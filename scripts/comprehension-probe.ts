#!/usr/bin/env node
/**
 * Comprehension probe (TODO.17 P2a) — facilitator instrument.
 *
 * Question: does a stranger understand what this is and what to do next?
 *
 * The script owns the app (sample workspace, seeded) and the clock; the
 * facilitator owns the participant. It records verbatim answers, when the
 * participant opened the match explanation, and whether they completed the
 * act step, then writes the evidence artifact.
 *
 * Usage:
 *   pnpm probe                 run one session (interactive, opens a browser window)
 *   pnpm probe --list          print the instrument's script and scenes
 *   pnpm probe --port 4199     use an already running server
 *   pnpm probe --headless      run without a visible window (automation)
 */

import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, type Browser, type Page} from 'playwright';
import {seed} from '../ui/test/support/seed';
import {readFrictionJournal} from '../ui/test/support/journal';
import {demoNotes, defaultSettings} from '../ui/test/fixtures/workspace';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'doc', 'evidence');
const RAW_PATH = join(EVIDENCE_DIR, 'comprehension-probe-raw.json');
const REPORT_PATH = join(EVIDENCE_DIR, '2026-11-comprehension-probe.md');

const QUESTIONS = [
    {
        id: 'purpose',
        prompt: 'What is this app for?',
        hint: 'Record the answer verbatim. Do not correct or rephrase.',
    },
    {
        id: 'nextAction',
        prompt: 'What would you do next?',
        hint: 'Record the answer verbatim. Do not suggest an action.',
    },
];

interface Session {
    participant: string;
    startedAt: string;
    purposeAnswer: string;
    nextActionAnswer: string;
    understoodPurpose: boolean;
    namedNextAction: boolean;
    timeToFirstExplanationSeconds: number | null;
    timeToFirstActionSeconds: number | null;
    timeToFirstMatchSeconds: number | null;
    matchWasAboutTheNeed: boolean | null;
    completedAct: boolean;
    wouldActOnMatch: boolean | null;
    relevanceReason: string;
}

interface ProbeOptions {
    port: number;
    list: boolean;
    headless: boolean;
}

function parseArgs(): ProbeOptions {
    const args = process.argv.slice(2);
    const options: ProbeOptions = {port: 4189, list: false, headless: false};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--list') options.list = true;
        if (args[i] === '--headless') options.headless = true;
        if (args[i] === '--port' && args[i + 1]) options.port = Number(args[++i]);
    }
    return options;
}

/**
 * Line reader that buffers input.
 * A human types answers as the questions are asked; a piped stdin delivers all
 * lines at once. Buffering keeps both usable, and the questions stay in order.
 */
class LineReader {
    private buffer = '';
    private lines: string[] = [];
    private waiters: Array<(line: string | null) => void> = [];
    private ended = false;

    constructor(input: NodeJS.ReadableStream = process.stdin) {
        input.setEncoding('utf8');
        input.on('data', chunk => {
            this.buffer += chunk;
            let index = this.buffer.indexOf('\n');
            while (index >= 0) {
                this.deliver(this.buffer.slice(0, index).replace(/\r$/, ''));
                this.buffer = this.buffer.slice(index + 1);
                index = this.buffer.indexOf('\n');
            }
        });
        input.on('end', () => {
            if (this.buffer.length > 0) {
                this.deliver(this.buffer);
                this.buffer = '';
            }
            this.ended = true;
            this.flushWaiters();
        });
    }

    private deliver(line: string): void {
        const waiter = this.waiters.shift();
        if (waiter) waiter(line);
        else this.lines.push(line);
    }

    private flushWaiters(): void {
        while (this.waiters.length > 0) {
            const waiter = this.waiters.shift();
            const line = this.lines.shift() ?? null;
            waiter?.(line);
        }
    }

    next(): Promise<string | null> {
        const buffered = this.lines.shift();
        if (buffered !== undefined) return Promise.resolve(buffered);
        if (this.ended) return Promise.resolve(null);
        return new Promise(resolve => this.waiters.push(resolve));
    }

    async ask(question: string): Promise<string> {
        process.stdout.write(question);
        const line = await this.next();
        return line ?? '';
    }
}

const reader = new LineReader();

function ask(question: string): Promise<string> {
    return reader.ask(question);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return true;
        } catch {
            // not up yet
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

async function startServer(port: number): Promise<() => void> {
    const url = `http://localhost:${port}/`;
    if (await waitForServer(url, 2_000)) {
        console.log(`Using the server already running at ${url}`);
        return () => {};
    }

    console.log('Starting the UI (production preview)…');
    const server = spawn(
        'pnpm',
        ['--filter', '@notention/ui', 'preview', '--port', String(port), '--strictPort'],
        {cwd: ROOT, stdio: 'ignore'}
    );

    if (!(await waitForServer(url))) {
        server.kill();
        throw new Error(`The UI did not start on port ${port}. Run "pnpm --filter @notention/ui build" first.`);
    }

    console.log(`UI ready at ${url}`);
    return () => server.kill();
}

/** Read the notes the app persisted, to see whether the act step happened. */
async function readPersistedNotes(page: Page): Promise<Array<{properties: Array<{key: string; values: string[]}>}>> {
    return page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('keyvaluepairs', 'readonly');
        const request = tx.objectStore('keyvaluepairs').get('notention-notes');
        return new Promise(resolve => {
            tx.oncomplete = () => resolve((request.result ?? []) as never);
            tx.onerror = () => resolve([] as never);
        });
    });
}

interface PollState {
    explanationOpen: boolean;
    responded: boolean;
}

async function pollState(page: Page): Promise<PollState> {
    const notes = await readPersistedNotes(page).catch(() => []);
    const responded = notes.some(note =>
        note.properties?.some(p => p.key === 'intent' && p.values.includes('response'))
    );
    const explanationOpen = await page.evaluate(() => {
        const details = document.querySelector('[data-testid="match-explanations"]');
        return !!details && details.hasAttribute('open');
    }).catch(() => false);
    return {explanationOpen, responded};
}

function loadRaw(): Session[] {
    if (!existsSync(RAW_PATH)) return [];
    try {
        return JSON.parse(readFileSync(RAW_PATH, 'utf-8')) as Session[];
    } catch {
        return [];
    }
}

function writeRaw(sessions: Session[]): void {
    mkdirSync(EVIDENCE_DIR, {recursive: true});
    writeFileSync(RAW_PATH, JSON.stringify(sessions, null, 2) + '\n');
}

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function formatSeconds(seconds: number | null | undefined): string {
    return seconds === null || seconds === undefined ? '—' : `${seconds.toFixed(1)}s`;
}

/**
 * Time-to-first-match (P2c.4): the journal's own timestamps, not the
 * facilitator's clock. t0 is the first need the participant expressed,
 * t1 is the first match explanation they opened after it.
 */
async function measureTimeToFirstMatch(page: Page): Promise<{seconds: number | null; sameNote: boolean | null}> {
    const deadline = Date.now() + 3_000;
    let events: Awaited<ReturnType<typeof readFrictionJournal>> = [];

    while (Date.now() < deadline) {
        events = await readFrictionJournal(page);
        if (events.some(e => e.kind === 'need_expressed' && e.timestamp)) break;
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    const needs = events
        .filter(e => e.kind === 'need_expressed' && e.timestamp)
        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
    if (needs.length === 0) return {seconds: null, sameNote: null};

    const need = needs[0];
    const needAt = new Date(need.timestamp!).getTime();
    const explanation = events
        .filter(e => e.kind === 'match_explained' && e.timestamp)
        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
        .find(e => new Date(e.timestamp!).getTime() >= needAt);

    if (!explanation) return {seconds: null, sameNote: null};

    return {
        seconds: (new Date(explanation.timestamp!).getTime() - needAt) / 1000,
        sameNote: !!need.noteId && need.noteId === explanation.noteId,
    };
}

function writeReport(sessions: Session[]): void {
    const understood = sessions.filter(s => s.understoodPurpose).length;
    const named = sessions.filter(s => s.namedNextAction).length;
    const explanationTimes = sessions.map(s => s.timeToFirstExplanationSeconds).filter((v): v is number => v !== null && v !== undefined);
    const actionTimes = sessions.map(s => s.timeToFirstActionSeconds).filter((v): v is number => v !== null && v !== undefined);
    const matchTimes = sessions.map(s => s.timeToFirstMatchSeconds).filter((v): v is number => v !== null && v !== undefined);
    const acted = sessions.filter(s => s.completedAct).length;
    const judged = sessions.filter(s => s.wouldActOnMatch !== null);
    const wouldAct = judged.filter(s => s.wouldActOnMatch === true).length;

    const rows = sessions.map(s => [
        s.participant,
        s.understoodPurpose ? 'yes' : 'no',
        s.namedNextAction ? 'yes' : 'no',
        formatSeconds(s.timeToFirstExplanationSeconds),
        formatSeconds(s.timeToFirstMatchSeconds),
        s.completedAct ? 'yes' : 'no',
        formatSeconds(s.timeToFirstActionSeconds),
    ].join(' | ')).join('\n');

    const relevanceRows = sessions.map(s => [
        s.participant,
        s.wouldActOnMatch === null ? '—' : s.wouldActOnMatch ? 'yes' : 'no',
        s.relevanceReason || '—',
    ].join(' | ')).join('\n');

    const answers = sessions.map(s => [
        `### ${s.participant}`,
        '',
        `- **What is this app for?** ${s.purposeAnswer || '_(no answer)_'}`,
        `- **What would you do next?** ${s.nextActionAnswer || '_(no answer)_'}`,
        `- Understood the purpose: ${s.understoodPurpose ? 'yes' : 'no'}`,
        `- Named a next action: ${s.namedNextAction ? 'yes' : 'no'}`,
        `- Opened the match explanation after ${formatSeconds(s.timeToFirstExplanationSeconds)}`,
        `- Time to first match: ${formatSeconds(s.timeToFirstMatchSeconds)}${s.matchWasAboutTheNeed === null || s.matchWasAboutTheNeed === undefined ? '' : s.matchWasAboutTheNeed ? ' (the match was about that need)' : ' (the match was about another request)'}`,
        `- Completed the act step: ${s.completedAct ? 'yes' : 'no'}`,
        `- Would act on the match: ${s.wouldActOnMatch === null ? '—' : s.wouldActOnMatch ? 'yes' : 'no'}`,
        '',
    ].join('\n')).join('\n');

    const report = `# Comprehension Probe — 2026-11

**Instrument:** \`pnpm probe\` (sample workspace, seeded; facilitator reads the questions aloud)
**Question:** does a stranger understand what this is and what to do next?
**Sessions:** ${sessions.length}

## Results

| Participant | Understood purpose | Named next action | Time to first explanation | Time to first match | Acted | Time to first action |
|---|---|---|---|---|---|---|
${rows}

- **Comprehension rate:** ${sessions.length ? Math.round((understood / sessions.length) * 100) : 0}% (${understood}/${sessions.length}) stated the purpose correctly
- **Next-action rate:** ${sessions.length ? Math.round((named / sessions.length) * 100) : 0}% (${named}/${sessions.length}) named an action the app supports
- **Act completion:** ${acted}/${sessions.length}
- **Time to first explanation:** median ${formatSeconds(median(explanationTimes))}${explanationTimes.length ? ` (n=${explanationTimes.length})` : ''}
- **Time to first match (P2c.4):** median ${formatSeconds(median(matchTimes))}${matchTimes.length ? ` (n=${matchTimes.length})` : ''} — threshold: median < 2 min
- **Time to first action:** median ${formatSeconds(median(actionTimes))}${actionTimes.length ? ` (n=${actionTimes.length})` : ''}

## Match relevance (P2c.3)

| Participant | Would act on the match | Why |
|---|---|---|
${relevanceRows}

- **Relevance rate:** ${judged.length ? Math.round((wouldAct / judged.length) * 100) : 0}% (${wouldAct}/${judged.length})

## Verbatim answers

${answers || '_No sessions recorded yet._'}

## Method

- 5 participants, 10 minutes each, no instruction beyond the two questions.
- The participant sees the sample workspace only; the facilitator does not demonstrate.
- Answers are recorded verbatim. The facilitator classifies each answer after the
  session: *understood the purpose* and *named a next action the app supports*.
- The match the product shows is judged in the same session: *would you act on
  this?* and *why not?* (P2c.3).
- The clock starts when the app reports ready and stops when the participant opens
  the match explanation or completes the act step.
- Time to first match (P2c.4) is measured by the app's own journal, not by the
  facilitator: from the first need the participant expressed to the first match
  explanation they opened after it (ADR 016).
- Sessions are stored locally in \`doc/evidence/comprehension-probe-raw.json\`;
  this report is anonymized (participants are \`P1\`, \`P2\`, …).
`;

    mkdirSync(EVIDENCE_DIR, {recursive: true});
    writeFileSync(REPORT_PATH, report);
}

function printInstrument(): void {
    console.log('Comprehension probe — instrument\n');
    console.log('Scenes: the sample workspace (seeded) plus the showcase scenes in ui/test/showcase/*.scene.ts');
    console.log('Questions (read verbatim, no instruction):');
    for (const question of QUESTIONS) {
        console.log(`  ${question.id}: ${question.prompt}`);
        console.log(`    ${question.hint}`);
    }
    console.log('\nRecorded per session:');
    console.log('  - both answers, verbatim');
    console.log('  - time from app-ready to the first opened match explanation');
    console.log('  - time from the first expressed need to the first opened match explanation');
    console.log('  - whether the participant created a response (the act step)');
    console.log('\nArtifacts:');
    console.log(`  ${RAW_PATH}`);
    console.log(`  ${REPORT_PATH}`);
}

async function runSession(options: ProbeOptions, browser: Browser): Promise<Session> {
    const url = `http://localhost:${options.port}/`;
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, baseURL: url});
    const page = await context.newPage();

    console.log('\nSeeding the sample workspace…');
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    const participant = (await ask('Participant id (e.g. P1): ')) || `P${loadRaw().length + 1}`;
    const startedAt = new Date().toISOString();

    console.log('\nHand the window to the participant. Read the questions aloud, verbatim.');
    const answers: Record<string, string> = {};
    for (const question of QUESTIONS) {
        console.log(`\nQ: ${question.prompt}`);
        console.log(`   (${question.hint})`);
        answers[question.id] = await ask('A: ');
    }

    console.log('\nLet the participant act. Press Enter when the session is over.');
    let timeToFirstExplanation: number | null = null;
    let timeToFirstAction: number | null = null;
    let completedAct = false;

    const finished = reader.next().then(() => undefined);
    const start = Date.now();
    while (timeToFirstExplanation === null || !completedAct) {
        const state = await pollState(page);
        const elapsed = (Date.now() - start) / 1000;
        if (state.explanationOpen && timeToFirstExplanation === null) {
            timeToFirstExplanation = elapsed;
            console.log(`  → explanation opened after ${elapsed.toFixed(1)}s`);
        }
        if (state.responded && !completedAct) {
            completedAct = true;
            timeToFirstAction = elapsed;
            console.log(`  → response created after ${elapsed.toFixed(1)}s`);
        }
        if (completedAct && timeToFirstExplanation !== null) break;
        if (await Promise.race([finished.then(() => true), sleep(250).then(() => false)])) break;
    }

    const understoodPurpose = (await ask('Did the participant state the purpose correctly? [y/N] ')).toLowerCase().startsWith('y');
    const namedNextAction = (await ask('Did they name a next action the app supports? [y/N] ')).toLowerCase().startsWith('y');

    const timeToFirstMatch = await measureTimeToFirstMatch(page);
    if (timeToFirstMatch.seconds !== null) {
        console.log(`  → time to first match: ${timeToFirstMatch.seconds.toFixed(1)}s`);
    }

    console.log('\nMatch relevance (P2c.3) — the match the product showed:');
    const relevanceAnswer = (await ask('Would you act on this match? [y/N] ')).trim().toLowerCase();
    const wouldActOnMatch = relevanceAnswer.startsWith('y') ? true : relevanceAnswer.startsWith('n') ? false : null;
    const relevanceReason = await ask('Why? (verbatim) ');

    await context.close();

    return {
        participant,
        startedAt,
        purposeAnswer: answers.purpose,
        nextActionAnswer: answers.nextAction,
        understoodPurpose,
        namedNextAction,
        timeToFirstExplanationSeconds: timeToFirstExplanation,
        timeToFirstActionSeconds: timeToFirstAction,
        timeToFirstMatchSeconds: timeToFirstMatch.seconds,
        matchWasAboutTheNeed: timeToFirstMatch.sameNote,
        completedAct,
        wouldActOnMatch,
        relevanceReason,
    };
}

async function main(): Promise<void> {
    const options = parseArgs();
    if (options.list) {
        printInstrument();
        writeReport(loadRaw());
        console.log(`\nReport refreshed: ${REPORT_PATH}`);
        return;
    }

    const stopServer = await startServer(options.port);
    const browser = await chromium.launch({headless: options.headless});

    try {
        const session = await runSession(options, browser);
        const sessions = [...loadRaw(), session];
        writeRaw(sessions);
        writeReport(sessions);
        console.log(`\nRecorded ${session.participant}. ${sessions.length} session(s) stored.`);
        console.log(`Report: ${REPORT_PATH}`);
    } finally {
        await browser.close();
        stopServer();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

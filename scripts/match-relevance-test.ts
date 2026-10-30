#!/usr/bin/env node
/** Match Relevance Test (H2) - Collect match relevance ratings from 5 users */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawnSync, spawn } from 'child_process';

const ROOT = join(__dirname, '..');
const RESULTS_DIR = join(ROOT, 'eval-results', 'match-relevance');

interface Rating {
    userId: string;
    matchId: string;
    matchType: string;
    requestText: string;
    offerText: string;
    relevant: boolean;
    timestamp: string;
    notes?: string;
}

interface TestRun {
    runId: string;
    startedAt: string;
    completedAt?: string;
    ratings: Rating[];
    summary: { totalRatings: number; relevantCount: number; relevanceRate: number; passed: boolean };
}

const TEST_CASES = [
    { matchId: 'match-1', matchType: 'job-match', request: 'React developer, TypeScript, remote, Berlin, $50/hr', offer: 'React developer role, $500 budget, remote, Berlin' },
    { matchId: 'match-2', matchType: 'job-match', request: 'Full-stack developer, Node.js, React, $60/hr, US timezone', offer: 'Backend developer, Node.js, $400 budget, async' },
    { matchId: 'match-3', matchType: 'skill-match', request: 'Designer, Figma, UI/UX, remote', offer: 'Design contractor, Figma, $300 budget, remote OK' },
    { matchId: 'match-4', matchType: 'collaboration', request: 'Co-founder search, technical, SaaS, equity', offer: 'Business co-founder, marketing, SaaS experience' },
    { matchId: 'match-5', matchType: 'job-match', request: 'Data scientist, Python, ML, $70/hr, remote', offer: 'ML engineer role, Python, $800 budget, remote' },
];

function createRun(): TestRun {
    return {
        runId: `match-relevance-${Date.now()}`,
        startedAt: new Date().toISOString(),
        ratings: [],
        summary: { totalRatings: 0, relevantCount: 0, relevanceRate: 0, passed: false },
    };
}

function saveRun(run: TestRun) {
    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(join(RESULTS_DIR, `${run.runId}.json`), JSON.stringify(run, null, 2));
    console.log(`💾 Saved to eval-results/match-relevance/${run.runId}.json`);
}

function prompt(q: string): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}

async function collectRatings(run: TestRun, userId: string) {
    console.log(`\n👤 ${userId} - Rate matches:\n` + '-'.repeat(60));
    for (const tc of TEST_CASES) {
        console.log(`\n📝 ${tc.matchId} (${tc.matchType})`);
        console.log(`   Request: "${tc.request}"`);
        console.log(`   Offer:   "${tc.offer}"`);
        const relevant = (await prompt('   Relevant? (y/n): ')).toLowerCase() === 'y';
        const notes = (await prompt('   Notes (optional): ')) || undefined;
        run.ratings.push({ userId, ...tc, relevant, timestamp: new Date().toISOString(), notes });
    }
    run.summary.totalRatings = run.ratings.length;
    run.summary.relevantCount = run.ratings.filter(r => r.relevant).length;
    run.summary.relevanceRate = run.summary.relevantCount / run.summary.totalRatings;
    run.summary.passed = run.summary.relevanceRate >= 0.7;
}

async function runMatchRelevanceTest() {
    console.log('🎯 Match Relevance Test (H2) - 5 users, ≥70% threshold\n' + '='.repeat(60));
    const run = createRun();
    for (let i = 1; i <= 5; i++) {
        await collectRatings(run, `user-${i}`);
        console.log(`\n📊 Running: ${run.summary.relevantCount}/${run.summary.totalRatings} (${(run.summary.relevanceRate * 100).toFixed(1)}%)`);
        saveRun(run);
    }
    run.completedAt = new Date().toISOString();
    saveRun(run);

    console.log('\n' + '='.repeat(60) + '\n📊 FINAL RESULTS\n' + '='.repeat(60));
    console.log(`Total: ${run.summary.totalRatings} | Relevant: ${run.summary.relevantCount} | Rate: ${(run.summary.relevanceRate * 100).toFixed(1)}%`);
    console.log(`Gate H2: ${run.summary.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (!run.summary.passed) process.exit(1);
}

async function runWithUI() {
    console.log('🌐 Starting UI for ratings...');
    if (spawnSync('pnpm', ['--filter', '@notention/ui', 'build'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
        console.error('❌ Build failed'); process.exit(1);
    }
    const server = spawn('pnpm', ['--filter', '@notention/ui', 'preview', '--', '--port', '5173'], { cwd: ROOT, stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 3000));
    console.log('✅ Server at http://localhost:5173');
    console.log('Users: Create notes per test cases, rate matches, record here');
    process.on('SIGINT', () => { server.kill(); process.exit(0); });
}

const args = process.argv.slice(2);
args.includes('--ui') ? runWithUI().catch(console.error) : runMatchRelevanceTest().catch(console.error);
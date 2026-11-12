#!/usr/bin/env node
/**
 * Diagnostic: does the sample workspace's flagship request/offer pair match?
 *
 * The sample workspace's empty-state card advertises "a request and an offer
 * that match". This script checks whether it actually does, and prints the
 * decomposition so a failure is diagnosable rather than merely observable.
 *
 * Run from the repo root:
 *   npx tsx scripts/check-demo-match.ts
 *
 * Expected: score 1.0, matches [job, budget, remote], no conflicts, no missing -> 
 * the dashboard's `score > 0.4` filter shows the match.
 *
 * See TODO.20.md P1.1-P1.2 (MatchEngine bugs fixed).
 */

import { buildDemoWorkspace } from '../core/src/fixtures/demoWorkspace.js';
import { DEFAULT_ONTOLOGY } from '../core/src/ontology/domains.js';
import { MatchEngine } from '../core/src/matching/MatchEngine.js';

const notes = buildDemoWorkspace();
const request = notes.find((n) => n.id === 'demo-request-react');
const offer = notes.find((n) => n.id === 'demo-offer-react');

if (!request || !offer) {
    console.error('Demo notes not found');
    process.exit(1);
}

const describe = (note: typeof request) =>
    note.properties.map((p) => `${p.key}=${p.values.join('|')}[${p.operator}]`).join(', ');

console.log('request :', describe(request));
console.log('offer   :', describe(offer));

const result = new MatchEngine(DEFAULT_ONTOLOGY).calculateMatchScore(request, offer);

console.log('\nscore        :', result.score);
console.log('matches      :', result.matches.map((m) => m.requestProp.key));
console.log('conflicts    :', result.conflicts.map((m) => m.requestProp.key));
console.log('missing      :', result.missing.map((p) => p.key));

const DASHBOARD_THRESHOLD = 0.4;
const displayed = result.score > DASHBOARD_THRESHOLD;

console.log(`\ndashboard threshold (> ${DASHBOARD_THRESHOLD}) ->`, displayed ? 'DISPLAYED' : 'NOT DISPLAYED');
console.log(displayed
    ? '✅ The flagship demo match is visible.'
    : '❌ The flagship demo match is invisible. See TODO.17.md P1a.');

process.exit(displayed ? 0 : 1);

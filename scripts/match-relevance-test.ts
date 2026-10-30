#!/usr/bin/env node
/**
 * Match Relevance Test (H2) - Collect match relevance ratings from users
 * 
 * Usage: pnpm tsx scripts/match-relevance-test.ts
 * 
 * This script:
 * 1. Sets up test notes with known matches
 * 2. Collects relevance ratings from 5 users
 * 3. Reports if ≥70% of matches rated relevant
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

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
    summary: {
        totalRatings: number;
        relevantCount: number;
        relevanceRate: number;
        passed: boolean;
    };
}

function createTestRun(): TestRun {
    const runId = `match-relevance-${Date.now()}`;
    return {
        runId,
        startedAt: new Date().toISOString(),
        ratings: [],
        summary: {
            totalRatings: 0,
            relevantCount: 0,
            relevanceRate: 0,
            passed: false,
        },
    };
}

function saveRun(run: TestRun): void {
    mkdirSync(RESULTS_DIR, { recursive: true });
    const filePath = join(RESULTS_DIR, `${run.runId}.json`);
    writeFileSync(filePath, JSON.stringify(run, null, 2));
    console.log(`💾 Saved to ${filePath}`);
}

function loadRun(runId: string): TestRun | null {
    const filePath = join(RESULTS_DIR, `${runId}.json`);
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function collectRating(run: TestRun, userId: string): void {
    console.log(`\n👤 User ${userId} - Rate the following matches:`);
    console.log('-'.repeat(60));

    // Pre-defined test cases
    const testCases = [
        {
            matchId: 'match-1',
            matchType: 'job-match',
            requestText: 'React developer, TypeScript, remote, Berlin, $50/hr',
            offerText: 'React developer role, $500 budget, remote, Berlin',
        },
        {
            matchId: 'match-2',
            matchType: 'job-match',
            requestText: 'Full-stack developer, Node.js, React, $60/hr, US timezone',
            offerText: 'Backend developer, Node.js, $400 budget, async',
        },
        {
            matchId: 'match-3',
            matchType: 'skill-match',
            requestText: 'Designer, Figma, UI/UX, remote',
            offerText: 'Design contractor, Figma, $300 budget, remote OK',
        },
        {
            matchId: 'match-4',
            matchType: 'collaboration',
            requestText: 'Co-founder search, technical, SaaS, equity',
            offerText: 'Business co-founder, marketing, SaaS experience',
        },
        {
            matchId: 'match-5',
            matchType: 'job-match',
            requestText: 'Data scientist, Python, ML, $70/hr, remote',
            offerText: 'ML engineer role, Python, $800 budget, remote',
        },
    ];

    for (const tc of testCases) {
        console.log(`\n📝 Match: ${tc.matchId} (${tc.matchType})`);
        console.log(`   Request: "${tc.requestText}"`);
        console.log(`   Offer:   "${tc.offerText}"`);
        
        // In real test, this would show the actual UI match with explanation
        // For now, we simulate by asking the user
        const relevant = prompt('   Is this match relevant? (y/n): ').toLowerCase() === 'y';
        const notes = prompt('   Notes (optional): ') || undefined;

        run.ratings.push({
            userId,
            matchId: tc.matchId,
            matchType: tc.matchType,
            requestText: tc.requestText,
            offerText: tc.offerText,
            relevant,
            timestamp: new Date().toISOString(),
            notes,
        });
    }
}

function prompt(question: string): string {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise<string>(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function runMatchRelevanceTest() {
    console.log('🎯 Match Relevance Test (H2) - Collect ratings from 5 users');
    console.log('='.repeat(60));
    console.log('');
    console.log('Goal: ≥70% of matches rated relevant by 5 users');
    console.log('');

    const run = createTestRun();

    for (let i = 1; i <= 5; i++) {
        console.log(`\n--- User ${i} of 5 ---`);
        collectRating(run, `user-${i}`);
        
        // Update summary
        run.summary.totalRatings = run.ratings.length;
        run.summary.relevantCount = run.ratings.filter(r => r.relevant).length;
        run.summary.relevanceRate = run.summary.relevantCount / run.summary.totalRatings;
        run.summary.passed = run.summary.relevanceRate >= 0.7;
        
        console.log(`\n📊 Running summary: ${run.summary.relevantCount}/${run.summary.totalRatings} relevant (${(run.summary.relevanceRate * 100).toFixed(1)}%)`);
        saveRun(run);
    }

    run.completedAt = new Date().toISOString();
    saveRun(run);

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total ratings: ${run.summary.totalRatings}`);
    console.log(`Relevant: ${run.summary.relevantCount}`);
    console.log(`Relevance rate: ${(run.summary.relevanceRate * 100).toFixed(1)}%`);
    console.log(`Gate H2: ${run.summary.passed ? '✅ PASSED' : '❌ FAILED'} (≥70% required)`);

    if (!run.summary.passed) {
        console.log('\n⚠️  H2 gate failed. Need to improve match relevance.');
        process.exit(1);
    }
}

// Also provide a way to run with actual UI
async function runWithUI() {
    console.log('🌐 Starting UI for match relevance rating...');
    
    const buildResult = spawnSync('pnpm', ['--filter', '@notention/ui', 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
    });
    if (buildResult.status !== 0) {
        console.error('❌ Build failed');
        process.exit(1);
    }

    const server = spawn('pnpm', ['--filter', '@notention/ui', 'preview', '--', '--port', '5173'], {
        cwd: ROOT,
        stdio: 'inherit',
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Server running at http://localhost:5173');
    console.log('Instruct users to:');
    console.log('  1. Open http://localhost:5173');
    console.log('  2. Create request and offer notes per test cases');
    console.log('  3. Rate match relevance on dashboard');
    console.log('  4. Record ratings in this terminal');

    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping server...');
        server.kill();
        process.exit(0);
    });
}

// Main
const args = process.argv.slice(2);
if (args.includes('--ui')) {
    runWithUI().catch(console.error);
} else {
    runMatchRelevanceTest().catch(console.error);
}
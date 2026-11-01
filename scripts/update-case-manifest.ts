#!/usr/bin/env node
// scripts/update-case-manifest.ts - Generate/update eval case manifest

import { generateManifest, writeManifest, verifyManifest } from '../core/src/eval/caseManifest.js';

function main(): void {
    console.log('📋 Generating evaluation case manifest...');
    
    try {
        const manifest = generateManifest();
        writeManifest(manifest);
        
        console.log(`✅ Manifest generated: eval/cases/manifest.json`);
        console.log(`   Hash: ${manifest.hash}`);
        console.log(`   Generated: ${manifest.generatedAt}`);
        console.log(`   Intent cases: ${manifest.counts.intent.search} search, ${manifest.counts.intent.validation} validation, ${manifest.counts.intent.holdout} holdout`);
        console.log(`   Quality cases: ${manifest.counts.quality.extraction} extraction, ${manifest.counts.quality.match} match`);
        console.log(`   Total cases: ${manifest.cases.length}`);
        
        // Verify
        const verification = verifyManifest();
        if (verification.valid) {
            console.log('✅ Manifest verification passed');
        } else {
            console.error(`❌ Manifest verification failed: ${verification.error}`);
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Failed to generate manifest:', e);
        process.exit(1);
    }
}

main();
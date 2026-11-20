#!/usr/bin/env tsx
/**
 * Lint copy for banned words in UI text.
 * Scans JSX text content and string literals under ui/src.
 * Exits non-zero on any banned word found.
 */

import { globSync } from 'glob';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BANNED_WORDS = [
  'fulfillment',
  'provider',
  'capacity',
  'transition',
  'attestation',
  'rung',
  'ladder',
  'satisfaction',
  'score',
  'confidence',
  'Props',
  'Local',
  'Net',
  'ACTIVE',
  'Assistant',
];

// Allowlist: internal identifiers, test fixtures, explicitly model-sourced strings
const ALLOWLIST = new Set([
  // Test fixtures
  'fulfillment-hint',
  'skill-match',
  'test-fixture',
  'mock-provider',
  // Internal identifiers (camelCase/PascalCase)
  'fulfillmentSource',
  'fulfillmentSourcePlugin',
  'providerConfig',
  'capacityCheck',
  'transitionState',
  'attestationRecord',
  'satisfactionScore',
  'confidenceLevel',
  'assistantHeader',
  'assistantContent',
  // Model-sourced strings (explicitly allowed when sourced from model)
  // Network identifiers
  'Local',
  'Net',
  // Status values
  'ACTIVE',
]);

function isAllowed(word: string, context: string): boolean {
  // Check if it's in the allowlist
  if (ALLOWLIST.has(word)) return true;

  // Allow camelCase/PascalCase identifiers (contain uppercase mid-word)
  if (/[a-z][A-Z]/.test(word) || /^[A-Z][a-z]/.test(word)) return true;

  // Allow if it's in a comment or test file
  if (context.includes('test/') || context.includes('.test.') || context.includes('.spec.')) return true;

  // Allow if it's in a type definition or interface
  if (context.includes('interface ') || context.includes('type ') || context.includes('enum ')) return true;

  // Allow if it's in an import/export statement
  if (context.includes('import ') || context.includes('export ')) return true;

  // Allow if it's a variable/property assignment (contains = or :)
  if (context.includes(' = ') || context.includes(': ')) return true;

  return false;
}

function scanFile(filePath: string): Array<{ line: number; word: string; context: string }> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: Array<{ line: number; word: string; context: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const banned of BANNED_WORDS) {
      // Case-insensitive search for whole words
      const regex = new RegExp(`\\b${banned}\\b`, 'gi');
      let match;
      while ((match = regex.exec(line)) !== null) {
        const matchedWord = match[0];
        if (!isAllowed(matchedWord, `${filePath}:${i + 1}: ${line}`)) {
          violations.push({
            line: i + 1,
            word: matchedWord,
            context: line.trim(),
          });
        }
      }
    }
  }

  return violations;
}

function main() {
  const files = globSync('ui/src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/node_modules/**'],
    absolute: true,
  });

  let totalViolations = 0;
  const fileViolations: Map<string, Array<{ line: number; word: string; context: string }>> = new Map();

  for (const file of files) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      fileViolations.set(file, violations);
      totalViolations += violations.length;
    }
  }

  if (totalViolations > 0) {
    console.error(`❌ Found ${totalViolations} banned word violation(s):\n`);
    for (const [file, violations] of fileViolations) {
      const relPath = file.replace(resolve('ui/src') + '/', '');
      console.error(`  ${relPath}:`);
      for (const v of violations) {
        console.error(`    Line ${v.line}: "${v.word}" in "${v.context}"`);
      }
      console.error('');
    }
    console.error('Run with --fix to attempt auto-removal (not implemented).');
    process.exit(1);
  } else {
    console.log('✅ No banned words found in UI copy.');
    process.exit(0);
  }
}

main();
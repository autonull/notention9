#!/usr/bin/env node
// Guard the type scale: no 9px/10px text in the UI.
import {readFile, readdir} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';

const ROOT = resolve(process.cwd(), 'ui/src');
const BANNED = /text-\[(?:9|10)px\]/;

const walk = async (directory) => {
    const entries = await readdir(directory, {withFileTypes: true});
    const files = await Promise.all(entries.map(entry => {
        const full = join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }));
    return files.flat();
};

const files = (await walk(ROOT)).filter(file => /\.(ts|tsx|css)$/.test(file));
const offenders = [];
for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
        if (BANNED.test(line)) offenders.push(`${relative(process.cwd(), file)}:${index + 1}`);
    });
}

if (offenders.length > 0) {
    console.error('Type scale violation: use text-xs or a scale token instead of 9px/10px.');
    for (const offender of offenders) console.error(`  ${offender}`);
    process.exit(1);
}

console.log(`Type scale OK (${files.length} files).`);

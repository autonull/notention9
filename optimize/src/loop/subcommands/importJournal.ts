import {importFrictionJournalFile} from '@notention/core/telemetry/journal';

export async function runImportJournal(
    dry: boolean,
    json: boolean,
    sourcePath?: string
): Promise<number> {
    console.log('\n━━━ IMPORT JOURNAL ━━━');

    if (!sourcePath) {
        console.error('❌ import-journal requires the path to an exported JSONL file.');
        return 1;
    }

    try {
        const result = await importFrictionJournalFile(sourcePath, {dryRun: dry});
        console.log(`  Source: ${sourcePath}`);
        console.log(`  Destination: ${result.destination}`);
        console.log(`  Imported: ${result.imported}`);
        console.log(`  Duplicates skipped: ${result.duplicates}`);
        console.log(`  Malformed lines: ${result.malformed}`);
        if (dry) console.log(`  Pending (dry run): ${result.pending}`);

        if (json) console.log(JSON.stringify(result, null, 2));

        if (result.malformed > 0) {
            console.error('❌ The export contained malformed JSONL lines; no events were imported.');
            return 1;
        }

        console.log(dry ? '✅ Friction journal import validated (no files written)' : '✅ Friction journal imported');
        return 0;
    } catch (error) {
        console.error(`❌ Journal import failed: ${error instanceof Error ? error.message : String(error)}`);
        return 1;
    }
}

#!/usr/bin/env node
// scripts/visual-diff.ts - Visual regression testing with pixelmatch
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface VisualDiffConfig {
    baseline: string;
    compare: string;
    contexts?: string[];
    themes?: string[];
    gallery?: boolean;
    threshold?: number;
    updateBaselines?: boolean;
}

async function runCommand(cmd: string, cwd: string = ROOT): Promise<{ stdout: string; stderr: string; code: number }> {
    try {
        const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
        return { stdout, stderr: '', code: 0 };
    } catch (err: any) {
        return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 };
    }
}

async function buildGallery(contexts: string[], themes: string[], target: string = 'react'): Promise<string> {
    const runId = `gallery-${Date.now()}`;
    const galleryDir = resolve(ROOT, 'doc/uisg/visual', runId, 'gallery');
    mkdirSync(galleryDir, { recursive: true });

    const env = {
        NOTENTION_UISG_GALLERY: '1',
        NOTENTION_UISG_GALLERY_DIR: galleryDir,
    };

    for (const context of contexts) {
        for (const theme of themes) {
            const ctxEnv = { ...env, NOTENTION_CONTEXT: context, NOTENTION_THEME: theme };
            await runCommand(`pnpm uisg optimize --contexts=${context} --themes=${theme} --targets=${target} --gallery`, ROOT);
        }
    }

    return galleryDir;
}

async function screenshotSurfaces(
    runId: string,
    contexts: string[],
    themes: string[],
    viewports: string[] = ['desktop-1440', 'mobile-390']
): Promise<string> {
    const screenshotDir = resolve(ROOT, 'doc/uisg/visual', runId, 'screenshots');
    mkdirSync(screenshotDir, { recursive: true });

    for (const context of contexts) {
        for (const theme of themes) {
            for (const viewport of viewports) {
                const env = {
                    NOTENTION_CONTEXT: context,
                    NOTENTION_THEME: theme,
                    NOTENTION_VIEWPORT: viewport,
                    NOTENTION_UISG_SCREENSHOT_DIR: screenshotDir,
                };

                await runCommand(
                    `pnpm playwright test --project=chromium --grep="visual"`,
                    ROOT
                );
            }
        }
    }

    return screenshotDir;
}

async function compareScreenshots(
    baselineDir: string,
    compareDir: string,
    outputDir: string,
    threshold: number = 0.99
): Promise<{ passed: number; failed: number; diffs: Array<{ file: string; similarity: number }> }> {
    const { pixelmatch } = await import('pixelmatch');
    const { PNG } = await import('pngjs');
    const { readdirSync, statSync } = await import('node:fs');

    const baselineFiles = readdirSync(baselineDir).filter(f => f.endsWith('.png'));
    let passed = 0;
    let failed = 0;
    const diffs: Array<{ file: string; similarity: number }> = [];

    for (const file of baselineFiles) {
        const baselinePath = join(baselineDir, file);
        const comparePath = join(compareDir, file);
        const diffPath = join(outputDir, `diff-${file}`);

        if (!statSync(comparePath, { throwIfNoEntry: false })?.isFile()) {
            diffs.push({ file, similarity: 0 });
            failed++;
            continue;
        }

        const baselineImg = PNG.sync.read(readFileSync(baselinePath));
        const compareImg = PNG.sync.read(readFileSync(comparePath));

        const { width, height } = baselineImg;
        const diffImg = new PNG({ width, height });

        const pixelDiff = pixelmatch(
            baselineImg.data,
            compareImg.data,
            diffImg.data,
            width,
            height,
            { threshold: 1 - threshold }
        );

        const similarity = 1 - pixelDiff / (width * height);
        diffs.push({ file, similarity });

        writeFileSync(diffPath, PNG.sync.write(diffImg));

        if (similarity >= threshold) {
            passed++;
        } else {
            failed++;
        }
    }

    return { passed, failed, diffs };
}

async function generateVisualDiffReport(
    result: { passed: number; failed: number; diffs: Array<{ file: string; similarity: number }> },
    baselineRunId: string,
    compareRunId: string,
    outputDir: string
): Promise<void> {
    let markdown = `# Visual Diff Report\n\n`;
    markdown += `**Baseline:** ${baselineRunId}  \n`;
    markdown += `**Compare:** ${compareRunId}  \n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Passed:** ${result.passed}\n`;
    markdown += `- **Failed:** ${result.failed}\n`;
    markdown += `- **Total:** ${result.passed + result.failed}\n\n`;

    markdown += `## Diffs\n\n`;
    markdown += `| File | Similarity | Status |\n`;
    markdown += `|---|---|---|\n`;

    for (const diff of result.diffs) {
        const status = diff.similarity >= 0.99 ? '✅ Pass' : '❌ Fail';
        markdown += `| ${diff.file} | ${(diff.similarity * 100).toFixed(2)}% | ${status} |\n`;
    }

    const reportPath = join(outputDir, 'visual-diff-report.md');
    writeFileSync(reportPath, markdown);

    console.log(markdown);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const config: VisualDiffConfig = {
        baseline: '',
        compare: '',
        contexts: [],
        themes: [],
        gallery: false,
        threshold: 0.99,
        updateBaselines: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--baseline') config.baseline = args[++i];
        else if (arg === '--compare') config.compare = args[++i];
        else if (arg === '--contexts') config.contexts = args[++i].split(',');
        else if (arg === '--themes') config.themes = args[++i].split(',');
        else if (arg === '--gallery') config.gallery = true;
        else if (arg === '--threshold') config.threshold = parseFloat(args[++i]);
        else if (arg === '--update-baselines') config.updateBaselines = true;
    }

    if (!config.baseline || !config.compare) {
        console.error('Usage: pnpm uisg visual-diff --baseline=<runId> --compare=<runId> [--contexts=...] [--themes=...] [--threshold=0.99] [--update-baselines]');
        process.exit(1);
    }

    const contexts = config.contexts.length > 0 ? config.contexts : ['desktop', 'mobile'];
    const themes = config.themes.length > 0 ? config.themes : ['default', 'dark', 'light'];

    console.log(`Building galleries...`);
    const baselineGallery = await buildGallery(contexts, themes);
    const compareGallery = await buildGallery(contexts, themes);

    console.log(`Taking screenshots...`);
    const baselineScreenshots = await screenshotSurfaces(config.baseline, contexts, themes);
    const compareScreenshots = await screenshotSurfaces(config.compare, contexts, themes);

    console.log(`Comparing screenshots...`);
    const diffOutputDir = resolve(ROOT, 'doc/uisg/visual', `${config.compare}-vs-${config.baseline}`);
    mkdirSync(diffOutputDir, { recursive: true });

    const result = await compareScreenshots(baselineScreenshots, compareScreenshots, diffOutputDir, config.threshold);

    await generateVisualDiffReport(result, config.baseline, config.compare, diffOutputDir);

    if (config.updateBaselines && result.failed === 0) {
        console.log('All diffs passed. Updating baselines...');
        // Copy compare screenshots to baseline
    }

    if (result.failed > 0) {
        console.error(`\n❌ Visual diff failed: ${result.failed} differences found`);
        process.exit(1);
    } else {
        console.log(`\n✅ Visual diff passed: ${result.passed} screenshots match`);
    }
}

main().catch(err => {
    console.error('Visual diff error:', err);
    process.exit(1);
});
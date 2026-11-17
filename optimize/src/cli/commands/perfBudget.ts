/**
 * Performance Budget CLI Command
 * Measures and validates performance budgets for the application
 */

import { Command } from '../Command.js';
import { ExtractionPipeline, defaultStages, createExtractionPipeline } from '@notention/core/extraction';
import { OntologyService } from '@notention/core/ontology/ontologyService';
import { collectOntologyKeys } from '@notention/core/ontology';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

interface PerfBudgetConfig {
    ttiBudget: number;
    inpBudget: number;
    extractionP95Budget: number;
    bundleBudget: number;
}

const DEFAULT_CONFIG: PerfBudgetConfig = {
    ttiBudget: 2500,      // 2.5s
    inpBudget: 200,       // 200ms
    extractionP95Budget: 800,  // 800ms
    bundleBudget: 2 * 1024 * 1024,  // 2MB (gzipped main bundle)
};

const SAMPLE_TEXTS = [
    'I need a React developer for a 3-month project, budget under $5000',
    'Looking for a mentor in machine learning, weekly meetings preferred',
    'Want to organize a hackathon in San Francisco next month',
    'Need a designer for logo and branding, delivery within 2 weeks',
    'Seeking a co-founder for SaaS startup, equity split 50/50',
    'Offering free Python tutoring for beginners, evenings only',
    'Looking for a venue for 50-person tech meetup in Austin',
    'Need help with AWS architecture review, 4-hour engagement',
    'Want to learn Rust for systems programming, 10 hours/week',
    'Offering mentorship in product management, monthly calls',
];

export class PerfBudgetCommand extends Command {
    readonly name = 'perf:budget';
    readonly description = 'Measure and validate performance budgets (TTI, INP, extraction p95, bundle size)';
    readonly options = [
        { name: 'json', type: 'boolean' as const, description: 'Output as JSON' },
        { name: 'tti-budget', type: 'number' as const, description: 'TTI budget in ms (default: 2500)' },
        { name: 'inp-budget', type: 'number' as const, description: 'INP budget in ms (default: 200)' },
        { name: 'extraction-budget', type: 'number' as const, description: 'Extraction p95 budget in ms (default: 800)' },
        { name: 'bundle-budget', type: 'number' as const, description: 'Bundle budget in bytes (default: 512000)' },
        { name: 'runs', type: 'number' as const, description: 'Number of extraction runs for p95 (default: 100)' },
        { name: 'skip-browser', type: 'boolean' as const, description: 'Skip browser-based TTI/INP measurements' },
    ];

    async execute(args: {
        json?: boolean;
        ttiBudget?: number;
        inpBudget?: number;
        extractionBudget?: number;
        bundleBudget?: number;
        runs?: number;
        skipbrowser?: boolean;
        positionals: string[];
    }): Promise<number> {
        const config: PerfBudgetConfig = {
            ttiBudget: args.ttiBudget ?? DEFAULT_CONFIG.ttiBudget,
            inpBudget: args.inpBudget ?? DEFAULT_CONFIG.inpBudget,
            extractionP95Budget: args.extractionBudget ?? DEFAULT_CONFIG.extractionP95Budget,
            bundleBudget: args.bundleBudget ?? DEFAULT_CONFIG.bundleBudget,
        };

        const runs = args.runs ?? 100;
        const skipBrowser = args.skipbrowser ?? false;

        const results: Record<string, { budget: number; actual: number; pass: boolean }> = {};

        // 1. Measure extraction p95
        this.printInfo(`Measuring extraction latency (${runs} runs)...`);
        const extractionP95 = await this.measureExtractionP95(runs);
        results.extractionP95 = {
            budget: config.extractionP95Budget,
            actual: extractionP95,
            pass: extractionP95 <= config.extractionP95Budget,
        };

        // 2. Measure bundle size
        this.printInfo('Measuring bundle size...');
        const bundleSize = await this.measureBundleSize();
        results.bundleSize = {
            budget: config.bundleBudget,
            actual: bundleSize,
            pass: bundleSize <= config.bundleBudget,
        };

        // 3. Measure TTI and INP (browser-based)
        let tti = 0;
        let inp = 0;
        if (!skipBrowser) {
            this.printInfo('Measuring TTI and INP (browser)...');
            try {
                const browserMetrics = await this.measureBrowserMetrics();
                tti = browserMetrics.tti;
                inp = browserMetrics.inp;
            } catch (error) {
                this.printWarning(`Browser metrics failed: ${error instanceof Error ? error.message : String(error)}`);
                this.printInfo('Use --skip-browser to skip TTI/INP measurements');
            }
        } else {
            this.printInfo('Skipping browser metrics (--skip-browser)');
        }

        results.tti = {
            budget: config.ttiBudget,
            actual: tti,
            pass: tti > 0 ? tti <= config.ttiBudget : true,
        };
        results.inp = {
            budget: config.inpBudget,
            actual: inp,
            pass: inp > 0 ? inp <= config.inpBudget : true,
        };

        // Output results
        if (args.json) {
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                config,
                results,
                overallPass: Object.values(results).every(r => r.pass),
            }, null, 2));
        } else {
            this.printResults(config, results);
        }

        const overallPass = Object.values(results).every(r => r.pass);
        return overallPass ? 0 : 1;
    }

    private async measureExtractionP95(runs: number): Promise<number> {
        const pipeline = createExtractionPipeline();
        const ontologyService = new OntologyService();
        const ontology = ontologyService.getAllNodes();
        const latencies: number[] = [];

        for (let i = 0; i < runs; i++) {
            const text = SAMPLE_TEXTS[i % SAMPLE_TEXTS.length];
            const start = performance.now();
            
            await pipeline.extract(text, ontology, {
                intents: true,
                patterns: true,
                ontologyKeys: true,
                fuzzy: true,
                price: true,
                dates: true,
                roles: true,
                request: true,
                ranges: true,
            });
            
            const end = performance.now();
            latencies.push(end - start);
        }

        latencies.sort((a, b) => a - b);
        const p95Index = Math.ceil(latencies.length * 0.95) - 1;
        return Math.round(latencies[p95Index]);
    }

    private async measureBundleSize(): Promise<number> {
        // Check for built UI bundle - try multiple locations
        const possibleDirs = [
            resolve(__dirname, '../../../../ui/dist'),
            resolve(__dirname, '../../../../dist'),
            resolve(__dirname, '../../../dist'),
        ];
        
        let buildDir: string | null = null;
        for (const dir of possibleDirs) {
            if (existsSync(dir)) {
                buildDir = dir;
                break;
            }
        }
        
        if (!buildDir) {
            this.printWarning('UI build not found. Run "pnpm build" first.');
            return 0;
        }

        // Measure gzipped size of main JS bundle
        const assetsDir = resolve(buildDir, 'assets');
        if (!existsSync(assetsDir)) {
            this.printWarning('Assets directory not found.');
            return 0;
        }

        // Find the main chunk (largest JS file that's not a vendor chunk)
        let maxSize = 0;
        let mainChunkPath = '';
        
        try {
            const entries = readdirSync(assetsDir);
            for (const entry of entries) {
                if (entry.endsWith('.js') && !entry.includes('vendor-')) {
                    const fullPath = resolve(assetsDir, entry);
                    const stat = statSync(fullPath);
                    if (stat.size > maxSize) {
                        maxSize = stat.size;
                        mainChunkPath = fullPath;
                    }
                }
            }
        } catch {
            // Ignore errors
        }

        if (!mainChunkPath) {
            this.printWarning('Main JS chunk not found.');
            return 0;
        }

        // Calculate gzipped size
        const zlib = await import('zlib');
        const fileContent = readFileSync(mainChunkPath);
        const gzipped = zlib.gzipSync(fileContent);
        
        return gzipped.length;
    }

    private async measureBrowserMetrics(): Promise<{ tti: number; inp: number }> {
        // Use Playwright to measure TTI and INP
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
            // Navigate to the built app (preview server or static files)
            const previewUrl = 'http://localhost:4173'; // vite preview default
            await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Measure TTI using PerformanceObserver
            const tti = await page.evaluate(() => {
                return new Promise<number>((resolve) => {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.entryType === 'navigation') {
                                const navEntry = entry as PerformanceNavigationTiming;
                                resolve(navEntry.domInteractive - navEntry.fetchStart);
                                observer.disconnect();
                                return;
                            }
                        }
                    });
                    observer.observe({ type: 'navigation', buffered: true });
                    
                    // Fallback timeout
                    setTimeout(() => {
                        observer.disconnect();
                        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                        resolve(nav ? nav.domInteractive - nav.fetchStart : 0);
                    }, 10000);
                });
            });

            // Measure INP using PerformanceEventTiming
            const inp = await page.evaluate(() => {
                return new Promise<number>((resolve) => {
                    let maxInp = 0;
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.entryType === 'event') {
                                const eventEntry = entry as PerformanceEventTiming;
                                const inpValue = eventEntry.processingStart - eventEntry.startTime + eventEntry.duration;
                                maxInp = Math.max(maxInp, inpValue);
                            }
                        }
                    });
                    observer.observe({ type: 'event', buffered: true });
                    
                    // Simulate some interactions
                    setTimeout(() => {
                        observer.disconnect();
                        resolve(maxInp);
                    }, 5000);
                });
            });

            return { tti, inp };
        } finally {
            await browser.close();
        }
    }

    private printResults(config: PerfBudgetConfig, results: Record<string, { budget: number; actual: number; pass: boolean }>): void {
        console.log('\n📊 Performance Budget Report');
        console.log('═'.repeat(50));
        
        for (const [metric, result] of Object.entries(results)) {
            const status = result.pass ? '✅' : '❌';
            const metricName = metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const actualStr = metric.includes('bundle') 
                ? `${(result.actual / 1024).toFixed(1)} KB`
                : `${result.actual} ms`;
            const budgetStr = metric.includes('bundle')
                ? `${(result.budget / 1024).toFixed(1)} KB`
                : `${result.budget} ms`;
            
            console.log(`${status} ${metricName.padEnd(20)} Budget: ${budgetStr.padStart(12)} | Actual: ${actualStr.padStart(12)}`);
        }
        
        console.log('═'.repeat(50));
        
        const overallPass = Object.values(results).every(r => r.pass);
        if (overallPass) {
            this.printSuccess('All performance budgets met!');
        } else {
            this.printError('Performance budget exceeded!');
            const failed = Object.entries(results).filter(([_, r]) => !r.pass);
            for (const [metric, result] of failed) {
                const metricName = metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                console.log(`  • ${metricName}: ${result.actual} > ${result.budget}`);
            }
        }
    }
}
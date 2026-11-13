# Simulator Dashboard v2 — Deterministic Video Recording Procedure

## Overview

This document describes the deterministic headless video capture procedure for recording Simulator Dashboard v2 demonstrations using Playwright and Chrome DevTools Protocol (CDP).

## Prerequisites

- Node.js 20+
- pnpm
- Playwright with Chromium
- Built UI (`pnpm --filter @notention/ui build`)
- Simulator scenarios ready (`pnpm --filter @notention/simulator build`)

## Recording Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Playwright Test Script                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chromium (headless) via CDP                         │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  UI Preview Server (pnpm preview)           │   │   │
│  │  │  + Simulator Scenario Runner                │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  → Video frames captured via CDP                   │   │
│  │  → Encoded to MP4 (H.264, 30fps, 1920x1080)       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Build UI and simulator
pnpm --filter @notention/ui build
pnpm --filter @notention/simulator build

# 2. Record a single scenario
pnpm record:scenario semantic-capture

# 3. Record all capability scenarios
pnpm record:all-scenarios

# 4. Record with custom output directory
OUTPUT_DIR=./my-recordings pnpm record:all-scenarios
```

## Available Scripts

### `pnpm record:scenario <scenario-name>`

Records a single scenario with deterministic timing.

```bash
pnpm record:scenario semantic-capture
pnpm record:scenario bidirectional-match
pnpm record:scenario verifiable-coordination
# ... etc
```

### `pnpm record:all-scenarios`

Records all 11 capability scenarios sequentially.

### `pnpm record:custom <scenario-json>`

Records a custom scenario from a JSON file.

```bash
pnpm record:custom ./my-scenario.json
```

## Implementation Details

### Playwright Configuration (`tools/record/video.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tools/record/scenarios',
    fullyParallel: false,  // Sequential for deterministic resource usage
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['line'], ['json', { outputFile: 'record-results.json' }]],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
        video: {
            mode: 'on',
            size: { width: 1920, height: 1080 },
        },
    },
    projects: [
        {
            name: 'chromium-headless',
            use: { ...devices['Desktop Chrome'], headless: true },
        },
    ],
    webServer: {
        command: 'pnpm --filter @notention/ui preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
```

### Recording Script (`tools/record/record-scenario.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { ScenarioRunner } from '@notention/simulator';

test.describe.configure({ mode: 'serial' });

const SCENARIO_NAME = process.env.SCENARIO || 'semantic-capture';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './recordings';

test(`Record ${SCENARIO_NAME}`, async ({ page, context }) => {
    // Start video recording via CDP
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.startScreencast', {
        format: 'h264',
        quality: 90,
        everyNthFrame: 1,
    });

    const chunks: Buffer[] = [];
    cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
        chunks.push(Buffer.from(data, 'base64'));
        cdp.send('Page.screencastFrameAck', { sessionId });
    });

    // Navigate to the simulator dashboard
    await page.goto('/simulator');

    // Load and run the scenario
    const runner = new ScenarioRunner('ws://localhost:4444', DEFAULT_ONTOLOGY);
    runner.setFastMode(false);  // Real-time for recording

    const scenario = getComprehensiveScenario(SCENARIO_NAME);
    await runner.prepare(scenario);
    await runner.execute(scenario);

    // Stop recording
    await cdp.send('Page.stopScreencast');

    // Save video
    const videoPath = path.join(OUTPUT_DIR, `${SCENARIO_NAME}-${Date.now()}.mp4`);
    await writeVideoFile(chunks, videoPath);

    console.log(`Recording saved to ${videoPath}`);
});
```

## Deterministic Seeding

For reproducible recordings, all scenarios use seeded RNG:

```typescript
// In scenario runner
runner.setSeed(0xCAFEBABE);  // Fixed seed per scenario

// In simulator
const scenario = getComprehensiveScenario(name);
scenario.seed = SCENARIO_SEEDS[name];  // Predefined seeds
```

**Predefined Seeds:**
| Scenario | Seed |
|----------|------|
| semantic-capture | 0x1A2B3C4D |
| bidirectional-match | 0x2B3C4D5E |
| verifiable-coordination | 0x3C4D5E6F |
| multi-device-sync | 0x4D5E6F7A |
| ontology-evolution | 0x5E6F7A8B |
| resilient-networking | 0x6F7A8B9C |
| agent-automation | 0x7A8B9CAD |
| self-improving-eval | 0x8B9CADBE |
| accessible-i18n | 0x9CADBECF |
| local-telemetry | 0xADBECF1A |
| family-evacuation | 0xDBECF12B |
| resource-distribution | 0xECF12B3C |
| mesh-relay-failover | 0xCF12B34D |

## Video Output Specifications

| Parameter | Value |
|-----------|-------|
| Format | MP4 (H.264) |
| Resolution | 1920×1080 (Full HD) |
| Frame Rate | 30 fps |
| Bitrate | ~8 Mbps (quality 90) |
| Audio | None (silent) |
| Duration | Per scenario `duration` field (seconds) |

## Post-Processing

### Concatenate Recordings

```bash
# Create concat file
ls recordings/*.mp4 | sort | sed "s/^/file '/; s/$/'/" > concat.txt

# Concatenate with ffmpeg
ffmpeg -f concat -safe 0 -i concat.txt -c copy output/full-demo.mp4
```

### Add Title Cards

```bash
ffmpeg -i input.mp4 -vf "drawtext=text='Semantic Capture':fontsize=48:fontcolor=white:x=(w-tw)/2:y=50" -c:a copy output.mp4
```

### Generate Thumbnails

```bash
ffmpeg -i recording.mp4 -vf "fps=1/60,scale=320:180" thumb_%03d.png
```

## Troubleshooting

### Video is Corrupted / Zero Bytes

1. Ensure CDP session is properly established
2. Check that `Page.startScreencast` succeeds
3. Verify `Page.screencastFrameAck` is sent for each frame
4. Ensure `Page.stopScreencast` is called before context closes

### Frames Dropped / Low FPS

1. Increase `everyNthFrame` to 1 (capture every frame)
2. Reduce quality if encoding is bottleneck
3. Use `setFastMode(false)` for real-time recording
4. Ensure sufficient CPU/memory for encoding

### Scenario Timing Issues

1. Use `runner.setFastMode(false)` for real-time execution
2. Add explicit waits between events: `await page.waitForTimeout(2000)`
3. Verify scenario `duration` matches expected recording length

### Relay Connection Failures

1. Ensure relay is running: `pnpm --filter @notention/simulator run:relay`
2. Check port 4444 is available
3. Use `ws://localhost:4444` in scenario runner

## CI Integration

```yaml
# .github/workflows/record-demo.yml
name: Record Demo Videos
on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 0'  # Weekly

jobs:
  record:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @notention/ui build
      - run: pnpm --filter @notention/simulator build
      - run: pnpm record:all-scenarios
      - uses: actions/upload-artifact@v4
        with:
          name: demo-videos
          path: recordings/
```

## File Structure

```
tools/
└── record/
    ├── video.config.ts           # Playwright config
    ├── record-scenario.ts        # Main recording script
    ├── scenarios/                # Test files per scenario
    │   ├── semantic-capture.spec.ts
    │   ├── bidirectional-match.spec.ts
    │   └── ...
    └── utils/
        ├── video-encoder.ts      # H.264 encoding from CDP frames
        └── scenario-loader.ts    # Load scenarios with seeds

recordings/                       # Output directory (gitignored)
├── semantic-capture-1234567890.mp4
├── bidirectional-match-1234567891.mp4
└── ...
```

## Maintenance

- Update seeds when scenario logic changes
- Regenerate baselines after MatchEngine changes
- Keep Chrome version pinned in CI for consistency
- Monitor video file sizes (target <100MB per scenario)

## References

- [Playwright Video Recording](https://playwright.dev/docs/api/class-page#page-video)
- [CDP Page.screencast](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-startScreencast)
- [Simulator Scenarios](../simulator/src/scenarios/comprehensiveScenarios.ts)
- [Measurement Suite](../simulator/src/scenarios/measurementSuite.test.ts)
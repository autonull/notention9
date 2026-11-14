# T2 Scenario Video Recording Procedures

## Overview

This document extends the [Simulator Dashboard v2 Video Recording Procedure](../doc/simulator-dashboard-video-recording.md) with T2-specific requirements for the **Trust & Durability** tier videos:

| # | Scenario | Capability | Key Requirements |
|---|----------|-----------|------------------|
| 3 | `verifiable-coordination` | Verifiable commitments | Relay required; receipt chain export |
| 4 | `multi-device-sync` | Multi-device sync | Device link/revoke flow; connections view |
| 6 | `resilient-networking` | Offline-first | Relay kill/restore; offline queue flush; insights view |
| 13 | `mesh-relay-failover` | Mesh networking | Bridge daemon; mesh carry; multi-agent |

**T2 Goal**: Demonstrate that coordination is safe, offline-capable, and provable.

---

## Prerequisites (T2-Specific)

In addition to [general prerequisites](../doc/simulator-dashboard-video-recording.md#prerequisites):

- **Relay server** running on `ws://localhost:4444` (for scenarios 3, 6, 13)
- **Bridge daemon** process available (for scenario 13)
- Playwright test environment with `@playwright/test` and `ws` dependency

```bash
# Start relay (required for 3 of 4 T2 scenarios)
pnpm --filter @notention/simulator run:relay &

# Verify relay is reachable
curl -v ws://localhost:4444 || echo "Relay not running - start it first"
```

---

## Scenario-Specific Recording Procedures

### 3. verifiable-coordination — "We agreed; the agreement is provable offline"

**Duration**: 18s (real-time)  
**Requires**: `relay`, `ui`  
**Camera Focus Sequence**: `Requester 1` → `Requester 1` → `Requester 1` → `Offerer 1` → `Requester 1` → `Offerer 1` → `Requester 1`

**Event Timeline**:
| Time | Action | Camera Focus | Notes |
|------|--------|--------------|-------|
| 2s | `draft_request` | `Requester 1` | User composes request in editor |
| 4s | `publish_request` | `Requester 1` | Request sent via relay |
| 6s | `match_found` | `Requester 1` | System highlights match on dashboard |
| 8s | `respond` | `Offerer 1` | Offerer responds to match |
| 10s | `accept` | `Requester 1` | Requester accepts; commitment formed |
| 12s | `complete` | `Offerer 1` | Offerer marks complete |
| 14s | `export_receipts` | `Requester 1` | **Key moment**: Receipt chain exported (verifiable offline) |

**Recording Tips**:
- Ensure relay is running before test starts
- The `export_receipts` action should show the receipt JSON/download — add 2s pause after for visibility
- Camera focus stays on `Requester 1` for most events; only shifts to `Offerer 1` for respond/complete

**Playwright Test Template**:
```typescript
// tools/record/scenarios/verifiable-coordination.spec.ts
test('Record verifiable-coordination', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await startScreencast(cdp);

  await page.goto('/simulator');
  const runner = new ScenarioRunner('ws://localhost:4444', DEFAULT_ONTOLOGY);
  runner.setFastMode(false);
  runner.setSeed(0x3C4D5E6F); // T2 seed

  const scenario = getComprehensiveScenario('verifiable-coordination');
  await runner.prepare(scenario);
  await runner.execute(scenario);

  // Extra wait for receipt export visibility
  await page.waitForTimeout(2000);

  await stopScreencastAndSave(cdp, 'verifiable-coordination');
});
```

---

### 4. multi-device-sync — "My phone and laptop agree; I revoked the lost one"

**Duration**: 12s (real-time)  
**Requires**: `ui` (no relay needed)  
**Camera Focus Sequence**: `connections` → `editor` → `editor` → `connections`

**Event Timeline**:
| Time | Action | Camera Focus | Notes |
|------|--------|--------------|-------|
| 2s | `link_device` | `connections` | User links second device (QR/phrase shown) |
| 4s | `capture_note` | `editor` | Note captured on primary device |
| 6s | `show_sync` | `editor` | **Key moment**: Note appears on second device view |
| 8s | `revoke_device` | `connections` | **Key moment**: Lost device revoked; sync severed |

**Recording Tips**:
- The `connections` view must clearly show device list with linked/revoked states
- `show_sync` should visually indicate cross-device sync (e.g., "Synced to Phone" badge)
- `revoke_device` should show immediate removal from device list

**Playwright Test Template**:
```typescript
// tools/record/scenarios/multi-device-sync.spec.ts
test('Record multi-device-sync', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await startScreencast(cdp);

  await page.goto('/simulator');
  const runner = new ScenarioRunner('', DEFAULT_ONTOLOGY); // No relay needed
  runner.setFastMode(false);
  runner.setSeed(0x4D5E6F7A);

  const scenario = getComprehensiveScenario('multi-device-sync');
  await runner.prepare(scenario);
  await runner.execute(scenario);

  await stopScreencastAndSave(cdp, 'multi-device-sync');
});
```

---

### 6. resilient-networking — "The relay died; nothing was lost"

**Duration**: 14s (real-time)  
**Requires**: `relay`, `ui`  
**Camera Focus Sequence**: `connections` → `editor` → `connections` → `editor` → `connections` → `insights`

**Event Timeline**:
| Time | Action | Camera Focus | Notes |
|------|--------|--------------|-------|
| 2s | `show_relays` | `connections` | Show healthy relay connection |
| 4s | `publish_note` | `editor` | Note published successfully |
| 6s | `kill_relay` | `connections` | **Key moment**: Relay connection drops (red indicator) |
| 8s | `publish_note_offline` | `editor` | **Key moment**: Note queued offline (pending badge) |
| 10s | `restore_relay` | `connections` | Relay reconnects (green indicator) |
| 12s | `show_flush` | `insights` | **Key moment**: Offline queue flushes; insight shows "3 notes synced" |

**Recording Tips**:
- `kill_relay` should visually show connection loss (WebSocket close)
- `publish_note_offline` must show offline queue indicator (e.g., "⏳ 1 pending")
- `show_flush` on `insights` view should display sync metrics
- Consider adding 1s pauses after kill/restore for visual clarity

**Playwright Test Template**:
```typescript
// tools/record/scenarios/resilient-networking.spec.ts
test('Record resilient-networking', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await startScreencast(cdp);

  await page.goto('/simulator');
  const runner = new ScenarioRunner('ws://localhost:4444', DEFAULT_ONTOLOGY);
  runner.setFastMode(false);
  runner.setSeed(0x6F7A8B9C);

  const scenario = getComprehensiveScenario('resilient-networking');
  await runner.prepare(scenario);
  await runner.execute(scenario);

  // Wait for flush animation on insights
  await page.waitForTimeout(2000);

  await stopScreencastAndSave(cdp, 'resilient-networking');
});
```

---

### 13. mesh-relay-failover — "No internet — the mesh carried the note"

**Duration**: 12s (real-time)  
**Requires**: `relay`, `ui`  
**Camera Focus Sequence**: `editor` → `connections` → `editor` → `grid`

**Event Timeline**:
| Time | Action | Camera Focus | Notes |
|------|--------|--------------|-------|
| 2s | `publish_note` | `editor` | UserA publishes note (no internet) |
| 4s | `bridge_connect` | `connections` | **Key moment**: BridgeDaemon connects mesh ↔ relay |
| 6s | `relay_reconnect` | `editor` | Note delivered via mesh bridge |
| 8s | `camera` | `grid` | Show both users' notes synced |

**Recording Tips**:
- Requires three agents: `UserA`, `UserB`, `BridgeDaemon` (with `bridge` trait)
- `bridge_connect` should show bridge daemon status on connections view
- The `grid` view at the end should show both users' notes visible
- This is the most complex T2 scenario — consider a 2s pause at bridge_connect

**Playwright Test Template**:
```typescript
// tools/record/scenarios/mesh-relay-failover.spec.ts
test('Record mesh-relay-failover', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await startScreencast(cdp);

  await page.goto('/simulator');
  const runner = new ScenarioRunner('ws://localhost:4444', DEFAULT_ONTOLOGY);
  runner.setFastMode(false);
  runner.setSeed(0xCF12B34D); // T2 seed

  const scenario = getComprehensiveScenario('mesh-relay-failover');
  await runner.prepare(scenario);
  await runner.execute(scenario);

  // Wait for grid view to show both users' notes
  await page.waitForTimeout(2000);

  await stopScreencastAndSave(cdp, 'mesh-relay-failover');
});
```

---

## T2 Recording Script (Batch)

Create a script to record all T2 scenarios sequentially:

```bash
#!/bin/bash
# tools/record/record-t2-scenarios.sh

set -e

SCENARIOS=(
  "verifiable-coordination"
  "multi-device-sync"
  "resilient-networking"
  "mesh-relay-failover"
)

OUTPUT_DIR="${OUTPUT_DIR:-./recordings/t2}"
mkdir -p "$OUTPUT_DIR"

# Start relay for scenarios that need it
RELAY_PID=""
start_relay() {
  if ! curl -s ws://localhost:4444 > /dev/null 2>&1; then
    echo "Starting relay..."
    pnpm --filter @notention/simulator run:relay &
    RELAY_PID=$!
    sleep 3  # Wait for relay to be ready
  fi
}

stop_relay() {
  if [ -n "$RELAY_PID" ]; then
    kill $RELAY_PID 2>/dev/null || true
  fi
}

trap stop_relay EXIT

start_relay

for SCENARIO in "${SCENARIOS[@]}"; do
  echo "Recording $SCENARIO..."
  SCENARIO=$SCENARIO OUTPUT_DIR="$OUTPUT_DIR" \
    pnpm playwright test tools/record/scenarios/${SCENARIO}.spec.ts
done

echo "All T2 recordings saved to $OUTPUT_DIR"
```

---

## T2-Specific Seeds

| Scenario | Seed (Hex) | Seed (Decimal) |
|----------|------------|----------------|
| verifiable-coordination | 0x3C4D5E6F | 1011979887 |
| multi-device-sync | 0x4D5E6F7A | 1297895290 |
| resilient-networking | 0x6F7A8B9C | 1869611932 |
| mesh-relay-failover | 0xCF12B34D | 3475628877 |

**Use fixed seeds** for deterministic recordings. Update seeds if scenario logic changes.

---

## Camera Focus Targets (T2)

The Simulator Dashboard v2 supports these camera focus targets for T2 scenarios:

| Target | View | Used By |
|--------|------|---------|
| `editor` | Note editor with extraction stages | All |
| `connections` | Relay/device/mesh connection status | 3, 4, 6, 13 |
| `dashboard-matches` | Match results dashboard | 3 |
| `insights` | Local telemetry / sync metrics | 6 |
| `grid` | All notes grid view | 13 |
| `ontology` | Ontology editor | — |
| `map` | Geographic map | — |
| `settings` | Settings view | — |

---

## Post-Processing (T2)

### Concatenate T2 Suite
```bash
cd recordings/t2
ls *.mp4 | sort | sed "s/^/file '/; s/$/'/" > concat-t2.txt
ffmpeg -f concat -safe 0 -i concat-t2.txt -c copy ../t2-suite.mp4
```

### Add T2 Title Card
```bash
ffmpeg -i t2-suite.mp4 -vf \
  "drawtext=text='T2: Trust & Durability':fontsize=64:fontcolor=white:x=(w-tw)/2:y=100, \
   drawtext=text='Verifiable • Offline • Mesh':fontsize=36:fontcolor=white:x=(w-tw)/2:y=180" \
  -c:a copy t2-suite-titled.mp4
```

---

## Troubleshooting (T2-Specific)

| Issue | Scenario | Fix |
|-------|----------|-----|
| Relay connection refused | 3, 6, 13 | Ensure `pnpm --filter @notention/simulator run:relay` is running on port 4444 |
| Bridge daemon not connecting | 13 | Verify bridge daemon binary exists and is in PATH; check `BridgeDaemon` agent has `bridge` trait |
| Offline queue not showing | 6 | Verify `publish_note_offline` action triggers queue indicator; check `insights` view renders sync metrics |
| Device list not updating | 4 | Ensure `link_device` and `revoke_device` actions update connections view reactively |
| Receipt export not visible | 3 | Add `await page.waitForTimeout(2000)` after `export_receipts`; verify download/JSON modal appears |

---

## CI Integration (T2)

```yaml
# .github/workflows/record-t2.yml
name: Record T2 Demo Videos
on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * 0'  # Weekly, after general recording

jobs:
  record-t2:
    runs-on: ubuntu-latest
    timeout-minutes: 30
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
      - run: |
          # Start relay
          pnpm --filter @notention/simulator run:relay &
          sleep 5
          # Record T2 scenarios
          pnpm record:t2-scenarios
      - uses: actions/upload-artifact@v4
        with:
          name: t2-demo-videos
          path: recordings/t2/
```

---

## References

- [General Recording Procedure](../doc/simulator-dashboard-video-recording.md)
- [Scenario Specifications (TODO.23.md §6)](../TODO.23.md#6-scenario-specifications-all-13)
- [Comprehensive Scenarios Source](../simulator/src/scenarios/comprehensiveScenarios.ts)
- [Measurement Suite Baselines](../simulator/src/scenarios/measurementSuite.test.ts)
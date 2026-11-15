# TODO.24 — Remaining Work After Automated Completion (2026-11-14)

**Status**: All automated work complete (1098/1098 tests pass, 25 scenarios, 16 taxonomy cells, 67% coverage). Two categories of remaining work:

---

## ⏳ BLOCKED — Requires Human Participants

| Item | Front | Description | Infrastructure Ready |
|------|-------|-------------|---------------------|
| Manual comprehension probe | B | 3-5 participants on Home screen; verify Inbox paradigm + primary CTA | ✅ Probe automation (`pnpm probe --headless`), data-testids in UI |
| T1 video recording | B | semantic-capture, bidirectional-match, family-evacuation | ✅ `doc/simulator-dashboard-video-recording.md` (Playwright + CDP) |
| T2 video recording | D | 4 scenarios per `doc/t2-video-recording-procedures.md` | ✅ Scenario seeds, relay setup, camera focus sequences documented |

**Action**: Schedule 3-5 participants + recording session. All tooling documented.

---

## 🔧 TECHNICAL — Can Continue Programmatically

### 1. Local LLM Integration for NL→Semantic Translation
| Task | Status | Notes |
|------|--------|-------|
| Wire WebLLM into optimizer | ❌ Not started | WebLLM exists in UI (`ui/src/services/ai/WebLLMProvider.ts`), but optimizer uses only `DeterministicProvider` |
| Implement llama.cpp-embedded for Node.js | ❌ Not started | No llama.cpp integration anywhere; needed for headless/CLI evaluation |
| Benchmark harness: local LLM vs quality cases | ❌ Not started | Run Llama 3.2 3B/1B against 60 quality cases + golden cases; compute F1/precision/recall |
| Prompt optimization loop | ❌ Not started | Generate prompt variants → evaluate → adopt best (optimizer loop exists but needs LLM provider) |

**Recommended path**: 
- **Option A**: Use WebLLM in headless Chrome via Playwright (reuses existing UI code)
- **Option B**: Add `node-llama-cpp` or `llama-node` to optimizer for pure Node.js evaluation

---

#### Implementation Plan: Wire WebLLM into Optimizer (Option A)

**Architecture**:
```
optimize/src/prompts/cli.ts:RegistryProvider.extract()
         │
         ▼
optimize/src/llm/webllmBridge.ts (NEW)
  • Launches headless Chrome via Playwright with WebGPU
  • Loads UI build with WebLLM provider initialized
  • Exposes page.evaluate() API for extraction
  • Caches browser instance across calls
         │
         ▼
ui/src/services/ai/WebLLMProvider.ts (EXISTING)
  • @mlc-ai/web-llm with Llama-3.2-3B-Instruct-q4f16_1-MLC
  • doSuggestTags(), doAnalyzeOntology(), etc.
```

**Files to Create/Modify**:
| File | Action |
|------|--------|
| `optimize/src/llm/webllmBridge.ts` | Create: Playwright bridge to WebLLM |
| `optimize/src/llm/index.ts` | Create: exports |
| `optimize/src/prompts/cli.ts` | Modify: RegistryProvider uses bridge |
| `optimize/package.json` | Add: `playwright` devDependency |
| `optimize/tests/webllmBridge.test.ts` | Create: integration test |

**Setup Commands** (run once):
```bash
cd /home/me/notention9/optimize && pnpm add -D playwright
pnpm exec playwright install chromium
pnpm exec playwright install-deps chromium
cd /home/me/notention9/ui && pnpm build
```

**Key Considerations**:
- **WebGPU in headless**: Need `--enable-webgpu` + `--use-angle=swiftshader` for CI
- **Model load time**: ~30-60s first load (downloads ~2GB); cache browser across evaluations
- **Prompt format**: Reuse UI's `doSuggestTags` prompt + `collectOntologyKeys(ontology)`
- **Fallback**: If WebGPU fails, fall back to deterministic provider with warning

**Success Criteria**:
- [ ] `pnpm prompts:eval --provider registry --quality` runs without errors
- [ ] 60 quality cases evaluated in < 10 minutes
- [ ] F1/precision/recall printed for each prompt variant
- [ ] Optimizer loop can adopt best prompt automatically
- [ ] CI can run (with GPU runner or swiftshader fallback)

**Alternative: llama.cpp-embedded (Option B)**
```bash
# If WebLLM fails, add to optimize/package.json:
"dependencies": { "node-llama-cpp": "^3.0.0" }
# Create optimize/src/llm/llamaCppBridge.ts — direct Node.js binding, no browser
# Faster cold start, larger binary, same model (GGUF format)
```

### 2. Ontology & Taxonomy Refinement
| Task | Status | Notes |
|------|--------|-------|
| Expand taxonomy to 24/24 cells | ⚠️ 16/24 done | 8 cells uncovered: see `ontology/taxonomy.json` |
| Corpus→patch cycle for new domains | ✅ Done (Week 9) | 60 quality cases, 124 manifest, E7/E14 pipeline verified |
| Add custom ontology modules | ✅ Framework ready | `doc/ontology-configuration.md` documents how |

### 3. UI/UX Polish
| Task | Status | Notes |
|------|--------|-------|
| Advanced Settings progressive disclosure | ✅ Done | AutomationTab, LabelsTab, Ontology behind "Open Editor" |
| Home screen comprehension fixes | ⏳ Blocked | Needs human probe data |
| Performance: virtualized lists, memoization | ✅ Done | VirtualizedList, MetaphorRenderer optimized |

### 4. Demonstrations & Teaching
| Task | Status | Notes |
|------|--------|-------|
| T1/T2 video recording | ⏳ Blocked | Procedures documented, needs humans |
| Simulator Dashboard v2 recording | ✅ Documented | `doc/simulator-dashboard-video-recording.md` |

---

## 📊 Current Metrics (Baseline)

| Metric | Value |
|--------|-------|
| Test suite | 1098/1098 pass (100%) |
| Core tests | 852 |
| UI tests | 72 |
| Simulator tests | 87 (25 scenarios) |
| Optimize tests | 72 |
| Agent tests | 17 |
| CLI tests | 6 |
| Taxonomy coverage | 16/24 cells (67%) |
| Scenarios calibrated | 25 (10 reps each) |
| Quality cases | 60 extraction + match |
| Corpus size | 864 notes, 14 domains |
| Orphan keys | 97 (down from 137) |

---

## 🎯 Suggested Next Session Priorities

**If humans available**: Run comprehension probe + record T1/T2 videos.

**If no humans**: 
1. **Wire WebLLM into optimizer** — evaluate Llama 3.2 3B against quality cases
2. **Add llama.cpp-embedded** — for headless CI evaluation
3. **Run optimizer loop** — `pnpm loop run` to discover/synthesize/evaluate new improvements
4. **Expand taxonomy** — add scenarios for remaining 8 cells

---

## Commands Reference

```bash
# Run full optimizer cycle (discovers problems, synthesizes fixes, evaluates)
pnpm loop run --output data/loop/runs

# Ingest corpus for new test cases
pnpm loop corpus --output data/loop/corpus-output

# Evaluate prompts (currently deterministic only)
pnpm prompts:eval --quality --provider registry

# Run all tests
pnpm test --filter=@notention/core --filter=@notention/optimize --filter=@notention/simulator --filter=@notention/ui --filter=@notention/agent --filter=@notention/cli

# Simulator measurement suite (25 scenarios)
cd simulator && pnpm test -- src/scenarios/measurementSuite.test.ts

# Setup WebLLM for optimizer (run once)
./scripts/setup-webllm-optimizer.sh
```
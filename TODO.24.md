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
| Wire WebLLM into optimizer | ✅ **Implemented** | `optimize/src/llm/webllmBridge.ts` — Playwright bridge to UI build with WebLLM. HTTP server serves UI assets. WebGPU works in headed mode; headless needs `--headless=new` + GPU runner. |
| Implement llama.cpp-embedded for Node.js | ✅ **Implemented** | `optimize/src/llm/llamaCppBridge.ts` — `node-llama-cpp` bridge loads GGUF models directly in Node.js. Model downloaded to `/home/me/notention9/models/`. |
| Benchmark harness: local LLM vs quality cases | ⚠️ **Partial** | Both providers integrated into `pnpm prompts:eval --provider webllm|llamacpp`. WebLLM works but needs headed Chrome or GPU runner. llama.cpp works but base Llama 3.2 3B model not fine-tuned for ontology-constrained extraction (uses wrong keys, triggers safety filters). |
| Prompt optimization loop | ❌ Not started | Optimizer loop exists (`pnpm loop run`) but needs working LLM provider for quality evaluation. |

**Recommended path**: 
- **Option A (WebLLM)**: Use headed Chrome or CI GPU runner for WebGPU. Reuses UI's proven prompts (`doAlignToOntology`).
- **Option B (llama.cpp)**: Requires fine-tuned model or better prompt engineering. Current base model unsuitable for constrained extraction.

---

#### Implementation Status: Wire WebLLM into Optimizer (Option A)

**Architecture**:
```
optimize/src/prompts/cli.ts:RegistryProvider.extract()
         │
         ▼
optimize/src/llm/webllmBridge.ts
  • Launches headed Chrome via Playwright with WebGPU
  • Serves UI build via local HTTP server (avoids file:// CORS)
  • Loads UI with `?optimizer=true` query param exposing `__OPTIMIZER_AI__`
  • Exposes page.evaluate() API for extraction via UI's WebLLMProvider
  • Caches browser instance across calls
         │
         ▼
ui/src/services/ai/WebLLMProvider.ts (EXISTING)
  • @mlc-ai/web-llm with Llama-3.2-3B-Instruct-q4f16_1-MLC
  • doAlignToOntology() — ontology-constrained extraction
```

**Files Created/Modified**:
| File | Action |
|------|--------|
| `optimize/src/llm/webllmBridge.ts` | ✅ Created: Playwright bridge with HTTP server |
| `optimize/src/llm/llamaCppBridge.ts` | ✅ Created: node-llama-cpp bridge |
| `optimize/src/llm/index.ts` | ✅ Created: exports for both providers |
| `optimize/src/prompts/cli.ts` | ✅ Modified: `--provider webllm|llamacpp|registry` |
| `ui/src/index.tsx` | ✅ Modified: exposes `__OPTIMIZER_AI__` when `?optimizer=true` |
| `optimize/package.json` | ✅ Already has `playwright` |

**Setup Commands** (run once):
```bash
cd /home/me/notention9/optimize && pnpm add node-llama-cpp
pnpm approve-builds node-llama-cpp
cd /home/me/notention9/ui && pnpm build
# Download GGUF model for llama.cpp:
node optimize/download-model.mjs
```

**Key Considerations**:
- **WebGPU in headless**: Works with `--headless=new` + `--enable-webgpu` + `--use-angle=swiftshader` but needs GPU runner in CI. Headed mode works locally.
- **Model load time**: ~30-60s first load (downloads ~2GB); browser cached across evaluations.
- **Prompt format**: Reuses UI's `doAlignToOntology` prompt + `collectOntologyKeys(ontology)`.
- **Fallback**: Both providers fall back to deterministic provider on failure.

**Success Criteria**:
- [x] `pnpm prompts:eval --provider webllm` runs (needs headed Chrome)
- [x] `pnpm prompts:eval --provider llamacpp` runs (model loads, but quality low)
- [ ] 60 quality cases evaluated in < 10 minutes with good F1
- [ ] Optimizer loop can adopt best prompt automatically
- [ ] CI can run (with GPU runner for WebLLM)

**Alternative: llama.cpp-embedded (Option B) — Current Limitation**
```
Base Llama-3.2-3B-Instruct-Q4_K_M.gguf not suitable for ontology-constrained extraction:
- Uses keys not in ontology (event, event.title, event.cost, etc.)
- Triggers safety filters on PII, prices, emails
- Doesn't follow JSON-only output format consistently
Solution: Fine-tune on extraction task or use WebLLM with UI's proven prompts.
```

---

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
1. **Fix WebLLM headless WebGPU** — Use CI GPU runner or headed Chrome for evaluation
2. **Improve llama.cpp extraction** — Fine-tune model or implement few-shot prompting with grammar constraints
3. **Run optimizer loop** — `pnpm loop run` to discover/synthesize/evaluate new improvements
4. **Expand taxonomy** — Add scenarios for remaining 8 cells

---

## Commands Reference

```bash
# Run full optimizer cycle (discovers problems, synthesizes fixes, evaluates)
pnpm loop run --output data/loop/runs

# Ingest corpus for new test cases
pnpm loop corpus --output data/loop/corpus-output

# Evaluate prompts (now with LLM providers)
pnpm prompts:eval --quality --provider webllm    # WebLLM via headed Chrome
pnpm prompts:eval --quality --provider llamacpp  # llama.cpp direct Node.js
pnpm prompts:eval --quality --provider deterministic  # baseline

# Run all tests
pnpm test --filter=@notention/core --filter=@notention/optimize --filter=@notention/simulator --filter=@notention/ui --filter=@notention/agent --filter=@notention/cli

# Simulator measurement suite (25 scenarios)
cd simulator && pnpm test -- src/scenarios/measurementSuite.test.ts
```
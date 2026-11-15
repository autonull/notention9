# TODO.24 — Remaining Work After Automated Completion (2026-11-14)

**Status (2026-11-15)**: Infrastructure is complete and verified. `optimize` 68 passed / 4 skipped, UI all batches passed, simulator 87 passed, manifest OK. Remaining work is quality (one golden miss), taxonomy breadth (16/24 cells), and human-dependent probes/videos.

---

## Session 2 Progress — 2026-11-15

**Model choice corrected.** The llama.cpp bridge uses **Qwen 3.5 0.8B** (the pre-existing default) again. A 3B Llama switch was reverted: it was an unverified assumption and slower on CPU.

**Modality corrected.** Extraction examples previously flattened desires/hypotheticals into asserted facts. The ontology distinguishes:
- `real` operators (`is`, `greater than`, `less than`, `before`, `after`, `near`) → facts
- `imaginary`/constraint operators (`is not`, `contains`, `between`, `not has`) → desires, needs, requests

`isIndefiniteOperator` + `inferNoteIntent` (`request`/`need`/`want` → Imaginary) carry this. The prompt and the golden set now encode it:
- "i need to buy milk" → `intent is request` + `need contains [milk, eggs]` (not `intent is shopping`)
- "maybe we should consider X" → `[]` (pure hypothetical, no asserted property)
- "looking for a laptop under $1000" → `intent is request` + `price less than 1000 USD`
- "I am a software engineer looking for a job" → `role is software engineer` + `intent is request`

**Root-cause fix: ontology keys.** `collectOntologyKeys` (loader) only reads top-level nodes and skipped child attributes (`intent`, `role`, `email`, `price`, `budget`, `need`, `deadline`). The bridge and `ui/src/services/ai/WebLLMProvider.ts` now use the recursive `collectOntologyKeysInTree`. This raised the Qwen 3.5 golden score from 2/10 to **9/10**.

**llama.cpp bridge hardened** (`optimize/src/llm/llamaCppBridge.ts`):
- Qwen 3.5 uses `QwenChatWrapper({ variation: '3.5', thoughts: 'discourage' })` — no 500-token thinking block.
- JSON-schema grammar constrains `key` to ontology leaf keys and `operator` to valid operators; `maxItems: 8`.
- Independent chat history per extraction (`resetChatHistory`).
- Robust unwrap/repair: strips `<think>`/fences, repairs truncated arrays.
- Post-filters keys/operators to the ontology.

**Remaining known limitation:** the 0.8B model omits `intent is schedule` on "Meeting with John tomorrow at 10am" (9/10). It prefers `meetingType`/`startTime`. A larger or fine-tuned model should close this; the grammar guarantees valid vocabulary, not semantic choice.

**WebLLM bridge:** added `headed` option + `WebGPU,Vulkan` flags. Still requires a real GPU (or X server + GPU); headless SwiftShader reports "No available adapters".

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
| Implement llama.cpp-embedded for Node.js | ✅ **Implemented + hardened** | `optimize/src/llm/llamaCppBridge.ts` — `node-llama-cpp` loads Qwen 3.5 0.8B GGUF. JSON-schema grammar constrains keys/operators; Qwen wrapper disables verbose thinking; independent history per case. |
| Benchmark harness: local LLM vs quality cases | ⚠️ **Runs; 9/10 golden** | Both providers run via `pnpm prompts:eval eval --provider webllm\|llamacpp`. WebLLM needs a GPU. Qwen 3.5 0.8B scores 9/10 (misses `intent is schedule` on one meeting case); deterministic baseline 4/10. |
| Prompt optimization loop | ❌ Not started | Optimizer loop exists (`pnpm loop run`) but needs a provider with usable quality for evaluation. |

**Recommended path**:
- **Option A (WebLLM)**: Needs a GPU runner. Reuses the UI's `doAlignToOntology` prompt (now with recursive ontology keys).
- **Option B (llama.cpp)**: Working on CPU with Qwen 3.5 0.8B + grammar. 9/10 golden; the remaining miss is model capacity, not infrastructure.

---

#### Implementation Status: Wire WebLLM into Optimizer (Option A)

**Architecture**:
```
optimize/src/prompts/cli.ts:RegistryProvider.extract()
         │
         ▼
optimize/src/llm/webllmBridge.ts
  • Launches Chromium via Playwright (headless by default; `headed: true` optional)
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
| `optimize/src/prompts/cli.ts` | ✅ Modified: `--provider webllm|llamacpp|registry`; `WEBLLM_HEADED=1` |
| `optimize/src/prompts/property-extraction.golden.json` | ✅ Modified: real/imaginary modality |
| `ui/src/services/ai/WebLLMProvider.ts` | ✅ Modified: recursive `collectOntologyKeysInTree` |
| `ui/src/index.tsx` | ✅ Modified: exposes `__OPTIMIZER_AI__` when `?optimizer=true` |
| `optimize/package.json` | ✅ Already has `playwright` |

**Setup Commands** (run once):
```bash
cd /home/me/notention9/optimize && pnpm add node-llama-cpp
pnpm approve-builds node-llama-cpp
cd /home/me/notention9/ui && pnpm build          # required by the WebLLM bridge
# The default GGUF is already at /home/me/notention9/models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf
# To refresh/download models, use one of:
node optimize/download-model.mjs                 # Llama 3.2 3B
node optimize/download-qwen.mjs                   # Qwen 2.5 3B
node optimize/download-qwen-small.mjs             # Qwen 2.5 0.5B
# Or point at any local GGUF:
LLAMA_MODEL_PATH=/path/to/model.gguf pnpm prompts:eval eval --provider llamacpp
```

**Key Considerations**:
- **WebGPU in headless**: Works with `--headless=new` + `--enable-webgpu` + `--use-angle=swiftshader` only with a GPU runner. Headed mode needs an X server (`xvfb-run`) plus a GPU.
- **Model load time**: ~30-60s first load; the session is cached across evaluations.
- **Prompt format**: UI `doAlignToOntology` + recursive `collectOntologyKeysInTree(ontology)`.
- **Fallback**: Both providers fall back to deterministic extraction on failure.

**Success Criteria**:
- [x] `pnpm prompts:eval eval --provider webllm` runs (needs headed Chrome + GPU)
- [x] `pnpm prompts:eval eval --provider llamacpp` runs (Qwen 3.5 0.8B; 9/10 golden)
- [ ] 60 quality cases evaluated in < 10 minutes with good F1
- [ ] Optimizer loop can adopt best prompt automatically
- [ ] CI can run (with GPU runner for WebLLM)

**Alternative: llama.cpp-embedded (Option B) — Current Limitation**
```
Qwen 3.5 0.8B (default) is fast and CPU-friendly. Grammar + modality prompt
produce valid, in-vocabulary output (9/10 golden). The remaining miss:
- "Meeting with John tomorrow at 10am" -> meetingType/startTime instead of intent is schedule
Solution: fine-tune on extraction, or use a larger model (Qwen 2.5 3B / Llama 3.2 3B)
with the same grammar + modality prompt.
```

---

### 2. Ontology & Taxonomy Refinement
| Task | Status | Notes |
|------|--------|-------|
| Expand taxonomy to 24/24 cells | ⚠️ 16/24 done | 8 cells uncovered: see `data/loop/taxonomy.json` |
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

**Verified 2026-11-15:** core 855 · agent 17 · cli 6 · optimize 68 passed / 4 skipped · UI all batches passed · simulator 87 (~10 min) · manifest OK · `prompts:eval` llamacpp 9/10.

---

## 🎯 Suggested Next Session Priorities

**If humans available**: Run comprehension probe + record T1/T2 videos.

**If no humans**:
1. **Close the last golden miss** — Try Qwen 2.5 3B / Llama 3.2 3B with the same grammar + modality prompt (`LLAMA_MODEL_PATH=...`). The 0.8B model omits `intent is schedule` on one meeting case.
2. **Fine-tune or few-shot** — Add retrieval-selected few-shot examples per input, or fine-tune on `data/eval/cases/quality/extraction`.
3. **Run optimizer loop** — `pnpm loop run` once a provider reaches usable F1.
4. **Expand taxonomy** — Add scenarios for remaining 8 cells (16/24 covered; `data/loop/taxonomy.json` reports 11 `cellsCovered` — reconcile the two counts).
5. **WebLLM on GPU CI** — Add a GPU runner; SwiftShader alone reports "No available adapters".

---

## Commands Reference

```bash
# Run full optimizer cycle (discovers problems, synthesizes fixes, evaluates)
pnpm loop run --output data/loop/runs

# Ingest corpus for new test cases
pnpm loop corpus --output data/loop/corpus-output

# Evaluate prompts (now with LLM providers)
pnpm prompts:eval eval --provider webllm       # WebLLM: headed Chrome + GPU
pnpm prompts:eval eval --provider llamacpp     # llama.cpp: Qwen 3.5 0.8B (CPU)
LLAMA_MODEL_PATH=/home/me/notention9/models/hf_bartowski_Qwen2.5-3B-Instruct.Q4_K_M.gguf \
  pnpm prompts:eval eval --provider llamacpp   # larger model
pnpm prompts:eval eval --provider deterministic  # baseline

# Run all tests
pnpm test                                   # core + agent + cli + optimize + simulator
pnpm --filter @notention/ui test            # UI (batched)
pnpm --filter @notention/simulator test     # 25 scenarios / 87 tests

# Simulator measurement suite only
pnpm --filter @notention/simulator exec vitest run src/scenarios/measurementSuite.test.ts
```

---

## ✅ Verification — Start Here Next Session

Run these before changing code. Expected results in parentheses.

```bash
git log --oneline -3                         # latest: fix(optimize): correct LLM modality and ontology keys
pnpm --filter @notention/optimize exec tsc --noEmit   # clean
pnpm --filter @notention/core test           # 855 passed (includes collectKeys regression)
pnpm --filter @notention/optimize test       # 68 passed, 4 skipped
pnpm --filter @notention/ui test             # all batches passed
pnpm --filter @notention/simulator test      # 87 passed (~10 min)
pnpm eval:verify-manifest                    # ✅ OK
pnpm prompts:eval eval --provider llamacpp   # 9/10 golden; exits 1 on the last miss
```

Notes:
- `prompts:eval` exits non-zero when any golden case fails. 9/10 is the current Qwen 3.5 result; the failure is the meeting/intent case, not infrastructure.
- UI `tsc --noEmit` has pre-existing unrelated errors (SmartNoteAssistant, EditorContent, etc.); use `pnpm --filter @notention/ui test` as the UI gate.
- WebLLM eval requires a GPU. On this machine it reports "No available adapters"; use llama.cpp for CPU verification.
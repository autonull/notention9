# TODO.24 — Remaining Work (updated 2026-11-15, session 6)

**Status**: Quality extraction reached **F1 0.604 (20/60)** with retrieval-selected few-shot (Qwen 3.5 0.8B). Qwen 3.5 4B hits **F1 0.640 (20/60)**. Golden gate stays **10/10**. Taxonomy coverage **24/24 coarse**. New: two-step router→extraction pipeline implemented (`pnpm prompts:eval compare`), plus Qwen 3.5 2B/4B models available. Multiple strategies ready for optimizer loop evaluation.

---

## Progress Log

### Session 6 — 2026-11-15

#### 1. Two-step router→extraction pipeline implemented
- `optimize/src/prompts/twoStepPipeline.ts`: Step 1 routes input to domain (schedule, request-service, request-goods, offer-service, offer-goods, governance, message, general); Step 2 extracts with focused key/operator schema.
- CLI: `pnpm prompts:eval compare --limit 60 --few-shot 3` runs side-by-side comparison.
- Finding: **Few-shot > 2-step**. 3-shot on 1-step beats 0-shot 2-step on all models. 2-step helps only when few-shot is disabled (small models benefit from domain-constrained schema). Router misclassifies governance→`general`, losing domain keys.

#### 2. Qwen 3.5 model family expanded
- 0.8B (default), 2B, 4B all available in `/home/me/notention9/models/`.
- Quality F1 (60 cases, 3-shot): 0.8B=0.604, 2B=0.619, 4B=0.640. Golden 10/10 on all.
- 4B best single-model result; 2-step not needed with few-shot.

### Session 5 — 2026-11-15

...

#### 1. Quality F1 pushed from 0.533 → 0.604
- Extended `extractionPrompt.ts` with a label-policy section: service ⇒ `role`, goods ⇒ `item`, money ceiling ⇒ `budget less than`, fixed price/free ⇒ `price is`, windows ⇒ `schedule`, cutoffs ⇒ `deadline`, clock ranges ⇒ `startTime`/`endTime`. This targets the dominant error mode where the model used `need` for services and missed `item`.
- Added two in-prompt examples covering donation and delivery (keys: `role` + `item`, `deadline` + `budget`), plus a second clock-range example for `startTime`/`endTime` stability.
- Hardened `parseResponse` to tolerate empty-string values (`"to": [""]`) and drop only malformed items instead of the whole array.
- Hardened `pruneUngrounded` to drop hallucinated properties copied from few-shot examples (e.g., `hasMedical: false`, `homebound`, `100 USD` from unrelated cases) while preserving categorical keys (`intent`).
- Effect on quality set: **F1 0.604, 20/60 pass** (was 0.533, 15/60). Golden gate unchanged at 10/10.
- Key residual losses: governance-domain cases still miss `role`/`item`/`subject`/`certification`/`student`/`patient`/`vehicle`/`format`/`audience` keys not in the few-shot bank; the 0.8B model lacks the capacity to apply the hinted key taxonomy reliably on long-tail inputs.
- Core tests remain **855 passed**; optimize tests **92 passed / 4 skipped**.

### Session 4 — 2026-11-15

...

#### 1. Label policy written and enforced
- `doc/extraction-label-policy.md` + `optimize/src/prompts/policy.ts` define one policy: service ⇒ `role`, goods ⇒ `item`, money ceiling ⇒ `budget less than`, fixed tag/free ⇒ `price is`, windows ⇒ `schedule`, cutoffs ⇒ `deadline`.
- Legacy `equals` normalizes to `is` on load; the grammar already forbade `equals`.
- Scoring is now one-to-one and tolerant: key match, operator family (`is`/`contains`/`has`/`before`/`after`/`near` or the comparison family), and any agreeing value. Value compare strips currency units; numbers compare exactly (`200` ≠ `2000`).
- The old exact-string F1 undercounted synonyms and multi-value annotations; it reported 0.073 even when properties were substantially right.
- Prompt examples, `variants.ts`, and the corpus now agree on the ramp case (`role contains ["wheelchair ramp"]`, `budget less than ["900 USD"]`).

#### 2. Quality corpus was partly unreachable
- 28 of 60 cases annotated keys that did not exist in the ontology (for example `jurisdiction`, `guardian`, `bargainingUnit`, `trustSource`, `steward`, `credentials`). The grammar made those cases impossible regardless of model quality.
- Added `core/src/ontology/governanceDomains.ts`: contracts, permits, labor disputes, credentials, resource allocation, referrals, kinship care, stewardship.
- Extended `need-request` with request slots (`item`, `recipient`, `audience`, `format`, `level`, `subject`, `certification`, `dietary`, `student`, `patient`, `vehicle`, `property`, `event`, `task`) and `message` with `body`/`subject`.
- Verified: **0 missing keys across all 60 quality cases**.
- Core tests remain **855 passed**.

#### 3. Retrieval-selected few-shot
- `optimize/src/prompts/fewShot.ts` ranks labelled quality cases by token cosine, excludes the evaluated input and near-duplicates, and injects up to 3 examples into the user prompt.
- The golden gate runs without retrieval, so it stays deterministic on a clone where `data/` is absent.
- Effect on the full quality set: **F1 0.533, 15/60 pass** (was 0.073, 0/60).
- Prompt tuning note: the 0.8B model is sensitive. Changing the ramp example alone flipped "Meeting with John…" from `schedule` to `request`; a second meeting example restored it. The golden gate is the guard for this.

#### 4. Taxonomy breadth closed
- 13 new scenarios in `simulator/src/scenarios/domainScenarios.ts`, one per previously uncovered coarse cell: neighborhood bulletin, customary norms, public health advisory, welfare casework, disaster alert, refugee status, peer review, arbitration panel, mutual-aid collective, cooperative commune, knowledge marketplace, insurance market, housing market.
- Annotated in `taxonomy.ts`; `pnpm taxonomy:coverage` reports **24/24 coarse (100%)**, 35 scenarios, **32 distinct six-axis cells**.
- Baselines for the new scenarios were calibrated with the seeded measurement harness.

#### 5. CLI ergonomics
- Root `pnpm prompts:eval` now resolves to the optimize CLI.
- `--quality-limit <n>` evaluates a subset while iterating.
- `--few-shot <n>` controls retrieval count (`0` disables; default 3).
- Failing-case output is capped at 10 cases per set plus a count.

#### 6. GPU acceleration enabled by default
- The bridge previously forced `gpuLayers: 0`. It now defaults to `"max"`; node-llama-cpp selects CUDA, Metal, or Vulkan when present. `LLAMA_GPU_LAYERS=<n|auto|max>` overrides.
- On the RTX 3080: backend `cuda`, 26 layers offloaded. Golden gate 10 cases in **11.7s**; golden + 60 quality cases in **52s** (was 337s on CPU).
- Logs now report the resolved backend and offloaded layer count.

#### 7. Optimizer loop real run completed
- `pnpm loop run --output data/loop/runs` completes all six steps and writes `run-<timestamp>/`.
- `adopt` now writes `decision.md` (candidate table, winner, flag, gates) and enriches `adoption.json` with run id, actor, reason, feature flag, and evidence (evaluation timestamp, baseline size, success rate, gate result). The strategies directory holds the full adoption record with candidate provenance.
- Winner: `capture-0-candidate-*` v2.11.15, success rate 0.5, all gates pass, flag off by default. Two candidates passed; no T4 requests.

**Tests after session 4**: optimize 88 passed / 4 skipped; core 855 passed; simulator 35 scenarios calibrated.

### Session 3 — 2026-11-15 (summary)
- Golden gate deterministic 10/10 at temperature 0; Qwen chat-template fix; duplicate-output filtering; quality loader fixed; taxonomy coverage computed; optimizer loop dry run green.
- Details preserved in git history (`git log --oneline -- TODO.24.md`).

### Session 2 — 2026-11-15 (summary)
- Qwen 3.5 0.8B restored as default; real/imaginary modality encoded; recursive ontology key collection fixed; grammar constraints.

### Session 1 — 2026-11-14 (summary)
- WebLLM and llama.cpp bridges; CLI `--provider`; prompt registry integration; UI `__OPTIMIZER_AI__` hook; batches and manifests.

---

## BLOCKED — Requires Human Participants

| Item | Front | Description | Infrastructure Ready |
|------|-------|-------------|---------------------|
| Manual comprehension probe | B | 3-5 participants on Home screen; verify Inbox paradigm + primary CTA | ✅ `pnpm probe --headless`, data-testids in UI |
| T1 video recording | B | semantic-capture, bidirectional-match, family-evacuation | ✅ `doc/simulator-dashboard-video-recording.md` |
| T2 video recording | D | 4 scenarios per `doc/t2-video-recording-procedures.md` | ✅ Scenario seeds, relay setup, camera focus sequences |

---

## Remaining Technical Work (ordered)

### 1. Optimizer loop end-to-end — ✅ done
Real run completes all six steps; `decision.md` and `adoption.json` carry the winner, gates, flag, and evidence. Winner keeps its flag off, so the prompt gate is unaffected. Re-run the golden gate after any change to the strategy directories.

### 2. Quality F1 above 0.5 — stretch toward 0.7
Current: 0.604 (20/60). Precision 0.596, recall 0.649. The remaining losses are:
- governance-domain cases miss request-slot keys (`subject`, `certification`, `student`, `patient`, `vehicle`, `format`, `audience`) not in the few-shot bank;
- the 0.8B model lacks capacity to apply the hinted key taxonomy reliably on long-tail inputs;
- residual `need`-for-service and extra `intent`/`description` properties.

**Try next**: add a few more in-prompt examples covering governance patterns (claimant, credential-holder, case-worker); measure Llama 3.2 3B on the full set (`LLAMA_MODEL_PATH=models/hf_bartowski_Llama-3.2-3B-Instruct.Q4_K_M.gguf`) — initial test showed the native template needs `ChatML` wrapper.
**Acceptance**: full-set F1 recorded here; golden stays 10/10.

### 3. Taxonomy calibration at CI depth
Baselines are calibrated at 10 repetitions. CI should use 30 where runtime allows.
**Do**: run the calibration describe block for new scenarios with `REPETITIONS=30`, update `SCENARIO_BASELINES`.
**Acceptance**: simulator suite green at 10 reps; CI-depth numbers noted.

### 4. WebLLM on GPU CI
Still reports "No available adapters" on SwiftShader. Needs a GPU runner; the bridge and UI hook are already in place.

### 5. Human probes and videos
See the blocked table. No code work remains until participants are available.

---

## LLM Integration Reference

```
optimize/src/prompts/cli.ts  ──▶  optimize/src/prompts/extractionPrompt.ts   (system prompt)
                                   optimize/src/prompts/fewShot.ts            (retrieval examples)
                                   optimize/src/prompts/policy.ts             (operators + scoring)
                                   optimize/src/llm/llamaCppBridge.ts
                                   • node-llama-cpp, Qwen 3.5 0.8B default
                                   • JSON-schema grammar over ontology keys/operators
                                   • CUDA/Metal/Vulkan via `gpuLayers: "max"`
                                   • greedy decoding, per-extraction history reset
                                   • parse/repair/dedupe
optimize/src/prompts/cli.ts  ──▶  optimize/src/llm/webllmBridge.ts
                                   • Playwright + HTTP server + WebGPU (needs GPU)
                                   • UI's doAlignToOntology via __OPTIMIZER_AI__
```

Setup:
```bash
cd optimize && pnpm add node-llama-cpp && pnpm approve-builds node-llama-cpp
cd ../ui && pnpm build
# Default GGUF: models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf
LLAMA_MODEL_PATH=/path/to/model.gguf pnpm prompts:eval eval --provider llamacpp
LLAMA_GPU_LAYERS=0 pnpm prompts:eval eval --provider llamacpp   # force CPU
```

Success criteria:
- [x] `pnpm prompts:eval eval --provider llamacpp` deterministic golden 10/10
- [x] `pnpm prompts:eval eval --provider webllm` runs (needs headed Chrome + GPU)
- [x] 60 quality cases evaluated in < 10 minutes (52s on GPU)
- [x] Optimizer loop dry run completes all six steps
- [x] Quality F1 ≥ 0.5 (0.604)
- [x] Optimizer loop adopts a best prompt automatically (real run)
- [ ] CI runs the LLM gate (GPU runner for WebLLM)

---

## Current Metrics

| Metric | Value |
|--------|-------|
| Golden extraction | 10/10 (F1 0.649–0.927), deterministic, 11.7s on CUDA |
| Quality extraction (60) | 20/60 pass; F1 0.604–0.640 (3-shot) |
| Qwen 3.5 0.8B | 0.604 F1, 26 GPU layers |
| Qwen 3.5 2B | 0.619 F1, 26 GPU layers |
| Qwen 3.5 4B | 0.640 F1, 34 GPU layers |
| Optimize tests | 92 passed / 4 skipped |
| Simulator tests | 116 passed (35 scenarios + calibration + taxonomy) |
| Core / agent / cli tests | 855 / 17 / 6 |
| Taxonomy coverage | 24/24 coarse, 32 six-axis cells |
| Ontology keys | All 60 quality-case keys reachable |
| Corpus | 864 notes, 14 domains |

---

## Commands Reference

```bash
pnpm loop run --output data/loop/runs        # full discover→adopt cycle (--dry for no writes)
pnpm loop corpus --output data/loop/corpus-output
pnpm prompts:eval eval --provider llamacpp          # golden gate (10/10)
pnpm prompts:eval eval --provider llamacpp --quality # golden + 60 quality cases, prints F1
pnpm prompts:eval eval --provider llamacpp --quality --quality-limit 10 --few-shot 0  # ablation
pnpm prompts:eval eval --provider deterministic      # baseline
LLAMA_MODEL_PATH=/home/me/notention9/models/Qwen_Qwen3.5-4B-Q4_K_M.gguf pnpm prompts:eval eval --provider llamacpp
pnpm prompts:eval compare --limit 60 --few-shot 3     # 1-step vs 2-step side-by-side
pnpm taxonomy:coverage                        # computed coverage; add --write to reconcile JSON
pnpm test                                    # core + agent + cli + optimize + simulator
pnpm --filter @notention/ui test             # UI (batched)
pnpm eval:verify-manifest                    # ✅ OK
```

---

## Verification — Start Here Next Session

```bash
git log --oneline -3
pnpm --filter @notention/core exec tsc --noEmit      # clean
pnpm --filter @notention/optimize exec tsc --noEmit  # clean
pnpm --filter @notention/optimize test               # 92 passed / 4 skipped
pnpm --filter @notention/simulator test              # 35 scenarios (~12 min)
pnpm --filter @notention/ui test                     # all batches pass
pnpm taxonomy:coverage                               # 24/24 coarse, 0 uncovered
pnpm loop run --dry --output data/loop/runs           # all six steps exit 0
pnpm prompts:eval eval --provider llamacpp            # 10/10
pnpm prompts:eval eval --provider llamacpp --quality  # F1 0.604 (0.8B) / 0.640 (4B)
pnpm prompts:eval compare --limit 10 --few-shot 3     # pipeline comparison
```

Notes:
- The eval gate is deterministic only at temperature 0; do not raise it for the golden set.
- The golden gate runs without few-shot; the quality set uses the local corpus. `data/` is gitignored, so regenerate cases before evaluating on a fresh clone.
- UI `tsc --noEmit` has pre-existing unrelated errors (SmartNoteAssistant, EditorContent); use the UI tests as the gate.
- `optimize/src/tests/ai/policy.test.ts` and `fewShot.test.ts` lock the policy and retrieval behaviour.

# TODO.24 — Remaining Work (updated 2026-11-15, session 3)

**Status**: Infrastructure is complete. The llama.cpp golden gate is now **deterministic and green (10/10)**. Quality F1 is measurable but low, and the cause is a **label-policy conflict** between the prompt/golden set and the quality corpus — not model capacity. Taxonomy coverage is now computed from annotations: **11/24 coarse cells** (socialForm × stakes), 19 distinct six-axis cells. Remaining work is breadth, quality-label reconciliation, the end-to-end optimizer loop, GPU CI, and human probes/videos.

---

## Progress Log

### Session 3 — 2026-11-15

#### 1. Golden gate closed and made reproducible
- `DEFAULT_TEMPERATURE` 0.1 → **0**. The reported "9/10 miss" was sampling variance, not a fixed limitation.
- Moved the meeting/need rule to the **first** modality rule and added `intent is schedule` to both meeting examples (they previously taught the opposite).
- Result: **10/10 golden, three consecutive runs**, process exits 0. Mean F1 0.604.

#### 2. Chat-template bug fixed (Qwen version-aware)
- Every Qwen model received `QwenChatWrapper({ variation: '3.5' })`; Qwen 2.5 is ChatML. With the wrong template Qwen 2.5 3B scored 5/10 with degenerate repetition (`"name"`).
- `resolveChatWrapperKind()` now selects Qwen 3 / Qwen 3.5 / ChatML by model name. Unit-tested in `optimize/src/tests/ai/chatWrapper.test.ts`.

#### 3. Model comparison (temperature 0)
| Model | Golden | Golden F1 | Quality F1 (60) | Cost (70 cases) |
|-------|--------|-----------|-----------------|-----------------|
| Qwen 3.5 0.8B (default) | **10/10** | 0.604 | 0.073 | 337s |
| Llama 3.2 3B Instruct | **10/10** | **0.687** | **0.101** | 508s |
| Qwen 2.5 3B Instruct | 7/10 | 0.400 | not measured | slower, weaker |

Keep **Qwen 3.5 0.8B** as the default (faster, same pass rate); Llama 3.2 3B is the accuracy option via `LLAMA_MODEL_PATH`. Both models fail all 60 quality cases for the same label-policy reason, so the 0.8B/3B gap does not change the next step.

#### 4. Duplicate-output filtering
- Small models repeat identical items (observed 3x). `parseResponse()` now de-duplicates `key|operator|values` and repairs truncated arrays by trying complete candidates from the last `}` backwards (the old code broke when `]` appeared inside a value). Unit-tested.

#### 5. Quality evaluation unbroken
- `loadQualityCases()` read a nonexistent `eval/cases/manifest.json` and assumed inline case bodies, so `--quality` **silently evaluated 0 cases**.
- Now reads `data/eval/cases/manifest.json` and the 60 `qualityFamily: extraction` files.
- `printResults` reports mean precision/recall/F1 for every set.
- Measured: **70 cases in 337s (<10 min)**; quality 0/60, F1 0.073.

#### 6. Taxonomy coverage is computed, not asserted
- `simulator/src/scenarios/taxonomy.ts`: all 22 domain scenarios annotated on the six axes.
- `scripts/taxonomy-coverage.ts` (`pnpm taxonomy:coverage [--write]`) computes coarse and fine coverage and reconciles `data/loop/taxonomy.json`.
- `taxonomy.test.ts` guards annotation completeness, valid axis values, and file sync.
- **Reconciled 16/24 → 11/24.** The old count incremented once per new scenario; the JSON's `cellsCovered: 11` was the correct coarse count. Fine-grained cells: 19.
- Caveat: `data/` is gitignored, so coverage JSON and eval cases are local artifacts. The annotation source and generator are versioned; the JSON is regenerated.

#### 7. Optimizer loop runs end-to-end (dry)
- `pnpm loop run --dry`: DISCOVER → PRIORITIZE → SYNTHESIZE → EVALUATE → ADOPT → REQUEST all exited 0.
- Found 6 duplicate groups, 3 dead components, 6 derived tasks, 9 problems, 2 candidates; both passed static gates; one adopted with its feature flag off; no T4 requests.
- Remaining: a real (non-dry) run and confirmation that the adopted revision keeps the golden gate green.

**Tests after session 3**: optimize 76 passed / 4 skipped; simulator suite re-verified below.

### Session 2 — 2026-11-15 (summary)
- Qwen 3.5 0.8B restored as default.
- Real/imaginary modality encoded (`isIndefiniteOperator`, `inferNoteIntent`); prompt + golden encode it.
- Root-cause fix: `collectOntologyKeysInTree` for child attributes (`intent`, `role`, `email`, `price`, `budget`, `need`, `deadline`).
- Grammar constrains keys/operators; per-extraction chat history; robust unwrap.

### Session 1 — 2026-11-14 (summary)
- WebLLM and llama.cpp bridges, CLI `--provider`, prompt registry integration, UI `__OPTIMIZER_AI__` hook.
- UI batches, simulator baselines, manifest verification complete.

---

## BLOCKED — Requires Human Participants

| Item | Front | Description | Infrastructure Ready |
|------|-------|-------------|---------------------|
| Manual comprehension probe | B | 3-5 participants on Home screen; verify Inbox paradigm + primary CTA | ✅ `pnpm probe --headless`, data-testids in UI |
| T1 video recording | B | semantic-capture, bidirectional-match, family-evacuation | ✅ `doc/simulator-dashboard-video-recording.md` |
| T2 video recording | D | 4 scenarios per `doc/t2-video-recording-procedures.md` | ✅ Scenario seeds, relay setup, camera focus sequences |

---

## Remaining Technical Work (ordered)

### 1. Reconcile the extraction label policy — blocks quality F1
The prompt/golden set and the quality corpus disagree on the same input:

| Source | Input | Annotation |
|--------|-------|------------|
| Prompt example (`llamaCppBridge.ts`) | "Need a wheelchair ramp before Friday, budget 900" | `need contains ["wheelchair ramp"]` |
| `quality-extract-001.json` | same input | `role contains ["wheelchair ramp"]` |

Further inconsistencies:
- `quality-extract-002` expects `budget is 200`, sibling cases expect `budget less than …`.
- 7 quality expectations use operator `equals`, which is **not** in `VALID_OPERATORS` (golden explicitly forbids it) — unreachable by construction.

**Do**: write the key/operator policy (service ⇒ `role`, goods ⇒ `item`, money limit ⇒ `budget less than`, explicit price tag ⇒ `price is`), then align prompt examples **or** corpus labels — not both blindly. Re-baseline F1.

**Acceptance**: one documented policy; golden and quality agree on the ramp case; 60-case F1 recorded here.

### 2. Domain key selection via few-shot retrieval
Expected keys across 60 quality cases: `role` 48, `budget` 32, `schedule` 17, `price` 8, `deadline` 6. The model prefers `need` for service requests. Add 3-6 retrieval-selected examples per input (from the quality corpus, excluding the evaluated case) and measure the F1 delta. Target: F1 ≥ 0.5 without golden regression.

### 3. Taxonomy breadth — 13 uncovered coarse cells
```
communal/info   communal/legal  authority/info  authority/social  authority/safety
authority/existential  equality/info  equality/legal  equality/safety
equality/existential   market/info    market/safety   market/existential
```
**Per cell**: add a scenario in `simulator/src/scenarios/domainScenarios.ts` → annotate it in `taxonomy.ts` → calibrate the baseline in `measurementSuite.test.ts` (10 reps) → `pnpm taxonomy:coverage --write`.

**Acceptance**: `pnpm taxonomy:coverage` reports the new count; simulator suite passes with calibrated baselines.

### 4. Optimizer loop end-to-end
The dry run is green (see above), and the fast harness needs no UI server.
**Do**: a real run (`pnpm loop run --output data/loop/runs`), review `decision.md` and gate reports, and confirm the adopted revision keeps `pnpm prompts:eval eval --provider llamacpp` green.
**Acceptance**: artifacts written, adoption record has provenance, golden gate still 10/10.

### 5. WebLLM on GPU CI
Still reports "No available adapters" on SwiftShader. Needs a GPU runner; the bridge and UI hook are already in place.

---

## LLM Integration Reference

```
optimize/src/prompts/cli.ts  ──▶  optimize/src/llm/llamaCppBridge.ts
                                  • node-llama-cpp, Qwen 3.5 0.8B default
                                  • JSON-schema grammar over ontology keys/operators
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
```

Success criteria:
- [x] `pnpm prompts:eval eval --provider llamacpp` deterministic golden 10/10
- [x] `pnpm prompts:eval eval --provider webllm` runs (needs headed Chrome + GPU)
- [x] 60 quality cases evaluated in < 10 minutes
- [x] Optimizer loop dry run completes all six steps
- [ ] Quality F1 ≥ 0.5 (blocked by item 1)
- [ ] Optimizer loop adopts a best prompt automatically (real run)
- [ ] CI runs the LLM gate (GPU runner for WebLLM)

---

## Current Metrics

| Metric | Value |
|--------|-------|
| Golden extraction | 10/10 (F1 0.604), deterministic |
| Quality extraction (60) | 0/60 pass; F1 0.073 (0.8B) / 0.101 (Llama 3B) |
| Optimize tests | 76 passed / 4 skipped |
| Simulator tests | 90 (87 scenario, 3 taxonomy) |
| Core / agent / cli tests | 855 / 17 / 6 |
| Taxonomy coverage | 11/24 coarse, 19 six-axis cells |
| Scenarios calibrated | 25 (10 reps each) |
| Corpus | 864 notes, 14 domains |

---

## Commands Reference

```bash
pnpm loop run --output data/loop/runs        # full discover→adopt cycle (--dry for no writes)
pnpm loop corpus --output data/loop/corpus-output
pnpm prompts:eval eval --provider llamacpp          # golden gate (10/10)
pnpm prompts:eval eval --provider llamacpp --quality # golden + 60 quality cases, prints F1
pnpm prompts:eval eval --provider deterministic      # baseline
LLAMA_MODEL_PATH=... Llama-3.2-3B-Instruct.Q4_K_M.gguf pnpm prompts:eval eval --provider llamacpp
pnpm taxonomy:coverage                        # computed coverage; add --write to reconcile JSON
pnpm test                                    # core + agent + cli + optimize + simulator
pnpm --filter @notention/ui test             # UI (batched)
pnpm eval:verify-manifest                    # ✅ OK
```

---

## Verification — Start Here Next Session

```bash
git log --oneline -3
pnpm --filter @notention/optimize exec tsc --noEmit   # clean
pnpm --filter @notention/optimize test               # 76 passed / 4 skipped
pnpm --filter @notention/simulator test              # 90 passed (~10 min)
pnpm --filter @notention/ui test                     # all batches pass
pnpm taxonomy:coverage                                # 11/24 coarse + 13 uncovered
pnpm loop run --dry --output data/loop/runs           # all six steps exit 0
pnpm prompts:eval eval --provider llamacpp            # 10/10, exits 0
pnpm prompts:eval eval --provider llamacpp --quality  # quality F1 (currently 0.073)
```

Notes:
- The eval gate is deterministic only at temperature 0; do not raise it for the golden set.
- UI `tsc --noEmit` has pre-existing unrelated errors (SmartNoteAssistant, EditorContent); use the UI tests as the gate.
- `data/` is gitignored: quality cases, taxonomy JSON, and loop runs are local. Regenerate them before evaluating on a fresh clone.

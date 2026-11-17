# Evaluation How-To

Guide to Notention's evaluation system: golden gate, quality extraction, quality match, taxonomy coverage, and canary.

---

## Overview

| Gate | Purpose | Cases | Pass Threshold | Command |
|------|---------|-------|----------------|---------|
| **Golden** | Regression (deterministic) | 10 | 10/10 | `pnpm prompts:eval eval` |
| **Quality Extraction** | LLM extraction F1 | 60 | — | `pnpm prompts:eval eval --quality` |
| **Quality Match** | End-to-end match F1 | 22 | Mean F1 ≥ 0.5 | `pnpm optimize eval:match` |
| **Taxonomy** | Ontology coverage | 24 cells | 100% | `pnpm taxonomy:coverage` |
| **Canary** | All gates combined | 10+60+22+24 | All pass | `pnpm optimize eval:canary` |

---

## 1. Golden Gate (Deterministic Regression)

**What**: 10 hand-crafted input→expected pairs. Runs with `DeterministicProvider` (no LLM).

**File**: `optimize/src/prompts/property-extraction.golden.json`

```json
[
  {
    "name": "basic-person",
    "input": "John is a developer",
    "expected": [{"key": "role", "operator": "contains", "values": ["developer"]}],
    "forbidden": [],
    "expectedOutcome": "suggested"
  }
]
```

**Run**:
```bash
# Deterministic (fast, CI-safe)
pnpm prompts:eval eval

# With LLM (measures quality regression)
LLAMA_MODEL_PATH=models/your-model.gguf pnpm prompts:eval eval --provider llamacpp
```

**Pass**: All 10 cases have `missing=0`, `extra=0`, no `forbidden` matches.

---

## 2. Quality Extraction (LLM Quality)

**What**: 60 real-world cases with expected properties. Measures F1, precision, recall, ECE.

**Files**: `data/eval/cases/quality/extraction/*.json` (referenced by `manifest.json`)

```json
{
  "input": "Need a plumber by Tuesday, budget $200-300",
  "expected": [
    {"key": "role", "operator": "contains", "values": ["plumber"]},
    {"key": "deadline", "operator": "before", "values": ["Tuesday"]},
    {"key": "budget", "operator": "less than", "values": ["300 USD"]},
    {"key": "budget", "operator": "greater than", "values": ["200 USD"]}
  ],
  "forbidden": [],
  "expectedOutcome": "suggested"
}
```

**Run**:
```bash
# Full quality eval (3 reps per case, few-shot)
LLAMA_MODEL_PATH=models/your-model.gguf pnpm prompts:eval eval --quality --repetitions 3

# Ablation study (compare prompt variants)
LLAMA_MODEL_PATH=models/your-model.gguf pnpm prompts:eval ablation --repetitions 3
```

**Metrics**:
- **F1**: Harmonic mean of precision/recall per case, macro-averaged
- **ECE**: Expected Calibration Error (confidence vs accuracy)
- **Pass**: `missing=0 && extra=0` (strict)

---

## 3. Quality Match (End-to-End)

**What**: 22 request notes matched against a corpus of 44 offer notes (2 per case). Full pipeline: extraction → matching → scoring.

**Files**: `data/eval/cases/quality/match/*.json`

**Run**:
```bash
pnpm optimize eval:match
```

**Output**: Per-case precision/recall/F1 + macro averages. JSON report at `data/eval/match/match-<timestamp>.json`.

**Pass**: Mean F1 ≥ 0.5 (configurable in `EvalMatchCommand`).

---

## 4. Taxonomy Coverage

**What**: Verifies all 24 coarse ontology cells (socialForm × stakes) have at least one quality case.

**Run**:
```bash
pnpm taxonomy:coverage
```

**Output**: `24/24 (100%)` or lists uncovered cells.

**Source**: `simulator/src/scenarios/taxonomy.ts` → `computeCoverage()`

---

## 5. Eval Canary (All Gates)

**What**: Single command runs all four gates, writes timestamped report, exits non-zero on any failure.

**Run**:
```bash
# Full canary (deterministic provider, fast)
pnpm optimize eval:canary

# With LLM (measures actual quality)
LLAMA_MODEL_PATH=models/your-model.gguf pnpm optimize eval:canary --provider llamacpp

# Subset
pnpm optimize eval:canary --golden-only
pnpm optimize eval:canary --quality-only
pnpm optimize eval:canary --match-only
pnpm optimize eval:canary --taxonomy-only
```

**Report**: `data/eval/canary/canary-<timestamp>.json`

```json
{
  "timestamp": "2026-11-17T13:51:17.643Z",
  "golden": {"passed": 10, "total": 10, "cases": [...]},
  "qualityExtraction": {"passed": 35, "total": 60, "meanF1": 0.72, "cases": [...]},
  "qualityMatch": {"passed": 12, "total": 22, "cases": [...]},
  "taxonomy": {"covered": 24, "total": 24, "percent": 100, "uncovered": []},
  "overallPass": true
}
```

**CI Integration**:
```bash
# Exits 0 on pass, 1 on fail
pnpm optimize eval:canary && echo "✅ All gates passed"
```

---

## 6. Adding a Test Case

### Golden Case
1. Edit `optimize/src/prompts/property-extraction.golden.json`
2. Add object with `name`, `input`, `expected`, `forbidden`, `expectedOutcome`
3. Run `pnpm prompts:eval eval` — must pass

### Quality Extraction Case
1. Create `data/eval/cases/quality/extraction/my-case.json`
2. Add entry to `data/eval/cases/manifest.json`:
   ```json
   {
     "id": "my-case",
     "path": "quality/extraction/my-case.json",
     "qualityFamily": "extraction"
   }
   ```
3. Run `pnpm eval:verify-manifest` — validates structure
4. Run `pnpm prompts:eval eval --quality` — measures F1

### Quality Match Case
1. Create request case in `data/eval/cases/quality/match/`
2. Create 2 offer cases referenced by `noteIds`
3. Add to manifest with `qualityFamily: "match"`
4. Run `pnpm optimize eval:match`

---

## 7. Reading F1 / ECE

### F1 (per case)
```
Precision = TP / (TP + FP)    — of extracted, how many correct?
Recall    = TP / (TP + FN)    — of expected, how many found?
F1        = 2 * P * R / (P + R)
```
- **Macro F1**: Average F1 across all cases (equal weight per case)
- **Micro F1**: Global TP/FP/FN across all cases (weighted by case size)

### ECE (Expected Calibration Error)
```
ECE = Σ (|accuracy(bin) - confidence(bin)| * weight(bin))
```
- Bins predictions by confidence (e.g., 0.0-0.1, 0.1-0.2, ...)
- **ECE < 0.05**: Well calibrated
- **ECE 0.05-0.15**: Moderately calibrated
- **ECE > 0.15**: Poorly calibrated (confidence doesn't match accuracy)

Run: `pnpm optimize eval:confidence` — reports ECE per extraction stage.

---

## 8. Model Matrix (Automated)

```bash
# Runs golden + quality across all models in models/
pnpm prompts:eval matrix

# Custom models
pnpm prompts:eval matrix --models "models/a.gguf,models/b.gguf"

# Limit quality cases for speed
pnpm prompts:eval matrix --quality-limit 20
```

**Output**: `data/eval/matrix-<timestamp>.json` + console table.

---

## 9. Continuous Integration

```yaml
# .github/workflows/eval.yml
- name: Eval Canary
  run: pnpm optimize eval:canary

- name: Taxonomy Coverage
  run: pnpm taxonomy:coverage

- name: Eval Manifest Valid
  run: pnpm eval:verify-manifest
```

**All gates must pass** for merge. Canary runs deterministic provider (no model download) in ~10s.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Golden 3/10 pass | Model fallback to deterministic | Check `LLAMA_MODEL_PATH`, GPU memory |
| Quality F1 0.15 | Few-shot retrieval not working | Verify `manifest.json` paths exist |
| Match 0% | Corpus notes not loaded | Check `QUALITY_CASE_NOTES` in evalMatch.ts |
| Taxonomy < 100% | Missing quality cases for cell | Add cases covering uncovered socialForm×stakes |
| Canary timeout | LLM too slow | Use `--golden-only` for CI; run quality separately |

---

*Last updated: 2026-11-17 — Notention TODO.25 W9.4*
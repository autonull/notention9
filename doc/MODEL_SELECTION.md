# Model Selection Guide

Reference for choosing a local GGUF model. All models run via `llama.cpp` (embedded or server mode).

---

## Quick Recommendation

| Use Case | Model | Command |
|----------|-------|---------|
| **Default (recommended)** | Qwen 3.5 2B Q4_K_M | `LLAMA_MODEL_PATH=models/Qwen_Qwen3.5-2B-Q4_K_M.gguf` |
| Low VRAM (< 3 GB) | Qwen 3.5 0.8B Q4_K_M | `LLAMA_MODEL_PATH=models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf` |
| Higher quality, 6+ GB VRAM | Qwen 3.5 4B Q4_K_M | `LLAMA_MODEL_PATH=models/Qwen_Qwen3.5-4B-Q4_K_M.gguf` |
| Maximum quality, 10 GB VRAM | Qwen 3.5 9B Q4_K_M | `LLAMA_MODEL_PATH=models/Qwen_Qwen3.5-9B-Q4_K_M.gguf` |
| CPU only | Any above + `LLAMA_GPU_LAYERS=0` | |

---

## Model Matrix (RTX 3080 10 GB, Q4_K_M, 4k context)

| Model | Params | GGUF Size | VRAM | Golden Gate (10/10) | Quality F1 (60 cases) | Quality Pass Rate | Latency p50 | Latency p95 | Grammar |
|-------|--------|-----------|------|---------------------|----------------------|-------------------|-------------|-------------|---------|
| Qwen 3.5 0.8B | 0.8B | 0.6 GB | ~1.5 GB | ✅ 10/10 | 0.674 | 50% | ~120 ms | ~280 ms | ✅ |
| **Qwen 3.5 2B** | **2B** | **1.4 GB** | **~2.5 GB** | **✅ 10/10** | **0.784** | **55.7%** | **~180 ms** | **~420 ms** | **✅** |
| Qwen 3.5 4B | 4B | 3.0 GB | ~4.5 GB | ❌ 3/10* | — | — | — | — | ✅ |
| Llama 3.2 3B | 3B | 2.0 GB | ~3.5 GB | ✅ 10/10 | 0.872 | 28.6% | ~220 ms | ~500 ms | ✅ |
| Qwen 3.5 9B | 9B | 5.5 GB | ~6.5 GB | — | — | — | ~450 ms | ~1.2 s | ✅ |
| Gemma 4 4B | 4B | 2.5 GB | ~3.5 GB | — | — | — | ~200 ms | ~480 ms | ✅ |

\* **Qwen 3.5 4B regression**: Falls back to deterministic extraction (grammar parse failures). Under investigation.

**Key**:
- **Golden Gate**: 10 deterministic regression cases (must pass 10/10)
- **Quality F1**: Macro F1 across 60 extraction cases (3-shot, few-shot retrieval)
- **Quality Pass Rate**: % of cases with perfect extraction (missing=0, extra=0)
- **Grammar**: Constrained JSON grammar generation supported

---

## VRAM Budget Breakdown (Q4_K_M)

```
Model weights:     params * 0.5 bytes (Q4) + overhead
KV cache (4k):     layers * 2 * heads * head_dim * 4k * 2 bytes (fp16)
Context overhead:  ~200-500 MB
---------------------
Total ≈ model_size * 1.3 + 0.5 GB
```

| Model | Weights | KV Cache (4k) | Total Est. |
|-------|---------|---------------|------------|
| 0.8B  | 0.6 GB  | 0.4 GB        | ~1.5 GB    |
| 2B    | 1.4 GB  | 0.5 GB        | ~2.5 GB    |
| 3B    | 2.0 GB  | 0.6 GB        | ~3.5 GB    |
| 4B    | 3.0 GB  | 0.7 GB        | ~4.5 GB    |
| 9B    | 5.5 GB  | 1.0 GB        | ~6.5 GB    |

**Rule of thumb**: Keep ≥ 2 GB headroom for OS + browser + other apps.

---

## Download Locations

| Model | Hugging Face Repo | File Pattern |
|-------|-------------------|--------------|
| Qwen 3.5 0.8B | `Qwen/Qwen2.5-0.8B-Instruct-GGUF` | `q4_k_m.gguf` |
| Qwen 3.5 2B | `Qwen/Qwen2.5-2B-Instruct-GGUF` | `q4_k_m.gguf` |
| Qwen 3.5 4B | `Qwen/Qwen2.5-4B-Instruct-GGUF` | `q4_k_m.gguf` |
| Qwen 3.5 9B | `Qwen/Qwen2.5-9B-Instruct-GGUF` | `q4_k_m.gguf` (gated) |
| Llama 3.2 3B | `meta-llama/Llama-3.2-3B-Instruct-GGUF` | `q4_k_m.gguf` (gated) |
| Gemma 4 4B | `google/gemma-2-4b-it-GGUF` | `q4_k_m.gguf` (gated) |

> **Gated models** require HF auth: `huggingface-cli login` then download.

---

## Running the Matrix Yourself

```bash
# Automated matrix (golden + quality across all local models)
pnpm prompts:eval matrix

# Single model evaluation
LLAMA_MODEL_PATH=models/your-model.gguf pnpm prompts:eval eval --provider llamacpp --quality

# With custom few-shot count
LLAMA_MODEL_PATH=models/your-model.gguf pnpm prompts:eval eval --provider llamacpp --quality --few-shot 5
```

Output: summary table + JSON report at `data/eval/matrix-<timestamp>.json`.

---

## Grammar Gating & Fallback

- **Grammar mode**: Constrained JSON generation (prevents syntax errors)
- **Auto-probe**: Tries grammar first; on 3 consecutive parse failures, switches to fallback (unconstrained + JSON repair)
- **Persisted**: Mode saved in `localStorage` (`notention:grammar-mode`) per model
- **Inspect**: `getGrammarModeStats()` in browser console

| Model | Grammar Default | Fallback Trigger |
|-------|-----------------|------------------|
| Qwen 3.5 0.8B/2B | ✅ Enabled | 3 parse failures |
| Qwen 3.5 4B | ✅ Enabled | Often (regression) |
| Llama 3.2 3B | ✅ Enabled | Rare |
| Gemma 4 4B | ✅ Enabled | Rare |

---

## Adaptive Routing (Ensemble-Lite)

Routes notes by complexity to the right model:

```typescript
// Complexity 0-100 → Model
≤ 30  → 2B  (short, simple notes)
31-69 → 4B  (medium, some structure)
≥ 70  → 9B  (long, governance, complex)
```

**Enable**: Set multiple model paths and use `adaptiveExtract()` from `@notention/optimize/adaptiveRouter`.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLAMA_MODEL_PATH` | `models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf` | Primary model |
| `LLAMA_GPU_LAYERS` | `max` | GPU offload (`0` = CPU only, `max` = all) |
| `LLAMA_CONTEXT_SIZE` | `4096` | Context window |
| `LLAMA_CPP_SERVER_URL` | — | Server mode URL (e.g., `http://localhost:8080/v1`) |
| `LLAMA_CPP_MODEL_NAME` | — | Model name for server mode |

---

## Quality vs Latency Tradeoff

```
Quality (F1)
 0.85 ┤           ╭─ Llama 3.2 3B (golden only)
      │          ╱
 0.78 ┤    ╭─────╯ Qwen 3.5 2B ◄── RECOMMENDED
      │   ╱
 0.67 ┤  ╱ Qwen 3.5 0.8B
      │ ╱
 0.50 ┼─────────────────
      0    2    4    6    8    10   12   Latency p95 (seconds)
```

**Qwen 3.5 2B** hits the sweet spot: passes golden gate, best quality pass rate, comfortable VRAM, sub-500ms p95.

---

## Updating This Guide

Run the matrix and update the table:

```bash
pnpm prompts:eval matrix --output data/eval/matrix-latest.json
# Edit doc/MODEL_SELECTION.md with new numbers
```

---

*Last updated: 2026-11-17 — Notention TODO.25 W9.2*
*Data from: `pnpm prompts:eval matrix` on RTX 3080 10GB*
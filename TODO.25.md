# TODO.25 — Future Work (post-TODO.24 completion)

**Context**: TODO.24 complete. All technical success criteria met. System has:
- Deterministic golden gate (10/10) on Qwen 0.8B/2B/4B + Llama 3.2 3B
- Quality F1 up to 0.742 (Qwen 4B, 3-shot)
- Full optimizer loop (6 steps) with automatic prompt adoption
- Taxonomy coverage 24/24 coarse, 32 six-axis cells
- E2 capture A/B test infrastructure + E13 prompt ablation infrastructure

---

## Immediate Next Steps (Human-Dependent)

| Item | Owner | Description | Prerequisites |
|------|-------|-------------|---------------|
| Manual comprehension probe | Product | 3-5 participants on Home screen; verify Inbox paradigm + primary CTA | `pnpm probe --headless` ready |
| T1 video recording | Product/Eng | semantic-capture, bidirectional-match, family-evacuation | `doc/simulator-dashboard-video-recording.md` |
| T2 video recording | Product/Eng | 4 scenarios per `doc/t2-video-recording-procedures.md` | Scenario seeds, relay setup ready |

---

## Strategic Directions (Pick One)

### A. Quality Push: Toward 0.8+ F1
**Goal**: Close the gap to human-level extraction on the 60-case quality set.

| Approach | Effort | Expected Gain | Notes |
|----------|--------|---------------|-------|
| Larger model (Qwen 3.5 7B/14B) | Medium | +0.05–0.10 F1 | Needs more VRAM; test 7B first |
| Fine-tune on corpus (LoRA) | High | +0.10–0.15 F1 | 864 notes + synthetic; requires GPU |
| Better few-shot retrieval | Medium | +0.03–0.05 F1 | Semantic similarity > token cosine |
| Chain-of-thought prompting | Low | +0.02–0.04 F1 | Works with grammar; test on Qwen |
| Ensemble (multiple models) | Medium | +0.03–0.06 F1 | Qwen 4B + 2B + deterministic |

### B. Match Quality Improvement
**Goal**: Improve bidirectional match relevance (currently simulator-focused).

| Approach | Effort | Notes |
|----------|--------|-------|
| Match-specific prompt variants | Low | Reuse E13 ablation infrastructure |
| Cross-encoder reranking | Medium | Requires training data |
| Corpus expansion (match domain) | Medium | Current corpus extraction-heavy |

### C. Production Hardening
**Goal**: Make optimizer loop production-ready for continuous deployment.

| Item | Effort | Notes |
|------|--------|-------|
| Real optimizer loop (non-dry) | Low | Already works; needs scheduling |
| Feature flag rollout strategy | Medium | Current: flag off by default |
| Prompt regression monitoring | Low | Golden gate as canary |
| Cost tracking per optimization | Low | Token usage, GPU time |

### D. Architecture Evolution
**Goal**: Address structural limitations.

| Item | Effort | Notes |
|------|--------|-------|
| WebLLM on real GPU (CI/CD) | High | Needs GPU runner; currently SwiftShader fails |
| Server-side llama.cpp (batched) | Medium | Replace embedded for throughput |
| Multi-modal (image → properties) | High | Ontology would need extension |
| Streaming extraction | Medium | For long notes; partial results |

---

## Technical Debt (Low Priority)

- [ ] UI `tsc --noEmit` errors (SmartNoteAssistant, EditorContent) — pre-existing, not blocking
- [ ] Simulator test suite runtime (~12 min) — consider parallelization
- [ ] `data/` directory management — gitignored but needed for eval; document regeneration
- [ ] Deprecation warnings (`module.register()`) — Node.js 26+

---

## Recommended Priority Order

1. **Human studies first** (blocked on participants) — validates UX before further quality investment
2. **Quality push via larger model** (Qwen 3.5 7B) — highest ROI, minimal code change
3. **Match quality** — if product needs better bidirectional matching
4. **Production hardening** — if optimizer loop goes to scheduled runs
5. **WebLLM GPU CI** — only if browser-based inference becomes priority

---

## Quick Wins (Can Start Anytime)

```bash
# Test Qwen 3.5 7B (if VRAM allows)
LLAMA_MODEL_PATH=/path/to/Qwen_Qwen3.5-7B-Q4_K_M.gguf pnpm prompts:eval eval --provider llamacpp --quality

# Run ablation with LLM provider (slow; use --quality-limit)
pnpm prompts:eval ablation --provider llama-cpp-embedded --model-path /path/to/model.gguf --quality-limit 10

# Run full optimizer loop (real, not dry)
pnpm loop run --output data/loop/runs

# Compare 1-step vs 2-step on full quality set
pnpm prompts:eval compare --limit 60 --few-shot 3
```
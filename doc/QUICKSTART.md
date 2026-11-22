# Quickstart: 10-Minute Path

This guide takes you from zero to a working semantic note that matches against another note, then exports the result.

> **Prerequisites**: Node.js 20+, pnpm. GPU optional (CPU fallback works).

---

## 1. Install (2 min)

```bash
git clone https://github.com/your-org/notention.git
cd notention
pnpm install
```

---

## 2. Choose a Model (1 min)

Notention runs entirely local-first. Pick a GGUF model and place it in `models/`:

| Model | Size | VRAM (Q4_K_M) | Quality | Speed | Best For |
|-------|------|---------------|---------|-------|----------|
| Qwen 3.5 0.8B | 0.6 GB | ~1.5 GB | Baseline | ⚡⚡⚡ Fastest | Quick tests, low VRAM |
| **Qwen 3.5 2B** | **1.4 GB** | **~2.5 GB** | **Best balance** | ⚡⚡ Fast | **Recommended default** |
| Qwen 3.5 4B | 3.0 GB | ~4.5 GB | High | ⚡ Medium | Higher quality needs |
| Llama 3.2 3B | 2.0 GB | ~3.5 GB | Good | ⚡ Medium | Alternative |
| Qwen 3.5 9B | 5.5 GB | ~6.5 GB | Highest | Slow | Max quality, 10GB+ VRAM |

```bash
# Option A: Download Qwen 3.5 2B (recommended default)
mkdir -p models
# Download from Hugging Face: Qwen/Qwen2.5-2B-Instruct-GGUF (q4_k_m.gguf)
# Place as: models/Qwen_Qwen3.5-2B-Q4_K_M.gguf

# Option B: Use CPU only (no GPU needed)
export LLAMA_GPU_LAYERS=0
```

**Verify**: `ls models/` should show your `.gguf` file.

---

## 3. Start the App (1 min)

```bash
# UI + local agent (recommended for full features)
pnpm run dev:server
```

Open `http://localhost:5173` (or the printed URL). You'll see the Notes workspace with the omnibox at the top.

---

## 4. Capture a Request Note (2 min)

1. Click the **omnibox** at the top of Notes
2. Type a need in natural language:
   ```
   I need a wheelchair ramp before Friday, budget under $900
   ```
3. Press **Enter** to keep the note
4. The note appears with extracted properties:
   - `deadline` → `before` → `Friday`
   - `budget` → `less than` → `900 USD`
   - `role` → `contains` → `accessibility`
   - `need` → `contains` → `wheelchair ramp`

> **Tip**: Properties are chips you can click to edit. Add more with the `+` button.

---

## 5. Capture an Offer Note (2 min)

1. Use the omnibox again
2. Type an offer:
   ```
   Offering wheelchair ramp installation, available this week, $750
   ```
3. Press **Enter** to keep the note
4. Properties extracted:
   - `role` → `contains` → `accessibility`
   - `service` → `contains` → `wheelchair ramp installation`
   - `availability` → `contains` → `this week`
   - `price` → `contains` → `750 USD`

---

## 6. See the Match (1 min)

1. Open the request note; its **Matches** tab in the context rail shows the offer
2. The match card shows the matched details, conflicts, missing properties, and score:
   - ✅ **Matched**: role (accessibility), service (wheelchair ramp)
   - ⚠️ **Conflicts**: none
   - ⚠️ **Missing**: deadline (offer doesn't specify when)
   - **Score**: e.g., 0.72 (72% compatibility)

> **Keyboard**: `Alt+1` = Notes, `Alt+2` = Settings, `Cmd+K` = search, `Cmd+N` = composer

---

## 7. Export (1 min)

### Export as Markdown (human-readable)
1. Open Settings → Data Management
2. Click **Export Markdown**
3. Opens a `.md` file with all notes as readable prose + property tables

### Export as JSON (machine-readable, full fidelity)
1. Settings → Data Management → **Export JSON**
2. Downloads `notention-backup-<timestamp>.json`

### Export Encrypted Backup (passphrase-protected)
1. Settings → Data Management → **Export Encrypted Backup**
2. Enter a passphrase (confirmed)
3. Downloads `notention-backup-<timestamp>.enc.json`
4. Import later with the same passphrase

---

## 8. Next Steps

| Goal | Command / Location |
|------|-------------------|
| Run quality evaluation | `pnpm optimize eval:canary` |
| Run model matrix | `pnpm prompts:eval matrix` |
| View friction digest | Settings → Metrics → Friction Digest |
| Run optimizer loop | `pnpm loop run` |
| Accessibility audit | `pnpm test:ui` (includes axe) |
| Comprehension probe | `pnpm probe` |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Model not found | Check `models/` path; set `LLAMA_MODEL_PATH` env var |
| GPU OOM | Use smaller model or `export LLAMA_GPU_LAYERS=0` |
| No matches appear | Ensure one note has `intent: request`, other has `intent: offer` |
| Extraction fails | Check console; falls back to deterministic heuristic |
| Port in use | `pnpm run dev:server -- --port 5174` |

---

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+N` | Open the composer for a new note |
| `Cmd/Ctrl+Enter` | Save the note (composer or editor) |
| `Cmd/Ctrl+K` | One search overlay: notes, details, tags, public notes, commands |
| `Cmd/Ctrl+V` | Paste clipboard into the omnibox |
| `Alt+1` / `Alt+2` | Notes / Settings |
| `Alt+,` | Settings |
| `Ctrl+Z / Ctrl+Shift+Z` | Undo/Redo in editor |

---

*Last updated: 2026-11-22 — TODO.30 W30.8*
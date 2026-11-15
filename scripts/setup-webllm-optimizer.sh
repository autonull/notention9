#!/usr/bin/env bash
# Quick-start for next session: Wire WebLLM into optimizer
# Run from repo root: ./scripts/setup-webllm-optimizer.sh

set -euo pipefail

echo "=== Setting up WebLLM bridge for optimizer ==="

cd /home/me/notention9/optimize

# 1. Add Playwright
echo "Installing Playwright..."
pnpm add -D playwright
pnpm exec playwright install chromium
pnpm exec playwright install-deps chromium  # system deps for headless

# 2. Verify UI builds (needed for WebLLM)
cd /home/me/notention9/ui
echo "Building UI..."
pnpm build

# 3. Create directory structure
cd /home/me/notention9/optimize
mkdir -p src/llm

echo "=== Setup complete ==="
echo ""
echo "Next steps (manual):"
echo "1. Create optimize/src/llm/webllmBridge.ts"
echo "2. Create optimize/src/llm/index.ts"
echo "3. Edit optimize/src/prompts/cli.ts RegistryProvider"
echo "4. Test: pnpm prompts:eval --provider registry --quality"
echo ""
echo "See WORKPLAN.webllm-optimizer.md for details"
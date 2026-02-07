#!/bin/bash

# Start the full stack
echo "Starting Dev Server..."
node scripts/dev-runner.js > /dev/null 2>&1 &
PID=$!

# Wait for UI port
echo "Waiting for UI at localhost:5173..."
timeout 120s bash -c 'until curl -s http://localhost:5173 > /dev/null; do sleep 5; done'

if [ $? -ne 0 ]; then
    echo "Timed out waiting for UI to start."
    kill $PID
    pkill -P $PID || true
    exit 1
fi

echo "UI is up!"

# Run Playwright Test
echo "Running Playwright Verification..."
npx playwright test verification/verify_ui_screenshots.spec.ts

EXIT_CODE=$?

# Kill the server
echo "Stopping Dev Server (PID $PID)..."
kill $PID
pkill -P $PID || true

echo "Done with exit code $EXIT_CODE."
exit $EXIT_CODE

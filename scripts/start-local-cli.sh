#!/bin/bash

# Define cleanup function
cleanup() {
    echo "Stopping local LLM server..."
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit
}

# Trap signals
trap cleanup SIGINT SIGTERM EXIT

# Start local LLM server
echo "Starting local LLM server (using node-llama-cpp)..."
# Start in background, but keep stdout visible for download progress
node scripts/local-llm-server.mjs &
SERVER_PID=$!

# Wait for server to be ready (check port 11434)
echo "Waiting for server to start..."
count=0
while ! node -e 'require("net").createConnection(11434).on("connect", ()=>process.exit(0)).on("error", ()=>process.exit(1))' 2>/dev/null; do
  sleep 1
  count=$((count+1))

  # Check if server process is still alive
  if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "Server process exited unexpectedly!"
      exit 1
  fi

  if [ $((count % 10)) -eq 0 ]; then
      echo "Still waiting... (Downloading model?)"
  fi
done
echo "Server is ready!"

# Start CLI with configuration pointing to local server
echo "Starting CLI..."
export LLM_PROVIDER="openai"
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="local-model"
export LLM_API_KEY="sk-dummy"

npm start -w @notention/cli --

# Cleanup happens via trap

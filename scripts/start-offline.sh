#!/bin/bash
export LLM_PROVIDER=ollama
export LLM_MODEL=${1:-llama3.2:3b}
export LLM_BASE_URL=http://localhost:11434/v1
echo "Starting CLI in Offline Mode with model $LLM_MODEL..."
npm start -w @notention/cli

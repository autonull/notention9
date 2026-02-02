#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "Starting Notention System..."
echo "---------------------------"

# Kill existing processes on relevant ports to ensure clean start
echo "Cleaning up ports 3000 (Agent) and 5173 (UI)..."
kill $(lsof -t -i :3000) 2>/dev/null || true
kill $(lsof -t -i :5173) 2>/dev/null || true

# Build core first as it's a dependency
echo "Building Core..."
npm run build -w @notention/core

# Start Agent in background
echo "Starting Agent (Port 3000)..."
npm run dev -w @notention/agent > agent.log 2>&1 &
AGENT_PID=$!

# Start UI in background
echo "Starting UI (Port 5173)..."
npm run dev -w @notention/ui > ui.log 2>&1 &
UI_PID=$!

echo "---------------------------"
echo "System is running!"
echo "Agent PID: $AGENT_PID"
echo "UI PID: $UI_PID"
echo ""
echo "Access UI at: http://localhost:5173"
echo "Agent API at: http://localhost:3000"
echo ""
echo "Logs are being written to agent.log and ui.log"
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill both processes
trap "kill $AGENT_PID $UI_PID; exit" INT

# Wait for processes
wait

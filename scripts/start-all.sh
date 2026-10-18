#!/usr/bin/env bash
# scripts/start-all.sh
# Usage: chmod +x scripts/start-all.sh && ./scripts/start-all.sh
set -e

# Load .env if present
if [ -f .env ]; then
  echo "Loading .env"
  export $(grep -v '^#' .env | xargs)
fi

: ${API_PORT:=3000}
: ${PROXY_PORT:=3001}
: ${USE_PROXY_INTERNAL:=true}

echo "API_PORT=${API_PORT} PROXY_PORT=${PROXY_PORT} USE_PROXY_INTERNAL=${USE_PROXY_INTERNAL}"

# Ensure logs directory
mkdir -p ./logs

# Start Ollama models in background (nohup so they survive if you close the terminal)
echo "Starting qwen2.5-coder:latest"
nohup ollama run qwen2.5-coder:latest > ./logs/ollama-qwen.log 2>&1 &

echo "Starting llava-phi3:3.8b"
nohup ollama run llava-phi3:3.8b > ./logs/ollama-llava.log 2>&1 &

# Wait for Ollama HTTP API
MAX_WAIT=180
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "Ollama HTTP API is responding"
    break
  fi
  sleep 3
  elapsed=$((elapsed+3))
  echo "Waiting for Ollama... $elapsed/$MAX_WAIT"
done

if [ $elapsed -ge $MAX_WAIT ]; then
  echo "Ollama did not become ready in time; check 'ollama ps' and logs in ./logs"
  exit 1
fi

# Install dependencies if needed
if [ -f package.json ]; then
  echo "Installing npm dependencies"
  npm install
fi

# Start the app
node main.js

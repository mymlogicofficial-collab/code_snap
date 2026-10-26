#!/usr/bin/env bash
set -e

LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

API_PORT="${API_PORT:-3000}"
PROXY_PORT="${PROXY_PORT:-3001}"
USE_PROXY_INTERNAL="${USE_PROXY_INTERNAL:-true}"

# Keep local secrets only in .env on your machine. Never commit them.
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export API_PORT
export PROXY_PORT
export USE_PROXY_INTERNAL

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama not found in PATH"
  exit 1
fi

# Start warm-up models.
nohup ollama run qwen2.5-coder:latest > "$LOG_DIR/ollama-qwen.log" 2>&1 &
nohup ollama run llava-phi3:3.8b > "$LOG_DIR/ollama-llava.log" 2>&1 &

# Wait for Ollama to respond.
for i in $(seq 1 60); do
  if curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "Ollama is ready"
    break
  fi
  echo "Waiting for Ollama... $i/60"
  sleep 2
done

# Start the app.
printf "Starting app on http://localhost:%s\n" "$API_PORT"
PORT="$API_PORT" node main.js > "$LOG_DIR/app.log" 2>&1 &

sleep 5
printf "\nReady:\n"
printf "  Ollama: http://localhost:11434/api/tags\n"
printf "  App: http://localhost:%s\n" "$API_PORT"
printf "  Proxy: http://localhost:%s\n" "$PROXY_PORT"

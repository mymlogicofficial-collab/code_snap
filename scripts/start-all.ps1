# PowerShell start script for Windows
# Usage: Open PowerShell in the repo root and run: .\scripts\start-all.ps1

Write-Host "Starting CodeSnap: load .env, start Ollama models, wait for Ollama, then start app"

# Load .env if present
if (Test-Path ".env") {
  Write-Host "Loading .env"
  Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
      $parts = $line -split '=',2
      if ($parts.Length -eq 2) {
        $name = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($name,$val,'Process')
        Write-Host "Loaded env $name"
      }
    }
  }
}

# Defaults
if (-not $env:API_PORT) { $env:API_PORT = "3000"; Write-Host "API_PORT not set, defaulting to 3000" }
if (-not $env:PROXY_PORT) { $env:PROXY_PORT = "3001" }
if (-not $env:USE_PROXY_INTERNAL) { $env:USE_PROXY_INTERNAL = "true" }

Write-Host "API_PORT=$($env:API_PORT) PROXY_PORT=$($env:PROXY_PORT) USE_PROXY_INTERNAL=$($env:USE_PROXY_INTERNAL)"

# Start Ollama models (spawn new processes). These will keep running in background.
Write-Host "Launching Ollama model: qwen2.5-coder:latest"
Start-Process -FilePath "ollama" -ArgumentList "run","qwen2.5-coder:latest" -WindowStyle Minimized

Write-Host "Launching Ollama model: llava-phi3:3.8b"
Start-Process -FilePath "ollama" -ArgumentList "run","llava-phi3:3.8b" -WindowStyle Minimized

# Wait for Ollama to respond on HTTP API
$maxWait = 180  # seconds
$elapsed = 0
$ok = $false
Write-Host "Waiting for Ollama HTTP API (http://localhost:11434/api/tags)"
while ($elapsed -lt $maxWait) {
  try {
    $resp = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    if ($resp) { $ok = $true; break }
  } catch {
    # ignore
  }
  Start-Sleep -Seconds 3
  $elapsed += 3
  Write-Host "Waiting for Ollama... ($elapsed/$maxWait)"
}

if (-not $ok) {
  Write-Warning "Ollama did not respond within $maxWait seconds. Check that ollama is installed and listening on :11434"
  exit 1
}

Write-Host "Ollama is up — starting the app server"

# Install dependencies if needed (comment out if you don't want auto-install)
if (Test-Path "package.json") {
  Write-Host "Ensuring dependencies installed (npm install)"
  npm install
}

# Start the Node app in the current window
node main.js

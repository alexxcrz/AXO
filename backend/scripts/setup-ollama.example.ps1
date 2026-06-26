# Setup IA local (Ollama) ù solo desarrollo. No se sube a Render.
Write-Host "=== AXIS ORDO - Setup Ollama (local) ===" -ForegroundColor Cyan

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backend = Join-Path $root "backend"
$localService = Join-Path $backend "src/services/ollama.local.service.js"
$exampleService = Join-Path $backend "src/services/ollama.local.service.example.js"
$envLocal = Join-Path $backend ".env.ollama.local"
$envExample = Join-Path $backend "ollama.env.example"

if (-not (Test-Path $localService) -and (Test-Path $exampleService)) {
  Copy-Item $exampleService $localService
  Write-Host "Creado ollama.local.service.js" -ForegroundColor Green
}

if (-not (Test-Path $envLocal) -and (Test-Path $envExample)) {
  Copy-Item $envExample $envLocal
  Write-Host "Creado .env.ollama.local ù agrega estas vars a backend/.env si hace falta." -ForegroundColor Green
}

$model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3.2" }

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Ollama no instalado. Descarga: https://ollama.com/download" -ForegroundColor Yellow
  exit 1
}

Write-Host "Descargando modelo $model ..." -ForegroundColor Green
ollama pull $model

Write-Host "Listo. Reinicia npm run dev y prueba el asistente de componentes." -ForegroundColor Cyan

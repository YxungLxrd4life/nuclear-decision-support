# Запуск стека из корня репозитория (удобно из PowerShell / Cursor).
# .\docker-up.ps1              — поднять и открыть браузер
# .\docker-up.ps1 -NoBrowser   — без открытия браузера
param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker не найден. Установите Docker Desktop и добавьте его в PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Запуск nuclear-decision-support..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Интерфейс:  http://localhost:8080"
Write-Host "API / docs: http://localhost:8000/docs"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:8080"
}

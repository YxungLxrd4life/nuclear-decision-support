@echo off
chcp 65001 >nul
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker не найден в PATH.
  pause
  exit /b 1
)

docker compose down
echo Контейнеры остановлены.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo [Ошибка] Docker не найден в PATH. Установите Docker Desktop и запустите его.
  pause
  exit /b 1
)

echo Запуск nuclear-decision-support (сборка при необходимости)...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [Ошибка] Не удалось собрать или запустить контейнеры. См. сообщения выше.
  pause
  exit /b 1
)

echo.
echo Готово.
echo   Интерфейс:  http://localhost:8080
echo   API / docs: http://localhost:8000/docs
echo.
start "" "http://localhost:8080"
pause

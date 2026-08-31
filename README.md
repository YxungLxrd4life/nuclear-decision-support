Проект: прототип интеллектуальной системы поддержки принятия решений (СППР)  
для оперативного персонала блочного щита управления АЭС.

## Структура проекта

- `backend` – FastAPI + SQLite, REST API для сценариев и узлов дерева решений  
- `frontend` – React + TypeScript + MUI, веб‑интерфейс оператора

## Docker 

Требования: установлен и **запущен** Docker Desktop.

**Самый простой способ (Windows):** дважды щёлкнуть `docker-up.bat` в корне репозитория — соберётся образ при необходимости, поднимутся контейнеры и откроется браузер на http://localhost:8080. Остановка: `docker-down.bat` или команда `docker compose down` из корня проекта.

Из терминала в корне `nuclear-decision-support`:

```powershell
docker compose up -d --build
```

или в PowerShell: `.\docker-up.ps1` (без открытия браузера: `.\docker-up.ps1 -NoBrowser`).

Адреса: интерфейс http://localhost:8080, Swagger http://localhost:8000/docs.

Стек в Compose: **PostgreSQL** (сервис `postgres`, пароль по умолчанию `nuclear_local_dev`), бэкенд подключается к БД по имени хоста `postgres` в общей сети проекта. Свой пароль можно задать в файле `.env` в корне репозитория: строка `POSTGRES_PASSWORD=...` (тот же пароль подставится и в `DATABASE_URL` у бэкенда). Фронтенд в браузере по-прежнему обращается к API по **http://localhost:8000** — это нормально: запросы идут с вашего ПК на опубликованный порт, а не по имени контейнера.

Если раньше запускали Postgres вручную (`docker run ...`), остановите такие контейнеры и освободите порт **5432**, если он занят, иначе будет конфликт.

## Как запустить бэкенд (API)

Требования: установлен Python 3.10+.

1. Открыть терминал / PowerShell в папке проекта:  
   `cd C:\nuclear-decision-support\backend`
2. (Рекомендуется) активировать виртуальное окружение, если нужно:
   - если нужно создать новое:
     - `python -m venv venv`
     - `venv\Scripts\activate`
   - или использовать уже существующее `venv\Scripts\activate`
3. Установить зависимости:
   - `pip install -r requirements.txt`
4. (Опционально) настроить PostgreSQL вместо SQLite:
   - создать БД `nuclear_support` в PostgreSQL;
   - создать файл `.env` в папке `backend` со строкой подключения, например:
     - `DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/nuclear_support`
   - при наличии `DATABASE_URL` приложение будет использовать PostgreSQL вместо SQLite.
5. Заполнить базу тестовыми данными:
   - `python scripts\seed_data.py`
6. Запустить сервер FastAPI:
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Linux/macOS

```bash
cd /path/to/nuclear-decision-support/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка работы API (сервер должен быть запущен командой `uvicorn` выше):

- `http://localhost:8000/health` — короткий ответ **без базы** (`{"status":"ok",...}`). Если страница не открывается, проверьте, что uvicorn запущен и порт **8000** (в консоли будет строка `Uvicorn running on ...`).
- `http://localhost:8000/health/db` — список сценариев из SQLite (если ошибка — проблема с БД или путём к файлу).
- `http://localhost:8000` — корневой эндпоинт  
- `http://localhost:8000/docs` — Swagger UI с описанием методов.

## Как запустить фронтенд

Требования: установлен Node.js (желательно LTS 18+).

1. В новом терминале / PowerShell:
   - `cd C:\nuclear-decision-support\frontend`
2. Установить зависимости:
   - `npm install`
3. Запустить dev‑сервер:
   - `npm run dev`
4. Открыть указанный адрес в браузере (обычно `http://localhost:5173`).

### Linux/macOS

```bash
cd /path/to/nuclear-decision-support/frontend
npm install
npm run dev
```

Важно: бэкенд по умолчанию слушает `http://localhost:8000`,  
фронтенд настроен на тот же адрес в файле `src\services\api.ts`.

- Бэкенд:
  - модели `Scenario`, `Node`, `Answer`, `UserSession` (SQLAlchemy)
  - по умолчанию SQLite‑БД `nuclear_support.db`, при наличии `DATABASE_URL` — PostgreSQL
  - скрипт `backend\scripts\seed_data.py` заполняет один сценарий АЗ реактора
  - эндпоинты:
    - `GET /scenarios` – список сценариев
    - `GET /scenarios/{id}` – один сценарий
    - `GET /scenarios/{id}/root` – корневой узел дерева
    - `GET /nodes/{id}` – конкретный узел (вопрос/действие)
    - `POST /sessions/start` – запуск пользовательской сессии по сценарию
    - `POST /sessions/{id}/answer` – переход по дереву решений в рамках сессии
- Фронтенд:
  - маршрутизация между режимами оператора и администратора (React Router)
  - выбор сценария и запуск сессии (`ScenarioSelector`)
  - пошаговый обход дерева решений в рамках сессии (`DecisionTree`):
    - показ вопроса
    - варианты ответов в виде крупных кнопок
    - финальный шаг с текстом действия для оператора
  - заготовка панели администратора (`AdminPanel`) для будущего редактора сценариев


```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git branch -M main
git push -u origin main
```

Файлы `venv/`, `.venv/`, `node_modules/`, `.env` и локальные `.db` в репозиторий не попадают (см. `.gitignore`).

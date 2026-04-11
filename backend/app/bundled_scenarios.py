"""
Встроенные сценарии из JSON (пакет app.data + fallback на каталог на диске).
При старте и при GET /scenarios создаются в БД, если ещё нет записи с таким именем.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from . import crud, models, schemas

logger = logging.getLogger(__name__)

# Каталог на диске: backend/app/data/
_DATA_DIR = Path(__file__).resolve().parent / "data"

_BUNDLED_SCENARIO_FILES = (
    "scenario_ie46_kva.json",
)


def _read_bundled_file(filename: str) -> str | None:
    """Чтение JSON: 1) тот же каталог, что и app/data/__init__.py; 2) importlib; 3) рядом с bundled_scenarios."""
    try:
        from .data import read_bundled_json

        return read_bundled_json(filename)
    except Exception as e:
        logger.debug("app.data.read_bundled_json не сработал для %s: %s", filename, e)

    try:
        from importlib import resources

        tr = resources.files("app.data").joinpath(filename)
        return tr.read_text(encoding="utf-8")
    except Exception as e:
        logger.debug("importlib.resources не прочитал %s: %s", filename, e)

    path = _DATA_DIR / filename
    if path.is_file():
        try:
            return path.read_text(encoding="utf-8")
        except OSError as e:
            logger.exception("Ошибка чтения %s: %s", path, e)
            print(f"[bundled_scenarios] Не удалось прочитать файл {path}: {e}", file=sys.stderr)
    return None


def ensure_bundled_scenarios(db: Session) -> None:
    """Если сценария с таким именем ещё нет — создать из JSON."""
    for filename in _BUNDLED_SCENARIO_FILES:
        raw = _read_bundled_file(filename)
        if raw is None:
            msg = f"[bundled_scenarios] Нет данных для {filename} (app.data и {_DATA_DIR / filename})"
            logger.warning(msg)
            print(msg, file=sys.stderr)
            continue

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.exception("JSON ошибка в %s: %s", filename, e)
            print(f"[bundled_scenarios] Невалидный JSON {filename}: {e}", file=sys.stderr)
            continue

        name = data.get("name")
        if not name:
            logger.warning("Bundled scenario %s has no name", filename)
            continue

        try:
            scenario_in = schemas.ScenarioWithNodesCreate(**data)
            before = db.query(models.Scenario).filter(models.Scenario.name == name).first()
            crud.ensure_scenario_with_nodes(db, scenario_in)
            after = db.query(models.Scenario).filter(models.Scenario.name == name).first()
            if before is None and after is not None:
                logger.info("Bundled scenario loaded: %s", name)
                print(f"[bundled_scenarios] Загружен сценарий: {name}", file=sys.stderr)
            elif after is not None:
                logger.debug("Bundled scenario already present: %s", name)
        except Exception as e:
            logger.exception("Failed to create bundled scenario %s: %s", name, e)
            print(
                f"[bundled_scenarios] Не удалось создать сценарий «{name}»: {e}",
                file=sys.stderr,
            )

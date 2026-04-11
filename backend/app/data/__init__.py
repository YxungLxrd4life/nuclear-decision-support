"""
Ресурсы сценариев: JSON лежит в этой же папке (рядом с __file__).
Так путь не зависит от cwd и от того, откуда импортирован bundled_scenarios.
"""
from __future__ import annotations

from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent


def read_bundled_json(filename: str) -> str:
    """Прочитать UTF-8 JSON из app/data/<filename>."""
    path = _DATA_DIR / filename
    return path.read_text(encoding="utf-8")

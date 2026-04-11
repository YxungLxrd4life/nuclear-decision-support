import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import crud, models, schemas, auth
from .database import engine, get_db, init_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nuclear Decision Support System")


def _dbg(hypothesis_id: str, location: str, message: str, data: dict):
    # Optional debug logging; portable path, works on Linux/Windows/macOS.
    debug_log_path = os.getenv("DEBUG_LOG_PATH")
    if not debug_log_path:
        return

    payload = {
        "sessionId": "a8db46",
        "runId": "pre-fix",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    path = Path(debug_log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")

_default_cors = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8080,http://127.0.0.1:8080,"
    "http://localhost,http://127.0.0.1"
)
_cors_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", _default_cors).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def read_root():
    return {
        "message": "Nuclear Decision Support System API",
        "health": "/health — только «пульс» API (без БД)",
        "health_db": "/health/db — список сценариев из БД",
        "docs": "/docs — Swagger",
    }


@app.get("/health")
def health():
    """
    Без БД и зависимостей: если uvicorn запущен, всегда ответ 200.
    Если эта страница не открывается — сервер не слушает этот порт или не запущен.
    """
    return {
        "status": "ok",
        "service": "nuclear-decision-support",
        "next": "Откройте /health/db чтобы увидеть сценарии в базе (или /docs при ошибке БД).",
    }


@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    """Проверка БД и встроенных сценариев; при ошибке БД вернётся 500 с текстом."""
    from . import bundled_scenarios

    bundled_scenarios.ensure_bundled_scenarios(db)
    db.expire_all()
    rows = crud.get_scenarios(db)
    return {
        "status": "ok",
        "scenarios_count": len(rows),
        "scenarios": [{"id": s.id, "name": s.name} for s in rows],
        "hint": "GET /scenarios требует JWT (вход оператора в приложении).",
    }


@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    _dbg(
        "H1",
        "main.py:/auth/login:entry",
        "Login endpoint called",
        {"username": form_data.username, "hasPassword": bool(form_data.password)},
    )
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        _dbg(
            "H1",
            "main.py:/auth/login:unauthorized",
            "Login rejected",
            {"username": form_data.username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    _dbg(
        "H2",
        "main.py:/auth/login:success",
        "Login success token issued",
        {"username": user.username, "isAdmin": user.is_admin},
    )
    if not user.is_admin:
        crud.create_operator_action_log(
            db=db,
            operator_username=user.username,
            action_type="login",
            details="Успешный вход оператора",
        )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/scenarios", response_model=list[schemas.Scenario])
def get_scenarios(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    _dbg(
        "H3",
        "main.py:/scenarios",
        "Scenarios endpoint authorized",
        {"username": current_user.username, "isAdmin": current_user.is_admin},
    )
    # Подхват встроенных JSON при каждом запросе списка (идемпотентно).
    # Так сценарий появится даже если startup не отработал или БД была в другом cwd.
    from . import bundled_scenarios

    bundled_scenarios.ensure_bundled_scenarios(db)
    db.expire_all()
    return crud.get_scenarios(db)


@app.get("/admin/operator-logs", response_model=list[schemas.OperatorActionLog])
def get_operator_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    return crud.get_operator_action_logs(db, limit=limit)


@app.post("/scenarios", response_model=schemas.Scenario)
def create_scenario(
    scenario_in: schemas.ScenarioCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    try:
        return crud.create_scenario(db, scenario_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scenarios/with-nodes", response_model=schemas.Scenario)
def create_scenario_with_nodes(
    scenario_in: schemas.ScenarioWithNodesCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    try:
        return crud.create_scenario_with_nodes(db, scenario_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/scenarios/{scenario_id}", response_model=schemas.Scenario)
def update_scenario(
    scenario_id: int,
    scenario_in: schemas.ScenarioCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    scenario = crud.update_scenario(db, scenario_id, scenario_in)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@app.delete("/scenarios/{scenario_id}")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.get_current_admin),
):
    ok = crud.delete_scenario(db, scenario_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"detail": "Deleted"}


@app.get("/scenarios/{scenario_id}", response_model=schemas.Scenario)
def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    scenario = crud.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@app.get("/scenarios/{scenario_id}/root", response_model=schemas.Node)
def get_root_node(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    node = crud.get_root_node(db, scenario_id)
    if not node:
        raise HTTPException(status_code=404, detail="Root node not found")
    return node


@app.get("/nodes/{node_id}", response_model=schemas.Node)
def get_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    node = crud.get_node(db, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@app.post("/sessions/start", response_model=schemas.SessionState)
def start_session(
    payload: schemas.SessionStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    try:
        session = crud.create_session(db, payload.scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    node = crud.get_node(db, session.current_node_id)
    if not node:
        raise HTTPException(status_code=500, detail="Node not found for session")

    if not current_user.is_admin:
        crud.create_operator_action_log(
            db=db,
            operator_username=current_user.username,
            action_type="start_session",
            scenario_id=session.scenario_id,
            session_id=session.id,
            node_id=node.id,
            details=f"Оператор начал сценарий #{session.scenario_id}",
        )

    return schemas.SessionState(session_id=session.id, current_node=node)


@app.post("/sessions/{session_id}/answer", response_model=schemas.SessionState)
def answer_session(
    session_id: int,
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    try:
        session = crud.answer_session(db, session_id, answer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    node = crud.get_node(db, session.current_node_id)
    if not node:
        raise HTTPException(status_code=500, detail="Node not found for session")

    if not current_user.is_admin:
        crud.create_operator_action_log(
            db=db,
            operator_username=current_user.username,
            action_type="answer",
            scenario_id=session.scenario_id,
            session_id=session.id,
            node_id=node.id,
            answer_id=answer_id,
            details=(
                "Выбран ответ в дереве решений; "
                + ("достигнут финальный узел" if node.is_final else "переход к следующему узлу")
            ),
        )

    return schemas.SessionState(session_id=session.id, current_node=node)
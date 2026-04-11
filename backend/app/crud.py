from sqlalchemy.orm import Session
from . import models, schemas


def get_scenarios(db: Session):
    return db.query(models.Scenario).all()


def create_operator_action_log(
    db: Session,
    operator_username: str,
    action_type: str,
    scenario_id: int | None = None,
    session_id: int | None = None,
    node_id: int | None = None,
    answer_id: int | None = None,
    details: str | None = None,
) -> models.OperatorActionLog:
    log = models.OperatorActionLog(
        operator_username=operator_username,
        action_type=action_type,
        scenario_id=scenario_id,
        session_id=session_id,
        node_id=node_id,
        answer_id=answer_id,
        details=details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_operator_action_logs(db: Session, limit: int = 200):
    return (
        db.query(models.OperatorActionLog)
        .order_by(models.OperatorActionLog.id.desc())
        .limit(limit)
        .all()
    )


def get_scenario(db: Session, scenario_id: int):
    return db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()


def get_node(db: Session, node_id: int):
    return db.query(models.Node).filter(models.Node.id == node_id).first()


def get_root_node(db: Session, scenario_id: int):
    scenario = get_scenario(db, scenario_id)
    if scenario and scenario.root_node_id:
        return get_node(db, scenario.root_node_id)
    return None


def create_scenario(db: Session, scenario_in: schemas.ScenarioCreate) -> models.Scenario:
    existing = db.query(models.Scenario).filter(
        models.Scenario.name == scenario_in.name
    ).first()
    if existing is not None:
        raise ValueError("Сценарий с таким названием уже существует")

    scenario = models.Scenario(
        name=scenario_in.name,
        description=scenario_in.description,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def create_scenario_with_nodes(
    db: Session, scenario_in: schemas.ScenarioWithNodesCreate
) -> models.Scenario:
    existing = db.query(models.Scenario).filter(
        models.Scenario.name == scenario_in.name
    ).first()
    if existing is not None:
        raise ValueError("Сценарий с таким названием уже существует")

    scenario = models.Scenario(
        name=scenario_in.name,
        description=scenario_in.description,
    )
    db.add(scenario)
    db.flush()

    key_to_node: dict[str, models.Node] = {}
    for node_in in scenario_in.nodes:
        node = models.Node(
            scenario_id=scenario.id,
            question=node_in.question,
            is_final=node_in.is_final,
            final_action=node_in.final_action,
        )
        db.add(node)
        db.flush()
        key_to_node[node_in.key] = node

    root_node = key_to_node.get(scenario_in.root_node_key)
    if root_node is None:
        raise ValueError("Root node key not found in nodes list")
    scenario.root_node_id = root_node.id
    db.flush()

    for node_in in scenario_in.nodes:
        current_node = key_to_node[node_in.key]
        for answer_in in node_in.answers:
            next_node_id = None
            if answer_in.next_node_key:
                next_node = key_to_node.get(answer_in.next_node_key)
                if next_node is None:
                    raise ValueError(
                        f"Next node key '{answer_in.next_node_key}' not found"
                    )
                next_node_id = next_node.id
            db.add(
                models.Answer(
                    node_id=current_node.id,
                    text=answer_in.text,
                    next_node_id=next_node_id,
                )
            )

    db.commit()
    db.refresh(scenario)
    return scenario


def ensure_scenario_with_nodes(
    db: Session, scenario_in: schemas.ScenarioWithNodesCreate
) -> models.Scenario:
    """Создать дерево сценария, если записи с таким именем ещё нет (идемпотентно)."""
    existing = db.query(models.Scenario).filter(
        models.Scenario.name == scenario_in.name
    ).first()
    if existing is not None:
        return existing
    return create_scenario_with_nodes(db, scenario_in)


def update_scenario(db: Session, scenario_id: int, scenario_in: schemas.ScenarioCreate) -> models.Scenario | None:
    scenario = get_scenario(db, scenario_id)
    if scenario is None:
        return None
    scenario.name = scenario_in.name
    scenario.description = scenario_in.description
    db.commit()
    db.refresh(scenario)
    return scenario


def delete_scenario(db: Session, scenario_id: int) -> bool:
    scenario = get_scenario(db, scenario_id)
    if scenario is None:
        return False
    db.delete(scenario)
    db.commit()
    return True


def create_session(db: Session, scenario_id: int) -> models.UserSession:
    scenario = get_scenario(db, scenario_id)
    if scenario is None or scenario.root_node_id is None:
        raise ValueError("Scenario or root node not found")
    session = models.UserSession(
        scenario_id=scenario.id,
        current_node_id=scenario.root_node_id,
        is_completed=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: int) -> models.UserSession | None:
    return db.query(models.UserSession).filter(models.UserSession.id == session_id).first()


def answer_session(db: Session, session_id: int, answer_id: int) -> models.UserSession:
    session = get_session(db, session_id)
    if session is None or session.is_completed:
        raise ValueError("Session not found or already completed")

    # Найти ответ и перейти к следующему узлу
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if answer is None or answer.next_node_id is None:
        # если ответ ведет в никуда — считаем сценарий завершённым
        session.is_completed = True
    else:
        next_node = get_node(db, answer.next_node_id)
        if next_node is None:
            session.is_completed = True
        else:
            session.current_node_id = next_node.id
            if next_node.is_final:
                session.is_completed = True

    db.commit()
    db.refresh(session)
    return session
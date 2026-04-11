import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import crud, schemas
from app.auth import get_password_hash
from app.database import SessionLocal, engine, Base
from app.models import Scenario, Node, Answer, User
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    # Создаем тестовых пользователей: оператор и администратор
    operator = User(
        username="operator",
        hashed_password=get_password_hash("operator123"),
        is_admin=False,
    )
    admin = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        is_admin=True,
    )
    db.add_all([operator, admin])
    db.commit()

    scenario = Scenario(
        name="Аварийное отключение реактора",
        description="Сценарий действий при обнаружении аномалий в работе реактора"
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    node1 = Node(
        scenario_id=scenario.id,
        question="Обнаружено повышение температуры в активной зоне. Показания датчиков?",
        is_final=False
    )
    db.add(node1)
    db.commit()
    db.refresh(node1)
    node2 = Node(
        scenario_id=scenario.id,
        question="Температура в пределах 350-400°C. Состояние системы охлаждения?",
        is_final=False
    )
    db.add(node2)
    db.commit()
    db.refresh(node2)
    node3 = Node(
        scenario_id=scenario.id,
        question="Температура превышает 400°C. КРИТИЧЕСКАЯ СИТУАЦИЯ!",
        is_final=True,
        final_action="НЕМЕДЛЕННО:\n1. Активировать аварийную защиту (АЗ)\n2. Запустить аварийное охлаждение\n3. Оповестить главного инженера\n4. Эвакуировать персонал из зоны реактора\n5. Задействовать резервные системы"
    )
    db.add(node3)
    db.commit()
    db.refresh(node3)
    node4 = Node(
        scenario_id=scenario.id,
        question="Система охлаждения работает нормально. Давление в первом контуре?",
        is_final=False
    )
    db.add(node4)
    db.commit()
    db.refresh(node4)
    node5 = Node(
        scenario_id=scenario.id,
        question="Обнаружена неисправность системы охлаждения!",
        is_final=True,
        final_action="ДЕЙСТВИЯ:\n1. Снизить мощность реактора до 50%\n2. Включить резервный контур охлаждения\n3. Вызвать аварийную бригаду\n4. Контролировать температуру каждые 2 минуты\n5. Подготовиться к возможному останову"
    )
    db.add(node5)
    db.commit()
    db.refresh(node5)
    node6 = Node(
        scenario_id=scenario.id,
        question="Давление в норме (15.7 МПа). Ситуация под контролем.",
        is_final=True,
        final_action="ДЕЙСТВИЯ:\n1. Продолжить мониторинг температуры\n2. Проверить калибровку датчиков\n3. Зафиксировать инцидент в журнале\n4. Уведомить начальника смены\n5. Усилить наблюдение на следующие 2 часа"
    )
    db.add(node6)
    db.commit()
    db.refresh(node6)
    node7 = Node(
        scenario_id=scenario.id,
        question="Давление падает! Возможна разгерметизация контура.",
        is_final=True,
        final_action="СРОЧНО:\n1. Инициировать плановый останов реактора\n2. Локализовать утечку\n3. Активировать систему аварийного охлаждения\n4. Собрать аварийную комиссию\n5. Проверить уровни радиации в помещениях"
    )
    db.add(node7)
    db.commit()
    db.refresh(node7)
    answer1_1 = Answer(node_id=node1.id, text="Температура 350-400°C", next_node_id=node2.id)
    answer1_2 = Answer(node_id=node1.id, text="Температура выше 400°C", next_node_id=node3.id)
    answer2_1 = Answer(node_id=node2.id, text="Система работает нормально", next_node_id=node4.id)
    answer2_2 = Answer(node_id=node2.id, text="Обнаружена неисправность", next_node_id=node5.id)
    answer4_1 = Answer(node_id=node4.id, text="Давление в норме (15.7 МПа)", next_node_id=node6.id)
    answer4_2 = Answer(node_id=node4.id, text="Давление падает", next_node_id=node7.id)
    db.add_all([answer1_1, answer1_2, answer2_1, answer2_2, answer4_1, answer4_2])
    db.commit()
    scenario.root_node_id = node1.id
    db.commit()

    # ИЭ-46 КВА — тот же JSON, что подхватывается при старте API (app/data/)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ie46_path = os.path.join(backend_dir, "app", "data", "scenario_ie46_kva.json")
    with open(ie46_path, encoding="utf-8") as f:
        ie46_payload = json.load(f)
    ie46_in = schemas.ScenarioWithNodesCreate(**ie46_payload)
    scenario_ie46 = crud.create_scenario_with_nodes(db, ie46_in)

    print("✅ База данных успешно заполнена тестовыми данными!")
    print(f"   Сценарий 1: {scenario.name} (узлов 7, ответов 6)")
    print(f"   Сценарий 2: {scenario_ie46.name} (id={scenario_ie46.id})")
except Exception as e:
    print(f"❌ Ошибка: {e}")
    db.rollback()
finally:
    db.close()
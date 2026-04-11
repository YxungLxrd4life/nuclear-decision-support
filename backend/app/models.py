from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    root_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)

    nodes = relationship(
        "Node",
        back_populates="scenario",
        foreign_keys="Node.scenario_id"
    )

    root_node = relationship(
        "Node",
        foreign_keys=[root_node_id],
        post_update=True
    )


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    question = Column(Text)
    is_final = Column(Boolean, default=False)
    final_action = Column(Text, nullable=True)

    scenario = relationship(
        "Scenario",
        back_populates="nodes",
        foreign_keys=[scenario_id]
    )

    answers = relationship(
        "Answer",
        back_populates="node",
        foreign_keys="Answer.node_id",
        cascade="all, delete-orphan"
    )


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)

    node_id = Column(Integer, ForeignKey("nodes.id"))
    next_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)

    text = Column(String)

    node = relationship(
        "Node",
        back_populates="answers",
        foreign_keys=[node_id]
    )

    next_node = relationship(
        "Node",
        foreign_keys=[next_node_id]
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    current_node_id = Column(Integer, ForeignKey("nodes.id"))
    is_completed = Column(Boolean, default=False)

    scenario = relationship("Scenario", foreign_keys=[scenario_id])
    current_node = relationship("Node", foreign_keys=[current_node_id])


class OperatorActionLog(Base):
    __tablename__ = "operator_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    operator_username = Column(String, index=True, nullable=False)
    action_type = Column(String, nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("user_sessions.id"), nullable=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=True)
    details = Column(Text, nullable=True)
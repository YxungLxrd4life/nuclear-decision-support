from pydantic import BaseModel
from typing import List, Optional


class AnswerBase(BaseModel):
    text: str
    next_node_id: Optional[int] = None


class AnswerCreate(AnswerBase):
    pass


class Answer(AnswerBase):
    id: int
    node_id: int

    class Config:
        from_attributes = True


class NodeBase(BaseModel):
    question: str
    is_final: bool = False
    final_action: Optional[str] = None


class NodeCreate(NodeBase):
    scenario_id: int


class Node(NodeBase):
    id: int
    scenario_id: int
    answers: List[Answer] = []

    class Config:
        from_attributes = True


class ScenarioBase(BaseModel):
    name: str
    description: str


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioAnswerDraft(BaseModel):
    text: str
    next_node_key: Optional[str] = None


class ScenarioNodeDraft(BaseModel):
    key: str
    question: str
    is_final: bool = False
    final_action: Optional[str] = None
    answers: List[ScenarioAnswerDraft] = []


class ScenarioWithNodesCreate(ScenarioBase):
    root_node_key: str
    nodes: List[ScenarioNodeDraft]


class Scenario(ScenarioBase):
    id: int
    root_node_id: Optional[int] = None

    class Config:
        from_attributes = True


class SessionStartRequest(BaseModel):
    scenario_id: int


class SessionState(BaseModel):
    session_id: int
    current_node: Node


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class OperatorActionLog(BaseModel):
    id: int
    created_at: str
    operator_username: str
    action_type: str
    scenario_id: Optional[int] = None
    session_id: Optional[int] = None
    node_id: Optional[int] = None
    answer_id: Optional[int] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True
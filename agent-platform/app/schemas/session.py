from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SessionCreate(BaseModel):
    pass


class SessionResponse(BaseModel):
    id: UUID
    agent_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    messages: list[dict]
    stream: bool = True


class MessageResponse(BaseModel):
    role: str
    content: str | None = None
    tool_calls: list[dict] | None = None

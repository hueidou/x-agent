from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    system_prompt: str = Field(default="You are a helpful assistant.")
    model: dict = Field(default={"provider": "openai", "name": "gpt-4o", "temperature": 0.7})
    tools: list[dict] = Field(default_factory=list)
    memory: dict = Field(default={"max_history": 50})
    max_iterations: int = Field(default=15, ge=1, le=100)


class AgentCreate(BaseModel):
    name: str
    config: AgentConfig


class AgentUpdate(BaseModel):
    name: str | None = None
    config: AgentConfig | None = None


class AgentResponse(BaseModel):
    id: UUID
    name: str
    config: AgentConfig
    api_key: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]

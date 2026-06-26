import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.db.database import get_db
from app.models.agent import Agent
from app.models.session import Session as SessionModel
from app.schemas.session import ChatRequest
from app.runtime.manager import manager

router = APIRouter(tags=["chat"])


@router.post("/api/v1/agents/{agent_id}/sessions/{session_id}/chat")
async def chat(
    agent_id: uuid.UUID,
    session_id: uuid.UUID,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    session = await db.get(SessionModel, session_id)
    if not session or session.agent_id != agent_id:
        raise HTTPException(404, "Session not found")

    executor = manager.get_or_create(str(agent_id), agent.config)

    history = session.messages or []
    full_messages = history + body.messages

    if not body.stream:
        result = await executor.invoke(full_messages)
        session.messages = full_messages + [result]
        await db.commit()
        return result

    async def event_stream():
        async for event in executor.stream(full_messages):
            yield {"event": event["type"], "data": json.dumps(event, ensure_ascii=False)}

        all_messages = history + body.messages + [{"role": "assistant", "content": ""}]
        session.messages = all_messages
        session.updated_at = None
        await db.commit()

    return EventSourceResponse(event_stream())

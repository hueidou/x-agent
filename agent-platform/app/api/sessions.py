import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.agent import Agent
from app.models.session import Session
from app.schemas.session import SessionCreate, SessionResponse

router = APIRouter(prefix="/api/v1/agents/{agent_id}/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(agent_id: uuid.UUID, body: SessionCreate, db: AsyncSession = Depends(get_db)):
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    session = Session(id=uuid.uuid4(), agent_id=agent_id, messages=[], metadata_={})
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("")
async def list_sessions(agent_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.agent_id == agent_id).order_by(Session.created_at.desc())
    )
    return {"sessions": result.scalars().all()}


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(agent_id: uuid.UUID, session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.agent_id != agent_id:
        raise HTTPException(404, "Session not found")
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(agent_id: uuid.UUID, session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session or session.agent_id != agent_id:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()

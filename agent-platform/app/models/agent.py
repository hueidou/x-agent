import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Text, JSON, Uuid

from app.db.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    config = Column(JSON, nullable=False)
    api_key = Column(Text, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

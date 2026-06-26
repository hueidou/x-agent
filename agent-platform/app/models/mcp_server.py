import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Text, JSON

from app.db.database import Base


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    transport = Column(Text, nullable=False)
    config = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

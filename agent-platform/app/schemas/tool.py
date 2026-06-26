from pydantic import BaseModel


class MCPServerCreate(BaseModel):
    id: str
    name: str
    transport: str
    config: dict


class ToolInfo(BaseModel):
    name: str
    description: str
    input_schema: dict
    source: str


class MCPServerResponse(BaseModel):
    id: str
    name: str
    transport: str
    config: dict

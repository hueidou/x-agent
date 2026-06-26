from fastapi import APIRouter

from app.runtime.tools import get_tool_registry
from app.schemas.tool import MCPServerCreate, MCPServerResponse

router = APIRouter(prefix="/api/v1", tags=["tools"])


@router.get("/tools")
async def list_tools():
    registry = get_tool_registry()
    tools = await registry.list_all_tools()
    return {"tools": tools}


@router.post("/mcp-servers", status_code=201)
async def register_mcp(body: MCPServerCreate):
    registry = get_tool_registry()
    await registry.register_mcp(body.id, body.transport, body.config)
    return MCPServerResponse(id=body.id, name=body.name, transport=body.transport, config=body.config)


@router.delete("/mcp-servers/{server_id}", status_code=204)
async def unregister_mcp(server_id: str):
    registry = get_tool_registry()
    await registry.unregister_mcp(server_id)

import httpx
from langchain_core.tools import BaseTool

from app.runtime.mcp_client import MCPClient


class _BuiltinLangTool(BaseTool):
    fn: callable

    def _run(self, **kwargs):
        raise NotImplementedError("async only")

    async def _arun(self, **kwargs):
        return await self.fn(**kwargs)


class _MCPLangTool(BaseTool):
    name: str
    description: str
    args_schema: dict
    call_func: callable

    def _run(self, **kwargs):
        raise NotImplementedError("async only")

    async def _arun(self, **kwargs):
        return await self.call_func(**kwargs)


class ToolRegistry:
    def __init__(self):
        self._mcp_clients: dict[str, MCPClient] = {}
        self._builtin_tools: dict = {}

    def register_builtin(self, name: str, description: str, input_schema: dict, fn):
        self._builtin_tools[name] = {
            "name": name,
            "description": description,
            "input_schema": input_schema,
            "fn": fn,
        }

    async def register_mcp(self, server_id: str, transport: str, config: dict):
        client = MCPClient(transport, config)
        await client.connect()
        self._mcp_clients[server_id] = client

    async def unregister_mcp(self, server_id: str):
        client = self._mcp_clients.pop(server_id, None)
        if client:
            await client.close()

    async def list_all_tools(self) -> list[dict]:
        tools = []
        for t in self._builtin_tools.values():
            tools.append({
                "name": t["name"],
                "description": t["description"],
                "input_schema": t["input_schema"],
                "source": "builtin",
            })
        for sid, client in self._mcp_clients.items():
            for mt in await client.list_tools():
                tools.append({
                    "name": mt.name,
                    "description": mt.description,
                    "input_schema": mt.input_schema,
                    "source": f"mcp:{sid}",
                })
        return tools

    async def resolve_tools(self, tool_refs: list[dict]) -> list[BaseTool]:
        result = []
        builtin_map = {n: t for n, t in self._builtin_tools.items()}
        mcp_tools_map = {}
        for sid, client in self._mcp_clients.items():
            for mt in await client.list_tools():
                mcp_tools_map[mt.name] = (mt, sid)

        def _build_schema(raw: dict) -> dict:
            if not raw:
                return {"type": "object", "properties": {}}
            return raw

        for ref in tool_refs:
            ttype = ref.get("type", "builtin")
            name = ref.get("name", "")

            if ttype == "builtin" and name in builtin_map:
                bt = builtin_map[name]
                result.append(_BuiltinLangTool(
                    name=bt["name"],
                    description=bt["description"],
                    args_schema=_build_schema(bt["input_schema"]),
                    fn=bt["fn"],
                ))
            elif ttype == "mcp" and name in mcp_tools_map:
                mt, _ = mcp_tools_map[name]
                result.append(_MCPLangTool(
                    name=mt.name,
                    description=mt.description,
                    args_schema=_build_schema(mt.input_schema),
                    call_func=mt.call,
                ))
            elif ttype == "mcp" and name == "*":
                for mt, _ in mcp_tools_map.values():
                    result.append(_MCPLangTool(
                        name=mt.name,
                        description=mt.description,
                        args_schema=_build_schema(mt.input_schema),
                        call_func=mt.call,
                    ))

        return result


_registry: ToolRegistry | None = None


def get_tool_registry() -> ToolRegistry:
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
        _registry.register_builtin(
            name="web_search",
            description="Search the web for current information",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "search query"}
                },
                "required": ["query"],
            },
            fn=_web_search,
        )
    return _registry


async def _web_search(query: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://lite.duckduckgo.com/lite/", params={"q": query})
            return resp.text[:2000]
    except Exception as e:
        return f"search failed: {e}"

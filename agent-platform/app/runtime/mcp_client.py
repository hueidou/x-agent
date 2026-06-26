import json

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from mcp.client.sse import sse_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    ClientSession = None
    StdioServerParameters = None
    stdio_client = None
    sse_client = None


class MCPTool:
    def __init__(self, name: str, description: str, input_schema: dict, call_func):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self._call = call_func

    async def call(self, **kwargs) -> str:
        return await self._call(**kwargs)


class MCPClient:
    def __init__(self, transport: str, config: dict):
        self.transport = transport
        self.config = config
        self._session: ClientSession | None = None
        self._ctx = None

    async def connect(self):
        if not MCP_AVAILABLE:
            raise RuntimeError("MCP SDK not installed. Run: pip install mcp")
        if self.transport == "stdio":
            params = StdioServerParameters(
                command=self.config["command"],
                args=self.config.get("args", []),
                env=self.config.get("env"),
            )
            ctx = stdio_client(params)
            self._ctx = ctx.__aenter__()
            read, write = await self._ctx
            self._session = await ClientSession(read, write).__aenter__()
            await self._session.initialize()

        elif self.transport == "sse":
            ctx = sse_client(self.config["url"])
            self._ctx = ctx.__aenter__()
            read, write = await self._ctx
            self._session = await ClientSession(read, write).__aenter__()
            await self._session.initialize()

    async def list_tools(self) -> list[MCPTool]:
        if not self._session:
            raise RuntimeError("MCP not connected")
        result = await self._session.list_tools()
        tools = []

        async def _make_call(name: str):
            async def call(**kwargs) -> str:
                resp = await self._session.call_tool(name, arguments=kwargs)
                return resp.content[0].text if resp.content else ""
            return call

        for t in result.tools:
            fn = await _make_call(t.name)
            tools.append(MCPTool(
                name=t.name,
                description=t.description or "",
                input_schema=t.inputSchema or {},
                call_func=fn,
            ))
        return tools

    async def close(self):
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._ctx:
            await self._ctx.__aexit__(None, None, None)

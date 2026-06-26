# Agent Runtime

## Architecture

```
Agent Config
    │
    ▼
AgentExecutor.build()
    │
    ├── ToolRegistry.resolve_tools()
    │   ├── "builtin" → lookup in registry
    │   └── "mcp"    → lookup in MCP clients
    │
    ├── ChatOpenAI(model, base_url, streaming=True)
    │
    └── create_react_agent(model, tools, prompt, MemorySaver())
        │
        └── LangGraph StateGraph (ReAct loop)
              ┌─────────────┐
              │  LLM Call   │ ◄────┐
              └──────┬──────┘      │
                     │             │
              ┌──────▼──────┐      │
              │ Tool Call?  │      │
              └──┬───────┬──┘      │
           Yes   │       │  No     │
                 ▼       ▼         │
          ┌──────────┐ ┌──────┐    │
          │ Execute  │ │ Done │    │
          │ Tool     │ │      │    │
          └────┬─────┘ └──────┘    │
               │                   │
               └───────────────────┘
```

## Executor (executor.py)

### Message Conversion

`_convert_to_langchain()` maps dict messages to LangChain types:

| role      | LangChain Type      |
|-----------|---------------------|
| system    | SystemMessage       |
| user      | HumanMessage        |
| assistant | AIMessage           |
| tool      | ToolMessage         |

### Streaming (SSE Events)

The `stream()` method is an async generator that yields events from `astream_events`:

| Event Type    | LangGraph Event       | Fields                     |
|---------------|-----------------------|----------------------------|
| `delta`       | `on_chat_model_stream`| `content` (token text)     |
| `tool_call`   | `on_tool_start`       | `name`, `arguments`        |
| `tool_result` | `on_tool_end`         | `name`, `content` (~1KB)   |
| `done`        | after loop ends       | `usage` (empty)            |

LLM call counting uses `on_chat_model_start` to enforce `max_iterations`.

### Non-Streaming

The `invoke()` method calls `ainvoke()` on the graph and returns the final `AIMessage.content`.

## Tool Registry (tools.py)

### Built-in Tools

| Tool          | Description                        | Implementation                 |
|---------------|------------------------------------|--------------------------------|
| `web_search`  | DuckDuckGo Lite web search         | `httpx` GET, parse HTML, ~2KB  |

### Tool Resolution

Config `tools` entries:
```json
{ "type": "builtin", "name": "web_search" }
{ "type": "mcp", "name": "specific-tool" }
{ "type": "mcp", "name": "*" }       // all MCP tools
```

### MCP Support

MCP servers can be registered at runtime via API. Two transports:
- **SSE**: Remote server with HTTP endpoint
- **STDIO**: Local process with stdin/stdout

MCP SDK (`mcp` Python package) is optional — if missing, MCP features are disabled gracefully.

## Executor Manager (manager.py)

- In-memory cache `dict[str, AgentExecutor]`
- `get_or_create(agent_id, config)`: returns cached or creates new
- `invalidate(agent_id)`: called on agent update/delete

# Architecture

## High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (UI)                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  React App (Vite dev server :5173)              │    │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────────┐   │    │
│  │  │ AgentList│ │ Session    │ │ ToolPanel    │   │    │
│  │  │ AgentForm│ │ Panel      │ │              │   │    │
│  │  └──────────┘ └────────────┘ └──────────────┘   │    │
│  │           ↕ API calls + SSE streams              │    │
│  └─────────────────────┬───────────────────────────┘    │
└────────────────────────┼────────────────────────────────┘
                         │ proxy (/api → :8001)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (:8001)                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Agents   │  │ Sessions │  │ Chat     │  │ Tools  │  │
│  │ Router   │  │ Router   │  │ Router   │  │ Router │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │             │             │       │
│  ┌────▼──────────────▼─────────────▼─────────────▼────┐  │
│  │               SQLAlchemy (async)                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │ Agent    │  │ Session  │  │ MCPServer        │   │  │
│  │  │ Model    │  │ Model    │  │ Model            │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│              ┌──────────▼──────────┐                      │
│              │  Database (SQLite   │                      │
│              │  or PostgreSQL)     │                      │
│              └─────────────────────┘                      │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │           Agent Runtime                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ││
│  │  │ Executor     │  │ ToolRegistry │  │ MCP Client │  ││
│  │  │ Manager      │  │              │  │            │  ││
│  │  └──────┬───────┘  └──────────────┘  └────────────┘  ││
│  │         │                                              ││
│  │  ┌──────▼───────┐                                      ││
│  │  │ LangGraph    │                                      ││
│  │  │ ReAct Agent  │                                      ││
│  │  │ + ChatOpenAI │                                      ││
│  │  └──────────────┘                                      ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ LLM API (DeepSeek,  │
              │ OpenAI, etc.)       │
              └─────────────────────┘
```

## Request Flow (Streaming Chat)

```
1. POST /api/v1/agents/{id}/sessions/{sid}/chat
   Body: { messages: [...], stream: true }

2. Chat router loads Agent + Session from DB

3. manager.get_or_create(agent_id, config) → AgentExecutor
   - Cache hit: return cached executor
   - Cache miss: build new LangGraph ReAct agent

4. AgentExecutor.stream(messages):
   a. Convert dict messages → LangChain BaseMessage objects
   b. Call graph.astream_events({messages}, version="v2")
   c. LangGraph runs ReAct loop:
      - LLM call → on_chat_model_stream events (token chunks)
      - Tool decision → on_tool_start / on_tool_end events
      - Final response → loop completes
   d. After loop → yield "done" event

5. EventSourceResponse wraps async generator as SSE:
   event: delta     data: {"type":"delta","content":"Hello"}
   event: tool_call data: {"type":"tool_call","name":"web_search",...}
   event: done      data: {"type":"done","usage":{}}

6. After stream completes, save messages to session in DB

7. Frontend parseSSEStream reads ReadableStreamDefaultReader:
   - delta → append to streaming text
   - tool_call → add to tool log
   - tool_result → add result to tool log
   - done → finalize assistant message
```

## Database

Three tables: `agents`, `sessions`, `mcp_servers`.

Auto-detection: if `DATABASE_URL` contains `postgresql`, use asyncpg; otherwise use aiosqlite.

## Executor Cache

`ExecutorManager` caches `AgentExecutor` instances in memory keyed by agent_id. Cache is invalidated when agent is updated or deleted. Each executor holds a single `LangGraph` ReAct agent graph.

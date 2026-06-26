# X-Agent Platform

An open-source AI Agent platform for creating, managing, running, and integrating AI agents into external systems.

## Architecture

```mermaid
graph TB
    Browser["Browser"] -->|HTTP + SSE| Frontend
    subgraph Frontend ["React + Vite"]
        UI["AgentList · SessionPanel · ToolPanel"]
        API["api/client.ts"]
    end
    Frontend -->|proxy| Backend
    subgraph Backend ["FastAPI :8001"]
        Agents["/api/v1/agents<br>Agent CRUD"]
        Sessions["/api/v1/agents/:id/sessions<br>Session CRUD"]
        Chat["/api/v1/agents/:id/sessions/:id/chat<br>SSE Streaming"]
        Tools["/api/v1/tools · /mcp-servers<br>Tool & MCP Registry"]
        Health["/health"]
        Executor["AgentExecutor<br>LangGraph ReAct"]
    end
    Backend -->|SQLAlchemy| DB[("SQLite / PostgreSQL")]
    Executor --> Chat
    Executor -->|astream_events| LLM["OpenAI-compatible API<br>DeepSeek / OpenAI / ..."]
    Tools -->|MCP SDK| MCP["MCP Servers<br>SSE / STDIO"]
    Agents -->|get_or_create| Manager["ExecutorManager (cache)"]
    Manager --> Executor
```

## API

```mermaid
graph LR
    subgraph Agents ["Agents"]
        A1["POST   /agents"]
        A2["GET    /agents"]
        A3["GET    /agents/:id"]
        A4["PUT    /agents/:id"]
        A5["DELETE /agents/:id"]
    end
    subgraph Sessions ["Sessions"]
        S1["POST   /agents/:id/sessions"]
        S2["GET    /agents/:id/sessions"]
        S3["GET    /agents/:id/sessions/:sid"]
        S4["DELETE /agents/:id/sessions/:sid"]
    end
    subgraph Chat ["Chat"]
        C1["POST /agents/:id/sessions/:sid/chat<br>stream=true → SSE"]
        C2["POST /agents/:id/sessions/:sid/chat<br>stream=false → JSON"]
    end
    subgraph Tools ["Tools & MCP"]
        T1["GET    /tools"]
        T2["POST   /mcp-servers"]
        T3["DELETE /mcp-servers/:id"]
    end
```

## Chat Streaming Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as FastAPI
    participant EX as AgentExecutor
    participant LG as LangGraph ReAct
    participant LLM as LLM API

    FE->>BE: POST /chat {stream: true}
    BE->>EX: executor.stream(messages)
    EX->>LG: astream_events(version="v2")
    LG->>LLM: ChatOpenAI(model, streaming=True)
    LLM-->>LG: on_chat_model_stream (token)
    LG-->>EX: {type: "delta", content: "你"}
    EX-->>BE: SSE event: delta
    LLM-->>LG: on_chat_model_stream (token)
    LG-->>EX: {type: "delta", content: "好"}
    EX-->>BE: SSE event: delta
    LG->>LG: tool_call decision
    LG-->>EX: on_tool_start
    EX-->>BE: SSE event: tool_call
    EX->>EX: run tool (web_search)
    EX-->>BE: SSE event: tool_result
    LG->>LLM: follow-up with tool result
    LLM-->>LG: on_chat_model_stream (final)
    LG-->>EX: {type: "delta", content: "..."}
    EX-->>BE: SSE event: delta
    LG-->>EX: stream ends
    EX-->>BE: SSE event: done
    BE-->>FE: SSE: done
```

- **Backend**: FastAPI + SQLAlchemy + LangGraph + SSE streaming
- **Frontend**: React 19 + Vite + TypeScript + shadcn/ui + Tailwind v4
- **Database**: PostgreSQL (prod) / SQLite (dev), auto-detected via `DATABASE_URL`
- **Agent Runtime**: LangGraph `create_react_agent` with tool calling and streaming
- **Model**: OpenAI-compatible API (DeepSeek, OpenAI, LiteLLM proxy, etc.)

## Quick Start

### Backend

```powershell
cd agent-platform
pip install -e .
$env:OPENAI_API_KEY="sk-your-key"
$env:OPENAI_API_BASE="https://api.deepseek.com/v1"
uvicorn app.main:app --port 8001
```

### Frontend

```powershell
cd agent-frontend
npm install
npm run dev
```

Open http://localhost:5173 to use the UI.

## Project Structure

```
agent-platform/          # Python/FastAPI backend
├── app/
│   ├── api/             # REST API routes
│   │   ├── agents.py    # Agent CRUD
│   │   ├── sessions.py  # Session management
│   │   ├── chat.py      # Streaming/non-streaming chat
│   │   └── tools.py     # Tool listing & MCP registration
│   ├── db/              # Database engine & session
│   ├── models/          # SQLAlchemy ORM models
│   ├── runtime/         # Core agent engine
│   │   ├── executor.py  # LangGraph ReAct agent
│   │   ├── manager.py   # Executor cache
│   │   ├── tools.py     # Tool registry & web_search
│   │   └── mcp_client.py# MCP protocol client
│   └── schemas/         # Pydantic request/response models
├── test_full.py         # Comprehensive integration test
├── Dockerfile
└── docker-compose.yml

agent-frontend/          # React/Vite frontend
├── src/
│   ├── components/
│   │   ├── AgentList.tsx
│   │   ├── AgentForm.tsx
│   │   ├── SessionPanel.tsx
│   │   ├── ToolPanel.tsx
│   │   └── ui/          # shadcn/ui primitives
│   ├── api/client.ts    # API client & SSE parser
│   ├── types/index.ts   # TypeScript interfaces
│   └── lib/utils.ts     # cn() utility
└── vite.config.ts
```

## Key Features

- **Agent CRUD** — Create, list, update, delete agents with configurable models and tools
- **Streaming Chat** — Real-time SSE streaming with per-token deltas, tool call logs
- **Tool Calling** — Built-in `web_search` tool + any MCP-compatible tool servers
- **MCP Protocol** — Register STDIO or SSE-based MCP servers, use their tools in agents
- **Session Management** — Persistent conversation history per agent
- **Multiple Models** — Per-agent model config; works with any OpenAI-compatible API
- **SQLite/PostgreSQL** — Zero-config SQLite for dev, PostgreSQL for production

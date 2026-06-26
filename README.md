# X-Agent Platform

An open-source AI Agent platform for creating, managing, running, and integrating AI agents into external systems.

## Platform

```
+-------------------------------------------+
|           X-Agent Platform                |
|-------------------------------------------|
|                                           |
|  +----------+ +----------+ +----------+   |
|  | Agents   | | Sessions | | Chat     |   |
|  | CRUD     | | CRUD     | | (SSE)    |   |
|  +----------+ +----------+ +----------+   |
|                                           |
|  +----------+ +-----------+               |
|  | Tools &  | | Executor  |               |
|  | MCP Reg  | | Mgr Cache |               |
|  +----------+ +-----------+               |
|                                           |
+-------------------------------------------+
```

## Features

- **Agent CRUD** — Create, list, update, delete agents with configurable models and tools
- **Streaming Chat** — Real-time SSE streaming with per-token deltas, tool call logs
- **Tool Calling** — Built-in `web_search` tool + any MCP-compatible tool servers
- **MCP Protocol** — Register STDIO or SSE-based MCP servers, use their tools in agents
- **Session Management** — Persistent conversation history per agent
- **Multiple Models** — Per-agent model config; works with any OpenAI-compatible API
- **SQLite / PostgreSQL** — Zero-config SQLite for dev, PostgreSQL for production

## Quick Start

```bash
cd agent-platform
pip install -e .
export OPENAI_API_KEY="sk-your-key"
export OPENAI_API_BASE="https://api.deepseek.com/v1"
uvicorn app.main:app --port 8001
```

## Tech Stack

- **Framework**: FastAPI
- **ORM**: SQLAlchemy (async)
- **Agent Runtime**: LangGraph `create_react_agent`
- **LLM Client**: langchain-openai (OpenAI-compatible)
- **Database**: PostgreSQL (prod) / SQLite (dev)
- **Streaming**: Server-Sent Events (sse-starlette)
- **Tools**: Built-in registry + MCP protocol client

## Project Structure

```
agent-platform/
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
├── test_full.py         # Integration test (all 10 endpoints)
├── Dockerfile
└── docker-compose.yml
```

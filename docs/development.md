# Development

## Prerequisites

- Python 3.12+
- Node.js 20+
- PowerShell 7+ (Windows)

## Setup

### Backend

```powershell
cd agent-platform
pip install -e .

# Copy and edit environment
copy .env.example .env
# Edit .env with your API keys

# Start dev server
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_API_BASE="https://api.deepseek.com/v1"
uvicorn app.main:app --port 8001 --reload
```

### Frontend

```powershell
cd agent-frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Testing

### Integration Test

```powershell
cd agent-platform
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_API_BASE="https://api.deepseek.com/v1"
python test_full.py
```

This tests all 10 API endpoints:
1. Create agent (with web_search tool)
2. List agents
3. Update agent name
4. Create session
5. Streaming chat (with tool calls)
6. Non-streaming chat
7. List tools
8. Get agent details
9. Delete session
10. Delete agent

### Manual API Test (curl)

```powershell
# Create agent
$agent = curl -s -X POST "http://localhost:8001/api/v1/agents" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"test\",\"config\":{\"system_prompt\":\"You are helpful.\",\"model\":{\"provider\":\"openai\",\"name\":\"deepseek-v4-flash\",\"api_base\":\"https://api.deepseek.com/v1\",\"temperature\":0.7},\"tools\":[],\"memory\":{\"max_history\":50},\"max_iterations\":10}}' `
  | ConvertFrom-Json

# Create session
$session = curl -s -X POST "http://localhost:8001/api/v1/agents/$($agent.id)/sessions" `
  -H "Content-Type: application/json" -d '{}' | ConvertFrom-Json

# Chat (streaming)
curl -N -X POST "http://localhost:8001/api/v1/agents/$($agent.id)/sessions/$($session.id)/chat" `
  -H "Content-Type: application/json" `
  -d '{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"stream\":true}'
```

## Architecture Decisions

### Why LangGraph `create_react_agent`?

- Production-proven, actively maintained
- Built-in ReAct loop with tool calling
- `astream_events` provides granular streaming events
- `MemorySaver` checkpointing for session state
- Easy to extend with custom nodes

### Why ChatOpenAI instead of LiteLLM?

- Fewer dependencies
- Works with any OpenAI-compatible API via `base_url`
- Consistent streaming behavior
- LiteLLM is available as an optional proxy layer

### Why SSE streaming?

- Standard HTTP protocol, no WebSocket needed
- Works through proxies and load balancers
- Easy to consume from any HTTP client
- `sse-starlette` handles chunked encoding

### Why per-agent model config?

- Each agent can use a different provider/model
- No global configuration changes needed
- Easy to test different models side-by-side
- Supports BYOK (bring your own API key)

## Project Conventions

### Backend

| Convention | Standard |
|------------|----------|
| Web framework | FastAPI |
| ORM | SQLAlchemy 2.0 async |
| Validation | Pydantic v2 |
| Agent framework | LangGraph |
| LLM client | langchain-openai ChatOpenAI |
| Database | SQLite (dev) / PostgreSQL (prod) |

### Frontend

| Convention | Standard |
|------------|----------|
| UI framework | React 19 + hooks |
| Build tool | Vite 6 |
| Language | TypeScript strict |
| CSS | Tailwind v4 |
| UI library | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| HTTP | fetch API (no axios) |

## Troubleshooting

### SSE events arrive in wrong order

DeepSeek API emits many empty `AIMessageChunk` objects before actual text content. Ensure `step` counting uses `on_chat_model_start`, not every raw event.

### Frontend shows no response

Check browser console for errors. Common issues:
- CORS (ensure backend has CORS middleware)
- Wrong proxy port in `vite.config.ts`
- SSE parser not handling event types correctly

### "Chat failed" error

Backend may be down or agent/session doesn't exist. Check:
- Backend is running on the expected port
- Agent and session IDs are valid UUIDs
- Database file exists (SQLite)

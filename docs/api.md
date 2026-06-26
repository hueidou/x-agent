# API Reference

Base URL: `http://localhost:8001/api/v1`

## Agents

### Create Agent

```
POST /agents
```

```json
{
  "name": "my-agent",
  "config": {
    "system_prompt": "You are a helpful assistant.",
    "model": {
      "provider": "openai",
      "name": "deepseek-v4-flash",
      "api_base": "https://api.deepseek.com/v1",
      "temperature": 0.7
    },
    "tools": [
      { "type": "builtin", "name": "web_search" }
    ],
    "memory": { "max_history": 50 },
    "max_iterations": 10
  }
}
```

Response `201`:
```json
{
  "id": "uuid",
  "name": "my-agent",
  "config": { ... },
  "api_key": "ask-...",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### List Agents

```
GET /agents
```

Response:
```json
{
  "agents": [ { ... }, { ... } ]
}
```

### Get Agent

```
GET /agents/{agent_id}
```

### Update Agent

```
PUT /agents/{agent_id}
```

```json
{
  "name": "new-name",
  "config": { ... }
}
```

### Delete Agent

```
DELETE /agents/{agent_id}
```

Response `204`.

## Sessions

### Create Session

```
POST /agents/{agent_id}/sessions
```

Body: `{}`

Response:
```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "created_at": "...",
  "updated_at": "..."
}
```

### List Sessions

```
GET /agents/{agent_id}/sessions
```

### Get Session

```
GET /agents/{agent_id}/sessions/{session_id}
```

### Delete Session

```
DELETE /agents/{agent_id}/sessions/{session_id}
```

Response `204`.

## Chat

### Streaming Chat

```
POST /agents/{agent_id}/sessions/{session_id}/chat
```

```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true
}
```

Returns `text/event-stream`:

```
event: delta
data: {"type":"delta","content":"Hello"}

event: delta
data: {"type":"delta","content":"!"}

event: tool_call
data: {"type":"tool_call","name":"web_search","arguments":{"query":"..."}}

event: tool_result
data: {"type":"tool_result","name":"web_search","content":"..."}

event: done
data: {"type":"done","usage":{}}
```

### Non-Streaming Chat

```
POST /agents/{agent_id}/sessions/{session_id}/chat
```

```json
{
  "messages": [ ... ],
  "stream": false
}
```

Response:
```json
{
  "role": "assistant",
  "content": "Hello!"
}
```

## Tools

### List Tools

```
GET /tools
```

### Register MCP Server

```
POST /mcp-servers
```

```json
{
  "id": "my-server",
  "name": "My Server",
  "transport": "sse",
  "config": {
    "url": "https://example.com/mcp"
  }
}
```

Transport options:
- `sse`: requires config `{ "url": "..." }`
- `stdio`: requires config `{ "command": "...", "args": [...] }`

### Unregister MCP Server

```
DELETE /mcp-servers/{server_id}
```

## Health

```
GET /health
```

Response: `{"status": "ok"}`

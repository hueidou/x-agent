# Frontend

## Stack

- **React 19** with hooks and functional components
- **Vite 6** for dev server and build
- **TypeScript** (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **shadcn/ui** style primitives built on Radix UI
- **Lucide React** for icons

## Component Tree

```
App
├── Header (status indicator, logo)
├── Tabs
│   ├── Agents
│   │   ├── AgentList
│   │   │   ├── AgentCard × N
│   │   │   ├── AgentForm (create/edit inline)
│   │   │   ├── Dialog (agent detail)
│   │   │   └── SessionPanel (modal overlay)
│   │   │       ├── SessionSidebar
│   │   │       └── ChatArea
│   │   │           ├── MessageList
│   │   │           ├── ToolLog
│   │   │           ├── StreamingText
│   │   │           └── InputBar
│   │   └── ToolPanel
│   │       ├── ToolsList
│   │       └── MCPRegistration
```

## Key Files

### `src/api/client.ts`
- Generic `request<T>(url, init?)` with JSON headers and error handling
- All CRUD functions: `createAgent`, `listAgents`, `getAgent`, `updateAgent`, `deleteAgent`
- Session functions: `createSession`, `listSessions`, `getSession`, `deleteSession`
- Chat: `chat(agentId, sessionId, messages, stream?)` — returns JSON or `ReadableStreamDefaultReader`
- `parseSSEStream(reader, onEvent)` — reads SSE chunks, parses `data:` lines as JSON, dispatches `StreamEvent`

### `src/types/index.ts`

```typescript
AgentConfig {
  system_prompt: string
  model: { provider, name, api_base?, temperature }
  tools: { type: "builtin"|"mcp", name: string }[]
  memory: { max_history: number }
  max_iterations: number
}

Agent { id, name, config, api_key, created_at, updated_at }

Session { id, agent_id, created_at, updated_at }

StreamEvent {
  type: "delta" | "tool_call" | "tool_result" | "done"
  content?: string
  name?: string
  arguments?: Record<string, unknown>
  usage?: Record<string, unknown>
}
```

### `src/components/SessionPanel.tsx`
Chat is a full-screen modal with:
- **Left sidebar**: session list (truncated UUIDs, timestamps, delete button)
- **Main area**: scrollable messages with user/assistant avatars, tool call logs, streaming indicator

Streaming flow:
1. User hits Send → `POST` with `stream: true`
2. Response body's `ReadableStreamDefaultReader` is parsed by `parseSSEStream`
3. `delta` → append to `streamText` state and a ref (for final capture)
4. `tool_call` / `tool_result` → append to `toolLog` state
5. `done` → move accumulated stream text to `messages` as assistant message

### `src/components/AgentForm.tsx`
Create/edit form with fields:
- Name, System Prompt (textarea), Model name, API Base URL
- Enable Tools checkbox → comma-separated tools input (supports `mcp:` prefix, `*` wildcard)
- Max Iterations number input

### UI Primitives (`src/components/ui/`)
All standard shadcn-style components: Button, Input, Textarea, Label, Card, Badge, Tabs, Select, Dialog, ScrollArea, Separator, Avatar, Skeleton.

## Styling

- CSS variables in `src/index.css` (OKLCH color space)
- Light and dark theme support via `.dark` class
- Monospace font family as default
- Tailwind v4 `@theme inline` block maps CSS vars to theme tokens

## Vite Config

- Dev server on port `5173`
- Proxy `/api` and `/health` to `http://localhost:8001` (backend)
- Tailwind CSS plugin via `@tailwindcss/vite`

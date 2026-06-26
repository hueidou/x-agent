import type { Agent, Session, ToolInfo, MCPServer, StreamEvent } from "../types";

const BASE = "/api/v1";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// === Agents ===
export function createAgent(name: string, config: Agent["config"]) {
  return request<Agent>(`${BASE}/agents`, {
    method: "POST",
    body: JSON.stringify({ name, config }),
  });
}

export function listAgents() {
  return request<{ agents: Agent[] }>(`${BASE}/agents`);
}

export function getAgent(id: string) {
  return request<Agent>(`${BASE}/agents/${id}`);
}

export function updateAgent(id: string, data: { name?: string; config?: Agent["config"] }) {
  return request<Agent>(`${BASE}/agents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteAgent(id: string) {
  return request<void>(`${BASE}/agents/${id}`, { method: "DELETE" });
}

// === Sessions ===
export function createSession(agentId: string) {
  return request<Session>(`${BASE}/agents/${agentId}/sessions`, {
    method: "POST",
    body: "{}",
  });
}

export function listSessions(agentId: string) {
  return request<{ sessions: Session[] }>(`${BASE}/agents/${agentId}/sessions`);
}

export function getSession(agentId: string, sessionId: string) {
  return request<Session>(`${BASE}/agents/${agentId}/sessions/${sessionId}`);
}

export function deleteSession(agentId: string, sessionId: string) {
  return request<void>(`${BASE}/agents/${agentId}/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

// === Chat (non-streaming) ===
export async function chat(
  agentId: string,
  sessionId: string,
  messages: { role: string; content: string }[],
  stream = false
): Promise<{ role: string; content: string } | ReadableStreamDefaultReader<Uint8Array>> {
  if (!stream) {
    return request(`${BASE}/agents/${agentId}/sessions/${sessionId}/chat`, {
      method: "POST",
      body: JSON.stringify({ messages, stream: false }),
    });
  }
  const res = await fetch(`${BASE}/agents/${agentId}/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: true }),
  });
  if (!res.ok) throw new Error("chat failed");
  return res.body!.getReader();
}

// === Tools ===
export function listTools() {
  return request<{ tools: ToolInfo[] }>(`${BASE}/tools`);
}

// === MCP ===
export function registerMCPServer(server: MCPServer) {
  return request<MCPServer>(`${BASE}/mcp-servers`, {
    method: "POST",
    body: JSON.stringify(server),
  });
}

export function unregisterMCPServer(id: string) {
  return request<void>(`${BASE}/mcp-servers/${id}`, { method: "DELETE" });
}

// === SSE Chat Parser ===
export function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (ev: StreamEvent) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  function processLines() {
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        try {
          const data = JSON.parse(trimmed.slice(5));
          onEvent(data as StreamEvent);
        } catch {
          // skip parse errors
        }
      }
    }
  }

  return new Promise((resolve) => {
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          processLines();
          resolve();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        processLines();
        pump();
      });
    }
    pump();
  });
}

export interface AgentConfig {
  system_prompt: string;
  model: {
    provider: string;
    name: string;
    api_base?: string;
    temperature: number;
  };
  tools: { type: string; name: string }[];
  memory: { max_history: number };
  max_iterations: number;
}

export interface Agent {
  id: string;
  name: string;
  config: AgentConfig;
  api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
}

export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  source: string;
}

export interface StreamEvent {
  type: "delta" | "tool_call" | "tool_result" | "done";
  content?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

export interface MCPServer {
  id: string;
  name: string;
  transport: string;
  config: Record<string, unknown>;
}

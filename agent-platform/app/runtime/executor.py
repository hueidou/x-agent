import json

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from app.runtime.tools import get_tool_registry


def _convert_to_langchain(msg: dict) -> BaseMessage:
    role = msg.get("role", "user")
    content = msg.get("content", "")
    tool_calls = msg.get("tool_calls")

    if role == "system":
        return SystemMessage(content=content)
    elif role == "user":
        return HumanMessage(content=content)
    elif role == "assistant":
        return AIMessage(content=content, tool_calls=tool_calls or [])
    elif role == "tool":
        return ToolMessage(content=content, tool_call_id=msg.get("tool_call_id", ""))
    return HumanMessage(content=content)


class AgentExecutor:
    def __init__(self, agent_id: str, config: dict):
        self.agent_id = agent_id
        self.config = config
        self._graph = None

    async def build(self):
        registry = get_tool_registry()
        tools = await registry.resolve_tools(self.config.get("tools", []))

        model_config = self.config.get("model", {})
        model_name = model_config.get("name", "gpt-4o")
        temperature = model_config.get("temperature", 0.7)
        max_tokens = model_config.get("max_tokens", 4096)
        api_base = model_config.get("api_base") or None

        from langchain_openai import ChatOpenAI
        model = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            base_url=api_base,
            streaming=True,
        )

        self._graph = create_react_agent(
            model=model,
            tools=tools,
            prompt=self.config.get("system_prompt", "You are a helpful assistant."),
            checkpointer=MemorySaver(),
        )

    async def stream(self, messages: list[dict]):
        if not self._graph:
            await self.build()

        lc_messages = [_convert_to_langchain(m) for m in messages]
        config = {"configurable": {"thread_id": self.agent_id}}
        max_iter = self.config.get("max_iterations", 15)
        llm_calls = 0

        async for event in self._graph.astream_events(
            {"messages": lc_messages},
            config=config,
            version="v2",
        ):
            kind = event.get("event", "")

            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk is not None:
                    text = getattr(chunk, "content", "")
                    if isinstance(text, str) and text:
                        yield {"type": "delta", "content": text}

            elif kind == "on_chat_model_start":
                llm_calls += 1
                if llm_calls > max_iter:
                    yield {"type": "done", "usage": {}}
                    return

            elif kind == "on_tool_start":
                yield {
                    "type": "tool_call",
                    "name": event.get("name", ""),
                    "arguments": event.get("data", {}).get("input", {}),
                }

            elif kind == "on_tool_end":
                output = event.get("data", {}).get("output", "")
                if hasattr(output, "content"):
                    text = str(output.content or "")[:1000]
                elif isinstance(output, str):
                    text = output[:1000]
                else:
                    text = str(output)[:1000]
                yield {"type": "tool_result", "name": event.get("name", ""), "content": text}

        yield {"type": "done", "usage": {}}

    async def invoke(self, messages: list[dict]) -> dict:
        if not self._graph:
            await self.build()

        lc_messages = [_convert_to_langchain(m) for m in messages]
        config = {"configurable": {"thread_id": self.agent_id}}

        result = await self._graph.ainvoke({"messages": lc_messages}, config=config)
        final = result["messages"][-1]
        return {
            "role": "assistant",
            "content": final.content if hasattr(final, "content") else str(final),
        }

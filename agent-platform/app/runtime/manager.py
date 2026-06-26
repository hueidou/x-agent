import json

from app.runtime.executor import AgentExecutor


class ExecutorManager:
    def __init__(self):
        self._cache: dict[str, AgentExecutor] = {}

    def get_or_create(self, agent_id: str, config: dict) -> AgentExecutor:
        if agent_id not in self._cache:
            self._cache[agent_id] = AgentExecutor(agent_id, config)
        return self._cache[agent_id]

    def invalidate(self, agent_id: str):
        self._cache.pop(agent_id, None)


manager = ExecutorManager()

import httpx, json, asyncio, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import os
DEEPSEEK_KEY = os.environ.get("OPENAI_API_KEY", "sk-your-key-here")
DEEPSEEK_BASE = "https://api.deepseek.com/v1"
BASE = "http://localhost:8001"


async def test_all():
    async with httpx.AsyncClient(base_url=BASE, timeout=120) as c:
        # ========== 1. Create agent ==========
        print("=== 1. 创建 Agent（带 web_search 工具）===")
        r = await c.post("/api/v1/agents", json={
            "name": "tool-agent",
            "config": {
                "system_prompt": "你是一个搜索助手，如果需要最新信息请使用 web_search 工具",
                "model": {
                    "provider": "openai",
                    "name": "deepseek-v4-flash",
                    "api_base": DEEPSEEK_BASE,
                    "temperature": 0.7,
                },
                "tools": [{"type": "builtin", "name": "web_search"}],
                "max_iterations": 10,
            },
        })
        agent = r.json()
        aid = agent["id"]
        print(f"  Agent: {agent['name']} ({aid})")
        assert agent["name"] == "tool-agent"

        # ========== 2. List agents ==========
        print("\n=== 2. 列出所有 Agent ===")
        r = await c.get("/api/v1/agents")
        agents = r.json()["agents"]
        print(f"  共 {len(agents)} 个")
        assert len(agents) >= 1

        # ========== 3. Update agent ==========
        print("\n=== 3. 更新 Agent 名称 ===")
        r = await c.put(f"/api/v1/agents/{aid}", json={"name": "tool-agent-v2"})
        print(f"  新名称: {r.json()['name']}")
        assert r.json()["name"] == "tool-agent-v2"

        # ========== 4. Create session ==========
        print("\n=== 4. 创建会话 ===")
        r = await c.post(f"/api/v1/agents/{aid}/sessions", json={})
        sid = r.json()["id"]
        print(f"  会话: {sid}")

        # ========== 5. Streaming chat with tool ==========
        print("\n=== 5. 流式对话（含工具调用）===")
        events = []
        async with c.stream(
            "POST",
            f"/api/v1/agents/{aid}/sessions/{sid}/chat",
            json={
                "messages": [{"role": "user", "content": "搜索 Python 和 Go 语言的区别"}],
                "stream": True,
            },
        ) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data:"):
                    data = json.loads(line[5:])
                    events.append(data)
                    t = data["type"]
                    if t == "delta":
                        print(data["content"], end="", flush=True)
                    elif t == "tool_call":
                        print(f"\n  >>> [工具调用] {data['name']}")
                    elif t == "tool_result":
                        print(f"\n  >>> [工具结果] {len(data['content'])} 字符")
                    elif t == "done":
                        print("\n  >>> [完成]")

        reply = "".join(e["content"] for e in events if e["type"] == "delta")
        assert len(reply) > 0, "回复为空"
        print(f"\n  回复总长度: {len(reply)} 字符")

        tool_events = [e for e in events if e["type"] == "tool_call"]
        if tool_events:
            print(f"  工具调用次数: {len(tool_events)}")
        else:
            # If model chose not to use tool, that's also valid
            print("  模型未调用工具（直接回答）")

        # ========== 6. Non-streaming chat ==========
        print("\n=== 6. 非流式对话 ===")
        r = await c.post(
            f"/api/v1/agents/{aid}/sessions/{sid}/chat",
            json={
                "messages": [{"role": "user", "content": "总结一下"}],
                "stream": False,
            },
        )
        result = r.json()
        print(f"  回复: {result['content'][:60]}...")
        assert result["role"] == "assistant"

        # ========== 7. List tools ==========
        print("\n=== 7. 列出可用工具 ===")
        r = await c.get("/api/v1/tools")
        tools = r.json()["tools"]
        print(f"  共 {len(tools)} 个工具")
        tool_names = [t["name"] for t in tools]
        assert "web_search" in tool_names

        # ========== 8. Get agent ==========
        print("\n=== 8. 获取 Agent 详情 ===")
        r = await c.get(f"/api/v1/agents/{aid}")
        assert r.json()["id"] == aid
        print("  OK")

        # ========== 9. Delete session ==========
        print("\n=== 9. 删除会话 ===")
        r = await c.delete(f"/api/v1/agents/{aid}/sessions/{sid}")
        assert r.status_code == 204
        print("  OK")

        # ========== 10. Delete agent ==========
        print("\n=== 10. 删除 Agent ===")
        r = await c.delete(f"/api/v1/agents/{aid}")
        assert r.status_code == 204
        print("  OK")

        print("\n" + "=" * 40)
        print("所有功能验证通过！")


asyncio.run(test_all())

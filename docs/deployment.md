# Deployment

## Production (Docker Compose)

```yaml
# docker-compose.yml (included in project)
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: agent_platform
      POSTGRES_USER: agent
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}

  app:
    build: ./agent-platform
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://agent:${PG_PASSWORD}@postgres:5432/agent_platform
      LITELLM_PROXY_URL: http://litellm:4000
    depends_on:
      - postgres
      - litellm

volumes:
  pgdata:
```

### Run

```bash
docker compose up -d
```

The app will be available at `http://localhost:8000`.

### Frontend Build

```bash
cd agent-frontend
npm run build
# Output in agent-frontend/dist/
# Serve with nginx or any static file server
```

## Development

### Backend

```powershell
cd agent-platform
pip install -e .

# SQLite (default, no setup needed)
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_API_BASE="https://api.deepseek.com/v1"
uvicorn app.main:app --port 8001 --reload

# PostgreSQL
$env:DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/agent_platform"
```

### Frontend

```powershell
cd agent-frontend
npm install
npm run dev
```

## Environment Variables

| Variable          | Default                           | Description                    |
|-------------------|-----------------------------------|--------------------------------|
| `DATABASE_URL`    | `sqlite+aiosqlite:///./agent_platform.db` | Async database connection |
| `LITELLM_PROXY_URL` | `http://localhost:4000`         | LiteLLM proxy address         |
| `OPENAI_API_KEY`  | —                                 | LLM provider API key          |
| `OPENAI_API_BASE` | —                                 | LLM API base URL override     |

Note: Per-agent model config (`api_base`) is set in the agent config JSON, overriding the default. The environment variables are fallbacks.

## Model Configuration

Each agent can use a different model/provider by setting `config.model`:

```json
{
  "provider": "openai",
  "name": "deepseek-v4-flash",
  "api_base": "https://api.deepseek.com/v1",
  "temperature": 0.7
}
```

Without `api_base`, it defaults to OpenAI's API. The app uses `langchain-openai` ChatOpenAI, which is compatible with any OpenAI-style API.

## Database Migrations

Tables are auto-created on app startup. For schema changes, use Alembic:

```bash
cd agent-platform
alembic init alembic
alembic revision --autogenerate -m "description"
alembic upgrade head
```

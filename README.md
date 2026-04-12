# GenAI Portfolio

React portfolio frontend + FastAPI RAG backend.

This repository now includes end-to-end wiring between the frontend chat widget and the RAG backend:

- Frontend chat widget calls `POST /chat` and `POST /suggestions`
- Local Vite development uses `/api` proxy to `http://localhost:8000`
- Docker/Nginx uses `/api` reverse proxy to backend service on the Compose network

## Architecture

- `frontend/`: React + Vite app, served by Nginx in Docker
- `rag-backend/`: FastAPI app for chat, RAG retrieval, suggestions, and metrics
- `docker-compose.yml`: Runs both services together

## Prerequisites

- Node.js 20+
- Python 3.10+
- Docker Desktop (optional, for containerized run)
- OpenAI API key
- Pinecone API key and index

## 1) Configure Backend Environment

Copy the backend environment file and fill in real values:

```bash
cp rag-backend/.env.example rag-backend/.env
```

Required values:

- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`

Optional values:

- `PINECONE_NAMESPACE` (default: `resume-v1`)
- `CORS_ORIGINS`
- Rate limit and logging settings in `rag-backend/app/config.py`

## 2) Add Resume and Ingest

Place resume PDF at:

- `rag-backend/data/resume.pdf`

Then ingest vectors:

```bash
cd rag-backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
python scripts/ingest_resume.py
```

## 3) Run Locally (No Docker)

Terminal 1 (backend):

```bash
cd rag-backend
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate    # macOS/Linux
uvicorn app.main:app --reload --port 8000
```

Terminal 2 (frontend):

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`

How wiring works in local dev:

- Frontend calls `/api/*`
- Vite proxy rewrites `/api/chat` -> `http://localhost:8000/chat`

## 4) Run With Docker Compose

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`
- Backend docs: `http://localhost:8000/docs`

How wiring works in Docker:

- Frontend bundle uses `VITE_API_BASE_URL=/api`
- Nginx proxies `/api/*` to `http://backend:8000/*`

## API Endpoints

- `POST /chat`
  - Request:
    ```json
    {
      "sessionId": "uuid-or-any-stable-id",
      "message": "Tell me about your projects"
    }
    ```
  - Response:
    ```json
    {
      "reply": "..."
    }
    ```

- `POST /suggestions`
  - Request:
    ```json
    {
      "last_user_message": "Tell me about projects",
      "conversation_summary": null
    }
    ```
  - Response:
    ```json
    {
      "suggestions": ["...", "..."]
    }
    ```

- `POST /rag/search` (debug retrieval endpoint)
- `GET /metrics` and `GET /metrics/json`
- `GET /info`

## Frontend-Backend Integration Files

- Chat UI: `frontend/src/components/ai/ChatWidget.jsx`
- Chat styles: `frontend/src/components/ai/chatWidget.css`
- API client: `frontend/src/services/chatApi.js`
- Vite proxy: `frontend/vite.config.js`
- Docker build arg: `docker-compose.yml`
- Nginx API proxy: `frontend/nginx.conf`

## Quick Verification

1. Start backend and frontend.
2. Open the site and click `Ask AI Assistant`.
3. Send a question like: `What are Yazhini's core skills?`
4. Confirm assistant response appears.
5. Confirm suggestions chips appear below messages.

## Notes

- If backend env vars are missing, `/chat` returns server errors by design.
- CORS defaults are configured in backend config for common localhost ports.
- For production, set `VITE_API_BASE_URL` and `CORS_ORIGINS` to your deployed domains.

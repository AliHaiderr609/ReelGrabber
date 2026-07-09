# workers/

Platform extraction workers (Python / FastAPI). Managed independently of npm
workspaces; orchestrated alongside the monorepo via documentation and Docker Compose.

## instagram-worker (Phase 6 — first vertical slice)

FastAPI service on port **8001**. Implements the platform interface over HTTP.

See [instagram-worker/README.md](./instagram-worker/README.md).

```bash
cd workers/instagram-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Flow (with gateway)

1. `POST http://localhost:4000/v1/extract` — gateway validates & enqueues (BullMQ)
2. Gateway job processor picks up the job
3. Processor calls `POST http://localhost:8001/v1/extract`
4. Result stored in `download_jobs.result`; poll `GET /v1/jobs/:id`

Planned additional workers: `tiktok-worker`, `facebook-worker`, `twitter-worker`,
`pinterest-worker`, `threads-worker`.

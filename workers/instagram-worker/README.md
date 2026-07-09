# Instagram extraction worker (FastAPI)

Isolated platform worker implementing the shared platform interface via HTTP:

- `validate()` / `normalize()` / `extract_media()` in `app/extractor.py`
- `POST /v1/extract` — primary extraction endpoint consumed by the API gateway job processor

## Setup

```bash
cd workers/instagram-worker
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy env.example .env           # optional IG session cookies
```

## Run

```bash
uvicorn app.main:app --reload --port 8001
```

Health: http://localhost:8001/health

## Environment

| Variable | Description |
| --- | --- |
| `IG_SESSIONID` | Instagram session cookie (recommended for reels) |
| `IG_DS_USER_ID` | Optional companion cookie |
| `IG_CSRFTOKEN` | Optional CSRF token cookie |

Extraction uses Open Graph metadata and embedded JSON fallbacks. For logged-out or
blocked content, configure session cookies — same as `apps/web`.

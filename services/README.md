# services/

Backend services (TypeScript / npm workspaces).

## api-gateway (Phase 3)

NestJS API gateway. **Contains no extraction logic.**

Responsibilities:

- Validate and normalize user-submitted media URLs (`@reelgrabber/validation`)
- Detect platform (`Platform` enum from `@reelgrabber/types`)
- Enqueue extraction jobs (in-memory stub in Phase 3; BullMQ in Phase 5)
- Rate limiting, Helmet, CORS, request ID propagation

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `POST` | `/v1/extract` | Validate URL, enqueue job, return `jobId` |
| `GET` | `/v1/jobs/:jobId` | Job status (stub until workers process jobs) |

### Run locally

```bash
cp services/api-gateway/env.example services/api-gateway/.env
npm run gateway
```

Gateway listens on http://localhost:4000 by default.

### Example

```bash
curl -X POST http://localhost:4000/v1/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/reel/ABC123/"}'
```

Each service is independently deployable and owns its own Dockerfile (added in a later phase).

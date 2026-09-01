# ReelGrabber

Production-grade media processing platform. A user submits a supported public media URL;
the system validates and normalizes it, detects the platform, routes extraction to an
isolated worker, and returns structured metadata suitable for downloading or further
processing.

This repository is being migrated incrementally from a single Next.js application into a
Turborepo monorepo (gateway + isolated workers + shared packages) without rewriting the
existing, working application. See "Migration status" below.

## Monorepo layout

```
apps/
  web/                 Next.js frontend + current API routes (the existing app, preserved)
services/
  api-gateway/         NestJS gateway (validation, normalization, routing, queueing) - Phase 3
workers/
  instagram-worker/    FastAPI extraction worker (first vertical slice) - Phase 6
  tiktok-worker/ ...    Additional isolated workers - later
packages/
  types/ validation/ config/ logger/ database/ queue/ cache/ monitoring/ shared/   - Phase 2+
```

Tooling: [Turborepo](https://turbo.build) orchestrates tasks across npm workspaces.
TypeScript/JS packages are npm workspaces; Python workers are managed separately and
orchestrated by Turborepo.

## Prerequisites

- Node.js >= 18 (currently developed on Node 24)
- npm 11+
- Docker Desktop (for local Postgres + Redis) or native Postgres 16 / Redis 7
- Python 3.11+ (for workers, added in Phase 6)

## Getting started

```bash
# 1. Install all workspace dependencies (from the repo root)
npm install

# 2. Start infrastructure (Postgres + Redis)
cp .env.example .env
docker compose up -d

# 3. Configure the web app
cp apps/web/env.example apps/web/.env
#   then edit apps/web/.env (DATABASE_URL, REDIS_URL, IG_SESSIONID, etc.)

# 4. Run the web app (via Turborepo)
npm run dev            # runs all workspace dev tasks
# or just the web app:
npm run web
```
The web app runs at http://localhost:3000.
The API gateway runs at http://localhost:4000 (`npm run gateway`).
The Instagram worker runs at http://localhost:8001 (see `workers/instagram-worker/README.md`).

### Full vertical slice (gateway + worker)

```bash
docker compose up -d                          # Postgres + Redis
npm run db:migrate                            # apply packages/database migrations
npm run gateway                               # terminal 1 — port 4000
# terminal 2 — instagram worker:
cd workers/instagram-worker && uvicorn app.main:app --reload --port 8001
npm run web                                   # terminal 3 — existing UI (unchanged)
```

### Observability (Phase 8)

```bash
docker compose --profile observability up -d   # Prometheus :9090, Grafana :3001 (admin/admin)
npm run gateway                                # exposes GET /metrics on port 4000
```

Optional gateway env: `SENTRY_DSN`, `OTEL_ENABLED=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Common commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run all workspace `dev` tasks via Turbo |
| `npm run web` | Run only the Next.js app (`apps/web`) |
| `npm run gateway` | Run only the NestJS API gateway (`services/api-gateway`) |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Test all workspaces |
| `npm run format` | Format the repo with Prettier |

## Migration status

This is an incremental migration. Working features are preserved and replaced one at a
time with backward compatibility maintained throughout.

- [x] Phase 1: Monorepo + infrastructure (Turborepo, workspaces, relocate app to `apps/web`, Postgres/Redis compose)
- [x] Phase 2: Shared packages (`types`, `validation`, `config`, `logger`, `shared`)
- [x] Phase 3: API Gateway (NestJS) — validate, normalize, detect platform, enqueue (in-memory stub)
- [x] Phase 4: Database + Prisma (`packages/database`, `DownloadJob` + audit tables)
- [x] Phase 5: Queues + Redis (BullMQ in `@reelgrabber/queue`, gateway job processor)
- [x] Phase 6: Worker framework (FastAPI `instagram-worker` vertical slice)
- [x] Phase 7: Frontend integration (`/api/download` optionally routes via gateway; legacy fallback preserved)
- [x] Phase 8: Observability (Prometheus `/metrics`, Sentry, OpenTelemetry; Grafana stack via compose profile)
- [x] Phase 9: Testing (monitoring + platform-mapper unit tests; validation suite)

### Intentional deviations from the target spec

- **Next.js 16 + React 18.3** are kept for `apps/web` (the spec listed Next.js 15 + React 19).
  Rationale: the existing app must be preserved without a rewrite. New services use the
  requested stack. Revisit as a separate, isolated upgrade later.
- The npm `workspaces` array includes `apps/*`, `services/*`, and `packages/*`.
- Phase 3 queue used an in-memory stub; **Phase 5 replaced it with BullMQ** when Redis is available.
- Set `USE_API_GATEWAY=true` in `apps/web/.env` to route `/api/download` through the gateway
  (gateway → BullMQ → worker). On failure or empty results, it falls back to the legacy
  Puppeteer extractor automatically.

### Bugs fixed during Phase 1 (pre-existing, blocked production build)

- `request.ip` (removed in Next 16) replaced with forwarding-header parsing in
  `apps/web/src/app/api/auth/route.ts`, `apps/web/src/app/api/proxy-download/route.ts`,
  and `apps/web/src/lib/bot-detection.ts`.
- `rateLimit.limit()` (wrong library API) corrected to `rate-limiter-flexible`'s
  `consume()` in `apps/web/src/app/api/auth/route.ts`.
- `headers()` is async in Next 16; awaited in `apps/web/src/app/api/webhooks/stripe/route.ts`.

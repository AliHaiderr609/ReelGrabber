# packages/

Shared TypeScript packages (npm workspaces), consumed by `apps/` and `services/`.

## Available packages (Phase 2)

| Package | Purpose |
| --- | --- |
| `@reelgrabber/types` | Domain types, `Platform` enum, worker contracts |
| `@reelgrabber/validation` | Zod schemas, platform detection, SSRF-safe URL validation |
| `@reelgrabber/config` | Environment parsing with Zod |
| `@reelgrabber/logger` | Pino logger with request-context fields |
| `@reelgrabber/shared` | Cross-cutting utilities (`getClientIp`, retry/backoff) |
| `@reelgrabber/database` | Prisma schema, migrations, client singleton (Phase 4) |
| `@reelgrabber/queue` | BullMQ queue + worker helpers (Phase 5) |
| `@reelgrabber/monitoring` | Prometheus metrics, Sentry, OpenTelemetry (Phase 8) |

## Planned (later phases)

- `cache/` - Redis helpers (Phase 5+)

## Usage in apps/web

The existing Next.js app imports shared packages incrementally. Current integrations:

- `apps/web/src/app/api/download/route.ts` → `@reelgrabber/validation` (`instagramDownloadRequestSchema`)
- `apps/web/src/app/api/proxy-download/route.ts` → SSRF host allow-list
- `apps/web/src/app/api/auth/route.ts`, `bot-detection.ts` → `@reelgrabber/shared` (`getClientIp`)

Build a package: `npm run build --workspace @reelgrabber/validation`

Test: `npm run test --workspace @reelgrabber/validation`

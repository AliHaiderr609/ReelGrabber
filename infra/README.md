# Observability stack (Phase 8)

Prometheus scrapes the API gateway `/metrics` endpoint. Grafana is pre-provisioned with a Prometheus datasource.

## Start

```bash
# From repo root — requires Docker
docker compose --profile observability up -d

# Gateway must be running on the host (default port 4000)
npm run gateway
```

| Service | URL | Notes |
| --- | --- | --- |
| Prometheus | http://localhost:9090 | Scrapes `host.docker.internal:4000/metrics` |
| Grafana | http://localhost:3001 | Login `admin` / `admin` |

## Gateway metrics

- `http_request_duration_seconds` — HTTP latency by method, route, status
- `extract_jobs_total` — jobs by platform and status (`queued`, `processing`, `completed`, `failed`)
- `extract_job_duration_seconds` — completed job duration by platform
- Default Node.js metrics (`nodejs_*`, process memory, etc.)

## Optional tracing & errors

Set in `services/api-gateway/.env`:

```env
SENTRY_DSN=https://...
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

OpenTelemetry uses OTLP HTTP export. Run a collector locally or point at your vendor endpoint.

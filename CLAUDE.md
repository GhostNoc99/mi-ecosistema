# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

A performance-testing lab: a small FastAPI + PostgreSQL product API that exists to be load-tested with k6 (and JMeter), with metrics sent to InfluxDB/Grafana and a Jenkins pipeline that runs the tests and emails an HTML report. Code comments and API messages are in Spanish.

## Commands

```bash
# Start the whole stack (API :8000, Postgres :5432, InfluxDB :8086, Grafana :3001 admin/admin)
docker-compose up -d --build

# API docs (Swagger): http://localhost:8000/docs   Health: http://localhost:8000/health

# Run a single k6 test (k6 is installed on the host, not in docker-compose)
k6 run k6/smoke-test.js --env BASE_URL=http://localhost:8000
k6 run k6/reporter.js --env BASE_URL=http://localhost:8000 --out influxdb=http://localhost:8086/k6

# Parameterized test against any endpoint
k6 run k6/dynamic-test.js --env TEST_TYPE=load --env URL=http://localhost:8000/products/ \
  --env METHOD=GET --env VUS=10 --env DURATION=1m --env REPORT_NAME=mi-reporte.html
```

There is no linter or unit-test suite. The uvicorn container runs with `--reload`, but source is copied into the image (no volume mount), so code changes require `docker-compose up --build api`.

## Architecture

### API (`app/`)

Imports are relative to `app/` (e.g. `from models.product import Product`), since the Dockerfile copies `app/` to `/app` and runs `uvicorn main:app`. Run Python from inside `app/` for imports to resolve. Tables are created at startup via `Base.metadata.create_all` (there are no migrations). `DATABASE_URL` comes from docker-compose and defaults to the `db` service hostname.

The same `Product` model is exposed through two routers with different conventions:

- **`routes/products.py`**: plain REST under `/products` (`GET /`, `GET /{id}`, `POST /`, `DELETE /{id}`), returning raw models and standard HTTP errors.
- **`routes/products_enterprise.py`**: mimics a corporate "backend-for-frontend" style under `/backfront/backendforfrontend/mec/orq/productos/v1/gestion` with action-named endpoints (`consultarProductos`, `consultarProducto`, `crearProducto`, `eliminarProducto`). The ID goes in the JSON body (`{"productId": n}`), even on DELETE. Every endpoint:
  - depends on `dependencies/headers.validate_enterprise_headers`, which requires `X-RqUID`, `X-CompanyId` (exactly 4 chars) and `X-Channel` (WEB/MOV/ZMA/API/BOT). It also validates the optional `X-GovIssueIdentType` (CC/CE/NIT/PA/TI).
  - wraps its output in `schemas/common.build_response(RC.X, rqUID, payload)`, which returns `{responseHeader: {rqUID, responseCode, responseDescription}, payLoad}`. Business codes live in `RC` (00 OK, 01 created, 10 not found, 20 invalid, 30 header error, 50 DB error, 99 unknown). Errors raise `HTTPException(detail=build_response(...))`.

New enterprise endpoints should follow the same header dependency + `build_response` envelope pattern.

### Load tests (`k6/`)

- `smoke-test.js`, `load-test.js`, `stress-test.js`, `reporter.js` all hit only `/health` with fixed stages. `reporter.js` writes `k6/reports/report.html` through the remote `benc-uk/k6-reporter` bundle.
- `dynamic-test.js` is the generic, env-driven script (`URL`, `METHOD`, `HEADERS` as JSON, `BODY`, `VUS`, `DURATION`, `TEST_TYPE` = smoke|load|stress, `REPORT_NAME`). `TEST_TYPE` selects both the stage profile and the thresholds. Its `handleSummary` builds a self-contained JMeter-style HTML report (Chart.js, auto-generated conclusions) at `k6/reports/<REPORT_NAME>`. It sets `summaryTrendStats` so that p90/p99 are available to the report.
- The k6 scripts import remote modules (jslib.k6.io, raw.githubusercontent.com), so they need internet access.

### CI (`Jenkinsfile`)

Jenkins runs in Docker and reaches the stack through `host.docker.internal`. The stages are: build, then a `/health` check, then a smoke test. The load test (`reporter.js` → InfluxDB) runs only on `main`. The stress test runs only on the nightly cron (02:00) or when `RUN_STRESS=true`. In `post`, `emailext` mails `k6/reports/report.html` if it exists. Sibling repos in the parent folder (`performance-configs`, `performance-on-demand`, `performance-shared-libs`) appear to be the related on-demand pipeline and shared-library pieces.

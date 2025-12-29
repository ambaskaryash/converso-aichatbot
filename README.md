# Converso Chatbot Platform

![Build](https://img.shields.io/github/actions/workflow/status/your-org/your-repo/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Backend](https://img.shields.io/website?url=https%3A%2F%2Fapi.yourdomain.com%2Fapi%2Fv1&label=backend)
![Widget CDN](https://img.shields.io/website?url=https%3A%2F%2Fcdn.yourdomain.com%2Fconverso-widget.js&label=widget%20cdn)

## Quick Start
- Clone and install:
  - `npm install` in `dashboard/` and `widget/`
  - `python -m venv venv && source venv/bin/activate && pip install -r backend/requirements.txt`
- Configure backend:
  - Edit `backend/.env` (CORS origins, secrets, DB, admin emails/password hash)
  - Run `uvicorn app.main:app --reload --port 8000` from `backend/`
- Run dashboard and widget:
  - `npm run dev` in `dashboard/` (http://localhost:5174 if 5173 taken)
  - `npm run dev` in `widget/` (http://localhost:5173)
- Try the widget:
  - Open `http://localhost:5173/?projectId=<id>&apiKey=<key>&apiBase=http://localhost:8000/api/v1`
  - Or call `window.Converso.init({ projectId, apiKey })` on your site

Converso is a full-stack chatbot platform comprising:
- Backend API (FastAPI) with WebSocket chat, ingestion, analytics, and admin management
- Admin Dashboard (React + Vite) for projects, conversations, and settings
- Embeddable Chat Widget (React) for websites

## Architecture
- Backend: FastAPI at `/api/v1` with endpoints for `chat`, `projects`, `ingest`, `analytics`, `integrations`, `auth`, `conversations`, and `admins`. CORS, rate limiting, request ID logging, and optional Sentry are included.
- Dashboard: React app that talks to the backend via `VITE_API_BASE_URL`, renders analytics, conversations, and project configuration.
- Widget: Shadow DOM-based React widget rendered on any site; connects to backend chat via WebSocket and supports per-project sessions and domain whitelisting.

## Key Features
- Chat via WebSocket streaming with session continuity
- Knowledge ingestion and project management
- Analytics overview, latency trend, conversations viewer
- Domain whitelist enforcement for widget connections
- Diagnostics from the dashboard to validate API, auth, and WebSocket connectivity

## Repository Layout
- Backend: `backend/app/main.py` (FastAPI app, CORS, routers)
- Dashboard: `dashboard/src` (pages, components, API client)
- Widget: `widget/src` (shadow DOM, chat UI, configurable API base)
- Example test host: `test.html`

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and `uvicorn`, `fastapi` (see `backend/requirements.txt`)
- PostgreSQL (default config uses `localhost`, database `converso`)

### Backend Setup
1. Create and activate a virtual environment:
   - `python -m venv venv`
   - `source venv/bin/activate`
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Configure environment:
   - Copy and edit `backend/.env` for production secrets and origins
   - Important variables:
     - `BACKEND_CORS_ORIGINS`: list of allowed dashboard/website origins
     - `SECRET_KEY`: JWT signing key
     - `ADMIN_EMAILS`, `ADMIN_PASSWORD_HASH`: initial admin access
     - `DATABASE_URL`: Postgres connection
     - `GROQ_API_KEY`, `EMBEDDING_PROVIDER`: LLM/embeddings config
4. Run the server:
   - `uvicorn app.main:app --reload --port 8000` (cwd `backend/`)

### Dashboard Setup
1. Install dependencies: `npm install` (cwd `dashboard/`)
2. Configure:
   - `VITE_API_BASE_URL` in environment (defaults to `http://localhost:8000/api/v1`)
3. Develop:
   - `npm run dev` (Vite dev server on `http://localhost:5174` if `5173` is taken)
4. Build:
   - `npm run build` to produce production assets in `dashboard/dist`

### Widget Setup
1. Install dependencies: `npm install` (cwd `widget/`)
2. Develop: `npm run dev` (Vite dev server on `http://localhost:5173`)
3. Build: `npm run build` — output in `widget/dist` with `converso-widget.js`

## Embed Usage
Load the widget script on your site and initialize with a project:
```html
<!-- CDN or self-hosted bundle -->
<script src="https://cdn.yourdomain.com/converso-widget.js"></script>
<script>
  window.Converso.init({
    projectId: "YOUR_PROJECT_ID",
    apiKey: "YOUR_PROJECT_API_KEY" // optional for authenticated chat
  });
</script>
```

Alternatively, pass configuration via URL parameters (dev usage):
- `http://localhost:5173/?projectId=<id>&apiKey=<key>&apiBase=https://api.yourdomain.com/api/v1`
- The widget reads:
  - `projectId` → `window.CONVERSO_PROJECT_ID`
  - `apiKey` persisted to `localStorage('converso_api_key')`
  - `apiBase` for WebSocket endpoint, persisted to `localStorage('converso_api_base')`

## Configuration Notes
- CORS:
  - Backend must allow dashboard and website origins.
  - CORS setup in `backend/app/main.py` supports explicit `allow_origins` and a local `allow_origin_regex`.
- Domain Whitelist:
  - WebSocket `chat` endpoint checks referer origin against project’s `EmbedSettings`.
  - Manage allowed domains on the Embed page.
- API Base:
  - Dashboard uses `VITE_API_BASE_URL`.
  - Widget WebSocket base is derived from `CONVERSO_API_BASE_URL` or `localStorage('converso_api_base')`.

## Security
- Never commit real secrets; inject via environment at deploy time.
- Rotate `SECRET_KEY`, LLM API keys before go-live.
- Ensure TLS termination at your proxy; allow WebSocket upgrades for `/api/v1/chat/*/ws`.
- Rate limits and CSRF cookie are in place; validate and harden for production.

## Diagnostics
- Dashboard Overview page includes a “Run Diagnostics” action to check:
  - API reachability
  - Auth-protected endpoints
  - WebSocket connectivity
  - Domain whitelist configuration

## Build and Deploy
- Backend:
  - Containerize FastAPI + Uvicorn or run under systemd
  - Proxy (Nginx/Caddy) with HTTPS, CORS, and WebSocket upgrade
- Dashboard:
  - `npm run build` → serve `dashboard/dist` via a static host or CDN
- Widget:
  - `npm run build` → publish `widget/dist/converso-widget.js` to CDN
  - Use versioned filenames and cache headers

## CI/CD
- Recommended GitHub Actions workflows:
  - Backend (Python):
    ```yaml
    name: backend-ci
    on: [push, pull_request]
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with: { python-version: '3.11' }
          - run: python -m venv venv && source venv/bin/activate
          - run: pip install -r backend/requirements.txt
          - run: python -m compileall backend
    ```
  - Dashboard/Widget (Node):
    ```yaml
    name: web-ci
    on: [push, pull_request]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: '20' }
          - run: cd dashboard && npm ci && npm run lint && npm run build
          - run: cd widget && npm ci && npm run lint && npm run build
    ```
- Add deploy jobs to publish:
  - Backend: container build and deploy to your infra
  - Dashboard: upload `dist/` to your static host/CDN
  - Widget: publish `converso-widget.js` to CDN with versioning

## Commands
- Backend run: `uvicorn app.main:app --reload --port 8000` (cwd `backend/`)
- Dashboard:
  - Dev: `npm run dev`
  - Lint: `npm run lint`
  - Build: `npm run build`
- Widget:
  - Dev: `npm run dev`
  - Lint: `npm run lint`
  - Build: `npm run build`

## Code References
- CORS setup: `backend/app/main.py:33`
- CORS origins env: `backend/.env:19`
- Domain whitelist enforcement: `backend/app/api/v1/endpoints/chat.py:47`
- Dashboard API base: `dashboard/src/lib/api.ts:1`
- Widget WebSocket base configuration: `widget/src/hooks/useChat.ts:104`
- Widget init and auto-mount: `widget/src/main.tsx:104`

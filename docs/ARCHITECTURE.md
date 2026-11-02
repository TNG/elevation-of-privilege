# System Architecture

High-level overview of the application structure.

## System Overview

Two services that must run together:

- **Client**: React application serving the game UI
- **Server**: Node.js backend handling multiplayer gameplay

The client cannot work standalone - both services are required.

## Services

### Client
- **Dev port**: 5173 (Vite default)
- **Access**: Web browser
- Framework: React with real-time updates via WebSocket
- Proxies `/api` → server API backend, `/socket.io` → server WebSocket backend

### Server
Three services on separate network endpoints:

| Port | Service               | Purpose                                    |
|------|-----------------------|--------------------------------------------|
| 8000 | WebSocket Endpoint    | Real-time game state synchronization       |
| 8001 | Public API            | Game creation and metadata                 |
| 8002 | Internal Lobby API    | Internal lobby operations (not public)     |

## Communication Flow

- **WebSocket** (port 8000): All game moves and state updates
- **HTTP API** (port 8001): Game creation, metadata, file downloads

## Data Storage

- Game state: JSON-based file storage
- Location: OS temporary directory (separate storage for game state and uploads)
- No external database required

## Game Creation Validation

`POST /game/create` accepts untrusted diagrams and images. All content is
checked before anything is stored, using these building blocks:

- **Shared valibot schemas** in `packages/shared/src/schemas/`:
  `createGameRequestSchema` (form fields) and `threatDragonModelSchema`
  (a strict allowlist for Threat Dragon models, which strips envelope
  metadata such as `extension` and rejects unknown keys). `formatIssues`
  reduces validation failures to safe `{ path, expected }` entries.
- **`apps/server/src/image-upload.ts`**: detects the real image type from
  the content (`file-type`), enforces that the claimed MIME type and
  filename extension match it, and sanitizes SVGs with
  DOMPurify (jsdom) to a canonical serialization.

The server runs these steps in order: validate the request → validate the
model or process the image in memory → `createMatch` (always `unlisted`, so
new games never appear in the public lobby) → join the players → store the
model/image. Any failure after the match is registered wipes the match, its
model key and its image file, so no half-created game is left behind.
Uploaded temp files are always deleted.

## Delivery Headers

Every response tells the browser what it may do with it (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and a strict `Content-Security-Policy`). The instructions are set in two places:

- **API responses (all environments)**: `koa-helmet` is the first middleware in `apps/server/src/publicApi.ts`, before `cors()` and the router, so error responses are covered too. The single policy definition lives in `apps/server/src/config.ts` (`CONTENT_SECURITY_POLICY_DIRECTIVES` / `CONTENT_SECURITY_POLICY_HEADER`) and is fixed by `specs/002-delivery-security-headers/contracts/response-headers.md`; changes require a contract update.
- **Static client (production only)**: the nginx config `apps/client/nginx/etc/nginx/conf.d/default.conf` adds the three headers with `add_header … always` inside `location /` only, so proxied `/api/` responses keep exactly one copy from Koa. The Vite dev server page carries no headers (hot reload needs inline scripts); its proxied `/api/` responses forward Koa's.

Uploaded SVG game images can never run as pages: `getImage` in `apps/server/src/endpoints.ts` delivers them with `Content-Disposition: attachment` and a `Content-Security-Policy: default-src 'none'` override (route-level `ctx.set` wins over helmet's header for that response). Raster images keep in-page display.

## Deployment

### Production Setup
- Web server serves static React assets
- Web server proxies API requests to backend
- Web server proxies WebSocket traffic to backend

### Docker
- Client container: Web server with React build
- Server container: Node.js runtime with all backend services
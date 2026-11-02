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

## Deployment

### Production Setup
- Web server serves static React assets
- Web server proxies API requests to backend
- Web server proxies WebSocket traffic to backend

### Docker
- Client container: Web server with React build
- Server container: Node.js runtime with all backend services
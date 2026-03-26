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

## Deployment

### Production Setup
- Web server serves static React assets
- Web server proxies API requests to backend
- Web server proxies WebSocket traffic to backend

### Docker
- Client container: Web server with React build
- Server container: Node.js runtime with all backend services
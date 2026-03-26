# Agent Development Guide

**IMPORTANT**: Before making any changes or attempting to interact with the game system, read the Game Flow documentation (see Resources below) to understand the game mechanics and how to navigate the application.

This is an online multiplayer platform for playing security threat modeling card games (Elevation of Privilege, OWASP Cornucopia, OWASP Cumulus, Elevation of MLsec) with remote teams via a React frontend and Koa/boardgame.io backend.

## Package Manager
Uses npm workspaces with Turbo for build orchestration (NOT pnpm/yarn).

## Essential Commands

### Start Development
```bash
npx turbo run dev         # Run normally
npx turbo run dev &       # Run in background
```
Starts both client and server together. **The client does not work standalone.**
- Client: port 5173
- Server: ports 8000 (WebSocket), 8001 (API), 8002 (internal)

### Other Common Commands
```bash
npx turbo run build    # Build all packages
npx turbo run test     # Run all tests
npx turbo run lint     # Lint all files
```

## Project Structure

- `apps/client` - React frontend
- `apps/server` - Node.js backend
- `packages/shared` - Game logic and types

## Workflow Guidelines

All commits must be signed off: `git commit --signoff -m "message"`

For version-worthy changes (features, fixes), create a changeset: `npx changeset add`

## Resources

For detailed guidance, see:
- [docs/GAME_FLOW.md](docs/GAME_FLOW.md) - Game mechanics and rules
- [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md) - TypeScript, React, testing patterns
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System overview and services
- [docs/WORKFLOW.md](docs/WORKFLOW.md) - Commit and versioning workflow

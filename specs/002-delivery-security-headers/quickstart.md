# Quickstart: Delivery Security Headers and Content Security Policy

**Spec**: [spec.md](spec.md) | **Contract**: [contracts/response-headers.md](contracts/response-headers.md) | **Data model**: [data-model.md](data-model.md)

## §1 Automated validation

All checks live in `apps/server/src/main.test.ts` (Vitest + Supertest, run via `npx turbo run test --filter=@eop/server`). Header values are compared against the exported single-source definition; the CSP is compared as a set of directives so ordering does not matter.

| # | Check | Proves |
|---|---|---|
| 1 | `POST /game/create` (no model), `GET /game/:id/players`, `GET /game/:id/model`, and an unknown route each return `x-content-type-options: nosniff`, `x-frame-options: DENY` and the global CSP | FR-001, FR-003 |
| 2 | Error responses (`400`, `403` unauthorized, unknown route `404`) carry the same three instructions | FR-003 |
| 3 | Create an image game with an SVG upload (`.attach('model', svg, { filename: 'x.svg', contentType: 'image/svg+xml' })`); `GET /game/:id/image` returns `content-type: image/svg+xml`, `content-disposition: attachment`, `content-security-policy: default-src 'none'` | FR-007 |
| 4 | Same with a PNG upload: `GET /game/:id/image` has the global CSP and **no** `attachment` | FR-008 |
| 5 | Header counts: every checked response carries each instruction exactly once | FR-004 |
| 6 | Production build inspection (task-level check): `apps/client/build/index.html` contains no inline `<script>` and no `on*=` handler | FR-010 |

## §2 Manual check — development environment

```bash
npx turbo run dev
```

- Open `http://localhost:5173` and create a game with an uploaded image model.
- `curl -sI http://localhost:5173/api/game/x/players` → the three API instructions are present (dev page itself has none — expected, FR-011).
- Play a turn: board, cards, uploaded image preview and live connection all work; browser console shows no CSP violations (FR-009).
- Verify helmet's remaining defaults (e.g. `Cross-Origin-Resource-Policy`) do not break the proxied dev calls; if they do, disable those defaults individually (research R4).

## §3 Manual check — production (Docker)

```bash
docker compose up --build
```

- `curl -sI http://localhost:8080/` and `curl -sI http://localhost:8080/api/game/x/players` → each of `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` appears **exactly once** (FR-004, SC-001).
- Create a game with an SVG upload; open the image URL directly in a browser → it downloads instead of rendering, and the response forbids scripts (SC-004). Do the same with a PNG → it renders.
- Play a full game with an uploaded PNG and an uploaded SVG: no console CSP violations (SC-002, SC-003).
- DevTools: inject `<img src=x onerror="alert(1)">` into the page → blocked by the policy (SC-002).

## §4 Wrap-up

`npx turbo run lint && npx turbo run test && npx turbo run build`, then `npx changeset add` (patch for `@eop/server`, `@eop/client`) and `git commit --signoff`.

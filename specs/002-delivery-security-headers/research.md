# Research: Delivery Security Headers and Content Security Policy

**Spec**: [spec.md](spec.md) | **Extracted from**: `specs/001-harden-create-endpoint` (research R7 there)

## R1 — Library choice for the API headers

**Decision**: `koa-helmet@^9` (which wraps `helmet@^8`) as the first middleware in `apps/server/src/publicApi.ts`.

**Rationale**:
- The maintainer reviews on PRs #358 and #360 required established libraries over hand-written header/sanitizing logic; `koa-helmet` is the standard Koa integration of the standard `helmet` library.
- Peer dependencies verified against the registry: `koa-helmet@9.0.0` accepts `koa ^2 || ^3` (repo has Koa 3.1.1) and `helmet ^6 || ^7 || ^8`.
- Placing it before `cors()` and the router means error responses (403 from auth, 400/404/500 thrown by handlers and `router.allowedMethods()`) also carry the headers (FR-003).
- `noSniff` is on in helmet's defaults; `frameguard` is configured explicitly with `action: 'deny'`.

**Alternatives considered**: hand-written `ctx.set` middleware (rejected: library policy, and helmet's defaults are battle-tested); serving all headers from the web server only (rejected: would not cover API responses in development).

## R2 — CSP directive design

**Decision**: the global policy from `specs/001-harden-create-endpoint/contracts/response-headers.md`, carried over unchanged:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

**Rationale**, grounded in the actual client code:
- `script-src 'self'` — the production build emits a single external module script and no inline script: verified in `apps/client/build/index.html` (only `<script type="module" crossorigin src="/assets/index-*.js">`). React attaches all handlers via `addEventListener`, so no inline event handlers exist. A guard task re-checks this on every build.
- `style-src 'self' 'unsafe-inline'` — Bootstrap's stylesheet from the own origin plus runtime-injected inline styles (e.g. `react-map-interaction` positioning, `style` attributes in components). `'unsafe-inline'` for styles is a deliberate, documented trade-off (styles cannot execute script in modern browsers).
- `img-src 'self' data: blob:` — card images from the own origin; small `data:` icons; uploaded model images are displayed via `URL.createObjectURL(blob)` in `apps/client/src/components/imagemodel/imagemodel.tsx:33`, so `blob:` is required.
- `connect-src 'self'` — all client traffic is same-origin: `fetch('/api/...')` and the boardgame.io WebSocket, both proxied by the Vite dev server (`apps/client/vite.config.ts` proxies `/api` → 8001 and `/socket.io` → 8000) and by nginx in production. Same-origin `ws:`/`wss:` upgrades are covered by `'self'` in current browsers; PR #360's broader `ws: wss:` would have allowed any WebSocket host.
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `default-src 'self'` — hardening defaults with no known consumer.

**Alternatives considered**: nonce- or hash-based `script-src` (out of scope, no inline scripts to whitelist); `ws:`/`wss:` in `connect-src` (weaker than same-origin).

## R3 — Single source of truth for the policy

**Decision**: export the directive set once as `CONTENT_SECURITY_POLICY_DIRECTIVES` from `apps/server/src/config.ts`; `publicApi.ts` builds the header from it and tests assert against it (FR-005). The nginx literal (R6) is static text and documented next to the contract; the header tests cover the Koa side.

**Rationale**: one definition shared by middleware and tests prevents drift; nginx cannot import TS, so its copy is pinned by the contract file and the Docker verification step.

## R4 — helmet defaults and the dev setup

**Decision**: keep helmet's defaults except `contentSecurityPolicy` (R2, with `useDefaults: false`) and `frameguard: { action: 'deny' }`. Verify that the remaining defaults (notably `Cross-Origin-Resource-Policy: same-origin`) do not break the dev client; disable individual defaults if they do, since deployment cross-origin policy is Out of Scope.

**Rationale**: in both dev and production the client reaches the API same-origin through a proxy (Vite in dev, nginx in prod), so `same-origin` resource policy should be harmless. This must still be verified live once (quickstart §2).

## R5 — SVG image delivery in `getImage`

**Decision**: in `apps/server/src/endpoints.ts` `getImage` (lines 180–201), when the stored `game.model.extension` is `svg`, set `ctx.attachment(\`${matchID}.svg\`)`, override the CSP with `default-src 'none'` (route-level `ctx.set` wins over helmet's header), and set `Access-Control-Expose-Headers: Content-Disposition`, consistent with the existing download endpoints (`endpoints.ts:290`, `endpoints.ts:335`). Raster images keep current behavior.

**Rationale**:
- `getImage` already reads `model.extension`, so no schema change is needed; this works before and after spec 001's creation-side rework.
- Client compatibility verified: `imagemodel.tsx` displays the image via `fetch` → `res.blob()` → `URL.createObjectURL` → `<img src>`; `Content-Disposition: attachment` and the response's own CSP do not affect this path, and the `blob:` URL is covered by the page's `img-src`. The download headers only matter when the SVG URL is opened as a top-level document — exactly the case FR-007 closes.
- `koa-send` sets `Content-Type` from the extension (`image/svg+xml`); `ctx.attachment` before `send` adds the disposition.

**Alternatives considered**: `default-src 'none'` only without attachment (weaker: the browser would still render a sanitized SVG as a page); applying attachment to rasters too (rejected by spec edge case).

## R6 — Static client headers in the web server

**Decision**: in `apps/client/nginx/etc/nginx/conf.d/default.conf`, add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and the global CSP via `add_header … always` **inside `location /` only**.

**Rationale**:
- nginx `add_header` directives are inherited from the enclosing block only when the current level defines none. Placing them in `location /` means the `/api/` and `/socket.io/` locations (which have no `add_header`) are untouched — those responses already carry Koa's headers, so each instruction appears exactly once (FR-004).
- `always` ensures the headers are also sent on nginx-generated error responses.
- Adding them at `server` level instead would duplicate headers on `/api/` responses (Koa + nginx).

## R7 — Development environment

**Decision**: no headers on the Vite dev page (hot reload requires inline scripts); API responses carry the full instruction set in every environment, including when reached through the Vite proxy.

**Rationale**: the Vite proxy forwards the upstream response headers, so `localhost:5173/api/...` responses keep Koa's headers in dev. This matches FR-011 and spec 001's assumption.

## R8 — Relationship to spec 001

**Decision**: this feature supersedes spec 001's User Story 3 (FR-019–FR-022, SC-004), plan item 5 and tasks T033–T038. The header values from 001's `contracts/response-headers.md` move to this spec's contract unchanged.

**Rationale**:
- Scope is implemented exactly once; spec 001 should drop that scope when its documents are next touched.
- Code overlap is limited to `apps/server/src/publicApi.ts`, `apps/server/src/endpoints.ts` (`getImage`), and the nginx config. If both features are in flight, sequence tasks touching `endpoints.ts` and `publicApi.ts`; the `koa-helmet`/`helmet` dependencies are the same ranges in both plans (`koa-helmet@^9`, `helmet@^8`), so whichever lands first adds them and the other's task becomes a no-op check.
- Test setup: an SVG game can be created via `POST /game/create` with `.attach('model', buffer, { filename: 'x.svg', contentType: 'image/svg+xml' })` — both today (extension from the file name, `endpoints.ts:111`) and after spec 001 (clean SVG uploads stay accepted). Header tests therefore do not depend on which feature lands first.

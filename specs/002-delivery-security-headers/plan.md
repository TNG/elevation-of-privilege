# Implementation Plan: Delivery Security Headers and Content Security Policy

**Branch**: `002-delivery-security-headers` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-delivery-security-headers/spec.md`. Extracted from `specs/001-harden-create-endpoint` (supersedes its User Story 3, FR-019–FR-022, SC-004, plan item 5 and tasks T033–T038).

## Summary

Every response the application delivers tells the browser what it may do with it:

- **Global instructions on every API response (all environments) and every production static response**: no content-type guessing (`nosniff`), no framing (`X-Frame-Options: DENY` + `frame-ancestors 'none'`), and a strict content security policy that allows only the application's own scripts, styles, images and connections.
- **SVG game images** are delivered as downloads with `default-src 'none'`, so they can never run as standalone pages. Raster images keep in-page display.
- **Compatibility is verified, not assumed**: the client already uses `fetch` → blob previews and same-origin proxies, and the production build is free of inline scripts (verified in `apps/client/build/index.html`).

Approach: `koa-helmet@^9` (+ `helmet@^8`) as the first middleware in `publicApi.ts`, route-level header overrides in `getImage` for SVG, `add_header … always` inside nginx `location /` only, one exported directive definition in `config.ts`. Header values are carried over unchanged from the contract agreed in spec 001.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`). Node ≥ 20.19, <25.

**Primary Dependencies**:
- Existing: Koa 3 (`koa@^3.1.1`), @koa/router 14, @koa/cors 5, koa-send 5, koa-body 6, boardgame.io 0.50, Vitest + Supertest.
- **New:** `koa-helmet@^9` (peer: `helmet ^6 || ^7 || ^8`, `koa ^2 || ^3`) and `helmet@^8`. Same ranges as spec 001's plan — whichever feature lands first installs them; the other's install step becomes a no-op check (research R8).

**Storage**: unchanged (boardgame.io FlatFile; this feature adds no stored data).

**Testing**: Vitest + Supertest against `publicApiServer.callback()` in `apps/server/src/main.test.ts`; header values asserted against the exported `CONTENT_SECURITY_POLICY_DIRECTIVES` (CSP compared as a directive set).

**Target Platform**: Linux server (Docker `node:24-alpine`) behind nginx (`nginxinc/nginx-unprivileged:1.31.0-alpine`, config mounted from `apps/client/nginx/etc/nginx/conf.d/default.conf`). Development client runs on the Vite dev server (port 5173) with same-origin proxies for `/api` and `/socket.io`.

**Project Type**: Web application (npm workspaces + Turbo): `apps/server`, `apps/client`, `packages/shared`.

**Performance Goals**: none measurable — three static headers per response; no runtime cost.

**Constraints**:
- Established libraries instead of hand-written header middleware (maintainer reviews on PRs #358/#360).
- The global CSP value is fixed by the contract; changes require a spec/contract update.
- All commits signed off, plus a changeset.

**Scale/Scope**: 3 source files changed (`publicApi.ts`, `endpoints.ts` (getImage only), nginx `default.conf`), 1 new export in `config.ts`, plus tests. No client source changes expected (compatibility verified in research R2/R5; the build check is a guard).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles. As in spec 001, the gates come from the project's binding guidance and the maintainer reviews:

| Gate | Source | Pre-design | Post-design |
|---|---|---|---|
| Established libraries rather than hand-written header logic | maintainer reviews on PRs #358 and #360 | ✅ planned | ✅ koa-helmet + helmet (research R1); nginx `add_header` is configuration, not logic |
| Vitest for all tests; Supertest for the API | CODE_CONVENTIONS "Testing" | ✅ planned | ✅ quickstart §1 |
| Imports sorted; kebab-case for new files | CODE_CONVENTIONS | ✅ | ✅ no new files beyond `config.ts` export and tests |
| Client only works together with the server; use `npx turbo` | AGENTS.md | ✅ | ✅ quickstart §2–4 |
| Commits signed off; changeset for fixes | WORKFLOW.md | ✅ | ✅ quickstart §4 |
| Scope matches the spec (no nonce CSP, no cross-origin policy, no client redesign) | spec Out of Scope | ✅ | ✅ |

No violations, so the Complexity Tracking table stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-delivery-security-headers/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0: R1–R8
├── data-model.md        # Phase 1: response classes, CSP, delivery decision
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── response-headers.md   # carried over from spec 001, unchanged values
└── checklists/requirements.md
```

### Source Code (repository root)

```text
apps/server/
├── package.json                         # + koa-helmet@^9, helmet@^8 (unless spec 001 already added them)
└── src/
    ├── config.ts                        # + exported CONTENT_SECURITY_POLICY_DIRECTIVES (single source of truth)
    ├── publicApi.ts                     # koa-helmet as first middleware (before cors() and the router)
    ├── endpoints.ts                     # getImage: SVG → attachment + default-src 'none' + expose header
    └── main.test.ts                     # header contract tests (success, error, unknown route, SVG, raster)

apps/client/
├── nginx/etc/nginx/conf.d/default.conf  # add_header … always inside location / only
└── build/index.html                     # guard check: no inline scripts/handlers in the production build

.changeset/<name>.md                     # patch for @eop/server, @eop/client
```

**Structure Decision**: Keep the existing workspace layout. The policy definition lives in `apps/server/src/config.ts` because only the server renders it; the nginx copy is pinned by the contract and the Docker check (research R3, R6).

## Implementation Outline

Ordered for test-first work. Detailed tasks come from `/speckit.tasks`.

1. **Dependencies**: add `koa-helmet@^9` + `helmet@^8` to `apps/server` (skip if already present from spec 001; verify the version ranges match).
2. **Header contract tests** (quickstart §1 table, research R2): write first, confirm they fail. Cover success, error and unknown routes; SVG attachment; raster non-attachment; exactly-once counts; assert against the exported directive definition, CSP as a directive set.
3. **Single policy definition**: export `CONTENT_SECURITY_POLICY_DIRECTIVES` from `config.ts`; add the header-string helper used by middleware and tests.
4. **`koa-helmet` in `publicApi.ts`**: first middleware, before `cors()` and the router (so error responses are covered); CSP with `useDefaults: false` + the directive set; `frameguard: { action: 'deny' }`; keep other defaults and verify they do not break the dev setup (research R4).
5. **`getImage` SVG path** (research R5): for `extension === 'svg'`, set `ctx.attachment`, `Content-Security-Policy: default-src 'none'` and `Access-Control-Expose-Headers: Content-Disposition` before `send(...)`; raster images unchanged.
6. **nginx headers** (research R6): `add_header … always` for the three instructions inside `location /` only, never at `server` level, so proxied `/api/` responses keep exactly one copy from Koa.
7. **Build guard**: check `apps/client/build/index.html` after `npx turbo run build --filter=@eop/client` for inline `<script>` or `on*=` handlers; fix the build config if any appear (today's build is clean — research R2).
8. **Wrap-up**: `npx turbo run lint`, `run test`, `run build`; manual quickstart §2 (dev) and §3 (Docker); `npx changeset add`; `git commit --signoff`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A helmet default (e.g. `Cross-Origin-Resource-Policy`) breaks the dev or production client | Defaults kept only after the quickstart §2 live check; individual defaults can be disabled without touching the CSP (research R4; deployment policy is Out of Scope) |
| The CSP blocks a client feature not in the compatibility matrix | Matrix built from the actual client code (data-model §4); full-game console check in quickstart §2/§3 |
| Vite starts emitting an inline script (e.g. a module-preload polyfill) | Build guard task (outline step 7); disable the polyfill in `vite.config.ts` if it appears |
| Duplicate headers when nginx and Koa both add them | nginx headers inside `location /` only; exactly-once assertions in tests and in the Docker check (FR-004) |
| Scope collision with spec 001 in `publicApi.ts`/`endpoints.ts` | Supersession documented (research R8); sequence shared-file tasks if both features are in flight; identical dependency ranges |

## Complexity Tracking

No constitution violations to justify.

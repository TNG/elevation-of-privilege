---

description: "Task list for: Delivery Security Headers and Content Security Policy"
---

# Tasks: Delivery Security Headers and Content Security Policy

**Input**: Design documents from `specs/002-delivery-security-headers/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R8), data-model.md, contracts/response-headers.md, quickstart.md

**Tests**: Included. The plan orders the work test-first (plan.md "Implementation Outline" step 2), and quickstart.md §1 names the test suites that prove the feature. Write each test task first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: User story the task belongs to (US1–US3)
- Paths are relative to the repository root `/home/christoph/git/tng/elevation-of-privilege`

## Conventions that apply to every task

- Follow `docs/CODE_CONVENTIONS.md`: sorted imports, `import type` for type-only imports, kebab-case for new files, Vitest for tests, Supertest for API tests.
- Never hand-write header middleware; use `koa-helmet@^9` + `helmet@^8` (research R1). nginx changes are configuration, not logic.
- The global CSP value is fixed by `contracts/response-headers.md`; changing it requires a spec/contract update.
- No size/DoS limits, no nonce/hash CSP, no cross-origin policy changes (spec Out of Scope).
- Commands: `npx turbo run lint`, `npx turbo run test`, `npx turbo run build` (never pnpm/yarn).
- `apps/server/src/main.test.ts` is touched by several stories: tasks writing to it are sequential, never [P] with each other.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The dependency shared by all user stories.

- [ ] T001 Add `koa-helmet@^9` and `helmet@^8` to `apps/server` via `npm install -w @eop/server koa-helmet@^9 helmet@^8` (updates `apps/server/package.json` and `package-lock.json`). If spec 001 already installed them, verify the ranges match `^9`/`^8` and skip. Run `npx turbo run build --filter=@eop/server` and the existing test suite to confirm no behavior change

**Checkpoint**: Dependencies in place; build and tests pass exactly as before.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single policy definition that US1's middleware, US1's tests and the contract all reference (FR-005, research R3).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Write tests in `apps/server/src/config.test.ts` (new): (a) the exported canonical string equals **exactly** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` (contracts/response-headers.md "Global CSP value", data-model §2); (b) every key of the exported directives object corresponds to one directive in that string with identical sources (e.g. `imgSrc` ↔ `img-src 'self' data: blob:`), so object and string cannot drift apart
- [ ] T003 Implement in `apps/server/src/config.ts`: export `CONTENT_SECURITY_POLICY_DIRECTIVES` — a `contentSecurityPolicy.directives`-shaped object with the camelCase keys `defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"]` — and `CONTENT_SECURITY_POLICY_HEADER`, the canonical header string from T002 (data-model §2). Import the directives type from `helmet` with `import type` if available, otherwise inline the type

**Checkpoint**: One tested definition of the policy exists; US1 can begin.

---

## Phase 3: User Story 1 - Every response tells browsers to treat content strictly (Priority: P1) 🎯 MVP

**Goal**: Every API response in every environment — success, client error, server error, unknown route — and every production static response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and the global CSP, each exactly once (FR-001–FR-005, SC-001).

**Independent Test**: quickstart §1 checks 1, 2 and 5 — `curl -sI` or Supertest on create/players/model, a 403, a 404: all three instructions present and unduplicated.

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [ ] T004 [P] [US1] Add a delivery-headers `describe` block to `apps/server/src/main.test.ts`: for `POST /game/create` (reuse the existing create-request body from the current tests), `GET /game/:matchID/players` (with player Basic auth, pattern from the existing `retrieves player info for a game` test), and an unknown route (404), assert `x-content-type-options` is exactly `nosniff`, `x-frame-options` is exactly `DENY`, and `content-security-policy` equals `CONTENT_SECURITY_POLICY_HEADER` from `apps/server/src/config.ts` when compared as a directive set (split on `;`, trim, order-independent). For error responses — a 403 (players route without credentials) and the 404 — assert the same three instructions. Assert each instruction appears exactly once (a duplicated header arrives as a `", "`-joined value; assert the values contain no `", "` and match the expected single value). Run `npx turbo run test --filter=@eop/server` and confirm these fail

### Implementation for User Story 1

- [ ] T005 [US1] Add `koa-helmet` in `apps/server/src/publicApi.ts` as the **first** middleware, before `app.use(cors())` and the router, so error responses are covered too (FR-003, research R1): `helmet({ contentSecurityPolicy: { useDefaults: false, directives: CONTENT_SECURITY_POLICY_DIRECTIVES }, frameguard: { action: 'deny' } })` importing `CONTENT_SECURITY_POLICY_DIRECTIVES` from `./config`. Keep helmet's other defaults for now (research R4); run `npx turbo run test --filter=@eop/server` — the US1 tests from T004 pass
- [ ] T006 [P] [US1] Add the static-client headers in `apps/client/nginx/etc/nginx/conf.d/default.conf` **inside `location / { … }` only** (research R6), each with the `always` parameter and matching the file's existing formatting: `add_header X-Content-Type-Options "nosniff" always;`, `add_header X-Frame-Options "DENY" always;`, `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;` — do **not** add them at `server` level, so `/api/` responses keep exactly one copy from Koa (FR-004)
- [ ] T007 [US1] Verify the development behavior (quickstart §2, FR-011): run `npx turbo run dev`, then `curl -sI http://localhost:5173/api/game/x/players` → the three instructions are present on the proxied API response; `curl -sI http://localhost:5173/` → the dev page itself carries none (hot reload needs inline scripts). Record the result in the PR description

**Checkpoint**: US1 is complete and independently shippable: every API response and the production static client carry the protective instructions.

---

## Phase 4: User Story 2 - Uploaded SVG images can never run as pages (Priority: P1)

**Goal**: SVG game images are delivered as downloads with `Content-Security-Policy: default-src 'none'`; raster images keep in-page display with the global instructions only (FR-007, FR-008, SC-004).

**Independent Test**: quickstart §1 checks 3 and 4 — create an SVG game and a PNG game; the SVG image response is an attachment that may run nothing, the PNG response is not.

### Tests for User Story 2 ⚠️ write first, confirm they fail

- [ ] T008 [P] [US2] Add image-delivery tests to `apps/server/src/main.test.ts` (sequential with T004 — same file): create an SVG game via `POST /game/create` reusing the existing create-request body fields plus `modelType` for an image model, using `.attach('model', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="9" height="9"/></svg>'), { filename: 'model.svg', contentType: 'image/svg+xml' })` (research R8: works before and after spec 001); then `GET /game/:matchID/image` with player Basic auth → assert `content-type` starts with `image/svg+xml`, `content-disposition` starts with `attachment` and names the matchID, `content-security-policy` is exactly `default-src 'none'` (overriding the global one), and `access-control-expose-headers` is `Content-Disposition`. Create a PNG game the same way with a tiny 1×1 PNG (commit it as `apps/server/src/__fixtures__/images/clean.png` with a short `README.md` if spec 001 has not already created it) → assert the response carries the global CSP and **no** `content-disposition: attachment`. Run the suite and confirm these fail

### Implementation for User Story 2

- [ ] T009 [US2] In `apps/server/src/endpoints.ts` `getImage` (currently lines 180–201): after fetching the game and the existing guards, when `game.model.extension === 'svg'`, before `send(...)`: `ctx.attachment(\`${matchID}.svg\`)`, `ctx.set('Content-Security-Policy', "default-src 'none'")` (route-level `ctx.set` wins over helmet's header, research R5), and `ctx.set('Access-Control-Expose-Headers', 'Content-Disposition')` consistent with the existing download endpoints (`endpoints.ts:290`, `endpoints.ts:335`). Raster extensions keep current behavior — no attachment, no CSP override. Run the US2 tests from T008
- [ ] T010 [P] [US2] Verify the client display path is unaffected by `Content-Disposition: attachment` (US2 AS3, research R5): confirm `apps/client/src/components/imagemodel/imagemodel.tsx` loads the image via `fetch` → `res.blob()` → `URL.createObjectURL` → `<img src>` and `apps/client/src/components/downloadbutton/downloadbutton.tsx` via `fetch` → blob download; if any component instead uses the raw image URL directly in `<img src>` or `<a href>`, switch it to the fetch + blob path. Record the outcome in the PR description

**Checkpoint**: US2 is complete: SVG images can never run as pages; raster display is unchanged.

---

## Phase 5: User Story 3 - The application keeps working under the strict policy (Priority: P2)

**Goal**: The strict instructions break nothing: full game session with zero policy violations, production build free of inline scripts, live connection maintained (FR-009–FR-012, SC-002, SC-003).

**Independent Test**: quickstart §2 and §3 — a full game in dev and in Docker with a clean browser console, and an injected inline script blocked.

### Implementation for User Story 3

- [ ] T011 [P] [US3] Guard the production build against CSP conflicts (FR-010, research R2): run `npx turbo run build --filter=@eop/client` and inspect `apps/client/build/index.html` for inline `<script>` blocks (a `<script>` without `src`) and inline `on*=` event handlers; today's build is clean (single external module script). If Vite emits an inline script (e.g. a module-preload polyfill), disable it in `apps/client/vite.config.ts` (`build: { modulePreload: { polyfill: false } }`) or externalize it, and document why
- [ ] T012 [US3] Run the dev compatibility check (quickstart §2, FR-012, research R4): with `npx turbo run dev`, create a game with an uploaded image model and play a turn — board, cards, uploaded image preview and live game connection all work, and the browser console shows no CSP violations. Then verify helmet's remaining defaults (notably `Cross-Origin-Resource-Policy: same-origin`) do not break the same-origin proxied client calls; if one does, disable that individual default in `apps/server/src/publicApi.ts` (not the CSP) and note it in the PR description — deployment cross-origin policy is Out of Scope
- [ ] T013 [US3] Run the production compatibility check (quickstart §3, SC-001–SC-004): `docker compose up --build`; `curl -sI http://localhost:8080/` and `curl -sI http://localhost:8080/api/game/x/players` → each of `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` appears exactly once; create games with an SVG and a PNG upload, open the SVG image URL directly in a browser → it downloads instead of rendering, the PNG renders; play a full game with both → console shows no CSP violations; inject `<img src=x onerror="alert(1)">` via DevTools → the browser blocks it

**Checkpoint**: All user stories are independently functional and compatibility is verified, not assumed.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Update `docs/ARCHITECTURE.md` with a short "Delivery headers" section: where the three instructions are set (Koa `koa-helmet` for every API response in all environments vs. nginx `add_header … always` inside `location /` for the static client), the single policy definition in `apps/server/src/config.ts`, and the SVG image override in `getImage`
- [ ] T015 [P] Slim spec 001 to reflect the extraction (research R8): in `specs/001-harden-create-endpoint/`, replace User Story 3, FR-019–FR-022, SC-004, plan item 5 and tasks T033–T038 with a short pointer to `specs/002-delivery-security-headers/`, so the delivery protections are implemented exactly once
- [ ] T016 [P] Create a changeset with `npx changeset add`: `patch` for `@eop/server` and `@eop/client`; summary "Add security response headers and a content security policy to all responses; deliver SVG images as downloads (extracted from #358/#360 follow-up, supersedes the delivery scope of spec 001)" (file in `.changeset/`)
- [ ] T017 Run `npx turbo run lint`, `npx turbo run test`, `npx turbo run build` and fix every finding (quickstart §4)
- [ ] T018 Commit with sign-off (`git commit --signoff`); in the PR description record: the supersession of spec 001's delivery scope (T015), the T007/T010 verification outcomes, any helmet default disabled in T012, and the build-guard result from T011

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T001 before everything.
- **Foundational (Phase 2)**: depends on Setup. Blocks all user stories.
- **US1 (Phase 3)**: depends on Phase 2 (T005 needs `CONTENT_SECURITY_POLICY_DIRECTIVES`).
- **US2 (Phase 4)**: depends on US1 — its PNG test asserts the global CSP on the image response (T005) and its tests share `main.test.ts` with T004.
- **US3 (Phase 5)**: depends on US1 and US2 — the full-game checks need the headers, the SVG delivery and the build guard in place.
- **Polish (Phase 6)**: after all stories.

### Story Dependency Graph

```text
Setup ─► Foundational ─► US1 (P1, MVP) ─► US2 (P1) ─► US3 (P2) ─► Polish
```

### Within Each User Story

- Tests first; confirm they fail (T004/T008).
- `apps/server/src/main.test.ts` tasks are sequential, never [P] with each other (T004 → T008).
- T005 and T006 touch different files and can proceed in parallel once T003 is done.

---

## Parallel Execution Examples

### Phase 2 + US1 tests

```text
T002 config.test.ts   |   T004 main.test.ts header tests   (different files; both test-first)
then T003 (config.ts) → T005 (publicApi.ts) → T006 (nginx default.conf, independent file)
```

### US2 (after T005)

```text
T008 main.test.ts image tests   |   T010 client display verification (read-only)
then T009 (endpoints.ts getImage)
```

### US3 + Polish

```text
T011 build guard   |   T014 docs   |   T015 spec 001 slimming   |   T016 changeset
then T012 (dev check) → T013 (Docker check) → T017 full run → T018 commit
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1): global instructions on every API response and the static client — the backstop protecting every participant.
3. **Stop and validate**: quickstart §1, `npx turbo run test --filter=@eop/server`.

### Incremental Delivery

1. Setup + Foundational → one tested policy definition.
2. US1 → every response instructs the browser (MVP).
3. US2 → SVG images delivered as downloads; the P1 pair is complete.
4. US3 → compatibility proven in dev and Docker.
5. Polish → docs, spec 001 slimming, changeset, full validation, signed-off commit.

US1 and US2 are both P1 and should ship together, matching the original intent in spec 001 (dropping the delivery protections from PRs #358/#360 would be a regression).

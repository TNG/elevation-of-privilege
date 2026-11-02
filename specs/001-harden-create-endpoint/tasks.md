---

description: "Task list for: Harden Game Creation Against Injected Content"
---

# Tasks: Harden Game Creation Against Injected Content

**Input**: Design documents from `specs/001-harden-create-endpoint/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/post-game-create.md, quickstart.md

**Tests**: Included. The plan orders the work test-first (plan.md "Implementation Outline"), and quickstart.md §1 names the test suites that prove the feature. Write each test task first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: User story the task belongs to (US1–US5)
- Paths are relative to the repository root `/home/christoph/git/tng/elevation-of-privilege`

## Conventions that apply to every task

- Follow `docs/CODE_CONVENTIONS.md`: sorted imports, `import type` for type-only imports, kebab-case for new files, Vitest for tests, Supertest for API tests.
- Never hand-write sanitizing or magic-byte logic. Use `valibot`, `file-type`, `dompurify` + `jsdom` (research R1–R3).
- Never return valibot `message` strings or any submitted value in a response or log (FR-023, FR-025). Paths and schema expectations only.
- No size/DoS limits (spec Assumptions, Out of Scope).
- Commands: `npx turbo run lint`, `npx turbo run test`, `npx turbo run build` (never pnpm/yarn).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Runtime, module system and dependencies needed by the ESM-only libraries (research R1).

- [X] T001 Raise `engines.node` from `">=20.0.0 < 25.0.0"` to `">=20.19.0 <25.0.0"` in `package.json` (repo root), so `require(esm)` works without a flag (research R1)
- [X] T002 Set `"module": "nodenext"` and `"moduleResolution": "nodenext"` in `compilerOptions` of both `apps/server/tsconfig.app.json` and `apps/server/tsconfig.test.json` (research R1); fix any import that no longer resolves (e.g. missing explicit paths) without changing behavior
- [X] T003 Add server dependencies `file-type@^21`, `dompurify@^3`, `jsdom@^28` and dev dependency `@types/jsdom` via `npm install -w @eop/server …` (updates `apps/server/package.json` and `package-lock.json`). (`koa-helmet`/`helmet` are added by `specs/002-delivery-security-headers/`, not here.)
- [X] T004 [P] Add dependency `valibot@^1.2.0` (same range as the server) to `packages/shared/package.json` via `npm install -w @eop/shared valibot@^1.2.0`
- [X] T005 Verify the platform switch has no behavior change: run `npx turbo run build`, `npx turbo run test`, `npx turbo run lint` and start `npx turbo run dev` once to confirm the ts-node dev server boots under `nodenext`. Write a throwaway check that `import { fileTypeFromBuffer } from 'file-type'` type-checks in `apps/server/src/` and delete it afterwards

**Checkpoint**: Build, tests and dev server work exactly as before on the new toolchain.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks used by every user story: issue formatting, the security log helper, form field schema, and the validate-first skeleton of `createGame` with the 400 error contract.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 [P] Write tests for `formatIssues` in `packages/shared/src/schemas/format-issues.test.ts`: given valibot issues from a `v.strictObject` with an unknown key and a wrong-type value, the result is `Issue[]` of `{ path: string, expected: string | null }`, where `path` is built with `v.getDotPath` (key names and indices only) and an optional prefix (e.g. `model.`), and no output string contains the submitted value
- [X] T007 [P] Write tests for `logSecurityEvent` in `packages/shared/src/utils/utils.test.ts` (create if missing): output is one line `"<ISO timestamp> - SECURITY <event> <JSON>"`, every field value is `JSON.stringify`-encoded, and a value containing `\n`, `\r` or a fake timestamp prefix cannot produce a second log line (FR-025)
- [X] T008 [P] Write tests for `createGameRequestSchema` in `packages/shared/src/schemas/create-game-request.test.ts` covering data-model §1 verbatim: `startSuit` picklist `SUITS`; `gameMode` enum `GameMode`; `modelType` enum `ModelType`; `modelReference?` "string, valid URL, protocol `https:`" (refuse `http:`, `javascript:`, non-URL); `turnDuration` "string matching `^\d{1,4}$` → number, integer, 0–3600" (accept `"0"`, `"3600"`; refuse `"3601"`, `"-1"`, `"1.5"`, `"abc"`, `"5x"`); `names` "array of (string → trim → non-empty), length 2–9 (`MIN/MAX_NUMBER_PLAYERS`), all unique" (refuse 1 and 10 names, `"  "`, and `["a", " a "]`); `model?` "string; **required** when `modelType === THREAT_DRAGON`"; unknown form keys are stripped from the output
- [X] T009 [P] Implement `formatIssues(issues, prefix?)` in `packages/shared/src/schemas/format-issues.ts` returning `{ path, expected }[]` from `v.getDotPath(issue)` and `issue.expected` only (data-model §3, research R5); never read `issue.message` or `issue.input`
- [X] T010 [P] Implement `logSecurityEvent(event: string, fields: Record<string, unknown>)` next to `logEvent` in `packages/shared/src/utils/utils.ts`, formatting as `${now} - SECURITY ${event} ${JSON.stringify(fields)}` (FR-025)
- [X] T011 Implement `createGameRequestSchema` (a stripping `v.object`) in `packages/shared/src/schemas/create-game-request.ts` per data-model §1, using `SUITS`, `GameMode`, `ModelType`, `MIN_NUMBER_PLAYERS`, `MAX_NUMBER_PLAYERS` from `packages/shared/src/utils/`; implement the THREAT_DRAGON → `model` required rule with `v.forward(v.partialCheck(...), ['model'])` so the issue path is `model`; export `CreateGameRequest = v.InferOutput<typeof createGameRequestSchema>`
- [X] T012 Export `createGameRequestSchema`, `CreateGameRequest`, `formatIssues` and the `Issue` type from `packages/shared/src/index.ts` (add `export * from './schemas/create-game-request'` and `export * from './schemas/format-issues'`); run `npx turbo run build --filter=@eop/shared` to confirm both CJS and ESM builds succeed
- [X] T013 Add `CreateGameError` in `apps/server/src/create-game-error.ts`: a class extending `Error` with `status = 400`, `code: 'invalid_request' | 'invalid_model_json' | 'invalid_model' | 'missing_image' | 'unsupported_file_type' | 'file_type_mismatch'` and optional `issues: Issue[]` (contracts/post-game-create.md "400 Bad Request" table)
- [X] T014 Restructure `createGame` in `apps/server/src/endpoints.ts` into validate-first order (FR-002, data-model §5 state diagram): (1) parse `ctx.request.body` with `v.safeParse(createGameRequestSchema, …)`; on failure throw `CreateGameError('invalid_request', formatIssues(result.issues))`; (2) run model/image validation (placeholders for now: THREAT_DRAGON parses `body.model` with `JSON.parse` inside try/catch → `CreateGameError('invalid_model_json')`); (3) only then `createMatch`, join players, store. Remove the old local `createGameBodySchema`. In the catch block: for `CreateGameError` set `ctx.status = 400`, `ctx.body = { error: code, issues }` (omit `issues` when undefined) and call `logSecurityEvent('create_rejected', { code, issues })` exactly once; for anything else call `logSecurityEvent('create_failed', { matchID, error: err.constructor.name })` and `ctx.throw(500)` with no details (FR-023, FR-024)
- [X] T015 Update the existing tests in `apps/server/src/main.test.ts` lines ~87–135 that post `{}` and `{ foo: 'bar' }` as Threat Dragon models (marked `TODO`) to post the smallest golden V1 model instead — temporarily inline a minimal valid model (`{ summary: { title: 'x' }, detail: { diagrams: [{ id: 0, title: 'd', diagramJson: { cells: [] } }] } }`) and replace it with the fixture `core-test-model.json` in T024 (research R9); run `npx turbo run test --filter=@eop/server` and confirm all existing tests pass

**Checkpoint**: A form-field violation returns `400 { error: 'invalid_request', issues }` before any match exists; existing success responses are unchanged.

---

## Phase 3: User Story 1 - Participants are protected from malicious Threat Dragon models (Priority: P1) 🎯 MVP

**Goal**: Only declared, validated Threat Dragon V1 content is ever stored. Any markup-carrying key, unknown attribute, unknown cell type or V2 model is refused with a 400 naming the path; metadata such as `extension` is stripped.

**Independent Test**: POST each payload from SC-001 "Threat Dragon payloads" to `/game/create` → `400 invalid_model` with the exact path and no match created; POST each golden V1 export → 200 and `GET /game/:id/model` returns the validated model (quickstart §2 steps 1–2).

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [X] T016 [P] [US1] Copy the golden corpus into `packages/shared/src/schemas/__fixtures__/threat-dragon/`: `v1/*.json` (the 13 files from `/tmp/opencode/td-golden/v1/`; use the smallest representative subset if size matters, but keep at least `core-test-model.json`, `desktop-demomodel-old.json` (legacy selectors), `td-demo-threat-model.json`, `td-vue-e2e-v1-model.json` and one `core-threat-mvp-*.json` with `$$hashKey`), `v2/*.json` (both files from `/tmp/opencode/td-golden/v2/`) and `SOURCES.md` (copy `/tmp/opencode/td-golden/SOURCES.md`, trimmed to the files kept, and add an "Apache-2.0, © OWASP Threat Dragon contributors" attribution line). If `/tmp/opencode/td-golden` is gone, download the files from the raw URLs listed in that `SOURCES.md`. Exclude the fixtures folder from prettier/eslint if lint complains (`packages/shared/.prettierignore`, `packages/shared/eslint.config.mjs`)
- [X] T017 [P] [US1] Write golden tests in `packages/shared/src/schemas/threat-dragon-model.test.ts`: every `v1/*.json` fixture passes `v.safeParse(threatDragonModelSchema, …)`; every `v2/*.json` fixture fails with at least one issue whose path ends in `.shape` or a cell `type`; a parsed golden model with added top-level `extension: 'png'` and `location` keys, plus `$$hashKey` on a diagram and a contributor, parses successfully and those keys are absent from the output (FR-007, edge case "field that marks it as an image model")
- [X] T018 [P] [US1] Write negative tests in `packages/shared/src/schemas/threat-dragon-model.test.ts` (one `it.each` row per payload; build each from a minimal valid model with one cell) asserting refusal and the exact issue path from `formatIssues(…, 'model')`: cell keys `markup`, `toolMarkup`, `labelMarkup`, `vertexMarkup`, `arrowheadMarkup`, `doubleToolMarkup`, `ports`, `portMarkup`, `shape` → `expected: 'never'`; `attrs['.element-shape']` with `onclick`, `onload`, `html`, `href`, `xlink:href`, `style`; unknown selector `attrs.foreignObject`; label with `markup`; label `attrs.text.html`; `type: 'tm.Image'` and `type: 'basic.Rect'`; `id` `"a b"`, `"<x>"`, and 65 chars (data-model §2.2 "`Id` = string `^[\w-]{1,64}$`"); threat with unknown key and with a numeric `title`; non-string `attrs.text.text`; model is `42`, `"str"`, `[]`, `null`; missing `summary.title`; `detail.diagrams: []` (FR-006 "has a text title, and has at least one diagram")

### Implementation for User Story 1

- [X] T019 [US1] Implement the envelope in `packages/shared/src/schemas/threat-dragon-model.ts` with stripping `v.object` exactly per data-model §2.1: `version?` string; `summary` { `title` string, `description?` string, `owner?` string, `id?` number | string }; `detail` { `contributors?` array of { `name`: string }, `reviewer?` string, `diagrams` "array, min length 1, of Diagram" }; `Diagram` { `id` number | string, `title` string, `thumbnail?` string, `diagramType?` string, `version?` string, `diagramTop?` number, `threatTop?` number, `reviewer?` string, `size?` { `width`: number|string, `height`: number|string }, `diagramJson` { `cells?`: array of Cell } }
- [X] T020 [US1] Implement the shared sub-schemas in `packages/shared/src/schemas/threat-dragon-model.ts` as `v.strictObject` (data-model §2.3–2.5, §2.2 "Shared types"): `Id` = `v.pipe(v.string(), v.regex(/^[\w-]{1,64}$/))`; `Point` strict `{ x: number, y: number }`; `End` strict `{ id?: Id, x?: number, y?: number }`; `Style` strict with all-optional keys: `text` string; `class`, `fill`, `stroke`, `stroke-dasharray`, `d`, `transform`, `ref`, `text-anchor`, `y-alignment`, `font-size`, `font-weight` string; `stroke-width`, `r`, `width`, `height`, `ref-x`, `ref-y` number | string; `follow-scale` boolean; `Attrs` strict with optional selector keys `.element-shape`, `.element-text`, `text`, `rect`, `.connection`, `.connection-wrap`, `.marker-source`, `.marker-target`, `.undefined`, `#element-shape`, `#element-process`, each mapping to `Style`; `Label` strict `{ position: number | strict { distance: number, offset?: number | Point }, attrs?: strict { text?: strict { text?: string, 'font-size'?: string, 'font-weight'?: string } } }`; `Threat` strict, all optional: string fields `title`, `type`, `status`, `severity`, `description`, `mitigation`, `modelType`, `threatId`, `ruleId`, `score`, `owner`, `id`, `game`, `$$hashKey`; number field `number`
- [X] T021 [US1] Implement `Cell` in `packages/shared/src/schemas/threat-dragon-model.ts` as `v.variant('type', [...])` of five `v.strictObject`s built from a shared base entries object (`id` Id; `type` literal; `z?` number; `attrs?` Attrs; `size?` strict `{ width: number, height: number }`; `hasOpenThreats?`, `outOfScope?` boolean; `reasonOutOfScope?`, `description?` string; `threats?` array of Threat) plus per-variant extras exactly per data-model §2.2 table: `tm.Process` (`angle?` number, `position?` Point, `privilegeLevel?` string, `handlesCardPayment?`, `handlesGoodsOrServices?`, `isWebApplication?` boolean); `tm.Store` (`angle?`, `position?`, `isALog?`, `storesCredentials?`, `isEncrypted?`, `isSigned?`, `storesInventory?` boolean); `tm.Actor` (`angle?`, `position?`, `providesAuthentication?` boolean); `tm.Flow` (`source?`/`target?` End, `vertices?` array of Point, `labels?` array of Label, `smooth?` boolean, `protocol?` string, `isEncrypted?`, `isPublicNetwork?` boolean); `tm.Boundary` (`source?`/`target?` End, `vertices?`, `labels?`, `smooth?` boolean, `isTrustBoundary?` boolean). Export `threatDragonModelSchema`
- [X] T022 [US1] Make the schema output type compatible with storage: ensure `v.InferOutput<typeof threatDragonModelSchema>` is assignable to `ThreatDragonModel` in `packages/shared/src/game/ThreatDragonModel.ts` (add a compile-time `satisfies`/assignability check in `threat-dragon-model.ts`); adjust the interface only where it is narrower than real exports (e.g. diagram `size` number | string, label `position` object form) and keep existing consumers in `apps/client` and `apps/server/src/endpoints.ts` compiling. Export the schema from `packages/shared/src/index.ts`
- [X] T023 [US1] Wire model validation into `createGame` in `apps/server/src/endpoints.ts`: for `ModelType.THREAT_DRAGON`, `JSON.parse(body.model)` (failure → `CreateGameError('invalid_model_json')`), then `v.safeParse(threatDragonModelSchema, parsed)` (failure → `CreateGameError('invalid_model', formatIssues(result.issues, 'model'))`), all **before** `createMatch`; store only `result.output` via `gameServer.db.setModel` (FR-007); remove the `// TODO: validation` comment and the `as ThreatDragonModel` cast
- [X] T024 [US1] Add integration tests in `apps/server/src/main.test.ts`: (a) replace the inline model from T015 with `packages/shared/src/schemas/__fixtures__/threat-dragon/v1/core-test-model.json` and assert `GET /game/:id/model` equals the parsed fixture minus stripped keys; (b) `it.each` over three payloads (cell `markup`, label `markup`, `attrs['.element-shape'].onclick`) → status 400, body `{ error: 'invalid_model', issues: [{ path: 'model.detail.diagrams.0.diagramJson.cells.0.<key path>', expected: … }] }`; (c) non-JSON `model` → `400 invalid_model_json`; (d) THREAT_DRAGON without `model` field → `400 invalid_request` with path `model`; (e) model with `extension: 'png'` at top level → 200 and the stored model has no `extension`, and `GET /game/:id/image` returns 400 (cross-game image access closed); (f) for each refused request, the match count from the internal lobby `listMatches` (or `gameServer.db.listMatches()`) is unchanged

**Checkpoint**: US1 is complete and independently shippable: malicious Threat Dragon models are refused, golden models work.

---

## Phase 4: User Story 2 - Uploaded images can never deliver code (Priority: P1)

**Goal**: Image type comes from the content; claimed MIME type and extension must agree; SVGs are parsed, sanitized in place, and only the server's own serialization is stored; temp files never remain.

**Independent Test**: Run `apps/server/src/image-upload.test.ts`, and POST the PR #360 payloads and the malicious SVG via `/game/create` (quickstart §2 steps 3–4); check `$TMPDIR/db-images/` gains no file for refusals.

### Tests for User Story 2 ⚠️ write first, confirm they fail

- [X] T025 [P] [US2] Create binary/text fixtures in `apps/server/src/__fixtures__/images/`: minimal valid `clean.png`, `clean.jpg`, `clean.gif`, `clean.webp` (generate tiny 1×1 files once and commit them), `clean.svg` (`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="9" height="9"/></svg>`), and a `README.md` stating how they were generated
- [X] T026 [P] [US2] Write unit tests in `apps/server/src/image-upload.test.ts` for `processImageUpload({ buffer, claimedMimeType, originalFilename })` (data-model §4) — **raster and type rules**: clean PNG/JPEG/GIF/WebP with matching MIME and extension → `{ kind: 'raster', extension, bytes }` with `bytes` identical to input; `DIAGRAM.PNG` accepted; `diagram.jpeg` claimed `image/jpeg` → extension `jpg`; filename without extension accepted; PR #360 payloads each throw `CreateGameError` with the given code: `<?php echo 1; ?>` as `evil.png`/`image/png` → `unsupported_file_type`; `<html><script>alert(1)</script></html>` as `x.png`/`image/png` → `unsupported_file_type`; `clean.svg` claimed `image/png` → `file_type_mismatch`; real PNG named `shell.php`, `evil.html`, `run.sh` → `file_type_mismatch`; PNG claimed `image/jpeg` → `file_type_mismatch`; empty buffer → `missing_image`; a PDF header (`%PDF-1.4…`) → `unsupported_file_type`
- [X] T027 [P] [US2] Write SVG tests in `apps/server/src/image-upload.test.ts` (`it.each` over the research R3 sample set) asserting either refusal (`unsupported_file_type`) or acceptance with an output that contains none of the listed substrings, a `removed` list of node/attribute **names only**, and idempotence (processing the output again yields identical bytes and empty `removed`): **refused** — broken XML (`<svg><g></svg>`), an HTML page claimed as `image/svg+xml`, `<html xmlns="http://www.w3.org/1999/xhtml"/>` as root, `<svg>` without the SVG namespace; **sanitized** — `<script>`, `onload` attribute on root, `onclick` on a child, `<foreignObject>` with HTML, `<a xlink:href="javascript:…">`, `<a href="javascript:…">`, `<animate attributeName="href" to="javascript:…">`, `<set attributeName="onmouseover" …>`, DOCTYPE with `<!ENTITY x "<script>alert(1)</script>">` used as `&x;` (output contains no `<script`, no `<!DOCTYPE`, no `<!ENTITY`), DOCTYPE with `<!ATTLIST svg onload CDATA "alert(1)">` (output has no `onload`), `<?xml-stylesheet href="evil.css"?>` (output has no `<?`), XML declaration + top-level comments (output starts with `<svg`); **accepted with editor parts removed** — Inkscape SVG with `sodipodi:`/`inkscape:` namespaced elements and attributes, draw.io SVG with `<switch><foreignObject>…</foreignObject><text>fallback</text></switch>` (output keeps the `<text>` fallback), Illustrator SVG with `<symbol>` + `<use xlink:href="#s">` and comments; clean SVG output visually equivalent (still contains the `<rect>`). Claimed MIME for SVG must be `image/svg+xml` and extension `svg`

### Implementation for User Story 2

- [X] T028 [US2] Implement raster detection and type checks in `apps/server/src/image-upload.ts` (new file): export `processImageUpload(input: { buffer: Buffer; claimedMimeType?: string; originalFilename?: string }): Promise<UploadedImage>` with `UploadedImage = { kind: 'raster' | 'svg'; extension: 'png' | 'jpg' | 'gif' | 'webp' | 'svg'; bytes: Buffer; removed: string[] }`. Apply data-model §4 rules in order: (1) empty buffer → `CreateGameError('missing_image')`; (2) `fileTypeFromBuffer` from `file-type`: `image/png|jpeg|gif|webp` → raster; `undefined` or `application/xml` → SVG path; anything else → `unsupported_file_type`; (4) `claimedMimeType` must equal the detected MIME (`image/svg+xml` for SVG) else `file_type_mismatch`; (5) `path.extname(originalFilename).slice(1).toLowerCase()`, `jpeg`→`jpg`: empty allowed, otherwise must equal the detected extension else `file_type_mismatch`; (6) returned `extension` always from detection (FR-013–FR-016)
- [X] T029 [US2] Implement the SVG path in `apps/server/src/image-upload.ts` (research R3): create one module-level `JSDOM` window and `DOMPurify(window)`; parse with `new window.DOMParser().parseFromString(text, 'image/svg+xml')`; refuse (`unsupported_file_type`) when `doc.getElementsByTagName('parsererror').length > 0` or `doc.documentElement` is not `localName === 'svg'` with `namespaceURI === 'http://www.w3.org/2000/svg'`; call `purify.sanitize(root, { IN_PLACE: true, USE_PROFILES: { svg: true, svgFilters: true } })` inside try/catch (throw → `unsupported_file_type`); set `removed` from `purify.removed` mapped to `element.nodeName` / `attribute.name` only (never values), capped at 50 entries; `bytes = Buffer.from(new window.XMLSerializer().serializeToString(root))` so the prolog, DOCTYPE, PIs and top-level comments are dropped (FR-017). Do not use `isomorphic-dompurify` or `is-svg` (research R3); add a short code comment explaining why the raw upload must never be stored (parser differential)
- [X] T030 [US2] Wire images into `createGame` in `apps/server/src/endpoints.ts`: before `createMatch`, require `ctx.request.files?.model` to be a single non-array file (else `CreateGameError('missing_image')`), read it with `readFile(file.filepath)`, and call `processImageUpload({ buffer, claimedMimeType: file.mimetype ?? undefined, originalFilename: file.originalFilename ?? undefined })`; after players have joined, write `image.bytes` with `writeFile` to `${getDbImagesFolder()}/${matchID}.${image.extension}` (replacing the old `rename` of the raw upload) and `setModel(matchID, { extension: image.extension })`; if `image.removed.length > 0` call `logSecurityEvent('svg_sanitized', { matchID, removed: image.removed })`. Remove the now-unused `getImageExtension` import (keep the shared helper if other code uses it)
- [X] T031 [US2] Guarantee temp-file cleanup (FR-018, US2 AS8) in `apps/server/src/endpoints.ts`: wrap the whole `createGame` body in `try … finally` that deletes every uploaded temp file in `ctx.request.files` (all fields, arrays included) with `rm(filepath, { force: true })`. In `apps/server/src/publicApi.ts` keep `formidable.uploadDir` but point it at a dedicated temp folder (e.g. `os.tmpdir()/db-uploads`, created via a new `getUploadTempFolder()` in `apps/server/src/filesystem.ts`) so stray uploads never sit next to served images in `db-images`
- [X] T032 [US2] Add integration tests in `apps/server/src/main.test.ts` (port of PR #358/#360 tests, expected status changed from 500 to 400, research R9): `it.each` over the PR #360 payloads from T026 posted via `.attach('model', buffer, { filename, contentType })` → 400 with the matching `error` code, no new match, and no new file in `getDbImagesFolder()` or the upload temp folder; two `.attach('model', …)` calls → `400 missing_image`; `modelType=Image` with no file → `400 missing_image`; malicious SVG `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="9" height="9"/></svg>` → 200 and `GET /game/:id/image` (player Basic auth) body equals `<svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>`, plus a `svg_sanitized` log line (spy on `console.log`); clean PNG/JPEG/GIF/WebP/SVG fixtures from T025 → 200 and image bytes served unchanged (SVG: canonical form)

**Checkpoint**: US2 is complete: no uploaded file can deliver code, and refused uploads leave nothing behind.

---

## Phase 5: User Story 3 - Delivered models and pages cannot be turned against the viewer (moved to spec 002)

**Moved to `specs/002-delivery-security-headers/tasks.md`** (its Phases 3–5): the global response headers, the SVG image headers and the production-build CSP check, including tasks T033–T038 that were planned here. The task numbers T033–T038 are retired; later phases keep their numbering so the [Story] labels stay stable.

---

## Phase 6: User Story 4 - Games are never half-created (Priority: P2)

**Goal**: New matches are unlisted, and any failure after `createMatch` wipes the match, its model key and its image file.

**Independent Test**: Force a failure after `createMatch` (mock `joinMatch` or `setModel` to throw) → 500, and match count, model keys and image files are unchanged; `GET` the public lobby listing → new games absent.

### Tests for User Story 4 ⚠️ write first, confirm they fail

- [X] T039 [P] [US4] Write tests in `apps/server/src/ModelFlatFile.test.ts` (new): after `setModel(id, model)` and `wipe(id)`, `fetch(id, { model: true }).model` is `undefined`/`null` and the boardgame.io match data is gone
- [X] T040 [P] [US4] Write integration tests in `apps/server/src/main.test.ts`: (a) with `vi.spyOn(gameServer.db, 'setModel').mockRejectedValueOnce(new Error('boom'))` on a valid image upload → response 500 with no `error`/stack details in the body, and afterwards no match, no `${matchID}:model` key, no `db-images/${matchID}.*` file and no temp upload file remain, and one `create_failed` log entry is written; (b) same with a failure injected in `joinMatch` for a Threat Dragon game; (c) after creating a game, `GET http://localhost:<INTERNAL_API_PORT>/games/<gameName>` (boardgame.io lobby list) does not contain the new `matchID` (FR-005, US4 AS3); (d) `it.each` over every invalid request kind from US1/US2/Phase 2 → match count unchanged (SC-003)

### Implementation for User Story 4

- [X] T041 [US4] Override `wipe(id)` in `apps/server/src/ModelFlatFile.ts` to call `super.wipe(id)` and then remove the `${id}:model` key via the private `removeItem` (with the same `@ts-expect-error` + eslint-disable pattern used for `getItem`/`setItem`) (research R6)
- [X] T042 [US4] Pass `unlisted: true` to `lobbyClient.createMatch(gameName, { numPlayers, setupData, unlisted: true })` in `createGame` in `apps/server/src/endpoints.ts` (FR-005)
- [X] T043 [US4] Add rollback to `createGame` in `apps/server/src/endpoints.ts` (FR-003, data-model §5): keep `matchID` in an outer `let`; in the catch for non-`CreateGameError` errors, if `matchID` is set, `await gameServer.db.wipe(matchID)` and `await rm(`${getDbImagesFolder()}/${matchID}.${extension}`, { force: true })` for the stored extension (if any), each in its own try/catch so a cleanup failure is logged (`logSecurityEvent('create_failed', …)`) but never masks the 500

**Checkpoint**: US4 is complete: no request, valid or invalid, can leave a partial game behind.

---

## Phase 7: User Story 5 - Facilitators get actionable errors (Priority: P3)

**Goal**: Refusals tell the facilitator what and where, never echo input, and are logged exactly once; the creation page shows the error instead of hanging.

**Independent Test**: Submit a model with one unknown field on one cell → 400 naming diagram index, cell index and field, without the value; the creation page shows the code and paths and leaves the "creating" state.

### Tests for User Story 5 ⚠️ write first, confirm they fail

- [X] T044 [P] [US5] Write contract tests in `apps/server/src/main.test.ts`: (a) model with `cells.1.foo = "SECRET-VALUE-123"` on diagram 0 → 400, `issues[0].path === 'model.detail.diagrams.0.diagramJson.cells.1.foo'`, and `JSON.stringify(response.body)` does not contain `SECRET-VALUE-123` (US5 AS1); (b) a name list `['SECRET-NAME', 'SECRET-NAME']` → 400 `invalid_request` and the body does not contain `SECRET-NAME`; (c) for every refusal in the suite, `console.log` spy records exactly one line containing `SECURITY create_rejected` (SC-005), and a payload with `\n2026-01-01T00:00:00.000Z - Game created` inside a field path cannot add a second log line; (d) unexpected failure → body contains no stack trace or error message (US5 AS2)
- [X] T045 [P] [US5] Extend the existing client tests in `apps/client/src/pages/__tests__/create.test.tsx` with a new case: mock `fetch` to return `400 { error: 'invalid_model', issues: [{ path: 'model.detail.diagrams.0.diagramJson.cells.1.foo', expected: 'never' }] }`; after submit, the page shows the error code and the path, the submit button is enabled again, and no navigation to the "created" view happens

### Implementation for User Story 5

- [X] T046 [US5] Handle non-OK responses in `apps/client/src/pages/create.tsx` (research R10, around lines 87–103): if `!response.ok`, read the JSON body defensively (it may be empty for 500), store `{ error, issues }` in new state, render it in a Bootstrap `Alert` (`color="danger"`) above the submit button listing the `error` code and each `issue.path` (rendered as React text, never HTML), call `setCreating(false)` and return; clear the error state on the next submit. For 500 show a generic "Game could not be created" message. Keep the success path unchanged (FR-026, FR-027)
- [X] T047 [US5] Review all `logSecurityEvent`/`logEvent` calls added in `apps/server/src/endpoints.ts` and `apps/server/src/image-upload.ts`: request-derived values only appear inside the JSON-encoded fields object, `issues` contain only `path`/`expected`, `removed` contains only names (≤ 50), and no call logs `ctx.request.body`, filenames or MIME types raw (FR-025)

**Checkpoint**: All user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T048 [P] Update `docs/ARCHITECTURE.md` with a short "Game creation validation" section: shared valibot schemas in `packages/shared/src/schemas/`, `apps/server/src/image-upload.ts`, and the validate → createMatch(unlisted) → join → store order with rollback. (Where delivery headers are set is documented by `specs/002-delivery-security-headers/tasks.md` T014, not here.)
- [X] T049 [P] Document in `docs/CODE_CONVENTIONS.md` (Error Handling section) that request validation must use the shared schemas and `formatIssues`, and that responses/logs never echo submitted values
- [X] T050 Create a changeset with `npx changeset add`: `patch` for `@eop/server`, `@eop/shared`, `@eop/client`; summary "Validate game creation input, sanitize SVG uploads, detect image types from content and add security headers (supersedes #358, #360)" (file in `.changeset/`)
- [X] T051 Run `npx turbo run lint`, `npx turbo run test`, `npx turbo run build` and fix every finding (quickstart §1)
- [X] T052 Run manual quickstart §2 steps 1–5 with `npx turbo run dev` and confirm each expected result
- T053 *(moved, retired)*: the production check of the security response headers and the content security policy now lives in `specs/002-delivery-security-headers/tasks.md` (T013 there)
- [ ] T054 Commit with sign-off (`git commit --signoff`), and in the PR description reference that PRs #358 and #360 are superseded, list the ported tests, and note the documented decisions (no `is-svg`, no `isomorphic-dompurify`, SVG sanitize-and-store policy, remaining `<image href>` tracking-pixel risk)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T001–T004 before T005.
- **Foundational (Phase 2)**: depends on Setup. Blocks all user stories.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on Phase 2 (`CreateGameError`, validate-first `createGame`). Independent of US1.
- **US4 (Phase 6)**: depends on Phase 2; its tests use valid image and Threat Dragon games, so run after US1 and US2.
- **US5 (Phase 7)**: depends on Phase 2; test (a) uses the US1 schema.
- **Polish (Phase 8)**: after all desired stories.

(US3's delivery protections moved to `specs/002-delivery-security-headers/` and no longer constrain this task list.)

### Story Dependency Graph

```text
Setup ─► Foundational ─┬─► US1 (P1, MVP) ──┐
                       ├─► US2 (P1) ───────┼─► US4 (P2) ─┐
                       └─► US5 (P3, needs US1 schema) ──┴─► Polish
```

### Within Each User Story

- Tests first; confirm they fail.
- Shared schemas → server module → `createGame` wiring → integration tests.
- `apps/server/src/endpoints.ts` and `apps/server/src/main.test.ts` are touched by several stories: tasks touching them are sequential, never [P] with each other.

---

## Parallel Execution Examples

### Phase 2

```text
T006 format-issues.test.ts   | T007 utils.test.ts       | T008 create-game-request.test.ts
T009 format-issues.ts        | T010 utils.ts (logSecurityEvent)
```

### User Story 1

```text
T016 fixtures copy   | T017 golden tests   | T018 negative tests   (T017/T018 same file: write T017 first, or in one sitting)
then T019 → T020 → T021 → T022 (same file, sequential) → T023 → T024
```

### User Story 2 (in parallel with US1 once Phase 2 is done)

```text
T025 image fixtures | T026 raster tests | T027 SVG tests   (T026/T027 same file: sequential)
then T028 → T029 (image-upload.ts) → T030 → T031 (endpoints.ts) → T032
```

### User Story 3

Moved to `specs/002-delivery-security-headers/tasks.md` (Phases 3–5 there).

### Across stories (two developers)

```text
Dev A: US1 (packages/shared/src/schemas/threat-dragon-model.*)
Dev B: US2 (apps/server/src/image-upload.*)
Merge both, then US4, US5 on endpoints.ts sequentially.
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1): closes the most severe zero-click XSS and the `extension` cross-game image access.
3. **Stop and validate**: quickstart §2 steps 1–2, `npx turbo run test`.

### Incremental Delivery

1. Setup + Foundational → validate-first skeleton with the 400 contract.
2. US1 → Threat Dragon models safe (MVP).
3. US2 → uploads safe (closes PR #358/#360 gaps).
4. US4 → no orphaned games, unlisted matches.
5. US5 → client error display and log hardening.
6. Polish → docs, changeset, full manual checks, signed-off commit.

US1 and US2 (both P1) should ship together in one PR, because the spec supersedes the input-side approaches of PRs #358 and #360. Their delivery-side protections now ship from `specs/002-delivery-security-headers/`.

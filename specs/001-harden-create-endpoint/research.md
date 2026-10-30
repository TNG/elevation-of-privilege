# Research: Harden Game Creation and Model Delivery

All findings were verified on 2026-10-30, either by running experiments or by reading code and library sources. Experiments ran in `/tmp/opencode/libtest` and `/tmp/opencode/td-golden` on Node 20.20.2 with TypeScript 5.9.2.

## R1 — Runtime and module system for ESM-only libraries

**Decision**:
- Raise the root `engines.node` to `>=20.19.0 <25.0.0`.
- Switch `apps/server` TypeScript to `module`/`moduleResolution: "nodenext"`.
- Import ESM-only `file-type` with a normal static `import`.

**Rationale**:
- **ESM-only packages:** `file-type@21` is ESM-only. Its types are reachable only via `exports`, which `moduleResolution: "Node"` (node10) cannot resolve.
- **TypeScript side:** TS ≥ 5.8 with `module: nodenext` compiles a static import of an ESM package from a CommonJS file into `require()`.
- **Node side:** Node ≥ 20.19 (and ≥ 22.12) supports `require(esm)` without a flag.
- **Checks run:**
  - The server compiles cleanly under `nodenext` with no other changes (`tsc --noEmit`).
  - A compiled CJS test file importing `file-type` ran correctly on Node 20.20.
  - The ts-node dev server starts under `nodenext`.
- **Compatibility:**
  - The CI matrix (20.x, 22.x, 24.x) uses the latest minor versions, so it satisfies ≥ 20.19.
  - Docker uses Node 24.
  - `jsdom@28` requires `^20.19` anyway.

**Alternatives considered**:
- `file-type@16.5.4`, the last CJS release: rejected because it is outdated.
- `await import()` wrapped in `new Function`: rejected as a hack that bypasses type checking.
- Hand-written magic-byte checks, as in PR #360: rejected per the maintainer's review.

## R2 — Raster image detection

**Decision**: Use `file-type@^21` `fileTypeFromBuffer` on the full upload buffer.
- **Accepted:** `image/png`, `image/jpeg`, `image/gif`, `image/webp`.
- **Passed on to SVG detection (R3):** `undefined` (unknown or text) and `application/xml`, because an SVG starting with `<?xml` is reported as XML.
- **Refused:** any other detected type.

**Rationale**: This is the library the maintainer asked for in the PR #360 review. Verified results: PNG, JPEG, GIF and WebP are detected correctly. PHP, HTML and empty files return `undefined`. A PDF returns `application/pdf`, which gets refused.

**Alternatives considered**: `image-type` (ESM, a thinner wrapper around the same engine) and hand-written signature checks.

## R3 — SVG detection, sanitization and storage

**Decision**:
1. Parse the upload with jsdom's `DOMParser` as `image/svg+xml`. Refuse if the result contains a `parsererror`, or if the root element is not `svg` in the SVG namespace.
2. Sanitize the root element in place with DOMPurify, which uses the same jsdom window: `{ IN_PLACE: true, USE_PROFILES: { svg: true, svgFilters: true } }`. If DOMPurify throws, refuse.
3. Store `XMLSerializer().serializeToString(root)`, i.e. the server's own serialization of the cleaned `<svg>` element. This drops the prolog, DOCTYPE, processing instructions and top-level comments.
4. Log what DOMPurify removed (`DOMPurify.removed`: node and attribute names only, never values) as a security event.

**Rationale (from the experiments)**:
- **String mode in HTML parsing** (what PR #358 does): DOMPurify parses SVG as HTML, which differs from how the browser parses `image/svg+xml`. It also always reports the `body` wrapper as removed.
- **String mode in XML parsing** (`PARSER_MEDIA_TYPE: application/xhtml+xml`): any XML declaration or DOCTYPE makes parsing fail silently. DOMPurify then returns `""` and reports nothing removed, so a naive `removed.length === 0` check would let an entity-based payload pass. **Rejected.**
- **jsdom DOMParser + `IN_PLACE`** sees exactly what a browser's XML parser sees, and `removed` lists only real removals.
- **Parser differential:** jsdom stores an internal entity's replacement text as *text*, but browsers parse it as *markup*. Example: `<!ENTITY x "<script>…">` used as `&x;`. Browsers also apply DTD default attributes (`<!ATTLIST svg onload …>`) and `<?xml-stylesheet?>` instructions, which jsdom ignores. **So the raw upload must never be stored.** Storing the server's own serialization removes all of these: each was shown to be harmless after re-serialization.
- **Stability:** sanitizing the stored output a second time removes nothing and gives the same bytes, for all 19 test samples.
- **Policy (user decision):** sanitize and store, as in PR #358, rather than refuse. Strict refusal would have rejected Inkscape SVGs (editor metadata), draw.io SVGs (`foreignObject` labels) and Illustrator SVGs (`<use>` references, comments). Removals are still logged.
- **Remaining risk:** `<image href="https://…">` stays in the stored file (external tracking pixel). Browsers don't load it in `<img>` context, and direct delivery uses `default-src 'none'`. Accepted.

**Alternatives considered**:
- `is-svg`, suggested in the PR #358 review: it is a heuristic, gives no security guarantee, and is ESM-only. A real XML parse with a namespace check on the root is both stricter and the input DOMPurify needs anyway, so `is-svg` adds nothing. **Not used.** This is documented for reviewers.
- `isomorphic-dompurify`: it creates its own hidden jsdom window, so a node parsed by our `DOMParser` would belong to a different window than DOMPurify. Using `dompurify` + `jsdom` directly with one shared window is explicit and is what was tested.

## R4 — Threat Dragon model schema (valibot)

**Decision**:
- Add `valibot` to `packages/shared` and define `threatDragonModelSchema` there.
- **Top level, summary, detail, contributors, diagrams:** use `v.object`, which **drops unknown keys**. Store the parsed output. This drops `extension`, `location`, `$$hashKey` and similar keys.
- **Cells:** `v.variant('type', [...])` with one `v.strictObject` per type, built from a shared base plus extras for each type.
- **`attrs`:** a strict object whose optional keys are the allowed selectors. Each selector maps to a strict style object with allowed attribute names. Values are `string | number | boolean`; `text` must be a string.
- **Labels, threats, source/target, vertices:** strict objects.
- **Identifiers:** `^[\w-]{1,64}$`.

**Rationale (from 13 real V1 exports, 291 cells; see the corpus under `/tmp/opencode/td-golden`)**:
- Real exports never contain `markup`, `ports`, `html`, `xlink:href` or `<`. A strict allowlist is practical.
- Legacy selectors exist and must be allowed: `.undefined`, `#element-shape`, `#element-process`.
- AngularJS leftovers (`$$hashKey`) appear on threats, so they must be declared there. On diagrams and contributors they are dropped by the outer `v.object`.
- `diagram.size` is sometimes a string (`"790"`), so it is declared as `number | string` at diagram level.
- A label's `position` can be a number or `{distance, offset}`, where `offset` is a number or `{x, y}`.
- Threat `status` values include `"Not Applicable"`. Fields added by this app's own model download (`owner`, `id`, `game`, `modelType`) must be accepted so that a downloaded model can be uploaded again.
- The official V1 schema can't be used as an allowlist: it has no `additionalProperties: false`, and it is wrong about required and missing keys.
- V2 models (X6 format) have a `shape` key on cells, which strict cells reject. That is the intended "clear client error" for V2.
- Under strict objects, valibot reports unknown keys as `type: "strict_object", expected: "never"`, with an exact path from `getDotPath`.

**Alternatives considered**:
- `v.looseObject` at the top level: rejected because it would keep `extension`, which enables the cross-game image IDOR.
- Strict objects at the top level: rejected because real exports carry varying metadata.
- A regex instead of a fixed list for selector names: rejected; a fixed list matches FR-009 more closely.

## R5 — Error response contract

**Decision**:
- Validation failures return `400` with body `{ "error": "<code>", "issues": [{ "path": "<dot path>", "expected": "<schema expectation>" }] }`.
- valibot's `message` is never returned, because it contains the received value.
- Other refusals return `400` with a fixed `error` code.
- Unexpected errors return `500` with no body details.

**Rationale**: FR-023 forbids echoing submitted content. The path contains key names, which US5 requires in order to name the field. `expected` comes from the schema, not from the input.

## R6 — Ordering, rollback and temp files

**Decision**: In `createGame`, run these steps in order:
1. Parse the body.
2. Validate the model, or detect and process the image into an in-memory buffer.
3. `createMatch({ unlisted: true })`.
4. Join the players.
5. Write the image file and call `setModel`.

If step 4 or 5 throws, call `db.wipe(matchID)` and delete the image file. Override `ModelFlatFile.wipe` so it also removes the `${matchID}:model` key. Delete the formidable temp file in `finally`.

**Rationale**: FR-002/003/018. `LobbyClient.createMatch` accepts `unlisted`. `FlatFile.wipe(id)` exists, but the model key is a custom key.

## R7 — Delivery headers

**Decision**:
- **API (Koa):** `koa-helmet@^9` (CJS) + `helmet@^8`, configured with:
  - `contentSecurityPolicy` directives: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`;
  - `frameguard: deny`;
  - `noSniff` (on by default).
- **`getImage` for SVG:** additionally sets `Content-Disposition: attachment` and `Content-Security-Policy: default-src 'none'`. The route-level `ctx.set` overrides helmet's header.
- **nginx:** `add_header … always` for `X-Content-Type-Options`, `X-Frame-Options` and the same CSP, **inside `location /`** (static files only). `/api/` responses already get headers from Koa, so they aren't duplicated.

**Rationale**:
- These are the protections from PR #358 and PR #360, and the maintainer agreed with them.
- Using a library instead of hand-written header middleware follows the "established libraries" policy.
- `connect-src 'self'` covers same-origin `ws:`/`wss:` in current browsers. PR #360's broader `ws: wss:` would allow any WebSocket host.
- `img-src blob:` is needed because the client shows uploads via `URL.createObjectURL`.
- The Vite dev server needs inline scripts, so the dev page gets no CSP (spec assumption).

**Alternatives considered**: hand-written middleware, as in PR #360.

## R8 — Shared vs. server code placement

**Decision**:
- `packages/shared/src/schemas/`: `createGameRequestSchema`, `threatDragonModelSchema`, and an issue formatter. These are pure and reusable (FR-001), and the client or a future `validateSetupData` can use them.
- `apps/server/src/image-upload.ts`: raster/SVG detection and SVG sanitization. This depends on Node and jsdom, so it stays on the server only.

## R9 — Existing tests that must change

- `main.test.ts`: two tests post `{}` and `{foo:'bar'}` as Threat Dragon models (both carry a TODO to fix them once validation lands). They will switch to a golden model.
- Tests ported from PR #358 and #360: the expected status changes from `500` to `400`. The SVG test asserts that the stored file is cleaned, not that the request is refused.

## R10 — Client handling of 400 responses

**Finding**: `apps/client/src/pages/create.tsx:87-103` doesn't check `response.ok`. A 400 makes `[...r.credentials]` throw, and the page stays in the "creating" state.

**Decision**: Make a minimal client change: if `!response.ok`, show the server's error code and the issue paths, and reset `creating`. This is required for US5 and FR-026. The spec only excludes the error boundary and the model reference link from client changes.

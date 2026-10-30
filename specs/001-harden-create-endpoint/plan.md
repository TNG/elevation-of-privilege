# Implementation Plan: Harden Game Creation and Model Delivery Against Injected Content

**Branch**: `fix/create-sanitization` (spec folder `001-harden-create-endpoint`) | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-harden-create-endpoint/spec.md`

## Summary

The work is done in one place, `POST /game/create`. Every model and file is validated there before anything is stored. On top of that, delivery headers act as a backstop.

- **One shared set of rules:** declarative valibot schemas in `packages/shared` cover the form fields and the Threat Dragon V1 model.
  - Top-level metadata is stripped, so keys like `extension` can't be stored.
  - Cells, styling, labels and threats are strict allowlists built from 13 real V1 exports.
  - This closes the JointJS markup XSS, the `extension` image IDOR, and the crashes from wrongly shaped models.
- **Uploaded images:**
  - Raster type is detected from the content with `file-type`.
  - SVGs are parsed with jsdom, sanitized in place with DOMPurify, and stored as the server's own serialization. This closes PR #358's XSS and the parser-differential tricks.
  - The claimed MIME type and the filename extension must match the detected type (PR #360).
- **`createGame` order:** validate first, then create an *unlisted* match. If a later step fails, wipe the match. Temp files are always deleted.
- **Errors:** a 400 contract that never echoes submitted values.
- **Delivery protections:** `koa-helmet` on the API, nginx headers for static files, and `attachment` + `default-src 'none'` for SVG images.
- **Client:** a minimal change so the creation page shows 400 errors.

This replaces PRs #358 and #360. Design decisions are in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`). Node ≥ 20.19, <25. The server switches to `module`/`moduleResolution: nodenext` (R1).

**Primary Dependencies**:
- Existing: Koa 3, koa-body 6, @koa/router 14, boardgame.io 0.50, valibot 1.x (server).
- **New for the server:** `file-type@^21`, `dompurify@^3`, `jsdom@^28`, `koa-helmet@^9`, `helmet@^8`.
- **New for shared:** `valibot`.

**Storage**: boardgame.io FlatFile (node-persist) in `os.tmpdir()/db`, with images in `os.tmpdir()/db-images`. The layout doesn't change.

**Testing**: Vitest, plus Supertest for server integration tests. The golden-file corpus lives in shared.

**Target Platform**: Linux server (Docker `node:24-alpine`) behind nginx (`nginx-unprivileged`). CI runs Node 20.x, 22.x and 24.x.

**Project Type**: Web application (npm workspaces + Turbo): `apps/server`, `apps/client`, `packages/shared`.

**Performance Goals**: Game creation is not noticeably slower for legitimate inputs. jsdom parsing only runs for SVG uploads.

**Constraints**:
- No hand-written sanitizing or magic-byte logic (maintainer reviews on #358 and #360).
- No size or DoS limits, per the maintainer's review on #358.
- The success response format stays the same.
- All commits signed off, plus a changeset.

**Scale/Scope**: About 6 source files changed and 4 new, plus tests and fixtures. The client change is limited to error display in `create.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles. Instead, the gates come from the project's binding guidance in `AGENTS.md` and `docs/*`, and from the maintainer reviews:

| Gate | Source | Pre-design | Post-design |
|---|---|---|---|
| Validate user input with Valibot schemas | CODE_CONVENTIONS "Error Handling" | ✅ planned | ✅ shared schemas (data-model §1–2) |
| Established libraries rather than hand-written sanitizing or sniffing | maintainer reviews on PRs #358 and #360 | ✅ | ✅ file-type, DOMPurify+jsdom, helmet. `is-svg` is replaced by a stricter jsdom parse (R3), and the reason is documented |
| Vitest for all tests; Supertest for the API | CODE_CONVENTIONS "Testing" | ✅ | ✅ quickstart §1 |
| Imports sorted; type-only imports; kebab-case for new files | CODE_CONVENTIONS | ✅ | ✅ `image-upload.ts`, `schemas/*.ts` |
| Client only works together with the server; use `npx turbo` | AGENTS.md | ✅ | ✅ quickstart §2 |
| Commits signed off; changeset for fixes | WORKFLOW.md | ✅ | ✅ in the implementation checklist |
| Scope matches the spec (no DoS limits, no move or socket hardening) | spec Out of Scope | ✅ | ✅ |

No violations, so the Complexity Tracking table stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-harden-create-endpoint/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0: R1–R10
├── data-model.md        # Phase 1: schemas, upload rules, state transitions
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   ├── post-game-create.md
│   └── response-headers.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks), not created here
```

### Source Code (repository root)

```text
packages/shared/
├── package.json                         # + valibot
└── src/
    ├── index.ts                         # export schemas
    └── schemas/
        ├── create-game-request.ts       # createGameRequestSchema (FR-004, FR-006)
        ├── threat-dragon-model.ts       # threatDragonModelSchema (FR-006–FR-012)
        ├── format-issues.ts             # path + expected only (FR-023)
        ├── *.test.ts
        └── __fixtures__/threat-dragon/
            ├── v1/*.json                # golden corpus (subset of 13 collected)
            ├── v2/*.json                # negative examples
            └── SOURCES.md               # URLs + Apache-2.0 attribution

apps/server/
├── package.json                         # + file-type, dompurify, jsdom, koa-helmet, helmet
├── tsconfig.app.json / tsconfig.test.json   # module + moduleResolution: nodenext
└── src/
    ├── image-upload.ts                  # NEW: detect raster/SVG, sanitize SVG, check claimed type + extension
    ├── image-upload.test.ts             # NEW: R3 samples + PR #360 payloads
    ├── endpoints.ts                     # createGame: validate → createMatch(unlisted) → join → store; rollback; 400 contract.
    │                                    # getImage: SVG attachment + CSP
    ├── ModelFlatFile.ts                 # wipe() also deletes the model key
    ├── publicApi.ts                     # koa-helmet; /create route unchanged otherwise
    └── main.test.ts                     # contract tests; fix the 2 TODO Threat Dragon tests; port the PR tests (500 → 400)

apps/client/
├── nginx/etc/nginx/conf.d/default.conf  # add_header ... always inside location /
└── src/pages/create.tsx                 # show 400 error code and paths, reset "creating" (R10)

package.json                             # engines.node >=20.19.0 <25.0.0
.changeset/<name>.md                     # patch for @eop/server, @eop/shared, @eop/client
```

**Structure Decision**: Keep the existing workspace layout.
- **Shared:** pure, reusable validation (FR-001) goes into `packages/shared/src/schemas/`.
- **Server only:** Node- and jsdom-dependent file handling goes into one new module, `apps/server/src/image-upload.ts`.
- **No new packages.**

## Implementation Outline

Ordered for test-first work. Detailed tasks come from `/speckit.tasks`.

1. **Platform** (R1):
   - bump `engines`;
   - switch the server tsconfig to `nodenext`;
   - add the dependencies;
   - check that `turbo build` and `test` still pass with no behavior change.
2. **Shared schemas + golden tests** (data-model §1–3, R4, R5): write the tests first.
   - **Threat Dragon payloads refused:** element markup, tool markup, label markup, vertex and arrowhead markup, `attrs.*.html`, `on*`, `href`, `xlink:href`, label `markup`, V2 `shape`.
   - **Field rules:** names, turnDuration, modelReference.
   - **Golden V1 models:** accepted.
   - **Envelope:** `extension` and `location` are dropped.
3. **`image-upload.ts`** (data-model §4, R2, R3):
   - **R3 SVG samples:** the 19 samples from research.
   - **PR #360 payloads:** PHP as PNG, HTML, SVG as PNG, PNG named `.php`/`.html`/`.sh`, PNG declared as JPEG, empty file.
   - **Clean images:** PNG, JPEG, GIF, WebP, SVG accepted.
4. **`createGame` rewrite** (R5, R6; contracts/post-game-create.md):
   - validate → `createMatch({unlisted:true})` → join → write image / `setModel`;
   - `try/catch` rollback via `db.wipe` (model key and image file too);
   - `finally` deletes the temp file;
   - error mapping and `logEvent`.
5. **Delivery headers** (R7; contracts/response-headers.md): `koa-helmet` in `publicApi.ts`, the SVG headers in `getImage`, the nginx `location /` headers.
6. **Client** (R10): handle `!response.ok` in `create.tsx`.
7. **Integration tests:** quickstart §1 table. Update the two TODO tests to use a golden model.
8. **Wrap-up:** run `npx turbo run lint test build`, the manual quickstart §2–3, `npx changeset add`, then `git commit --signoff`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The strict cell schema rejects an unusual but legitimate export | Golden corpus of 13 real exports (legacy selectors, `$$hashKey`, string sizes, object label positions). The 400 names the exact path. |
| The `nodenext` switch affects other imports | Verified: `tsc --noEmit` is clean and the ts-node dev server starts. CI covers Node 20, 22 and 24. |
| `require(esm)` isn't available on Node < 20.19 | Engines bump. CI and Docker already use newer versions. |
| Apache-2.0 fixtures in an MIT repo | Attribution in `SOURCES.md`. Use the smallest representative subset. |
| A CSP header breaks a client feature | The policy is derived from the client's actual needs (blob images, same-origin WebSocket). Manual check of the browser console in quickstart §3. |
| SVG sanitization changes how editor-made SVGs look | Accepted by user decision. Removals are logged. draw.io's text fallbacks remain. |

## Complexity Tracking

No constitution violations to justify.

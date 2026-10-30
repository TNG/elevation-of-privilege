# Quickstart: Validate the Hardening

## Prerequisites

- Node ≥ 20.19 (`node --version`) and `npm ci` run at the repo root.
- The golden Threat Dragon V1 and V2 corpus is checked in under `packages/shared/src/schemas/__fixtures__/threat-dragon/{v1,v2}/`. Its `SOURCES.md` lists the sources and the Apache-2.0 attribution.

## 1. Automated checks

```bash
npx turbo run lint
npx turbo run test     # shared schema unit tests + server integration tests
npx turbo run build
```

Expected: all three pass. The key suites:

| Suite | Proves |
|---|---|
| `packages/shared/src/schemas/*.test.ts` | Every XSS sink key and attribute is refused. All golden V1 models are accepted. V2 models are refused. `extension` is dropped. Form field rules hold. |
| `apps/server/src/image-upload.test.ts` | The 19 SVG samples from research R3 are sanitized or refused. The PR #360 file-type payloads are refused. Clean PNG, JPEG, GIF, WebP and SVG are accepted. |
| `apps/server/src/main.test.ts` | The end-to-end 400 contract ([contracts/post-game-create.md](contracts/post-game-create.md)): no orphan matches or files, unlisted matches, the image header contract ([contracts/response-headers.md](contracts/response-headers.md)), and the updated Threat Dragon round-trip tests. |

## 2. Manual end-to-end (dev)

```bash
npx turbo run dev     # client http://localhost:5173, API :8001
```

1. **Legitimate Threat Dragon model.**
   - Create a game with a golden V1 model.
   - Expected: every player link shows the diagram as before.
2. **XSS model.**
   - Run this:
     ```bash
     curl -s -F startSuit=A -F gameMode="Elevation of Privilege" -F modelType="Threat Dragon" -F turnDuration=300 -F 'names[]=a' -F 'names[]=b' -F 'model={"summary":{"title":"x"},"detail":{"diagrams":[{"id":0,"title":"d","diagramJson":{"cells":[{"id":"c1","type":"tm.Actor","markup":"<image href=\"/x\" onerror=\"alert(1)\"/>"}]}}]}}' http://localhost:8001/game/create
     ```
   - Expected: `400` and `{"error":"invalid_model","issues":[{"path":"model.detail.diagrams.0.diagramJson.cells.0.markup","expected":"never"}]}`.
3. **Malicious SVG.**
   - Upload `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="9" height="9"/></svg>` as an image model through the UI.
   - Expected: the game is created and the rectangle shows.
   - Then `GET /game/<id>/image` (with player Basic auth) returns `<svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>`, plus the `attachment` and `default-src 'none'` headers.
   - The server log has an `svg_sanitized` entry.
4. **File type bypass.**
   - Run: `printf '<?php echo 1; ?>' > evil.png && curl -s -F … -F modelType=Image -F 'model=@evil.png;type=image/png' …`
   - Expected: `400 unsupported_file_type`, and nothing new under `$TMPDIR/db-images/`.
5. **Error display.**
   - Submit an invalid model through the UI.
   - Expected: the page shows the error code and the issue paths, and leaves the "creating" state.

## 3. Production headers

```bash
docker compose up --build
curl -sI http://localhost:8080/ | grep -iE 'content-security|x-frame|x-content-type'
curl -sI http://localhost:8080/api/game/x/players | grep -iE 'content-security|x-frame|x-content-type'
```

Expected:
- each header appears exactly once on both responses;
- the browser console on the running app shows no CSP violations while you create and play a game, including with an uploaded image.

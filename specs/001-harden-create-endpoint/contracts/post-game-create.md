# Contract: `POST /game/create`

Public endpoint, no authentication. Proxied by nginx as `/api/game/create`.

## Request

`multipart/form-data`. Field rules are in [data-model.md §1](../data-model.md#1-creategamerequest-creategamerequestschema-stripping).

| Field | Required | Notes |
|---|---|---|
| `startSuit`, `gameMode`, `modelType`, `turnDuration` | yes | |
| `names[]` | yes | repeated field, 2–9 entries |
| `modelReference` | no | https URL |
| `model` (text) | if `modelType=Threat Dragon` | JSON text of a Threat Dragon V1 model |
| `model` (file) | if `modelType=Image` | exactly one file: PNG, JPEG, GIF, WebP or SVG |

## Responses

### 200 OK (unchanged)

```json
{ "game": "<matchID>", "credentials": ["<p0>", "<p1>"], "spectatorCredential": "<uuid>" }
```

The match is unlisted. For SVG uploads, the stored image is the server's cleaned serialization of the file.

### 400 Bad Request

```json
{ "error": "<code>", "issues": [{ "path": "model.detail.diagrams.0.diagramJson.cells.3.markup", "expected": "never" }] }
```

| `error` code | When | `issues` |
|---|---|---|
| `invalid_request` | form fields break `createGameRequestSchema` | yes |
| `invalid_model_json` | `model` text is not JSON | no |
| `invalid_model` | the model breaks `threatDragonModelSchema` | yes. Paths start with `model.` |
| `missing_image` | no file, more than one file, or an empty file | no |
| `unsupported_file_type` | the content is not PNG, JPEG, GIF or WebP, nor a well-formed SVG | no |
| `file_type_mismatch` | the claimed MIME type or the filename extension contradicts the detected type | no |

Guarantees:
- No submitted **values** are echoed back. Paths contain only key names and indices.
- No match, model or image file exists afterwards.
- No temp file remains.
- Exactly one security log entry is written, with JSON-encoded fields.

### 500 Internal Server Error

Generic, with no details. Any match created so far is wiped, together with its model key and image file.

## Logging (server console via `logEvent`)

| Event | Fields (JSON-encoded) |
|---|---|
| `create_rejected` | `code`, `issues` (paths only) |
| `svg_sanitized` | `matchID`, `removed` (node and attribute names, at most 50 entries) |
| `create_failed` | `matchID`, error class name |

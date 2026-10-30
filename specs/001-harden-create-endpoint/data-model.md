# Data Model: Harden Game Creation and Model Delivery

All schemas are declarative valibot schemas in `packages/shared/src/schemas/`, except where noted. Notation:
- **strict**: unknown keys are refused.
- **stripping**: unknown keys are dropped from the output.
- **`?`**: optional key.

## 1. CreateGameRequest (`createGameRequestSchema`, stripping)

| Field | Type / rule | Source |
|---|---|---|
| `startSuit` | picklist `SUITS` | unchanged |
| `gameMode` | enum `GameMode` | unchanged |
| `modelType` | enum `ModelType` | unchanged |
| `modelReference?` | string, valid URL, protocol `https:` | FR-004 |
| `turnDuration` | string matching `^\d{1,4}$` → number, integer, 0–3600 | FR-004 |
| `names` | array of (string → trim → non-empty), length 2–9 (`MIN/MAX_NUMBER_PLAYERS`), all unique | FR-004 |
| `model?` | string; **required** when `modelType === THREAT_DRAGON` (cross-field check) | FR-006 |

Image uploads come in through `ctx.request.files.model` and are validated separately (§4).

## 2. ThreatDragonModel (`threatDragonModelSchema`)

### 2.1 Envelope (stripping)

```text
Model (stripping)
├─ version?        string
├─ summary (stripping)
│   ├─ title        string
│   ├─ description? string
│   ├─ owner?       string
│   └─ id?          number | string
└─ detail (stripping)
    ├─ contributors? array of (stripping) { name: string }
    ├─ reviewer?     string
    └─ diagrams      array, min length 1, of Diagram
Diagram (stripping)
├─ id            number | string
├─ title         string
├─ thumbnail?    string
├─ diagramType?  string
├─ version?      string
├─ diagramTop?   number
├─ threatTop?    number
├─ reviewer?     string
├─ size?         (stripping) { width: number|string, height: number|string }
└─ diagramJson   (stripping) { cells?: array of Cell }
```

Anything not declared is dropped. This includes `extension`, `location` and `$$hashKey`.

### 2.2 Cell (`v.variant('type', …)`, each variant strict)

**Common base (every variant):**

| Key | Type |
|---|---|
| `id` | `Id` = string `^[\w-]{1,64}$` |
| `type` | literal per variant |
| `z?` | number |
| `attrs?` | `Attrs` (§2.3) |
| `size?` | strict `{ width: number, height: number }` |
| `hasOpenThreats?`, `outOfScope?` | boolean |
| `reasonOutOfScope?`, `description?` | string |
| `threats?` | array of `Threat` (§2.5) |

**Extras by variant:**

| Variant | Extra keys |
|---|---|
| `tm.Process` | `angle?` number; `position?` Point; `privilegeLevel?` string; `handlesCardPayment?`, `handlesGoodsOrServices?`, `isWebApplication?` boolean |
| `tm.Store` | `angle?`; `position?`; `isALog?`, `storesCredentials?`, `isEncrypted?`, `isSigned?`, `storesInventory?` boolean |
| `tm.Actor` | `angle?`; `position?`; `providesAuthentication?` boolean |
| `tm.Flow` | `source?`/`target?` End; `vertices?` array of Point; `labels?` array of Label; `smooth?` boolean; `protocol?` string; `isEncrypted?`, `isPublicNetwork?` boolean |
| `tm.Boundary` | `source?`/`target?` End; `vertices?` array of Point; `labels?` array of Label; `smooth?` boolean; `isTrustBoundary?` boolean |

**Shared types:**
- `Point`: strict `{ x: number, y: number }`.
- `End`: strict `{ id?: Id, x?: number, y?: number }`.

**Rejected keys:** `markup`, `toolMarkup`, `labelMarkup`, `vertexMarkup`, `arrowheadMarkup`, `doubleToolMarkup`, `ports`, `portMarkup`, `shape` (V2) and any other key not listed. V2 models are rejected through `shape` and the strict cells.

### 2.3 Attrs (strict; all keys optional)

**Allowed selector keys:**
- current: `.element-shape`, `.element-text`, `text`, `rect`, `.connection`, `.connection-wrap`, `.marker-source`, `.marker-target`;
- legacy: `.undefined`, `#element-shape`, `#element-process`.

Each selector maps to a **Style** object (strict, all keys optional):

| Attribute | Type |
|---|---|
| `text` | string |
| `class`, `fill`, `stroke`, `stroke-dasharray`, `d`, `transform`, `ref`, `text-anchor`, `y-alignment`, `font-size`, `font-weight` | string |
| `stroke-width`, `r`, `width`, `height`, `ref-x`, `ref-y` | number or string |
| `follow-scale` | boolean |

The strict Style object rejects `html`, `on*`, `href`, `xlink:href`, `style` and every other attribute name.

### 2.4 Label (strict)

- `position`: number, or strict `{ distance: number, offset?: number | Point }`.
- `attrs?`: strict `{ text?: strict { text?: string, 'font-size'?: string, 'font-weight'?: string } }`.
- No `markup`.

### 2.5 Threat (strict; all keys optional)

- **String fields:** `title`, `type`, `status`, `severity`, `description`, `mitigation`, `modelType`, `threatId`, `ruleId`, `score`, `owner`, `id`, `game`, `$$hashKey`.
- **Number fields:** `number`.

Text values are rendered by React, so they are escaped. Markdown export is out of scope.

## 3. Validation issue (`formatIssues`, shared)

```text
Issue { path: string  (valibot getDotPath; key names only, no values)
        expected: string | null (schema expectation, e.g. "never", "string") }
```

## 4. UploadedImage (server, `apps/server/src/image-upload.ts`)

```text
input:  { buffer, claimedMimeType?, originalFilename? }
output: { kind: 'raster' | 'svg', extension: 'png'|'jpg'|'gif'|'webp'|'svg',
          bytes: Buffer (raster: original; svg: canonical serialization),
          removed: string[] (svg only; node/attribute names) }
```

**Rules, applied in order** (any failure is refused with `400`):
1. Exactly one non-empty file.
2. `detected` = `file-type` result:
   - one of png, jpeg, gif or webp → raster;
   - `undefined` or `application/xml` → try SVG (step 3);
   - anything else → refuse.
3. SVG:
   - parse as `image/svg+xml` with jsdom;
   - a `parsererror`, or a root that isn't `{SVG_NS}svg` → refuse;
   - DOMPurify `IN_PLACE` sanitize; if it throws → refuse;
   - `bytes` = `XMLSerializer` output of the root.
4. `claimedMimeType` must equal the detected MIME type.
5. `path.extname(originalFilename)`, lowercased, with `jpeg` normalized to `jpg`:
   - empty → allowed;
   - otherwise it must equal the detected `extension`.
6. The stored extension always comes from the detected type.

## 5. Stored game records (unchanged layout)

| Key | Content | Change |
|---|---|---|
| `${matchID}:model` | parsed ThreatDragonModel, `{ extension }` for images, `DEFAULT_MODEL`, or `null` | only validated output is stored |
| `db-images/${matchID}.${ext}` | raster bytes, or the canonical SVG | written only after `createMatch` and joins succeed |
| match metadata | boardgame.io | `unlisted: true` |

**State transitions in `createGame`:**

```text
received → validated → match registered → players joined → model/image stored → 200
   │           │              │                 │                 │
   └─ 400 ─────┘              └─ 500 + wipe(match, model key, image file) ┘
temp upload file: deleted in every path (finally)
```

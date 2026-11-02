# Data Model: Delivery Security Headers and Content Security Policy

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md) (R1–R8)

This feature adds no persistent data. The model below defines the delivery rules: which instructions each response class must carry, the one global policy, and the client features each directive must keep working.

## §1 Response classes and required instructions

| Response class | Delivered by | Required instructions |
|---|---|---|
| Static client (pages, assets), production | web server, `location /` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: <global>` |
| Every API response (success, client error, server error, unknown route), all environments | Koa middleware, first in the chain | same three, plus the library's other safe defaults |
| `GET /game/:matchID/image`, stored extension `svg` | `getImage`, overriding the global CSP | `Content-Type: image/svg+xml`, `Content-Disposition: attachment; filename="<matchID>.svg"`, `Content-Security-Policy: default-src 'none'`, `Access-Control-Expose-Headers: Content-Disposition` |
| `GET /game/:matchID/image`, raster extensions (`png`, `jpg`, `gif`, `webp`) | `getImage` | global API instructions only; **no** `Content-Disposition: attachment` |
| Development page (dev server) | none | none (hot reload needs inline scripts; exempt per FR-011) |

**Rules**:
- Each instruction appears **exactly once** per response (FR-004). The web server adds headers only for the static location, never for proxied API traffic.
- The instruction set is defined once (see §2); the web server's static copy is pinned by the contract and verified in the Docker check.

## §2 Global content security policy

Single definition, exported from `apps/server/src/config.ts` as `CONTENT_SECURITY_POLICY_DIRECTIVES` and rendered into the header value:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

| Directive | Value | Client feature it must keep working (FR-009) |
|---|---|---|
| `default-src` | `'self'` | fallback deny-by-default |
| `script-src` | `'self'` | the single external bundle; blocks inline scripts and inline event handlers (FR-006) |
| `style-src` | `'self'` `'unsafe-inline'` | Bootstrap stylesheet plus runtime-injected inline styles |
| `img-src` | `'self' data: blob:` | card images; inline `data:` icons; uploaded-image previews via `URL.createObjectURL` |
| `font-src` | `'self' data:` | the webfont inlined as a `data:application/font-woff` URL in the stylesheet (added after the US3 production check found `default-src` blocking it) |
| `connect-src` | `'self'` | `/api` fetches and the same-origin live game connection (WebSocket) |
| `object-src` | `'none'` | no plugin content is used |
| `base-uri` | `'self'` | blocks `<base>` hijacking |
| `frame-ancestors` | `'none'` | no embedding in other sites (paired with `X-Frame-Options: DENY` for older browsers) |

## §3 SVG image delivery decision (getImage)

```text
fetch(matchID, { model }) ──► model.extension?
   │
   ├─ 'svg'   ──► ctx.attachment(matchID + '.svg')
   │             ctx.set('Content-Security-Policy', "default-src 'none'")
   │             ctx.set('Access-Control-Expose-Headers', 'Content-Disposition')
   │             send(matchID + '.svg')      # Content-Type: image/svg+xml
   │
   └─ raster  ──► send(matchID + '.' + extension)   # global headers only, no attachment
```

Route-level `ctx.set` takes precedence over the middleware's CSP for that response. The client's display path (`fetch` → blob → object URL → `<img>`) is unaffected by `Content-Disposition`, so only the direct-open case changes: it becomes a download that may run nothing (SC-004).

## §4 Client compatibility matrix

| Client behavior | Where | Required allowance |
|---|---|---|
| Load the bundle | production `index.html` | `script-src 'self'`; build must stay free of inline scripts/handlers (FR-010) |
| Show board and cards | `components/board` | images from own origin (`img-src 'self'`) |
| Show uploaded model image | `components/imagemodel` | fetch `/api/game/:id/image` (`connect-src 'self'`), preview via `blob:` (`img-src blob:`) |
| Live game connection | boardgame.io client | same-origin WebSocket (`connect-src 'self'`) |
| Download reports / model | `components/downloadbutton` | `connect-src 'self'`; reads `Content-Disposition` filename (exposed header) |
| Inline icons | components | `img-src data:` |

Any violation of these allowances is a bug in the policy, not in the client: the application keeps working unchanged (FR-009, SC-003).

# Contract: Delivery Protections (response headers)

Carried over unchanged from `specs/001-harden-create-endpoint/contracts/response-headers.md`; owned by this spec from now on.

## Global CSP value

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

## Headers by response

| Response | Set by | Headers |
|---|---|---|
| Static client (`/`, assets, `index.html`), production | nginx `location /`, `add_header … always` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: <global>` |
| Every API response (`/game/*`, including errors and unknown routes), all environments | Koa `koa-helmet`, first middleware | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: <global>`, plus helmet's other defaults |
| `GET /game/:matchID/image` where the stored extension is `svg` | `getImage`, overriding helmet's CSP | `Content-Type: image/svg+xml`, `Content-Disposition: attachment`, `Content-Security-Policy: default-src 'none'`, `Access-Control-Expose-Headers: Content-Disposition` |
| `GET /game/:matchID/image` for raster images | `getImage` | global API headers only; no `attachment`, so in-page display is unchanged |
| Vite dev server page (port 5173) | none | none, because hot reload needs inline scripts (spec assumption) |

## Duplicate-header rule

Each header appears at most once per response. nginx adds headers only inside `location /`; proxied `/api/` responses get theirs from Koa only.

## Compatibility requirements

The policy must allow everything the client needs:
- **Scripts:** bundled scripts from the own origin only.
- **Styles:** Bootstrap and runtime-injected styles (`'unsafe-inline'`).
- **Images:**
  - card images from the own origin;
  - `blob:` URLs from `URL.createObjectURL` for uploaded images;
  - `data:` URLs for inline icons.
- **Connections:** same-origin `/api/` (fetch) and `/socket.io/` (WebSocket).

## Verification summary

- Automated (Vitest/Supertest): assert the three global headers (CSP compared as a directive set) on success, error and unknown routes; assert the SVG image header set and the raster non-attachment rule.
- Manual (Docker): each header appears exactly once on `/` and on an API route; browser console shows zero CSP violations during a full game; an injected inline script is blocked.

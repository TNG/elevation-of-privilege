# Contract: Delivery Protections (response headers)

## Global CSP value

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

## Headers by response

| Response | Set by | Headers |
|---|---|---|
| Static client (`/`, assets, `index.html`), production | nginx `location /`, `add_header … always` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: <global>` |
| Every API response (`/game/*`), all environments | Koa `koa-helmet` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: <global>`, plus helmet's other defaults |
| `GET /game/:matchID/image` where the stored extension is `svg` | `getImage`, overriding helmet's CSP | `Content-Type: image/svg+xml`, `Content-Disposition: attachment`, `Content-Security-Policy: default-src 'none'` |
| `GET /game/:matchID/image` for raster images | `getImage` | global API headers only; no `attachment`, so in-page display is unchanged |
| Vite dev server page (port 5173) | none | none, because hot reload needs inline scripts (spec assumption) |

## Compatibility requirements

The policy must allow everything the client needs:
- **Scripts:** bundled scripts from the own origin only.
- **Styles:** Bootstrap and runtime-injected styles (`'unsafe-inline'`).
- **Images:**
  - card images from the own origin;
  - `blob:` URLs from `URL.createObjectURL` for uploaded images;
  - `data:` URLs for inline icons.
- **Connections:** same-origin `/api/` (fetch) and `/socket.io/` (WebSocket).

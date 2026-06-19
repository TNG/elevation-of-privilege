---
"@eop/server": patch
"@eop/client": patch
---

Fix file upload restriction bypass via Content-Type manipulation (CWE-434).
Image uploads to POST /api/game/create are now validated server-side against
a strict allowlist (PNG, JPEG, GIF, WebP, SVG) and the actual file content is
verified via magic-byte sniffing, so an attacker can no longer upload
arbitrary file types (e.g. PHP, HTML) by spoofing the multipart Content-Type
header. The stored file extension is now derived from the server allowlist
rather than the client-supplied filename. Additionally, X-Content-Type-Options:
nosniff, X-Frame-Options, and a strict Content-Security-Policy are now set on
both the API (Koa) and the static client (nginx) responses as defense-in-depth
against stored XSS via content-type confusion.

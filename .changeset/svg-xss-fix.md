---
"@eop/server": patch
---

Fix stored XSS via malicious SVG uploads. SVG files uploaded as image models
are now sanitized server-side with DOMPurify (stripping <script>, event
handlers, foreignObject, javascript: URIs, etc.) before storage, and the
/image endpoint sets Content-Disposition: attachment and
Content-Security-Policy: default-src 'none' headers when serving SVGs so they
cannot be rendered as navigable documents that execute embedded scripts.

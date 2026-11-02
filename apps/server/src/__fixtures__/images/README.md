# Image fixtures

All files in this directory are **generated**, not copied from any repository,
so the uploaded content is unencumbered and deterministic.

They were produced by a one-off local script (byte-level construction) during
task T025 of `specs/001-harden-create-endpoint/tasks.md`:

| File         | Generation                                                        | Validation                                                                                                              |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `clean.png`  | 1×1 8-bit RGBA opaque white PNG, IDAT produced with zlib          | detected as `image/png` by `file-type`                                                                                  |
| `clean.gif`  | minimal GIF89a, 1×1, global color table, minimal LZW block        | detected as `image/gif` by `file-type`                                                                                  |
| `clean.jpg`  | public-domain "smallest JPEG" byte sequence (JFIF, 1×1 grayscale) | detected as `image/jpeg` by `file-type`                                                                                 |
| `clean.webp` | RIFF/WEBP container with a minimal VP8L (lossless) 1×1 frame      | detected as `image/webp` by `file-type`                                                                                 |
| `clean.svg`  | hand-written minimal SVG (see T025)                               | intentionally **not** detected by `file-type` (no SVG support); must be accepted by the SVG path of the upload pipeline |

All raster fixtures were verified with the `file-type` package (the same
detector used by `apps/server/src/image-upload.ts`) before being committed.

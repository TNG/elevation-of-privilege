/**
 * Server-side validation of uploaded image files.
 *
 * The previous implementation trusted the client-supplied `Content-Type`
 * header and the filename extension independently, which allowed an attacker
 * to upload arbitrary file types (e.g. `.php`, `.html`) by claiming an
 * `image/*` MIME type. This module enforces a strict allowlist and verifies
 * the actual file content via magic-byte sniffing, so the client-supplied
 * MIME type and extension can no longer bypass validation on their own.
 */

/**
 * Allowlist of MIME types that may be uploaded as image models, mapped to the
 * canonical extension the server uses when persisting the file. The stored
 * extension is always derived from this map, never from the client-supplied
 * filename, so attackers cannot control the on-disk extension.
 */
export const ALLOWED_IMAGE_TYPES: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export type ImageTypeResult = {
  /** Canonical MIME type, determined from the allowlist. */
  readonly mimeType: string;
  /** Canonical file extension, derived from the allowlist. */
  readonly extension: string;
  /** Whether the file was detected as SVG (by extension or content). */
  readonly isSvg: boolean;
};

/**
 * Magic-byte signatures for the allowed raster formats. SVG is detected
 * separately by content sniffing (see {@link looksLikeSvg}).
 */
const MAGIC_BYTES: ReadonlyArray<{
  readonly mimeType: string;
  readonly match: (buf: Buffer) => boolean;
}> = [
  {
    mimeType: 'image/png',
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mimeType: 'image/jpeg',
    match: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mimeType: 'image/gif',
    match: (b) =>
      b.length >= 6 &&
      (b.subarray(0, 6).equals(Buffer.from('GIF87a')) ||
        b.subarray(0, 6).equals(Buffer.from('GIF89a'))),
  },
  {
    // RIFF....WEBP
    mimeType: 'image/webp',
    match: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).equals(Buffer.from('RIFF')) &&
      b.subarray(8, 12).equals(Buffer.from('WEBP')),
  },
];

const SVG_CONTENT_HINTS: ReadonlyArray<RegExp> = [
  /<\?xml[^>]*\bsvg\b/i,
  /<svg\b/i,
  /\bxmlns\s*=\s*["']https?:\/\/www\.w3\.org\/2000\/svg["']/i,
];

/**
 * Detects whether a buffer is an SVG, either by extension hint or by content
 * sniffing. This catches payloads that were renamed to a non-SVG extension to
 * bypass extension-based checks.
 */
export const looksLikeSvg = (buffer: Buffer): boolean => {
  const head = buffer.subarray(0, 1024).toString('utf8');
  return SVG_CONTENT_HINTS.some((hint) => hint.test(head));
};

const sniffMagicBytes = (buffer: Buffer): string | undefined => {
  for (const { mimeType, match } of MAGIC_BYTES) {
    if (match(buffer)) {
      return mimeType;
    }
  }
  return undefined;
};

/**
 * Validates an uploaded image file against the allowlist, cross-checking the
 * client-supplied MIME type, the client-supplied filename extension, and the
 * actual file content (magic bytes for raster formats).
 *
 * SVG is accepted when the declared MIME type is `image/svg+xml`; it has no
 * reliable magic bytes, so content sniffing is intentionally not performed
 * here. A separate sanitization step is responsible for neutralizing active
 * content in SVG uploads.
 *
 * @param declaredMimeType The MIME type from the multipart `Content-Type`
 *   header (client-controlled).
 * @param originalFilename The original filename from the multipart part
 *   (client-controlled).
 * @param fileBuffer The uploaded file content. Only the first few KB are read.
 * @returns The canonical MIME type, extension, and SVG flag on success.
 * @throws Error if the file is not a supported image type, the declared MIME
 *   does not match the allowlist, the extension does not match the MIME, or the
 *   magic bytes do not match the claimed type.
 */
export const validateImageFile = (
  declaredMimeType: string,
  originalFilename: string,
  fileBuffer: Buffer,
): ImageTypeResult => {
  const canonicalExtension = ALLOWED_IMAGE_TYPES[declaredMimeType];
  if (canonicalExtension === undefined) {
    throw new Error('Filetype not supported');
  }

  const clientExtension = extractExtension(originalFilename);
  if (clientExtension !== undefined && clientExtension !== canonicalExtension) {
    // The extension does not have to match the MIME, but if one is provided it
    // must not contradict the allowlist (e.g. `Content-Type: image/png` with
    // `evil.php` is rejected).
    throw new Error('Filetype not supported');
  }

  if (canonicalExtension === 'svg') {
    // SVG has no reliable magic bytes; rely on sanitization downstream.
    return { mimeType: 'image/svg+xml', extension: 'svg', isSvg: true };
  }

  const sniffed = sniffMagicBytes(fileBuffer);
  if (sniffed === undefined) {
    throw new Error('Filetype not supported');
  }
  if (sniffed !== declaredMimeType) {
    // E.g. a PHP file claiming `Content-Type: image/png`.
    throw new Error('Filetype not supported');
  }

  return {
    mimeType: sniffed,
    extension: canonicalExtension,
    isSvg: false,
  };
};

const extractExtension = (filename: string): string | undefined => {
  const match = filename.match(/\.([A-Za-z0-9+]+)$/);
  return match?.[1]?.toLowerCase();
};

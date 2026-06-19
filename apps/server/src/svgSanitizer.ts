import DOMPurify from 'isomorphic-dompurify';

const SVG_CONTENT_HINTS = [
  /<\?xml[^>]*\bsvg\b/i,
  /<svg\b/i,
  /\bxmlns\s*=\s*["']https?:\/\/www\.w3\.org\/2000\/svg["']/i,
];

const SVG_SANITIZER_OPTIONS: DOMPurify.Config = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'foreignObject'],
  FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover'],
};

/**
 * Detects whether a buffer is an SVG, either by extension hint or by content
 * sniffing. This catches payloads that were renamed to a non-SVG extension to
 * bypass extension-based checks.
 */
export const isSvg = (extension: string, buffer: Buffer): boolean => {
  if (extension.toLowerCase() === 'svg') {
    return true;
  }

  const head = buffer.subarray(0, 1024).toString('utf8');
  return SVG_CONTENT_HINTS.some((hint) => hint.test(head));
};

/**
 * Sanitizes an SVG buffer by stripping scripts, event handlers, and other
 * active content using DOMPurify with the SVG profile. The output preserves
 * benign shapes, paths, gradients, and filters.
 *
 * Throws if the SVG cannot be parsed and yields an empty result.
 */
export const sanitizeSvg = (buffer: Buffer): Buffer => {
  const svgString = buffer.toString('utf8');
  const sanitized = DOMPurify.sanitize(svgString, SVG_SANITIZER_OPTIONS);

  if (sanitized.trim().length === 0) {
    throw new Error('SVG sanitization yielded an empty document');
  }

  return Buffer.from(sanitized, 'utf8');
};

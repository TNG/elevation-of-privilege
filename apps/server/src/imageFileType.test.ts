import { describe, expect, it } from 'vitest';

import {
  ALLOWED_IMAGE_TYPES,
  looksLikeSvg,
  validateImageFile,
} from './imageFileType';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

const GIF89A_SIGNATURE = Buffer.from('GIF89a');

const WEBP_SIGNATURE = Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'binary');

const MINIMAL_PNG = Buffer.concat([
  PNG_SIGNATURE,
  Buffer.from(
    // IHDR chunk (13 bytes data) + IEND
    '\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa3U\xe7\xe6\x00\x00\x00\x00IEND\xaeB`\x82',
  ),
]);

describe('validateImageFile', () => {
  describe('valid uploads', () => {
    it('accepts a real PNG with matching Content-Type and .png extension', () => {
      const result = validateImageFile('image/png', 'diagram.png', MINIMAL_PNG);
      expect(result).toEqual({
        mimeType: 'image/png',
        extension: 'png',
        isSvg: false,
      });
    });

    it('accepts a PNG with a mismatched (but absent) extension', () => {
      const result = validateImageFile('image/png', 'noext', MINIMAL_PNG);
      expect(result.extension).toBe('png');
    });

    it('accepts a JPEG with .jpg extension', () => {
      const result = validateImageFile(
        'image/jpeg',
        'photo.jpg',
        JPEG_SIGNATURE,
      );
      expect(result.extension).toBe('jpg');
    });

    it('accepts a GIF with .gif extension', () => {
      const result = validateImageFile(
        'image/gif',
        'anim.gif',
        GIF89A_SIGNATURE,
      );
      expect(result.extension).toBe('gif');
    });

    it('accepts a WebP with .webp extension', () => {
      const result = validateImageFile(
        'image/webp',
        'pic.webp',
        WEBP_SIGNATURE,
      );
      expect(result.extension).toBe('webp');
    });

    it('accepts an SVG by extension without checking magic bytes', () => {
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
      );
      const result = validateImageFile('image/svg+xml', 'drawing.svg', svg);
      expect(result).toEqual({
        mimeType: 'image/svg+xml',
        extension: 'svg',
        isSvg: true,
      });
    });

    it('accepts an SVG whose declared MIME is image/svg+xml even when content is short', () => {
      const result = validateImageFile(
        'image/svg+xml',
        'x.svg',
        Buffer.from('<svg/>'),
      );
      expect(result.isSvg).toBe(true);
    });
  });

  describe('rejected uploads', () => {
    it('rejects a .php file claiming Content-Type: image/png with PHP body', () => {
      const php = Buffer.from('<?php echo "Hello, World!"; ?>');
      expect(() => validateImageFile('image/png', 'file.php', php)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects an HTML file claiming Content-Type: image/html', () => {
      const html = Buffer.from('<html><script>alert(1)</script></html>');
      // image/html is not in the allowlist
      expect(() => validateImageFile('image/html', 'x.html', html)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects a PHP body claiming Content-Type: image/png but no extension', () => {
      const php = Buffer.from('<?php echo "Hello, World!"; ?>');
      expect(() => validateImageFile('image/png', 'no-extension', php)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects a .php extension even when magic bytes are absent', () => {
      expect(() =>
        validateImageFile('image/png', 'shell.php', MINIMAL_PNG),
      ).toThrow('Filetype not supported');
    });

    it('rejects a PHP file claiming image/png with .png filename', () => {
      // This is the core of the report: Content-Type spoofed to image/png
      // and extension .png, but the actual content is PHP.
      const php = Buffer.from('<?php system($_GET["c"]); ?>');
      expect(() => validateImageFile('image/png', 'evil.png', php)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects a PHP file claiming image/jpeg with .jpg filename', () => {
      const php = Buffer.from('<?php echo 1; ?>');
      expect(() => validateImageFile('image/jpeg', 'evil.jpg', php)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects an SVG content payload claiming image/png with .png extension', () => {
      // SVG has no PNG magic bytes, so magic-byte sniffing rejects it even
      // though the MIME and extension both claim PNG. (SVG uploads must use
      // the image/svg+xml MIME type, which is then sanitized downstream.)
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      expect(() => validateImageFile('image/png', 'evil.png', svg)).toThrow(
        'Filetype not supported',
      );
    });

    it('rejects a .html extension with image/png Content-Type', () => {
      expect(() =>
        validateImageFile('image/png', 'evil.html', MINIMAL_PNG),
      ).toThrow('Filetype not supported');
    });

    it('rejects an arbitrary executable extension (.sh) with image/png', () => {
      expect(() =>
        validateImageFile('image/png', 'evil.sh', MINIMAL_PNG),
      ).toThrow('Filetype not supported');
    });

    it('rejects an unknown MIME type', () => {
      expect(() =>
        validateImageFile('application/x-php', 'x.php', MINIMAL_PNG),
      ).toThrow('Filetype not supported');
    });

    it('rejects text/html MIME', () => {
      expect(() =>
        validateImageFile('text/html', 'x.html', Buffer.from('<html/>')),
      ).toThrow('Filetype not supported');
    });

    it('rejects a PNG declared as image/jpeg (cross-type mismatch)', () => {
      expect(() =>
        validateImageFile('image/jpeg', 'x.jpg', MINIMAL_PNG),
      ).toThrow('Filetype not supported');
    });

    it('rejects an empty buffer claiming image/png', () => {
      expect(() =>
        validateImageFile('image/png', 'x.png', Buffer.alloc(0)),
      ).toThrow('Filetype not supported');
    });
  });
});

describe('ALLOWED_IMAGE_TYPES', () => {
  it('contains the expected entries', () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual({
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    });
  });
});

describe('looksLikeSvg', () => {
  it('detects an SVG by <svg tag', () => {
    expect(
      looksLikeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBe(true);
  });

  it('detects an SVG by xml declaration', () => {
    expect(
      looksLikeSvg(
        Buffer.from(
          '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>',
        ),
      ),
    ).toBe(true);
  });

  it('returns false for a PNG buffer', () => {
    expect(looksLikeSvg(MINIMAL_PNG)).toBe(false);
  });

  it('returns false for arbitrary text', () => {
    expect(looksLikeSvg(Buffer.from('hello world'))).toBe(false);
  });
});

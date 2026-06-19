import { describe, expect, it } from 'vitest';

import { isSvg, sanitizeSvg } from './svgSanitizer';

const SVG_NS = 'http://www.w3.org/2000/svg';

const wrap = (inner: string) => `<svg xmlns="${SVG_NS}">${inner}</svg>`;

describe('sanitizeSvg', () => {
  it('strips <script> elements', () => {
    const input = Buffer.from(
      wrap(
        '<script>alert(document.cookie)</script><rect width="10" height="10"/>',
      ),
    );
    const output = sanitizeSvg(input).toString('utf8');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert');
    expect(output).toContain('<rect');
  });

  it('strips event handler attributes', () => {
    const input = Buffer.from(
      wrap(
        '<rect width="10" height="10" onload="alert(1)" onclick="alert(2)"/>',
      ),
    );
    const output = sanitizeSvg(input).toString('utf8');
    expect(output).not.toContain('onload');
    expect(output).not.toContain('onclick');
    expect(output).toContain('<rect');
  });

  it('strips <foreignObject> with embedded scripts and iframes', () => {
    const input = Buffer.from(
      wrap(
        '<foreignObject width="100" height="100"><script>alert(1)</script><iframe src="https://evil.example/"></iframe></foreignObject><rect/>',
      ),
    );
    const output = sanitizeSvg(input).toString('utf8');
    expect(output.toLowerCase()).not.toContain('foreignobject');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('<iframe');
    expect(output).toContain('<rect');
  });

  it('neutralizes javascript: URIs in href attributes', () => {
    const input = Buffer.from(
      wrap('<a href="javascript:alert(1)"><rect width="10" height="10"/></a>'),
    );
    const output = sanitizeSvg(input).toString('utf8');
    expect(output).not.toContain('javascript:');
    expect(output).toContain('<rect');
  });

  it('neutralizes javascript: URIs in xlink:href attributes', () => {
    const input = Buffer.from(
      `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>`,
    );
    const output = sanitizeSvg(input).toString('utf8');
    expect(output).not.toContain('javascript:');
  });

  it('preserves benign SVG content (shapes, paths, gradients, filters)', () => {
    const benign = `<svg xmlns="${SVG_NS}">
      <defs>
        <linearGradient id="g"><stop offset="0%" stop-color="red"/><stop offset="100%" stop-color="blue"/></linearGradient>
        <filter id="f"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <rect width="100" height="100" fill="url(#g)" filter="url(#f)"/>
      <path d="M0 0 L10 10" stroke="black"/>
      <circle cx="5" cy="5" r="3"/>
    </svg>`;
    const output = sanitizeSvg(Buffer.from(benign)).toString('utf8');
    expect(output).toContain('<rect');
    expect(output).toContain('<path');
    expect(output).toContain('<circle');
    expect(output).toContain('linearGradient');
    expect(output).toContain('feGaussianBlur');
  });

  it('throws on input that sanitizes to an empty document', () => {
    const input = Buffer.from('<script>alert(1)</script>');
    expect(() => sanitizeSvg(input)).toThrow();
  });
});

describe('isSvg', () => {
  it('returns true when extension is svg', () => {
    expect(isSvg('svg', Buffer.from('not svg at all'))).toBe(true);
  });

  it('returns true when extension is SVG (uppercase)', () => {
    expect(isSvg('SVG', Buffer.from('not svg at all'))).toBe(true);
  });

  it('returns true when content is SVG but extension is png (renamed file)', () => {
    const buffer = Buffer.from(wrap('<rect width="10" height="10"/>'));
    expect(isSvg('png', buffer)).toBe(true);
  });

  it('returns true when content starts with xml declaration mentioning svg', () => {
    const buffer = Buffer.from(
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
    );
    expect(isSvg('png', buffer)).toBe(true);
  });

  it('returns false for a non-SVG PNG buffer with png extension', () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    expect(isSvg('png', pngSignature)).toBe(false);
  });

  it('returns false for arbitrary text with no SVG markers', () => {
    expect(isSvg('jpg', Buffer.from('hello world'))).toBe(false);
  });
});

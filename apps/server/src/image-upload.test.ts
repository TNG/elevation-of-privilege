import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { processImageUpload } from './image-upload';

const FIXTURES = path.join(__dirname, '__fixtures__/images');

const readFile = (name: string): Buffer =>
  readFileSync(path.join(FIXTURES, name));

const expectRefusal = async (
  input: Parameters<typeof processImageUpload>[0],
  code: string,
): Promise<void> => {
  await expect(processImageUpload(input)).rejects.toMatchObject({
    name: 'CreateGameError',
    code,
  });
};

describe('processImageUpload: raster and type rules', () => {
  it.each([
    { extension: 'png', file: 'clean.png', mime: 'image/png' },
    { extension: 'jpg', file: 'clean.jpg', mime: 'image/jpeg' },
    { extension: 'gif', file: 'clean.gif', mime: 'image/gif' },
    { extension: 'webp', file: 'clean.webp', mime: 'image/webp' },
  ] as const)(
    'accepts a clean $extension with matching MIME type and extension',
    async ({ extension, file, mime }) => {
      const bytes = readFile(file);
      const image = await processImageUpload({
        buffer: bytes,
        claimedMimeType: mime,
        originalFilename: `diagram.${extension}`,
      });

      expect(image.kind).toBe('raster');
      expect(image.extension).toBe(extension);
      expect(image.bytes.equals(bytes)).toBe(true);
      expect(image.removed).toStrictEqual([]);
    },
  );

  it('accepts an uppercase filename (DIAGRAM.PNG)', async () => {
    const bytes = readFile('clean.png');
    const image = await processImageUpload({
      buffer: bytes,
      claimedMimeType: 'image/png',
      originalFilename: 'DIAGRAM.PNG',
    });

    expect(image.kind).toBe('raster');
    expect(image.extension).toBe('png');
  });

  it('normalizes a .jpeg filename to the jpg extension', async () => {
    const bytes = readFile('clean.jpg');
    const image = await processImageUpload({
      buffer: bytes,
      claimedMimeType: 'image/jpeg',
      originalFilename: 'diagram.jpeg',
    });

    expect(image.extension).toBe('jpg');
  });

  it('accepts a filename without an extension', async () => {
    const bytes = readFile('clean.png');
    const image = await processImageUpload({
      buffer: bytes,
      claimedMimeType: 'image/png',
      originalFilename: 'diagram',
    });

    expect(image.extension).toBe('png');
  });

  it('refuses PHP code claimed to be a PNG', async () => {
    await expectRefusal(
      {
        buffer: Buffer.from('<?php echo 1; ?>'),
        claimedMimeType: 'image/png',
        originalFilename: 'evil.png',
      },
      'unsupported_file_type',
    );
  });

  it('refuses HTML claimed to be a PNG', async () => {
    await expectRefusal(
      {
        buffer: Buffer.from('<html><script>alert(1)</script></html>'),
        claimedMimeType: 'image/png',
        originalFilename: 'x.png',
      },
      'unsupported_file_type',
    );
  });

  it('refuses an SVG claimed to be a PNG', async () => {
    await expectRefusal(
      {
        buffer: readFile('clean.svg'),
        claimedMimeType: 'image/png',
        originalFilename: 'clean.svg',
      },
      'file_type_mismatch',
    );
  });

  it.each(['shell.php', 'evil.html', 'run.sh'] as const)(
    'refuses a real PNG named %s',
    async (filename) => {
      await expectRefusal(
        {
          buffer: readFile('clean.png'),
          claimedMimeType: 'image/png',
          originalFilename: filename,
        },
        'file_type_mismatch',
      );
    },
  );

  it('refuses a PNG claimed to be a JPEG', async () => {
    await expectRefusal(
      {
        buffer: readFile('clean.png'),
        claimedMimeType: 'image/jpeg',
        originalFilename: 'diagram.png',
      },
      'file_type_mismatch',
    );
  });

  it('refuses an empty buffer', async () => {
    await expectRefusal(
      {
        buffer: Buffer.alloc(0),
        claimedMimeType: 'image/png',
        originalFilename: 'diagram.png',
      },
      'missing_image',
    );
  });

  it('refuses a PDF', async () => {
    await expectRefusal(
      {
        buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'),
        claimedMimeType: 'application/pdf',
        originalFilename: 'document.pdf',
      },
      'unsupported_file_type',
    );
  });

  it('refuses a GIF claimed to be a PNG even with a .png filename', async () => {
    await expectRefusal(
      {
        buffer: readFile('clean.gif'),
        claimedMimeType: 'image/png',
        originalFilename: 'diagram.png',
      },
      'file_type_mismatch',
    );
  });
});

describe('processImageUpload: SVG sanitization (research R3)', () => {
  const uploadSvg = (svg: string, filename = 'diagram.svg') =>
    processImageUpload({
      buffer: Buffer.from(svg),
      claimedMimeType: 'image/svg+xml',
      originalFilename: filename,
    });

  const refused = [
    { name: 'broken XML', svg: '<svg><g></svg>' },
    {
      name: 'an HTML page claimed as SVG',
      svg: '<html xmlns="http://www.w3.org/1999/xhtml"><body>hi</body></html>',
    },
    {
      name: 'an XHTML root element',
      svg: '<html xmlns="http://www.w3.org/1999/xhtml"/>',
    },
    { name: 'an svg without the SVG namespace', svg: '<svg><rect/></svg>' },
  ] as const;

  const sanitized = [
    {
      name: 'a script element',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="9" height="9"/></svg>',
      mustNotContain: ['<script'],
      mustContain: ['<rect'],
    },
    {
      name: 'onload on the root',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="9" height="9"/></svg>',
      mustNotContain: ['onload'],
    },
    {
      name: 'onclick on a child',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="9" height="9"/></svg>',
      mustNotContain: ['onclick'],
    },
    {
      name: 'a foreignObject with HTML',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></div></foreignObject><rect width="9" height="9"/></svg>',
      mustNotContain: ['<foreignObject', '<script'],
    },
    {
      name: 'a javascript xlink:href',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><rect width="9" height="9"/></a></svg>',
      mustNotContain: ['javascript:'],
    },
    {
      name: 'a javascript href',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="9" height="9"/></a></svg>',
      mustNotContain: ['javascript:'],
    },
    {
      name: 'an animate targeting href with javascript',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><a><rect width="9" height="9"/><animate attributeName="href" to="javascript:alert(1)"/></a></svg>',
      mustNotContain: ['javascript:'],
    },
    {
      name: 'a set targeting onmouseover',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onmouseover" to="alert(1)"/><rect width="9" height="9"/></svg>',
      mustNotContain: ['onmouseover'],
    },
    {
      name: 'a DOCTYPE with an entity expansion of a script',
      svg: '<!DOCTYPE svg [<!ENTITY x "<script>alert(1)</script>">]><svg xmlns="http://www.w3.org/2000/svg">&x;<rect width="9" height="9"/></svg>',
      mustNotContain: ['<script', '<!DOCTYPE', '<!ENTITY'],
    },
    {
      name: 'a DOCTYPE with a default onload attribute',
      svg: '<!DOCTYPE svg [<!ATTLIST svg onload CDATA "alert(1)">]><svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>',
      mustNotContain: ['onload', '<!DOCTYPE'],
    },
    {
      name: 'an xml-stylesheet processing instruction',
      svg: '<?xml-stylesheet href="evil.css"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>',
      mustNotContain: ['<?'],
    },
    {
      name: 'an XML declaration and top-level comments',
      svg: '<?xml version="1.0"?><!-- copyright --><svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>',
      mustNotContain: ['<!--', '<?xml'],
      startsWithSvg: true,
    },
  ] as const;

  const editors = [
    {
      name: 'an Inkscape SVG (sodipodi/inkscape namespaces)',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"><sodipodi:namedview id="base"/><rect inkscape:label="Layer 1" width="9" height="9"/></svg>',
      mustNotContain: ['<sodipodi:namedview', 'inkscape:label'],
      mustContain: ['<rect'],
    },
    {
      name: 'a draw.io SVG (foreignObject with a text fallback)',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><switch><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">label</div></foreignObject><text>fallback</text></switch></svg>',
      mustNotContain: ['<foreignObject'],
      mustContain: ['<text>fallback</text>'],
    },
    {
      name: 'an Illustrator SVG (symbol, use and comments)',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><!-- a comment --><symbol id="s"><rect width="9" height="9"/></symbol><use xlink:href="#s"/></svg>',
      mustNotContain: ['<!--', '<use'],
      mustContain: ['<symbol', '<rect'],
    },
  ] as const;

  it('accepts the clean fixture and keeps it equivalent', async () => {
    const image = await uploadSvg(readFile('clean.svg').toString());
    expect(image.kind).toBe('svg');
    expect(image.extension).toBe('svg');
    expect(image.bytes.toString()).toContain('<rect width="9" height="9"/>');
    expect(image.removed).toStrictEqual([]);
  });

  it('rejects an SVG claimed with a non-SVG MIME type', async () => {
    await expectRefusal(
      {
        buffer: readFile('clean.svg'),
        claimedMimeType: 'image/png',
        originalFilename: 'diagram.svg',
      },
      'file_type_mismatch',
    );
  });

  it('rejects an SVG with a non-svg extension', async () => {
    await expectRefusal(
      {
        buffer: readFile('clean.svg'),
        claimedMimeType: 'image/svg+xml',
        originalFilename: 'diagram.png',
      },
      'file_type_mismatch',
    );
  });

  it.each(refused)('refuses $name', async ({ svg }) => {
    await expectRefusal(
      {
        buffer: Buffer.from(svg),
        claimedMimeType: 'image/svg+xml',
        originalFilename: 'diagram.svg',
      },
      'unsupported_file_type',
    );
  });

  interface SvgSample {
    group: string;
    name: string;
    svg: string;
    mustNotContain: readonly string[];
    mustContain?: readonly string[];
    startsWithSvg?: boolean;
  }

  const allSvgSamples: SvgSample[] = [
    ...sanitized.map((sample) => ({ ...sample, group: 'sanitized' })),
    ...editors.map((sample) => ({ ...sample, group: 'editor' })),
  ];

  describe.each(allSvgSamples)('$group: $name', (sample) => {
    it('stores a canonical, harmless serialization', async () => {
      const image = await uploadSvg(sample.svg);
      const output = image.bytes.toString();

      expect(image.kind).toBe('svg');
      expect(image.extension).toBe('svg');

      for (const forbidden of sample.mustNotContain) {
        expect(output).not.toContain(forbidden);
      }
      for (const required of sample.mustContain ?? []) {
        expect(output).toContain(required);
      }
      if ('startsWithSvg' in sample && sample.startsWithSvg) {
        expect(output.startsWith('<svg')).toBe(true);
      }

      for (const entry of image.removed) {
        // node/attribute names only: no values, no markup
        expect(entry).toMatch(/^#?[\w.:-]+$/);
      }
    });

    it('is idempotent: the stored output sanitizes to itself', async () => {
      const first = await uploadSvg(sample.svg);
      const second = await processImageUpload({
        buffer: first.bytes,
        claimedMimeType: 'image/svg+xml',
        originalFilename: 'diagram.svg',
      });

      expect(second.bytes.equals(first.bytes)).toBe(true);
      expect(second.removed).toStrictEqual([]);
    });
  });

  it('caps the removed list at 50 entries', async () => {
    const payloads = Array.from(
      { length: 60 },
      (_, i) => `<rect onclick="alert(${i})"/>`,
    ).join('');
    const image = await uploadSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">${payloads}</svg>`,
    );

    expect(image.removed.length).toBeLessThanOrEqual(50);
    expect(image.removed.length).toBeGreaterThan(0);
    expect(image.removed.every((entry) => entry === 'onclick')).toBe(true);
  });
});

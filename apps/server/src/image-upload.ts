import path from 'node:path';

import createDOMPurify, { type DOMPurify } from 'dompurify';
import { JSDOM } from 'jsdom';
import { fileTypeFromBuffer } from 'file-type';

import { CreateGameError } from './create-game-error';

export interface UploadedImage {
  kind: 'raster' | 'svg';
  extension: 'png' | 'jpg' | 'gif' | 'webp' | 'svg';
  bytes: Buffer;
  removed: string[];
}

interface ProcessImageUploadInput {
  buffer: Buffer;
  claimedMimeType?: string;
  originalFilename?: string;
}

const RASTER_MIME_TYPES: Record<string, 'png' | 'jpg' | 'gif' | 'webp'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_MIME_TYPE = 'image/svg+xml';
const REMOVED_LIST_LIMIT = 50;

// One module-level jsdom window shared by DOMParser, DOMPurify and
// XMLSerializer: nodes parsed by our DOMParser must belong to the same window
// that DOMPurify sanitizes in (research R3). Not `isomorphic-dompurify`,
// which would create its own hidden window.
const window = new JSDOM('').window;
const purifier: DOMPurify = createDOMPurify(window);

const processRaster = (detectedMime: string, bytes: Buffer): UploadedImage => {
  const extension = RASTER_MIME_TYPES[detectedMime];
  if (extension === undefined) {
    throw new CreateGameError('unsupported_file_type');
  }

  return { kind: 'raster', extension, bytes, removed: [] };
};

const processSvg = (text: string): UploadedImage => {
  // The raw upload must never be stored: jsdom resolves DTD entities and
  // processing instructions differently from a browser (parser differential),
  // so only our own serialization of the sanitized tree is safe to keep.
  const doc = new window.DOMParser().parseFromString(text, SVG_MIME_TYPE);

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new CreateGameError('unsupported_file_type');
  }

  const root = doc.documentElement;
  if (
    root === null ||
    root.localName !== 'svg' ||
    root.namespaceURI !== SVG_NAMESPACE
  ) {
    throw new CreateGameError('unsupported_file_type');
  }

  try {
    purifier.sanitize(root, {
      IN_PLACE: true,
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  } catch {
    throw new CreateGameError('unsupported_file_type');
  }

  // Node and attribute names only — never values (FR-023).
  const removed = purifier.removed
    .map((entry) =>
      'attribute' in entry ? entry.attribute?.name : entry.element.nodeName,
    )
    .filter((name): name is string => name !== undefined)
    .slice(0, REMOVED_LIST_LIMIT);

  const bytes = Buffer.from(new window.XMLSerializer().serializeToString(root));

  return { kind: 'svg', extension: 'svg', bytes, removed };
};

/**
 * Detect the real type of an uploaded image, enforce that the claims (MIME
 * type, filename extension) match it, and sanitize SVGs to a canonical,
 * harmless serialization (data-model §4).
 */
export const processImageUpload = async (
  input: ProcessImageUploadInput,
): Promise<UploadedImage> => {
  const { buffer, claimedMimeType, originalFilename } = input;

  if (buffer.length === 0) {
    throw new CreateGameError('missing_image');
  }

  const detected = await fileTypeFromBuffer(buffer);

  const image =
    detected?.mime !== undefined &&
    Object.prototype.hasOwnProperty.call(RASTER_MIME_TYPES, detected.mime)
      ? processRaster(detected.mime, buffer)
      : detected?.mime === undefined || detected.mime === 'application/xml'
        ? processSvg(buffer.toString('utf8'))
        : (() => {
            throw new CreateGameError('unsupported_file_type');
          })();

  if (
    claimedMimeType !== undefined &&
    claimedMimeType !== (image.kind === 'svg' ? SVG_MIME_TYPE : detected!.mime)
  ) {
    throw new CreateGameError('file_type_mismatch');
  }

  const filenameExtension =
    originalFilename === undefined
      ? ''
      : path.extname(originalFilename).slice(1).toLowerCase();
  const claimedExtension =
    filenameExtension === 'jpeg' ? 'jpg' : filenameExtension;

  if (claimedExtension !== '' && claimedExtension !== image.extension) {
    throw new CreateGameError('file_type_mismatch');
  }

  return image;
};

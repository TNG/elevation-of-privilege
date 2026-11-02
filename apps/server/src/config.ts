import { ModelFlatFile } from './ModelFlatFile';
import { getDbFolder } from './filesystem';

export function getDatabase(): ModelFlatFile {
  return new ModelFlatFile({
    dir: getDbFolder(),
    logging: false,
  });
}

export const SERVER_PORT = Number.parseInt(process.env.SERVER_PORT ?? '8000');
export const API_PORT = Number.parseInt(process.env.API_PORT ?? '8001');
export const INTERNAL_API_PORT = Number.parseInt(
  process.env.INTERNAL_API_PORT ?? '8002',
);

// Single source of truth for the global content security policy, fixed by
// contracts/response-headers.md (spec 002); changes require a contract update.
export const CONTENT_SECURITY_POLICY_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
};

export const CONTENT_SECURITY_POLICY_HEADER =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

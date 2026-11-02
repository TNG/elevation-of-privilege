import { FlatFile } from 'boardgame.io/server';

import { describe, it, afterEach, expect } from 'vitest';

import {
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  CONTENT_SECURITY_POLICY_HEADER,
  getDatabase,
} from './config';

const env = process.env;

afterEach(() => {
  process.env = env;
});

it('returns correct FlatFile database', () => {
  process.env.DATA_STORE = 'whatever';
  const db = getDatabase();
  expect(db).toBeInstanceOf(FlatFile);
});

describe('content security policy definition (contracts/response-headers.md)', () => {
  const canonicalHeader =
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

  const camelToKebab = (key: string) =>
    key.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

  it('exports the canonical header string exactly as fixed by the contract', () => {
    expect(CONTENT_SECURITY_POLICY_HEADER).toBe(canonicalHeader);
  });

  it('renders every key of the directives object into the header with identical sources', () => {
    const rendered = Object.entries(CONTENT_SECURITY_POLICY_DIRECTIVES)
      .map(([key, sources]) => `${camelToKebab(key)} ${sources.join(' ')}`)
      .sort();
    const expected = canonicalHeader
      .split(';')
      .map((directive) => directive.trim())
      .sort();

    expect(rendered).toStrictEqual(expected);
  });
});

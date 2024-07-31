import { FlatFile } from 'boardgame.io/server';

import { it, afterEach, expect } from 'vitest';

import { getDatabase } from './config';

const env = process.env;

afterEach(() => {
  process.env = env;
});

it('returns correct FlatFile database', () => {
  process.env.DATA_STORE = 'whatever';
  const db = getDatabase();
  expect(db).toBeInstanceOf(FlatFile);
});

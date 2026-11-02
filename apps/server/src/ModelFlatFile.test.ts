import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { expect, it } from 'vitest';

import { ModelFlatFile } from './ModelFlatFile';

import type { Server, State } from 'boardgame.io';

const createDb = async (): Promise<ModelFlatFile> => {
  const dir = mkdtempSync(path.join(tmpdir(), 'eop-modelflatfile-test-'));
  const db = new ModelFlatFile({ dir, logging: false });
  await db.connect();
  return db;
};

const initialState = {} as State;
const metadata = {
  players: [{ id: 0, name: 'P1' }],
} as unknown as Server.MatchData;

it('wipe removes the model key and the boardgame.io match data', async () => {
  const db = await createDb();
  const matchID = 'wipe-me';

  await db.createMatch(matchID, { initialState, metadata });
  await db.setModel(matchID, { extension: 'png' });

  const before = await db.fetch(matchID, {
    metadata: true,
    state: true,
    model: true,
  });
  expect(before.model).toStrictEqual({ extension: 'png' });
  expect(before.metadata).toBeDefined();
  expect(before.state).toBeDefined();

  await db.wipe(matchID);

  const after = await db.fetch(matchID, {
    metadata: true,
    state: true,
    model: true,
  });
  expect(after.model).toBeUndefined();
  expect(after.metadata).toBeUndefined();
  expect(after.state).toBeUndefined();
});

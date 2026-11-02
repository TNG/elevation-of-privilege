import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

import {
  GameMode,
  gameName,
  ModelType,
  SPECTATOR,
  threatDragonModelSchema,
} from '@eop/shared';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as v from 'valibot';
import { LobbyClient } from 'boardgame.io/client';

import {
  gameServer,
  gameServerHandle,
  publicApiServer,
  publicApiServerHandle,
} from './main';
import { CONTENT_SECURITY_POLICY_HEADER, INTERNAL_API_PORT } from './config';
import { getDbImagesFolder, getUploadTempFolder } from './filesystem';

import type { ThreatDragonModel } from '@eop/shared';
import type { LobbyAPI, Server, State } from 'boardgame.io';

beforeEach(() => {
  const mockDate = new Date('2025-08-04T14:27:39');
  vi.setSystemTime(mockDate);
});

afterEach(() => {
  vi.useRealTimers();
});

const goldenModelPath = path.resolve(
  __dirname,
  '../../../packages/shared/src/schemas/__fixtures__/threat-dragon/v1/core-test-model.json',
);
const goldenModel: unknown = JSON.parse(readFileSync(goldenModelPath, 'utf-8'));
const parsedGoldenModel = v.parse(threatDragonModelSchema, goldenModel);

it('gameServer is not undefined', () => {
  expect(gameServer).toBeDefined();
});

it('creates a game without a model', async () => {
  const names = ['P1', 'P2', 'P3'];
  const response = await request(publicApiServer.callback())
    .post('/game/create')
    .field('startSuit', 'A')
    .field('gameMode', 'Elevation of Privilege')
    .field('modelType', 'Default')
    .field('turnDuration', '5')
    .field('names[]', names);
  const body = response.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };
  expect(body.game).toStrictEqual(expect.any(String));
  expect(body.credentials.length).toBe(names.length);
  body.credentials.forEach((credential) =>
    expect(credential).toStrictEqual(expect.any(String)),
  );
  expect(body.spectatorCredential).toStrictEqual(expect.any(String));
});

it('retrieves player info for a game', async () => {
  const names = ['P1', 'P2', 'P3'];
  const createResponse = await request(publicApiServer.callback())
    .post('/game/create')
    .field('startSuit', 'A')
    .field('gameMode', 'Elevation of Privilege')
    .field('modelType', 'Default')
    .field('turnDuration', '5')
    .field('names[]', names);

  const createBody = createResponse.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };

  const playersResponse = await request(publicApiServer.callback())
    .get(`/game/${createBody.game}/players`)
    .auth('0', createBody.credentials[0]!);

  const playersBody = playersResponse.body as LobbyAPI.Match;

  expect(playersBody.players.length).toBe(names.length);
  playersBody.players.forEach((p, i: number) => {
    expect(p.name).toBe(names[i]);
  });
});

it('creates a game with a model', async () => {
  const names = ['P1', 'P2', 'P3'];
  const response = await request(publicApiServer.callback())
    .post('/game/create')
    .field('startSuit', 'A')
    .field('gameMode', 'Elevation of Privilege')
    .field('turnDuration', '5')
    .field('names[]', names)
    .field('modelType', ModelType.THREAT_DRAGON)
    .field('model', JSON.stringify(goldenModel));

  const body = response.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };
  expect(body.game).toStrictEqual(expect.any(String));
  expect(body.credentials.length).toBe(names.length);
  body.credentials.forEach((credential) =>
    expect(credential).toStrictEqual(expect.any(String)),
  );
  expect(body.spectatorCredential).toStrictEqual(expect.any(String));
});

it('retrieve the model for a game', async () => {
  const model = goldenModel;

  const names = ['P1', 'P2', 'P3'];
  const createResponse = await request(publicApiServer.callback())
    .post('/game/create')
    .field('startSuit', 'A')
    .field('gameMode', 'Elevation of Privilege')
    .field('turnDuration', '5')
    .field('names[]', names)
    .field('modelType', ModelType.THREAT_DRAGON)
    .field('model', JSON.stringify(model));

  const createBody = createResponse.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };

  // retrieve the model
  const modelResponse = await request(publicApiServer.callback())
    .get(`/game/${createBody.game}/model`)
    .auth('0', createBody.credentials[0]!);

  expect(modelResponse.body).toStrictEqual(parsedGoldenModel);
});

describe('delivery headers (contracts/response-headers.md, US1)', () => {
  const createGame = () =>
    request(publicApiServer.callback())
      .post('/game/create')
      .field('startSuit', 'A')
      .field('gameMode', 'Elevation of Privilege')
      .field('modelType', 'Default')
      .field('turnDuration', '5')
      .field('names[]', ['P1', 'P2', 'P3']);

  const directiveSet = (value: string) =>
    value
      .split(';')
      .map((directive) => directive.trim())
      .sort();

  const expectDeliveryHeaders = (response: request.Response) => {
    expect(response.headers['x-content-type-options']).not.toContain(', ');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).not.toContain(', ');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).not.toContain(', ');
    expect(
      directiveSet(response.headers['content-security-policy'] ?? ''),
    ).toStrictEqual(directiveSet(CONTENT_SECURITY_POLICY_HEADER));
  };

  it('instructs the browser on a successful create response', async () => {
    const response = await createGame();
    expect(response.status).toBe(200);
    expectDeliveryHeaders(response);
  });

  it('instructs the browser on a successful players response', async () => {
    const createResponse = await createGame();
    const createBody = createResponse.body as {
      game: string;
      credentials: string[];
    };

    const playersResponse = await request(publicApiServer.callback())
      .get(`/game/${createBody.game}/players`)
      .auth('0', createBody.credentials[0]!);

    expect(playersResponse.status).toBe(200);
    expectDeliveryHeaders(playersResponse);
  });

  it('instructs the browser on a 403 error response', async () => {
    const createResponse = await createGame();
    const createBody = createResponse.body as { game: string };

    const playersResponse = await request(publicApiServer.callback()).get(
      `/game/${createBody.game}/players`,
    );

    expect(playersResponse.status).toBe(403);
    expectDeliveryHeaders(playersResponse);
  });

  it('instructs the browser on an unknown route', async () => {
    const response = await request(publicApiServer.callback()).get(
      '/no-such-route',
    );

    expect(response.status).toBe(404);
    expectDeliveryHeaders(response);
  });
});

describe('image delivery (contracts/response-headers.md, US2)', () => {
  const directiveSet = (value: string) =>
    value
      .split(';')
      .map((directive) => directive.trim())
      .sort();

  const createImageGame = (buffer: Buffer, filename: string) =>
    request(publicApiServer.callback())
      .post('/game/create')
      .field('startSuit', 'A')
      .field('gameMode', 'Elevation of Privilege')
      .field('turnDuration', '5')
      .field('names[]', ['P1', 'P2'])
      .field('modelType', ModelType.IMAGE)
      .attach('model', buffer, {
        filename,
        contentType: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
      });

  it('delivers an uploaded SVG as a download that may run nothing', async () => {
    const createResponse = await createImageGame(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="9" height="9"/></svg>',
      ),
      'model.svg',
    );
    expect(createResponse.status).toBe(200);
    const createBody = createResponse.body as {
      game: string;
      credentials: string[];
    };

    const imageResponse = await request(publicApiServer.callback())
      .get(`/game/${createBody.game}/image`)
      .auth('0', createBody.credentials[0]!);

    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['content-type']).toMatch(/^image\/svg\+xml/);
    expect(imageResponse.headers['content-disposition']).toMatch(
      new RegExp(`^attachment; filename="${createBody.game}\\.svg"`),
    );
    expect(imageResponse.headers['content-security-policy']).toBe(
      "default-src 'none'",
    );
    expect(imageResponse.headers['access-control-expose-headers']).toBe(
      'Content-Disposition',
    );
  });

  it('keeps an uploaded PNG as an in-page image with the global policy', async () => {
    const png = readFileSync(
      path.join(__dirname, '__fixtures__/images/clean.png'),
    );
    const createResponse = await createImageGame(png, 'model.png');
    expect(createResponse.status).toBe(200);
    const createBody = createResponse.body as {
      game: string;
      credentials: string[];
    };

    const imageResponse = await request(publicApiServer.callback())
      .get(`/game/${createBody.game}/image`)
      .auth('0', createBody.credentials[0]!);

    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['content-type']).toMatch(/^image\/png/);
    expect(imageResponse.headers['content-disposition'] ?? '').not.toMatch(
      /^attachment/,
    );
    expect(
      directiveSet(imageResponse.headers['content-security-policy'] ?? ''),
    ).toStrictEqual(directiveSet(CONTENT_SECURITY_POLICY_HEADER));
  });
});

describe('game creation validation (contracts/post-game-create.md)', () => {
  const listMatches = () => gameServer.db.listMatches({ gameName });

  const postCreate = () =>
    request(publicApiServer.callback()).post('/game/create');

  const validFields = {
    startSuit: 'A',
    gameMode: GameMode.EOP,
    turnDuration: '300',
  };

  const modelWithCell = (cell: Record<string, unknown>) => ({
    summary: { title: 'x' },
    detail: {
      diagrams: [{ id: 0, title: 'd', diagramJson: { cells: [cell] } }],
    },
  });

  it.each([
    [
      'cell markup',
      modelWithCell({
        id: 'c1',
        type: 'tm.Actor',
        markup: '<image href="/x" onerror="alert(1)"/>',
      }),
      'model.detail.diagrams.0.diagramJson.cells.0.markup',
    ],
    [
      'label markup',
      modelWithCell({
        id: 'f1',
        type: 'tm.Flow',
        labels: [{ position: 0.5, markup: '<rect/>' }],
      }),
      'model.detail.diagrams.0.diagramJson.cells.0.labels.0.markup',
    ],
    [
      'attrs onclick',
      modelWithCell({
        id: 'c1',
        type: 'tm.Actor',
        attrs: { '.element-shape': { onclick: 'alert(1)' } },
      }),
      'model.detail.diagrams.0.diagramJson.cells.0.attrs..element-shape.onclick',
    ],
  ])(
    'refuses a Threat Dragon model with %s and stores nothing',
    async (_name, model, issuePath) => {
      const matchesBefore = await listMatches();

      const response = await postCreate()
        .field('startSuit', validFields.startSuit)
        .field('gameMode', validFields.gameMode)
        .field('turnDuration', validFields.turnDuration)
        .field('names[]', ['a', 'b'])
        .field('modelType', ModelType.THREAT_DRAGON)
        .field('model', JSON.stringify(model));

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        error: 'invalid_model',
        issues: [{ path: issuePath, expected: 'never' }],
      });
      expect(await listMatches()).toStrictEqual(matchesBefore);
    },
  );

  it('refuses a non-JSON model with invalid_model_json', async () => {
    const matchesBefore = await listMatches();

    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.THREAT_DRAGON)
      .field('model', 'definitely not json {{{');

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: 'invalid_model_json' });
    expect(await listMatches()).toStrictEqual(matchesBefore);
  });

  it('refuses a Threat Dragon game without a model with invalid_request', async () => {
    const matchesBefore = await listMatches();

    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.THREAT_DRAGON);

    expect(response.status).toBe(400);
    const body = response.body as {
      error: string;
      issues: { path: string; expected: string | null }[];
    };
    expect(body.error).toBe('invalid_request');
    expect(body.issues[0]?.path).toBe('model');
    expect(await listMatches()).toStrictEqual(matchesBefore);
  });

  it('stores the model without metadata keys and closes cross-game image access', async () => {
    const model = {
      ...(goldenModel as Record<string, unknown>),
      extension: 'png',
    };
    const names = ['a', 'b'];

    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', names)
      .field('modelType', ModelType.THREAT_DRAGON)
      .field('model', JSON.stringify(model));

    expect(response.status).toBe(200);
    const createBody = response.body as {
      game: string;
      credentials: string[];
      spectatorCredential: string;
    };

    const modelResponse = await request(publicApiServer.callback())
      .get(`/game/${createBody.game}/model`)
      .auth('0', createBody.credentials[0]!);

    expect(modelResponse.status).toBe(200);
    expect(modelResponse.body).toStrictEqual(parsedGoldenModel);

    const imageResponse = await request(publicApiServer.callback())
      .get(`/game/${createBody.game}/image`)
      .auth('0', createBody.credentials[0]!);

    expect(imageResponse.status).toBe(400);
  });
});

describe('image upload (contracts/post-game-create.md, US2)', () => {
  const listMatches = () => gameServer.db.listMatches({ gameName });

  const postCreate = () =>
    request(publicApiServer.callback()).post('/game/create');

  const validFields = {
    startSuit: 'A',
    gameMode: GameMode.EOP,
    turnDuration: '300',
  };

  const fixturesFolder = path.join(__dirname, '__fixtures__/images');
  const readFixture = (name: string): Buffer =>
    readFileSync(path.join(fixturesFolder, name));

  const listImagesFolder = () => readdirSync(getDbImagesFolder()).sort();
  const listUploadTempFolder = () => readdirSync(getUploadTempFolder()).sort();

  const postImage = (buffer: Buffer, filename: string, contentType: string) =>
    postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.IMAGE)
      .attach('model', buffer, { filename, contentType });

  it.each([
    {
      name: 'PHP code claimed to be a PNG',
      buffer: Buffer.from('<?php echo 1; ?>'),
      filename: 'evil.png',
      contentType: 'image/png',
      error: 'unsupported_file_type',
    },
    {
      name: 'HTML claimed to be a PNG',
      buffer: Buffer.from('<html><script>alert(1)</script></html>'),
      filename: 'x.png',
      contentType: 'image/png',
      error: 'unsupported_file_type',
    },
    {
      name: 'an SVG claimed to be a PNG',
      buffer: readFixture('clean.svg'),
      filename: 'clean.svg',
      contentType: 'image/png',
      error: 'file_type_mismatch',
    },
    {
      name: 'a PNG named shell.php',
      buffer: readFixture('clean.png'),
      filename: 'shell.php',
      contentType: 'image/png',
      error: 'file_type_mismatch',
    },
    {
      name: 'a PNG named evil.html',
      buffer: readFixture('clean.png'),
      filename: 'evil.html',
      contentType: 'image/png',
      error: 'file_type_mismatch',
    },
    {
      name: 'a PNG named run.sh',
      buffer: readFixture('clean.png'),
      filename: 'run.sh',
      contentType: 'image/png',
      error: 'file_type_mismatch',
    },
    {
      name: 'a PNG claimed to be a JPEG',
      buffer: readFixture('clean.png'),
      filename: 'diagram.png',
      contentType: 'image/jpeg',
      error: 'file_type_mismatch',
    },
    {
      name: 'an empty buffer',
      buffer: Buffer.alloc(0),
      filename: 'empty.png',
      contentType: 'image/png',
      error: 'missing_image',
    },
    {
      name: 'a PDF',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'),
      filename: 'document.pdf',
      contentType: 'application/pdf',
      error: 'unsupported_file_type',
    },
  ])(
    'refuses $name with 400 $error and stores nothing',
    async ({ buffer, filename, contentType, error }) => {
      const matchesBefore = await listMatches();
      const imagesBefore = listImagesFolder();
      const tempBefore = listUploadTempFolder();

      const response = await postImage(buffer, filename, contentType);

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({ error });
      expect(await listMatches()).toStrictEqual(matchesBefore);
      expect(listImagesFolder()).toStrictEqual(imagesBefore);
      expect(listUploadTempFolder()).toStrictEqual(tempBefore);
    },
  );

  it('refuses two model files with missing_image', async () => {
    const matchesBefore = await listMatches();

    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.IMAGE)
      .attach('model', readFixture('clean.png'), {
        filename: 'clean.png',
        contentType: 'image/png',
      })
      .attach('model', readFixture('clean.png'), {
        filename: 'clean.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: 'missing_image' });
    expect(await listMatches()).toStrictEqual(matchesBefore);
  });

  it('refuses an Image game with no file at all with missing_image', async () => {
    const matchesBefore = await listMatches();

    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.IMAGE);

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: 'missing_image' });
    expect(await listMatches()).toStrictEqual(matchesBefore);
  });

  it('sanitizes a malicious SVG and logs the removals', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const response = await postImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="9" height="9"/></svg>',
        ),
        'diagram.svg',
        'image/svg+xml',
      );

      expect(response.status).toBe(200);
      const createBody = response.body as {
        game: string;
        credentials: string[];
      };

      const imageResponse = await request(publicApiServer.callback())
        .get(`/game/${createBody.game}/image`)
        .auth('0', createBody.credentials[0]!);

      expect(imageResponse.status).toBe(200);
      expect((imageResponse.body as Buffer).toString()).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>',
      );

      const sanitizedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('svg_sanitized')),
      );
      expect(sanitizedCalls.length).toBeGreaterThan(0);
      for (const call of sanitizedCalls) {
        const line = call.map(String).join(' ');
        expect(line).toContain('"removed":["onload","script"]');
        // never the values
        expect(line).not.toContain('alert(');
      }
    } finally {
      logSpy.mockRestore();
    }
  });

  it.each([
    {
      extension: 'png',
      file: 'clean.png',
      contentType: 'image/png',
    },
    {
      extension: 'jpg',
      file: 'clean.jpg',
      contentType: 'image/jpeg',
    },
    {
      extension: 'gif',
      file: 'clean.gif',
      contentType: 'image/gif',
    },
    {
      extension: 'webp',
      file: 'clean.webp',
      contentType: 'image/webp',
    },
    {
      extension: 'svg',
      file: 'clean.svg',
      contentType: 'image/svg+xml',
    },
  ] as const)(
    'stores a clean $extension and serves it unchanged',
    async ({ file, contentType }) => {
      const bytes = readFixture(file);

      const response = await postImage(bytes, file, contentType);

      expect(response.status).toBe(200);
      const createBody = response.body as {
        game: string;
        credentials: string[];
      };

      const imageResponse = await request(publicApiServer.callback())
        .get(`/game/${createBody.game}/image`)
        .auth('0', createBody.credentials[0]!);

      expect(imageResponse.status).toBe(200);
      expect(Buffer.from(imageResponse.body).equals(bytes)).toBe(true);
    },
  );
});

describe('game creation rollback and listing (US4)', () => {
  const listMatches = () => gameServer.db.listMatches({ gameName });

  const postCreate = () =>
    request(publicApiServer.callback()).post('/game/create');

  const validFields = {
    startSuit: 'A',
    gameMode: GameMode.EOP,
    turnDuration: '300',
    names: ['a', 'b'],
  };

  const fixturesFolder = path.join(__dirname, '__fixtures__/images');
  const readFixture = (name: string): Buffer =>
    readFileSync(path.join(fixturesFolder, name));

  const listImagesFolder = () => readdirSync(getDbImagesFolder()).sort();
  const listUploadTempFolder = () => readdirSync(getUploadTempFolder()).sort();

  const expectNoLeftovers = async (
    before: {
      matches: string[];
      images: string[];
      temp: string[];
      createFailedCount: number;
    },
    response: request.Response,
  ) => {
    expect(response.status).toBe(500);
    expect(response.text).not.toContain('boom');

    expect(await listMatches()).toStrictEqual(before.matches);
    expect(listImagesFolder()).toStrictEqual(before.images);
    expect(listUploadTempFolder()).toStrictEqual(before.temp);
  };

  it('wipes a half-created image game when storing the model fails', async () => {
    const setModelSpy = vi
      .spyOn(gameServer.db, 'setModel')
      .mockRejectedValueOnce(new Error('boom'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const before = {
        matches: await listMatches(),
        images: listImagesFolder(),
        temp: listUploadTempFolder(),
        createFailedCount: 0,
      };

      const response = await postCreate()
        .field('startSuit', validFields.startSuit)
        .field('gameMode', validFields.gameMode)
        .field('turnDuration', validFields.turnDuration)
        .field('names[]', validFields.names)
        .field('modelType', ModelType.IMAGE)
        .attach('model', readFixture('clean.png'), {
          filename: 'clean.png',
          contentType: 'image/png',
        });

      await expectNoLeftovers(before, response);

      const createFailedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('SECURITY create_failed')),
      );
      expect(createFailedCalls.length).toBe(1);
    } finally {
      setModelSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('wipes a half-created Threat Dragon game when joining a player fails', async () => {
    const joinMatchSpy = vi
      .spyOn(LobbyClient.prototype, 'joinMatch')
      .mockRejectedValueOnce(new Error('boom'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const before = {
        matches: await listMatches(),
        images: listImagesFolder(),
        temp: listUploadTempFolder(),
        createFailedCount: 0,
      };

      const response = await postCreate()
        .field('startSuit', validFields.startSuit)
        .field('gameMode', validFields.gameMode)
        .field('turnDuration', validFields.turnDuration)
        .field('names[]', validFields.names)
        .field('modelType', ModelType.THREAT_DRAGON)
        .field('model', JSON.stringify(goldenModel));

      await expectNoLeftovers(before, response);

      const createFailedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('SECURITY create_failed')),
      );
      expect(createFailedCalls.length).toBe(1);
    } finally {
      joinMatchSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('does not list a new game in the public lobby (FR-005)', async () => {
    const response = await postCreate()
      .field('startSuit', validFields.startSuit)
      .field('gameMode', validFields.gameMode)
      .field('turnDuration', validFields.turnDuration)
      .field('names[]', validFields.names)
      .field('modelType', ModelType.PRIVACY_ENHANCED);

    expect(response.status).toBe(200);
    const createBody = response.body as { game: string };

    const listResponse = await fetch(
      `http://localhost:${INTERNAL_API_PORT}/games/${gameName}`,
    );
    const listed = (await listResponse.json()) as {
      matches: { matchID: string }[];
    };

    expect(
      listed.matches.some((match) => match.matchID === createBody.game),
    ).toBe(false);
  });

  it.each([
    {
      name: 'a request missing all fields',
      error: 'invalid_request',
      post: (create: () => request.Test) => create(),
    },
    {
      name: 'a non-JSON Threat Dragon model',
      error: 'invalid_model_json',
      post: (create: () => request.Test) =>
        create()
          .field('startSuit', 'A')
          .field('gameMode', GameMode.EOP)
          .field('turnDuration', '300')
          .field('names[]', ['a', 'b'])
          .field('modelType', ModelType.THREAT_DRAGON)
          .field('model', 'definitely not json {{{'),
    },
    {
      name: 'a Threat Dragon model with cell markup',
      error: 'invalid_model',
      post: (create: () => request.Test) =>
        create()
          .field('startSuit', 'A')
          .field('gameMode', GameMode.EOP)
          .field('turnDuration', '300')
          .field('names[]', ['a', 'b'])
          .field('modelType', ModelType.THREAT_DRAGON)
          .field(
            'model',
            JSON.stringify({
              summary: { title: 'x' },
              detail: {
                diagrams: [
                  {
                    id: 0,
                    title: 'd',
                    diagramJson: {
                      cells: [
                        {
                          id: 'c1',
                          type: 'tm.Actor',
                          markup: '<image href="/x" onerror="alert(1)"/>',
                        },
                      ],
                    },
                  },
                ],
              },
            }),
          ),
    },
    {
      name: 'an Image game without a file',
      error: 'missing_image',
      post: (create: () => request.Test) =>
        create()
          .field('startSuit', 'A')
          .field('gameMode', GameMode.EOP)
          .field('turnDuration', '300')
          .field('names[]', ['a', 'b'])
          .field('modelType', ModelType.IMAGE),
    },
    {
      name: 'PHP code claimed to be a PNG',
      error: 'unsupported_file_type',
      post: (create: () => request.Test) =>
        create()
          .field('startSuit', 'A')
          .field('gameMode', GameMode.EOP)
          .field('turnDuration', '300')
          .field('names[]', ['a', 'b'])
          .field('modelType', ModelType.IMAGE)
          .attach('model', Buffer.from('<?php echo 1; ?>'), {
            filename: 'evil.png',
            contentType: 'image/png',
          }),
    },
    {
      name: 'a PNG named shell.php',
      error: 'file_type_mismatch',
      post: (create: () => request.Test) =>
        create()
          .field('startSuit', 'A')
          .field('gameMode', GameMode.EOP)
          .field('turnDuration', '300')
          .field('names[]', ['a', 'b'])
          .field('modelType', ModelType.IMAGE)
          .attach('model', readFixture('clean.png'), {
            filename: 'shell.php',
            contentType: 'image/png',
          }),
    },
  ])('refuses $name without creating a match', async ({ post, error }) => {
    const matchesBefore = await listMatches();

    const response = await post(postCreate);

    expect(response.status).toBe(400);
    expect((response.body as { error: string }).error).toBe(error);
    expect(await listMatches()).toStrictEqual(matchesBefore);
  });
});

describe('error contract (US5)', () => {
  const postCreate = () =>
    request(publicApiServer.callback()).post('/game/create');

  const postValidThreatDragonGame = (model: unknown) =>
    postCreate()
      .field('startSuit', 'A')
      .field('gameMode', GameMode.EOP)
      .field('turnDuration', '300')
      .field('names[]', ['a', 'b'])
      .field('modelType', ModelType.THREAT_DRAGON)
      .field('model', JSON.stringify(model));

  it('names the diagram, cell and field of an unknown key without echoing the value', async () => {
    const model = {
      summary: { title: 'x' },
      detail: {
        diagrams: [
          {
            id: 0,
            title: 'd',
            diagramJson: {
              cells: [
                { id: 'c0', type: 'tm.Actor' },
                { id: 'c1', type: 'tm.Actor', foo: 'SECRET-VALUE-123' },
              ],
            },
          },
        ],
      },
    };

    const response = await postValidThreatDragonGame(model);

    expect(response.status).toBe(400);
    const body = response.body as {
      error: string;
      issues: { path: string; expected: string | null }[];
    };
    expect(body.error).toBe('invalid_model');
    expect(body.issues[0]?.path).toBe(
      'model.detail.diagrams.0.diagramJson.cells.1.foo',
    );
    expect(JSON.stringify(response.body)).not.toContain('SECRET-VALUE-123');
  });

  it('never echoes submitted names when refusing duplicate names', async () => {
    const response = await postCreate()
      .field('startSuit', 'A')
      .field('gameMode', GameMode.EOP)
      .field('turnDuration', '300')
      .field('names[]', ['SECRET-NAME', 'SECRET-NAME'])
      .field('modelType', ModelType.THREAT_DRAGON)
      .field('model', JSON.stringify(goldenModel));

    expect(response.status).toBe(400);
    const body = response.body as { error: string };
    expect(body.error).toBe('invalid_request');
    expect(JSON.stringify(response.body)).not.toContain('SECRET-NAME');
  });

  it('writes exactly one create_rejected log entry per refusal', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const response = await postValidThreatDragonGame('definitely not json');

      expect(response.status).toBe(400);
      const rejectedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('SECURITY create_rejected')),
      );
      expect(rejectedCalls.length).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('cannot forge additional log lines through a submitted field name', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const forgedKey = 'x\n2026-01-01T00:00:00.000Z - Game created';
      const model = {
        summary: { title: 'x' },
        detail: {
          diagrams: [
            {
              id: 0,
              title: 'd',
              diagramJson: {
                cells: [{ id: 'c0', type: 'tm.Actor', [forgedKey]: 'y' }],
              },
            },
          ],
        },
      };

      const response = await postValidThreatDragonGame(model);

      expect(response.status).toBe(400);
      const rejectedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('SECURITY create_rejected')),
      );
      expect(rejectedCalls.length).toBe(1);
      // the forged line is JSON-encoded, so no log argument ever contains a
      // raw newline that could split it into two lines
      for (const call of logSpy.mock.calls) {
        for (const arg of call) {
          expect(String(arg)).not.toContain(
            '\n2026-01-01T00:00:00.000Z - Game created',
          );
        }
      }
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns no stack trace or error details on an unexpected failure', async () => {
    const setModelSpy = vi
      .spyOn(gameServer.db, 'setModel')
      .mockRejectedValueOnce(new Error('boom'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const response = await postValidThreatDragonGame(goldenModel);

      expect(response.status).toBe(500);
      expect(response.text).not.toContain('boom');
      expect(response.text).not.toContain('at ');
      expect(JSON.stringify(response.body)).not.toContain('SECRET');
      const failedCalls = logSpy.mock.calls.filter((args) =>
        args.some((arg) => String(arg).includes('SECURITY create_failed')),
      );
      expect(failedCalls.length).toBe(1);
    } finally {
      setModelSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

it('download the final model for a game', async () => {
  const matchID = '123456';

  const state = {
    G: {
      modelType: ModelType.THREAT_DRAGON,
      gameMode: GameMode.EOP,
      identifiedThreats: [
        {
          'component-1': {
            'threat-1': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title',
              description: 'description',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
          'component-2': {
            'threat-2': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title',
              description: 'description',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
          'component-3': {
            'threat-3': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title',
              description: 'description',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
        },
      ],
    },
  } as State;

  const metadata: Server.MatchData = {
    gameName: 'some game',
    players: {
      0: { id: 0, name: 'P1', credentials: 'abc123' },
      1: { id: 1, name: 'P2', credentials: '123abc' },
    },
    createdAt: 0,
    updatedAt: 0,
  };

  const model: ThreatDragonModel = {
    summary: {
      title: 'Foo',
    },
    detail: {
      diagrams: [
        {
          id: 0,
          diagramJson: {
            cells: [
              {
                id: 'component-1',
                type: 'tm.Actor',
                hasOpenThreats: false,
                threats: [],
                size: { height: 0, width: 0 },
                attrs: {},
                angle: 0,
                position: { x: 0, y: 0 },
                z: 0,
              },
              {
                id: 'component-2',
                type: 'tm.Actor',
                hasOpenThreats: false,
                size: { height: 0, width: 0 },
                attrs: {},
                angle: 0,
                position: { x: 0, y: 0 },
                z: 0,
              },
            ],
          },
          diagramType: 'STRIDE',
          size: { width: 0, height: 0 },
          thumbnail: '',
          title: '',
        },
      ],
    },
  };

  await gameServer.db.setMetadata(matchID, metadata);
  await gameServer.db.setModel(matchID, model);
  await gameServer.db.setState(matchID, state);

  // retrieve the model
  const response = await request(publicApiServer.callback())
    .get(`/game/${matchID}/download`)
    .auth('0', 'abc123');

  const body = response.body as ThreatDragonModel;
  const threats = body.detail.diagrams[0]?.diagramJson.cells?.[0]?.threats;

  expect(threats?.[0]?.id).toBe('0');
  expect(threats?.[0]?.type).toBe('Spoofing');
  expect(threats?.[0]?.title).toBe('title');
  expect(threats?.[0]?.description).toBe('description');
  expect(threats?.[0]?.mitigation).toBe('mitigation');
  expect(threats?.[0]?.game).toBe(matchID);
});

it('Download threat file', async () => {
  const matchID = '1234567';

  const state = {
    G: {
      modelType: ModelType.THREAT_DRAGON,
      gameMode: GameMode.EOP,
      identifiedThreats: [
        {
          'component-1': {
            'threat-1': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title',
              description:
                '<img src="" onerror="alert(\'XSS\') alt="Uh oh...">',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
          'component-2': {
            'threat-2': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title ',
              description: 'description',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
          'component-3': {
            'threat-3': {
              id: '0',
              severity: 'High',
              type: 'D',
              title: 'title',
              description: 'description',
              mitigation: 'mitigation',
              owner: '0',
            },
          },
        },
      ],
    },
  } as State;

  //Maybe I should put these jsons into a file
  const model: ThreatDragonModel = {
    summary: {
      title: '  Demo Threat Model ',
    },
    detail: {
      diagrams: [
        {
          id: 0,
          diagramJson: {
            cells: [
              {
                threats: [
                  {
                    status: 'Open',
                    severity: 'High',
                    mitigation: "[Click Me](javascript:alert('XSS'))",
                    description:
                      'The Background Worker configuration stores the credentials used by the worker to access the DB. An attacker could compromise the Background Worker and get access to the DB credentials.',
                    title: '    Accessing DB credentials ',
                    type: 'Information disclosure',
                  },
                ],
                hasOpenThreats: true,
                angle: 0,
                attrs: {},
                id: '',
                position: { x: 0, y: 0 },
                size: { height: 0, width: 0 },
                type: 'tm.Actor',
                z: 0,
              },
              {
                threats: [
                  {
                    status: 'Mitigated',
                    severity: 'High',
                    description:
                      'An attacker could make an query call on the DB,',
                    title: 'Unauthorised access ',
                    type: 'Information disclosure',
                    mitigation: 'Require all queries to be authenticated.',
                  },
                  {
                    status: 'Open',
                    severity: 'Medium',
                    description:
                      'An attacker could obtain the DB credentials ans use them to make unauthorised queries.',
                    title: 'Credential theft',
                    type: 'Information disclosure',
                    mitigation:
                      'Use a firewall to restrict access to the DB to only the Background Worker IP address.',
                    owner: 'The Model',
                  },
                ],
                hasOpenThreats: true,
                angle: 0,
                attrs: {},
                id: '',
                position: { x: 0, y: 0 },
                size: { height: 0, width: 0 },
                type: 'tm.Actor',
                z: 0,
              },
              {
                threats: [
                  {
                    status: 'Open',
                    severity: 'High',
                    title:
                      '![Uh oh...](https://www.example.com/image.png"onload="alert(\'XSS\'))',
                    type: 'Information disclosure',
                    description:
                      'The Web Application Config stores credentials used  by the Web App to access the message queue.\r\n\r\nThese could be stolen by an attacker and used to read confidential data or place poison message on the queue.',
                    mitigation:
                      "The Message Queue credentials should be encrypted.\n\n\n\n\nnewlines shouldn't\nbreak the formatting",
                  },
                ],
                hasOpenThreats: false,
                angle: 0,
                attrs: {},
                id: '',
                position: { x: 0, y: 0 },
                size: { height: 0, width: 0 },
                type: 'tm.Actor',
                z: 0,
              },
              {
                hasOpenThreats: false,
                angle: 0,
                attrs: {},
                id: '',
                position: { x: 0, y: 0 },
                size: { height: 0, width: 0 },
                type: 'tm.Actor',
                z: 0,
              },
              {
                hasOpenThreats: true,
                angle: 0,
                attrs: {},
                id: '',
                position: { x: 0, y: 0 },
                size: { height: 0, width: 0 },
                type: 'tm.Actor',
                z: 0,
              },
            ],
          },
          diagramType: 'STRIDE',
          size: { width: 0, height: 0 },
          thumbnail: '',
          title: '',
        },
      ],
    },
  };

  const metadata: Server.MatchData = {
    gameName: 'some game',
    players: {
      0: {
        id: 0,
        credentials: '30d1cdc1-110c-46f7-8178-e3fedcc71e3d',
        name: 'Player 1',
      },
      1: {
        id: 1,
        credentials: '7f76dc60-665a-4068-b3de-0ab7b00fcb6f',
        name: 'Player 2',
      },
    },
    createdAt: 0,
    updatedAt: 0,
  };

  await gameServer.db.setState(matchID, state);
  await gameServer.db.setMetadata(matchID, metadata);
  await gameServer.db.setModel(matchID, model);

  const date = new Date().toLocaleString();

  // retrieve the model
  const response = await request(publicApiServer.callback())
    .get(`/game/${matchID}/download/text`)
    .auth('0', '30d1cdc1-110c-46f7-8178-e3fedcc71e3d');
  expect(response.text).toBe(`Threats ${date}
=======

1. **title**
    - *Category:* Spoofing
    - *Severity:* High
    - *Author:* Player 1
    - *Description:* &lt;img src="" onerror="alert\\('XSS'\\) alt="Uh oh..."&gt;
    - *Mitigation:* mitigation
2. **title**
    - *Category:* Spoofing
    - *Severity:* High
    - *Author:* Player 1
    - *Description:* description
    - *Mitigation:* mitigation
3. **title**
    - *Category:* Spoofing
    - *Severity:* High
    - *Author:* Player 1
    - *Description:* description
    - *Mitigation:* mitigation
4. **Accessing DB credentials**
    - *Category:* Information disclosure
    - *Severity:* High
    - *Description:* The Background Worker configuration stores the credentials used by the worker to access the DB. An attacker could compromise the Background Worker and get access to the DB credentials.
    - *Mitigation:* \\[Click Me\\]\\(javascript:alert\\('XSS'\\)\\)
5. **Unauthorised access**
    - *Category:* Information disclosure
    - *Severity:* High
    - *Description:* An attacker could make an query call on the DB,
    - *Mitigation:* Require all queries to be authenticated.
6. **Credential theft**
    - *Category:* Information disclosure
    - *Severity:* Medium
    - *Author:* The Model
    - *Description:* An attacker could obtain the DB credentials ans use them to make unauthorised queries.
    - *Mitigation:* Use a firewall to restrict access to the DB to only the Background Worker IP address.
7. **\\!\\[Uh oh...\\]\\(https://www.example.com/image.png"onload="alert\\('XSS'\\)\\)**
    - *Category:* Information disclosure
    - *Severity:* High
    - *Description:* The Web Application Config stores credentials used  by the Web App to access the message queue. These could be stolen by an attacker and used to read confidential data or place poison message on the queue.
    - *Mitigation:* The Message Queue credentials should be encrypted. newlines shouldn't break the formatting
`);
});

describe('authentication', () => {
  const endpoints = ['players', 'model', 'download', 'download/text'];
  let matchID: string | null = null;
  let credentials: string[] | null = null;
  let spectatorCredential: string | null = null;

  beforeAll(async () => {
    // first create game
    const names = ['P1', 'P2', 'P3'];
    const response = await request(publicApiServer.callback())
      .post('/game/create')
      .field('startSuit', 'A')
      .field('gameMode', 'Elevation of Privilege')
      .field('turnDuration', '5')
      .field('names[]', names)
      .field('modelType', ModelType.PRIVACY_ENHANCED);

    const body = response.body as {
      game: string;
      credentials: string[];
      spectatorCredential: string;
    };

    expect(body.game).toBeDefined();
    expect(body.credentials.length).toBe(names.length);

    matchID = body.game;
    credentials = body.credentials;
    spectatorCredential = body.spectatorCredential;
  });

  it.each(endpoints)(
    'returns an error if no authentication is provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback()).get(
        `/game/${matchID}/${endpoint}`,
      );
      expect(response.status).toBe(403);
    },
  );

  it.each(endpoints)(
    'returns an error if no secret is provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .auth('0', '');
      expect(response.status).toBe(403);
    },
  );

  it.each(endpoints)(
    'returns an error if no userID is provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .auth('', credentials?.[0] ?? '');
      expect(response.status).toBe(403);
    },
  );

  it.each(endpoints)(
    'returns an error if wrong secret is provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .auth('0', 'thisiswrong');
      expect(response.status).toBe(403);
    },
  );

  it.each(endpoints)(
    'returns an error if Authorization header is incorrectly provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .set(
          'Authorization',
          // missing 'Basic ' prefix
          btoa(`0:${credentials?.[0] ?? ''}`),
        );
      expect(response.status).toBe(403);
    },
  );

  it.each(endpoints)(
    'is successful for correct credentials provided to %s',
    async (endpoint) => {
      // Try players

      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .set('Authorization', 'Basic ' + btoa(`0:${credentials?.[0] ?? ''}`));
      expect(response.status).not.toBe(403);
    },
  );

  it.each(endpoints)(
    'is successful for correct spectator credentials provided to %s',
    async (endpoint) => {
      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .set(
          'Authorization',
          'Basic ' + btoa(`${SPECTATOR}:${spectatorCredential}`),
        );
      expect(response.status).not.toBe(403);
    },
  );

  it.each(endpoints)(
    'rejects wrong spectator credentials provided to %s',
    async (endpoint) => {
      const response = await request(publicApiServer.callback())
        .get(`/game/${matchID}/${endpoint}`)
        .set('Authorization', 'Basic ' + btoa(`${SPECTATOR}:wrongCredentials`));
      expect(response.status).toBe(403);
    },
  );
});

afterAll(async () => {
  // cleanup
  await gameServerHandle.then((s) => {
    s.apiServer.close();
    s.appServer.close();
  });
  publicApiServerHandle.close();
});

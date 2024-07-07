import { GameMode, ModelType, SPECTATOR } from '@eop/shared';
import request from 'supertest';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import {
  gameServer,
  gameServerHandle,
  publicApiServer,
  publicApiServerHandle,
} from './main';

import type { LobbyAPI, Server, State } from 'boardgame.io';
import type { ThreatDragonModel } from '@eop/shared';

it('gameServer is not undefined', () => {
  expect(gameServer).toBeDefined();
});

it('creates a game without a model', async () => {
  const players = 3;
  const response = await request(publicApiServer.callback())
    .post('/game/create')
    .field('players', players)
    .field('names[]', ['P1', 'P2', 'P3']);
  const body = response.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };
  expect(body.game).toStrictEqual(expect.any(String));
  expect(body.credentials.length).toBe(players);
  body.credentials.forEach((credential) =>
    expect(credential).toStrictEqual(expect.any(String)),
  );
  expect(body.spectatorCredential).toStrictEqual(expect.any(String));
});

it('retrieves player info for a game', async () => {
  const players = 3;
  const names = ['P1', 'P2', 'P3'];
  const createResponse = await request(publicApiServer.callback())
    .post('/game/create')
    .field('players', players)
    .field('names[]', names);

  const createBody = createResponse.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };

  const playersResponse = await request(publicApiServer.callback())
    .get(`/game/${createBody.game}/players`)
    .auth('0', createBody.credentials[0]);

  const playersBody = playersResponse.body as LobbyAPI.Match;

  expect(playersBody.players.length).toBe(players);
  playersBody.players.forEach((p, i: number) => {
    expect(p.name).toBe(names[i]);
  });
});

it('creates a game with a model', async () => {
  const players = 3;
  const response = await request(publicApiServer.callback())
    .post('/game/create')
    .field('players', players)
    .field('names[]', ['P1', 'P2', 'P3'])
    .field('modelType', ModelType.THREAT_DRAGON)
    .field('model', JSON.stringify({})); // TODO: add proper model because this will fail when validation is added

  const body = response.body as {
    game: string;
    credentials: string[];
    spectatorCredential: string;
  };
  expect(body.game).toStrictEqual(expect.any(String));
  expect(body.credentials.length).toBe(players);
  body.credentials.forEach((credential) =>
    expect(credential).toStrictEqual(expect.any(String)),
  );
  expect(body.spectatorCredential).toStrictEqual(expect.any(String));
});

it('retrieve the model for a game', async () => {
  const players = 3;
  const model = { foo: 'bar' }; // TODO add proper model because this will break when validation is added

  const createResponse = await request(publicApiServer.callback())
    .post('/game/create')
    .field('players', players)
    .field('names[]', ['P1', 'P2', 'P3'])
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
    .auth('0', createBody.credentials[0]);

  expect(modelResponse.body).toStrictEqual(model);
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
  const threats = body.detail.diagrams[0].diagramJson.cells![0].threats!;

  expect(threats[0].id).toBe('0');
  expect(threats[0].type).toBe('Spoofing');
  expect(threats[0].title).toBe('title');
  expect(threats[0].description).toBe('description');
  expect(threats[0].mitigation).toBe('mitigation');
  expect(threats[0].game).toBe(matchID);
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
    const players = 3;

    const response = await request(publicApiServer.callback())
      .post('/game/create')
      .field('players', players)
      .field('names[]', ['P1', 'P2', 'P3'])
      .field('modelType', ModelType.PRIVACY_ENHANCED);

    const body = response.body as {
      game: string;
      credentials: string[];
      spectatorCredential: string;
    };

    expect(body.game).toBeDefined();
    expect(body.credentials.length).toBe(players);

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

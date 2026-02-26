import { rename } from 'node:fs/promises';

import {
  DEFAULT_MODEL,
  escapeMarkdownText,
  GameMode,
  gameName,
  GameState,
  getImageExtension,
  getSuitDisplayName,
  isSuit,
  logEvent,
  ModelType,
  SetupData,
  SUITS,
  ThreatDragonModelV2,
  ThreatV2,
} from '@eop/shared';
import { LobbyClient } from 'boardgame.io/client';
import send from 'koa-send';
import { v4 as uuidv4 } from 'uuid';

import { INTERNAL_API_PORT } from './config';
import { getDbImagesFolder } from './filesystem';

import type { Server, State } from 'boardgame.io';
import type { IMiddleware } from 'koa-router';
import * as v from 'valibot';
import type { GameServer } from './gameServer';

const createGameBodySchema = v.object({
  startSuit: v.picklist(SUITS),
  gameMode: v.enum(GameMode),
  modelType: v.enum(ModelType),
  modelReference: v.optional(v.string()),
  turnDuration: v.pipe(v.string(), v.transform(parseInt), v.number()),
  names: v.array(v.string()),
  model: v.optional(v.string()),
});

export const createGame =
  (gameServer: GameServer): IMiddleware =>
    async (ctx) => {
      const spectatorCredential = uuidv4();

      try {
        // Create game
        const body = v.parse(createGameBodySchema, ctx.request.body);

        const lobbyClient = new LobbyClient({
          server: `http://localhost:${INTERNAL_API_PORT}`,
        });

        const { matchID } = await lobbyClient.createMatch(gameName, {
          numPlayers: body.names.length,
          setupData: {
            startSuit: body.startSuit,
            turnDuration: body.turnDuration,
            gameMode: body.gameMode,
            modelType: body.modelType,
            modelReference: body.modelReference,
            spectatorCredential,
          } satisfies SetupData,
        });

        const credentials = [];

        for (const [index, name] of body.names.entries()) {
          const { playerCredentials } = await lobbyClient.joinMatch(
            gameName,
            matchID,
            { playerID: index.toString(), playerName: name },
          );

          credentials.push(playerCredentials);
        }

        // model stuff
        switch (body.modelType) {
          case ModelType.THREAT_DRAGON: {
            await gameServer.db.setModel(
              matchID,
              JSON.parse(body.model as string) as ThreatDragonModelV2,
            );
            break;
          }

          case ModelType.PRIVACY_ENHANCED: {
            await gameServer.db.setModel(matchID, DEFAULT_MODEL);
            break;
          }

          case ModelType.IMAGE: {
            if (
              !ctx.request.files ||
              !ctx.request.files.model ||
              Array.isArray(ctx.request.files.model)
            ) {
              throw Error('A single image needs to be provided');
            }

            if (!ctx.request.files.model.originalFilename) {
              throw Error('No name specified for the provided image');
            }

            if (!ctx.request.files.model.mimetype) {
              throw Error('No mime type specified for the provided image');
            }

            const extension = getImageExtension(
              ctx.request.files.model.originalFilename,
            );
            if (
              !(
                /image\/[a-z+]+$/i.test(ctx.request.files.model.mimetype) &&
                extension
              )
            ) {
              throw Error('Filetype not supported');
            }

            await rename(
              ctx.request.files.model.filepath,
              `${getDbImagesFolder()}/${matchID}.${extension}`,
            );
            // use model object to store info about image
            await gameServer.db.setModel(matchID, { extension });

            break;
          }

          default: {
            await gameServer.db.setModel(matchID, null);
            break;
          }
        }

        logEvent(`Game created: ${matchID}`);
        ctx.body = {
          game: matchID,
          credentials,
          spectatorCredential,
        };
      } catch (err) {
        const logArguments = err instanceof Error ? [err, err.stack] : [err];
        console.error(...logArguments);
        ctx.throw(500);
      }
    };

// TODO: This returns more than just the players: It returns the requested match. We should probably adjust the name (and the path). See https://boardgame.io/documentation/#/api/Lobby?id=getting-a-specific-match-by-its-id
export const getPlayerNames = (): IMiddleware => async (ctx) => {
  const matchID = ctx.params.matchID;
  if (matchID === undefined) {
    return ctx.throw('Missing required parameter matchID', 400);
  }

  const lobbyClient = new LobbyClient({
    server: `http://localhost:${INTERNAL_API_PORT}`,
  });

  ctx.body = await lobbyClient.getMatch(gameName, matchID);
};

export const getModel =
  (gameServer: GameServer): IMiddleware =>
    async (ctx) => {
      const matchID = ctx.params.matchID;
      if (matchID === undefined) {
        return ctx.throw('Missing required parameter matchID', 400);
      }

      const game = await gameServer.db.fetch(matchID, { model: true });

      ctx.body = game.model;
    };

export const getImage =
  (gameServer: GameServer): IMiddleware =>
    async (ctx) => {
      const matchID = ctx.params.matchID;
      if (matchID === undefined) {
        return ctx.throw('Missing required parameter matchID', 400);
      }

      const game = await gameServer.db.fetch(matchID, { model: true });

      if (!game.model || !('extension' in game.model)) {
        return ctx.throw(
          'Cannot request image if none is stored, maybe the wrong model type has been set?',
          400,
        );
      }

    //send image
      await send(ctx, `${matchID}.${game.model?.extension}`, {
        root: getDbImagesFolder(),
      });
    };

const getMethodologyName = (gameMode: GameMode) => {
  if (gameMode === GameMode.EOP) {
    return 'STRIDE';
  }
  if (gameMode === GameMode.CORNUCOPIA) {
    return 'Cornucopia';
  }
  if (gameMode === GameMode.CUMULUS) {
    return 'Cumulus';
  }

  return undefined;
};

export const downloadThreatDragonModel =
  (gameServer: GameServer): IMiddleware =>
    async (ctx) => {
      const matchID = ctx.params.matchID;
      if (matchID === undefined) {
        return ctx.throw('Missing required parameter matchID', 400);
      }

      const game = await gameServer.db.fetch(matchID, {
        state: true,
        metadata: true,
        model: true,
      });

      const state = game.state as State<GameState>;

      const isJsonModel =
        state.G.modelType == ModelType.PRIVACY_ENHANCED ||
        state.G.modelType == ModelType.THREAT_DRAGON;

      const model = game.model;
      if (!model || 'extension' in model || !isJsonModel) {
        // if in wrong modelType
        return ctx.throw(
          'Cannot download model if none is set, maybe the wrong model type has been set?',
          400,
        );
      }

      const tdModel: ThreatDragonModelV2 = model

      // update the model with the identified threats
      state.G.identifiedThreats.forEach((threatsForComponent, diagramIdx) => {
        if (threatsForComponent === null) return;

        const diagram = tdModel.detail.diagrams[diagramIdx];
        if (!diagram) return;

        Object.keys(threatsForComponent).forEach((componentId) => {
          const cell = diagram.cells?.find((c) => c.id === componentId);
          if (!cell) return;

          const threatsInGame = threatsForComponent[componentId];
          if (!threatsInGame) return;

          const existing: ThreatV2[] = cell.data.threats ?? [];

          Object.values(threatsInGame).forEach((t) => {
            existing.push({
              description: t.description ?? '',
              mitigation: t.mitigation ?? '',
              modelType: getMethodologyName(state.G.gameMode),
              severity: t.severity ?? '',
              status: 'Open',
              title: t.title ?? '',
              type: getSuitDisplayName(state.G.gameMode, t.type),
              owner:
                t.owner !== undefined
                  ? game.metadata.players[Number.parseInt(t.owner)]?.name
                  : undefined,
              id: t.id,
              game: matchID,
            });
          });

          cell.data.threats = existing;
          cell.data.hasOpenThreats =
            cell.data.hasOpenThreats || existing.some((x) => x.status === 'Open');
        });
      });

      const modelTitle = tdModel.summary.title.replace(' ', '-');
      const timestamp = new Date().toISOString().replace(':', '-');
      const filename = `${modelTitle}-${timestamp}.json`;

      logEvent(`Download model: ${matchID}`);
      ctx.attachment(filename);
      ctx.set('Access-Control-Expose-Headers', 'Content-Disposition');
      ctx.body = tdModel;
    };

export const downloadThreatsMarkdownFile =
  (gameServer: GameServer): IMiddleware =>
    async (ctx) => {
      //get some variables that might be useful
      const matchID = ctx.params.matchID;
      if (matchID === undefined) {
        return ctx.throw('Missing required parameter matchID', 400);
      }

      const game = await gameServer.db.fetch(matchID, {
        state: true,
        metadata: true,
        model: true,
      });

      const state = game.state as State<GameState>;

      const isJsonModel =
        state.G.modelType == ModelType.PRIVACY_ENHANCED ||
        state.G.modelType == ModelType.THREAT_DRAGON;

      const model: ThreatDragonModelV2 | null = game.model as ThreatDragonModelV2;

      const threats = getThreats(
        state,
        game.metadata,
        isJsonModel && model && !('extension' in model) ? model : null,
      );

      const modelTitle =
        isJsonModel && game.model && !('extension' in game.model)
          ? game.model.summary.title.trim().replaceAll(' ', '-')
          : state.G.gameMode
            ? state.G.gameMode.trim().replaceAll(' ', '')
            : ``;

      const timestamp = new Date().toISOString().replaceAll(':', '-');
      const date = new Date().toLocaleString();
      const filename = `threats-${modelTitle}-${timestamp}.md`;

      logEvent(`Download threats: ${matchID}`);
      ctx.attachment(filename);
      ctx.set('Access-Control-Expose-Headers', 'Content-Disposition');
      ctx.body = formatThreats(
        threats.map((threat) => enrichThreatWithCategory(threat, state.G.gameMode)),
        date,
      );
    };

type ThreatWithCategory = ThreatV2 & { category?: string; owner?: string };

function enrichThreatWithCategory(
  threat: ThreatV2,
  gameMode: GameMode,
): ThreatWithCategory {
  if (threat.type) {
    return {
      ...threat,
      category: isSuit(threat.type)
        ? getSuitDisplayName(gameMode, threat.type)
        : threat.type,
    };
  }

  return threat;
}

function getThreats(
  gameState: State<GameState>,
  metadata: Server.MatchData,
  model: ThreatDragonModelV2 | null,
) {
  const threats: ThreatV2[] = [];

  // add threats from G.identifiedThreats
  gameState.G.identifiedThreats.forEach((identifiedThreats) => {
    if (identifiedThreats !== null) {
      Object.keys(identifiedThreats).forEach((componentId) => {
        if (identifiedThreats[componentId] !== undefined) {
          Object.values(identifiedThreats[componentId]).forEach((threat) => {
            //const t = threat as Partial<ThreatV2> & { owner?: string };
            threats.push({
              ...threat,
              owner:
                threat.owner !== undefined
                  ? metadata.players[Number.parseInt(threat.owner)]?.name
                  : undefined,
              status: 'NA',
              description: threat.description ?? '',
              mitigation: threat.mitigation ?? '',
              severity: threat.severity ?? 'Low',
              title: threat.title ?? '',
              type: threat.type ?? '',
            });
          });
        }
      });
    }
  });

  // add threats from model
  if (model) {
    model.detail.diagrams.forEach((diagram) => {
      diagram.cells?.forEach((cell) => {
        const t = cell.data?.threats;
        if (Array.isArray(t) && t.length) {
          threats.push(...t);
        }
      });
    });
  }

  return threats;
}

function formatThreats(threats: ThreatWithCategory[], date: string) {
  return `Threats ${date}
=======

${threats.map(formatSingleThreat).join('\n')}
`;
}

function formatSingleThreat(threat: ThreatWithCategory, index: number) {
  const lines = [
    `${index + 1}. **${escapeMarkdownText(
      threat.title?.trim() ?? 'No title given',
    )}**`,
  ];

  if ('category' in threat && threat.category !== undefined) {
    lines.push(`    - *Category:* ${escapeMarkdownText(threat.category)}`);
  }

  if ('severity' in threat && threat.severity !== undefined) {
    lines.push(`    - *Severity:* ${escapeMarkdownText(threat.severity)}`);
  }

  if ('owner' in threat && threat.owner !== undefined) {
    lines.push(`    - *Author:* ${escapeMarkdownText(threat.owner)}`);
  }

  if ('description' in threat && threat.description !== undefined) {
    lines.push(
      `    - *Description:* ${escapeMarkdownText(
        threat.description?.replace(/(\r|\n)+/gm, ' '),
      )}`,
    );
  }

  if (
    'mitigation' in threat &&
    threat.mitigation !== undefined &&
    threat.mitigation !== `No mitigation provided.`
  ) {
    lines.push(
      `    - *Mitigation:* ${escapeMarkdownText(
        threat.mitigation?.replace(/(\r|\n)+/gm, ' '),
      )}`,
    );
  }

  return lines.join('\n');
}

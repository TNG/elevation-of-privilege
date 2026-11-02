import { readFile, rm, writeFile } from 'node:fs/promises';

import {
  createGameRequestSchema,
  DEFAULT_MODEL,
  escapeMarkdownText,
  formatIssues,
  GameMode,
  gameName,
  GameState,
  getSuitDisplayName,
  isSuit,
  logEvent,
  logSecurityEvent,
  ModelType,
  SetupData,
  threatDragonModelSchema,
  ThreatDragonModel,
  ThreatDragonThreat,
} from '@eop/shared';
import { LobbyClient } from 'boardgame.io/client';
import send from 'koa-send';
import { v4 as uuidv4 } from 'uuid';

import { INTERNAL_API_PORT } from './config';
import { CreateGameError } from './create-game-error';
import { getDbImagesFolder } from './filesystem';
import { processImageUpload, type UploadedImage } from './image-upload';

import type { Server, State } from 'boardgame.io';
import type { IMiddleware } from 'koa-router';
import * as v from 'valibot';
import type { GameServer } from './gameServer';

export const createGame =
  (gameServer: GameServer): IMiddleware =>
  async (ctx) => {
    const spectatorCredential = uuidv4();
    let matchID: string | undefined;
    let image: UploadedImage | undefined;

    try {
      // 1. Validate all form fields before anything is stored (FR-002)
      const parsed = v.safeParse(
        createGameRequestSchema,
        ctx.request.body ?? {},
      );
      if (!parsed.success) {
        throw new CreateGameError(
          'invalid_request',
          formatIssues(parsed.issues),
        );
      }
      const body = parsed.output;

      // 2. Validate the model content before the match is registered
      let validatedModel: ThreatDragonModel | undefined;
      switch (body.modelType) {
        case ModelType.THREAT_DRAGON: {
          let parsedModel: unknown;
          try {
            parsedModel = JSON.parse(body.model ?? '');
          } catch {
            throw new CreateGameError('invalid_model_json');
          }
          const modelResult = v.safeParse(threatDragonModelSchema, parsedModel);
          if (!modelResult.success) {
            throw new CreateGameError(
              'invalid_model',
              formatIssues(modelResult.issues, 'model'),
            );
          }
          validatedModel = modelResult.output;
          break;
        }

        case ModelType.IMAGE: {
          const file = ctx.request.files?.model;
          if (file === undefined || Array.isArray(file)) {
            throw new CreateGameError('missing_image');
          }
          image = await processImageUpload({
            buffer: await readFile(file.filepath),
            claimedMimeType: file.mimetype ?? undefined,
            originalFilename: file.originalFilename ?? undefined,
          });
          break;
        }

        default:
          break;
      }

      const lobbyClient = new LobbyClient({
        server: `http://localhost:${INTERNAL_API_PORT}`,
      });

      const { matchID: createdMatchID } = await lobbyClient.createMatch(
        gameName,
        {
          numPlayers: body.names.length,
          setupData: {
            startSuit: body.startSuit,
            turnDuration: body.turnDuration,
            gameMode: body.gameMode,
            modelType: body.modelType,
            modelReference: body.modelReference,
            spectatorCredential,
          } satisfies SetupData,
          // Never announce new games in the public lobby (FR-005)
          unlisted: true,
        },
      );
      matchID = createdMatchID;

      const credentials = [];

      for (const [index, name] of body.names.entries()) {
        const { playerCredentials } = await lobbyClient.joinMatch(
          gameName,
          matchID,
          { playerID: index.toString(), playerName: name },
        );

        credentials.push(playerCredentials);
      }

      //model stuff
      switch (body.modelType) {
        case ModelType.THREAT_DRAGON: {
          if (validatedModel === undefined) {
            // unreachable: model validation above guarantees the model exists
            throw new CreateGameError('invalid_model');
          }
          await gameServer.db.setModel(matchID, validatedModel);
          break;
        }

        case ModelType.PRIVACY_ENHANCED: {
          await gameServer.db.setModel(matchID, DEFAULT_MODEL);
          break;
        }

        case ModelType.IMAGE: {
          if (image === undefined) {
            // unreachable: image validation above guarantees the image exists
            throw new CreateGameError('missing_image');
          }
          await writeFile(
            `${getDbImagesFolder()}/${matchID}.${image.extension}`,
            image.bytes,
          );
          //use model object to store info about image
          await gameServer.db.setModel(matchID, {
            extension: image.extension,
          });
          if (image.removed.length > 0) {
            logSecurityEvent('svg_sanitized', {
              matchID,
              removed: image.removed,
            });
          }
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
      if (err instanceof CreateGameError) {
        ctx.status = 400;
        ctx.body =
          err.issues !== undefined
            ? { error: err.code, issues: err.issues }
            : { error: err.code };
        logSecurityEvent(
          'create_rejected',
          err.issues !== undefined
            ? { code: err.code, issues: err.issues }
            : { code: err.code },
        );
        return;
      }

      if (matchID !== undefined) {
        // Roll back the half-created game (FR-003): each cleanup runs in its
        // own try/catch so a cleanup failure is logged but never masks the
        // 500 the client receives.
        try {
          await gameServer.db.wipe(matchID);
        } catch (cleanupErr) {
          logSecurityEvent('create_failed', {
            matchID,
            cleanup: 'wipe',
            error:
              cleanupErr instanceof Error
                ? cleanupErr.constructor.name
                : typeof cleanupErr,
          });
        }
        if (image !== undefined) {
          try {
            await rm(`${getDbImagesFolder()}/${matchID}.${image.extension}`, {
              force: true,
            });
          } catch (cleanupErr) {
            logSecurityEvent('create_failed', {
              matchID,
              cleanup: 'image_file',
              error:
                cleanupErr instanceof Error
                  ? cleanupErr.constructor.name
                  : typeof cleanupErr,
            });
          }
        }
      }

      logSecurityEvent('create_failed', {
        matchID,
        error: err instanceof Error ? err.constructor.name : typeof err,
      });
      ctx.throw(500);
    } finally {
      // Guarantee the formidable temp files are gone in every path (FR-018)
      const files = ctx.request.files;
      if (files !== undefined) {
        await Promise.all(
          Object.values(files)
            .flat()
            .map((file) => rm(file.filepath, { force: true })),
        );
      }
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
      // http-errors v2 only accepts the status as the first argument
      return ctx.throw(400, 'Missing required parameter matchID');
    }

    const game = await gameServer.db.fetch(matchID, { model: true });

    if (!game.model || !('extension' in game.model)) {
      return ctx.throw(
        400,
        'Cannot request image if none is stored, maybe the wrong model type has been set?',
      );
    }

    // An SVG may contain script-active content, so it must never run as a
    // top-level document: deliver it as a download with a policy that allows
    // nothing (FR-007). Raster images keep in-page display (FR-008).
    if (game.model.extension === 'svg') {
      ctx.attachment(`${matchID}.svg`);
      ctx.set('Content-Security-Policy', "default-src 'none'");
      ctx.set('Access-Control-Expose-Headers', 'Content-Disposition');
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

    // update the model with the identified threats
    state.G.identifiedThreats.forEach((threatsForComponent, diagramIdx) => {
      if (threatsForComponent === null) {
        return;
      }
      Object.keys(threatsForComponent).forEach((componentIdx) => {
        const diagram = model.detail.diagrams[diagramIdx]?.diagramJson;
        const cell = diagram?.cells?.find((c) => c.id === componentIdx);

        if (
          cell !== undefined &&
          threatsForComponent[componentIdx] !== undefined
        ) {
          const threats: ThreatDragonThreat[] = cell.threats ?? [];
          Object.values(threatsForComponent[componentIdx]).forEach((t) =>
            threats.push({
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
            }),
          );
          cell.threats = threats;
        }
      });
    });

    const modelTitle = model.summary.title.replace(' ', '-');
    const timestamp = new Date().toISOString().replace(':', '-');
    const filename = `${modelTitle}-${timestamp}.json`;

    logEvent(`Download model: ${matchID}`);
    ctx.attachment(filename);
    ctx.set('Access-Control-Expose-Headers', 'Content-Disposition');
    ctx.body = game.model;
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

    const model = game.model;
    const threats = getThreats(
      state,
      game.metadata,
      isJsonModel && model && !('extension' in model) ? model : null,
    );

    const modelTitle =
      isJsonModel && game.model && !('extension' in game.model)
        ? game.model
          ? game.model?.summary.title.trim().replaceAll(' ', '-')
          : ``
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
      threats.map((threat) =>
        enrichThreatWithCategory(threat, state.G.gameMode),
      ),
      date,
    );
  };

type ThreatWithCategory = ThreatDragonThreat & { category?: string };

function enrichThreatWithCategory(
  threat: ThreatDragonThreat,
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
  model: ThreatDragonModel | null,
) {
  const threats: ThreatDragonThreat[] = [];

  //add threats from G.identifiedThreats
  gameState.G.identifiedThreats.forEach((identifiedThreats) => {
    if (identifiedThreats !== null) {
      Object.keys(identifiedThreats).forEach((componentId) => {
        if (identifiedThreats[componentId] !== undefined) {
          Object.values(identifiedThreats[componentId]).forEach((threat) => {
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

  //add threats from model
  if (model) {
    model.detail.diagrams.forEach((diagram) => {
      diagram.diagramJson.cells?.forEach((cell) => {
        if (cell.threats !== undefined) {
          threats.push(...cell.threats);
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

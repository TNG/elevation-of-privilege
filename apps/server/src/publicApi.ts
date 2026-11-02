import { SPECTATOR } from '@eop/shared';
import cors from '@koa/cors';
import auth from 'basic-auth';
import Koa from 'koa';
import koaBody from 'koa-body';
import Router from '@koa/router';
import type { Server } from 'node:http';
import { API_PORT } from './config';
import {
  createGame,
  downloadThreatDragonModel,
  downloadThreatsMarkdownFile,
  getImage,
  getModel,
  getPlayerNames,
} from './endpoints';
import { getUploadTempFolder } from './filesystem';

import type { SetupData } from '@eop/shared';
import type { GameServer } from './gameServer';

const runPublicApi = (gameServer: GameServer): [Koa, Server] => {
  const app = new Koa();

  const router = new Router({
    prefix: '/game',
  });

  const authMiddlewareInstance = authMiddleware(gameServer);

  router.post(
    '/create',
    koaBody({
      multipart: true,
      formidable: { uploadDir: getUploadTempFolder() },
    }),
    createGame(gameServer),
  );
  router.get('/:matchID/players', authMiddlewareInstance, getPlayerNames());
  router.get('/:matchID/model', authMiddlewareInstance, getModel(gameServer));
  router.get('/:matchID/image', authMiddlewareInstance, getImage(gameServer));
  router.get(
    '/:matchID/download',
    authMiddlewareInstance,
    downloadThreatDragonModel(gameServer),
  );
  router.get(
    '/:matchID/download/text',
    authMiddlewareInstance,
    downloadThreatsMarkdownFile(gameServer),
  );

  app.use(cors());
  app.use(router.routes()).use(router.allowedMethods());
  const appHandle = app.listen(API_PORT, () => {
    console.log(`Public API serving at: http://localhost:${API_PORT}/`);
  });

  return [app, appHandle];
};

const authMiddleware =
  (gameServer: GameServer): Router.Middleware =>
  async (ctx, next) => {
    const authorizationHeader = ctx.header.authorization;
    let authorized = false;

    if (authorizationHeader) {
      try {
        const credentials = auth.parse(authorizationHeader);

        if (credentials) {
          if (ctx.params.matchID === undefined) {
            // http-errors v2 only accepts the status as the first argument
            return ctx.throw(400, 'Missing required parameter matchID');
          }
          const game = await gameServer.db.fetch(ctx.params.matchID, {
            metadata: true,
          });
          const metadata = game.metadata;

          authorized =
            (credentials.name === SPECTATOR &&
              credentials.pass ===
                (metadata.setupData as SetupData).spectatorCredential) ||
            credentials.pass ===
              metadata.players[Number.parseInt(credentials.name)]?.credentials;
        }
      } catch (err) {
        console.error(
          `Error during authentication. Game: ${ctx.params.matchID}, Error: ${(err as Error).toString()}`,
        );
        // ... and go directly to rejection
      }
    }

    if (!authorized) {
      console.log(
        `Rejecting unauthorized request. Game: ${ctx.params.matchID}`,
      );
      ctx.throw(403);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await next();
  };

export default runPublicApi;

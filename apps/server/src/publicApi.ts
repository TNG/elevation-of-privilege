import type { Server } from 'node:http';
import cors from '@koa/cors';
import auth from 'basic-auth';
import Koa from 'koa';
import koaBody from 'koa-body';
import Router from 'koa-router';
import { SPECTATOR } from '@eop/shared';
import { API_PORT } from './config';
import {
  createGame,
  downloadThreatDragonModel,
  downloadThreatsMarkdownFile,
  getImage,
  getModel,
  getPlayerNames,
} from './endpoints';
import { getDbImagesFolder } from './filesystem';

import type { SetupData } from '@eop/shared';
import type { GameServer } from './gameServer';

const runPublicApi = (gameServer: GameServer): [Koa, Server] => {
  const app = new Koa();

  const router = new Router({
    prefix: '/game',
  });

  //require authentication for all routes starting with `/:matchID/*`
  router.use('/:matchID/', authMiddleware(gameServer));

  router.post(
    '/create',
    koaBody({
      multipart: true,
      formidable: { uploadDir: getDbImagesFolder() },
    }),
    createGame(gameServer),
  );
  router.get('/:matchID/players', getPlayerNames());
  router.get('/:matchID/model', getModel(gameServer));
  router.get('/:matchID/image', getImage(gameServer));
  router.get('/:matchID/download', downloadThreatDragonModel(gameServer));
  router.get(
    '/:matchID/download/text',
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
  (gameServer: GameServer): Router.IMiddleware =>
  async (ctx, next) => {
    const authorizationHeader = ctx.header.authorization;
    if (authorizationHeader) {
      try {
        const credentials = auth.parse(authorizationHeader);

        if (credentials) {
          const game = await gameServer.db.fetch(ctx.params.matchID, {
            metadata: true,
          });
          const metadata = game.metadata;

          if (
            credentials.name === SPECTATOR &&
            credentials.pass ===
              (metadata.setupData as SetupData).spectatorCredential
          ) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await next();
          }

          if (
            credentials.pass ===
            metadata.players[Number.parseInt(credentials.name)].credentials
          ) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await next();
          }
        }
      } catch (err) {
        console.error(
          `Error during authentication. Game: ${ctx.params.matchID}, Error: ${(err as Error).toString()}`,
        );
        // ... and go directly to rejection
      }
    }

    console.log(`Rejecting unauthorized request. Game: ${ctx.params.matchID}`);
    ctx.throw(403);
  };

export default runPublicApi;

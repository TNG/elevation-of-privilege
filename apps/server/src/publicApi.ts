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
import { getDbImagesFolder } from './filesystem';

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
      formidable: { uploadDir: getDbImagesFolder() },
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
  app.use(async (ctx, next) => {
    await next();
    // Prevent MIME-type sniffing so an attacker-controlled extension stored on
    // disk cannot cause the browser to interpret an upload as active content.
    ctx.set('X-Content-Type-Options', 'nosniff');
    // Restrict where this origin may be embedded to prevent clickjacking.
    ctx.set('X-Frame-Options', 'DENY');
    // Defense-in-depth against stored XSS via uploaded content: only allow
    // same-origin scripts. Inline styles are permitted because the React build
    // injects styles at runtime; images may come from data/blob URLs (client
    // diagram rendering) or same-origin uploads. WebSockets use ws/wss.
    ctx.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'",
    );
  });
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
    if (authorizationHeader) {
      try {
        const credentials = auth.parse(authorizationHeader);

        if (credentials) {
          if (ctx.params.matchID === undefined) {
            return ctx.throw('Missing required parameter matchID', 400);
          }
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
            metadata.players[Number.parseInt(credentials.name)]?.credentials
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

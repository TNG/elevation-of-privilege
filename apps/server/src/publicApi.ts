import { SPECTATOR } from '@eop/shared';
import cors from '@koa/cors';
import auth from 'basic-auth';
import Koa from 'koa';
import koaBody from 'koa-body';
import helmet from 'koa-helmet';
import Router from '@koa/router';
import type { Server } from 'node:http';
import { API_PORT, CONTENT_SECURITY_POLICY_DIRECTIVES } from './config';
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

  // First middleware, before cors() and the router, so every response carries
  // the delivery headers (FR-003)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: CONTENT_SECURITY_POLICY_DIRECTIVES,
      },
      frameguard: { action: 'deny' },
    }),
  );
  // Koa's default error handling (ctx.onerror) removes every response header
  // before sending the error body, which would strip the headers helmet set.
  // ctx.onerror restores whatever it finds on err.headers, so snapshot the
  // delivery headers onto the error before rethrowing (FR-003).
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof Error) {
        const errWithHeaders = err as Error & {
          headers?: Record<string, unknown>;
        };
        const deliveryHeaders: Record<string, unknown> = {};
        for (const name of ctx.res.getHeaderNames()) {
          if (name !== 'etag') {
            deliveryHeaders[name] = ctx.res.getHeader(name);
          }
        }
        errWithHeaders.headers = {
          ...(errWithHeaders.headers ?? {}),
          ...deliveryHeaders,
        };
      }
      throw err;
    }
  });
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

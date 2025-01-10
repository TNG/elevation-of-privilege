FROM node:23-alpine AS base

FROM base AS pruner
WORKDIR /app
ENV DO_NOT_TRACK=1
COPY . .
RUN npm ci --workspaces=false
RUN npx turbo prune @eop/server --docker

FROM base AS builder
WORKDIR /app
ENV DO_NOT_TRACK=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build

FROM base as dependency-installer
ENV NODE_ENV production
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci --omit=dev

FROM base
RUN apk add dumb-init
ENV NODE_ENV production
WORKDIR /app
USER node
COPY --chown=node:node --from=dependency-installer /app ./
# TODO: Find a generic way to copy the built versions of packages (alternatively, bundle the server)
COPY --chown=node:node --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=builder /app/apps/server/build ./apps/server/build
CMD [ "dumb-init", "npm", "start", "-w", "@eop/server"]

FROM node:20-alpine AS base

FROM base AS pruner
WORKDIR /app
ENV DO_NOT_TRACK=1
COPY . .
RUN npm ci --workspaces=false
RUN npx turbo prune @eop/client --docker

FROM base AS builder
WORKDIR /app
ENV DO_NOT_TRACK=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci
COPY --from=pruner /app/out/full/ .
ARG REACT_APP_EOP_IMPRINT
ARG REACT_APP_EOP_PRIVACY
ARG REACT_APP_EOP_BANNER_TEXT
ENV REACT_APP_EOP_IMPRINT=$REACT_APP_EOP_IMPRINT
ENV REACT_APP_EOP_PRIVACY=$REACT_APP_EOP_PRIVACY
ENV REACT_APP_EOP_BANNER_TEXT=$REACT_APP_EOP_BANNER_TEXT
RUN npx turbo run build

FROM nginxinc/nginx-unprivileged:1.27.0-alpine
COPY --from=builder /app/apps/client/nginx/etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/client/nginx/etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/client/build /usr/share/nginx/html/
EXPOSE 8080

FROM hub.hamdocker.ir/node:24-alpine AS base

WORKDIR /app

COPY offline-pkgs/apk/ /tmp/offline-pkgs/
RUN apk add --no-cache --no-network --allow-untrusted /tmp/offline-pkgs/*.apk && \
    rm -rf /tmp/offline-pkgs

# ENV NPM_CONFIG_REGISTRY=https://hub.megan.ir/npm/

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=gomnam-npm-cache,target=/root/.npm,sharing=locked \
	npm ci --legacy-peer-deps --prefer-offline --no-audit --fund=false

COPY . .

ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/offline-pkgs/prisma/libquery_engine-linux-musl-openssl-3.0.x.so.node
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/offline-pkgs/prisma/schema-engine
RUN npm run db:generate

RUN npm run build

RUN mkdir -p /app/public/uploads

EXPOSE 3000

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD sh /docker-entrypoint.sh

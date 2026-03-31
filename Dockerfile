FROM node:24-alpine AS base

WORKDIR /app

COPY offline-pkgs/apk/ /tmp/offline-pkgs/
RUN apk add --no-cache --no-network --allow-untrusted /tmp/offline-pkgs/*.apk && \
    rm -rf /tmp/offline-pkgs

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps --registry=https://hub.megan.ir/npm/ --strict-ssl=false

COPY . .

RUN npm run build

RUN mkdir -p /app/public/uploads

EXPOSE 3000

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD sh /docker-entrypoint.sh

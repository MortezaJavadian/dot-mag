FROM node:24-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps || npm ci

COPY . .

RUN npm run db:generate || true

RUN npm run build

RUN mkdir -p /app/public/uploads

EXPOSE 3000

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD sh /docker-entrypoint.sh

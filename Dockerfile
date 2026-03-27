# Base image
FROM node:24-alpine AS base

# Set working directory
WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# Install dependencies
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps || npm ci

# Copy application code
COPY . .

# Generate Prisma client (included in ci, but run explicitly to ensure)
RUN npm run db:generate || true

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Start the application
CMD sh /docker-entrypoint.sh
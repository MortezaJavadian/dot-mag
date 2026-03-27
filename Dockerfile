# Base image
FROM node:24-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm config set registry https://hub.megan.ir/npm/ && \
    npm ci

# Copy application code
COPY . .

# Generate Prisma client (included in ci, but run explicitly to ensure)
RUN npm run db:generate || true

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
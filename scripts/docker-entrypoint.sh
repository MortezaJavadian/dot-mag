#!/bin/sh
set -e

echo "Starting application..."

# Wait for database readiness
sleep 2

# Initialize database schema
echo "Initializing database schema..."
npx prisma db push --skip-generate --accept-data-loss || {
  echo "Warning: Prisma db push failed"
}

# Seed database (only creates admin user, preserves all other data)
echo "Seeding database..."
npm run db:seed || {
  echo "Warning: Database seeding failed"
}

# Start Next.js server
echo "Starting Next.js server..."
exec npm start

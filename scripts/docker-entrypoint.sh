#!/bin/sh
set -e

echo "Starting application..."

# Wait a moment for database readiness
sleep 2

# Push Prisma schema to database
echo "Initializing database schema..."
npx prisma db push --skip-generate --accept-data-loss || {
  echo "Warning: Prisma db push failed, database may not be initialized"
}

# Seed the database with initial data
echo "Seeding database..."
npm run db:seed || {
  echo "Warning: Database seeding failed"
}

# Start the application
echo "Starting Next.js server..."
exec npm start

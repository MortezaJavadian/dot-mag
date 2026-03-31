#!/bin/sh
set -e

echo "Starting application..."

# Start Next.js server
echo "Starting Next.js server..."
exec npm start

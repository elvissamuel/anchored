#!/bin/bash

# This script initializes the database with Prisma
# Make sure DATABASE_URL is set in your environment

echo "Installing Prisma..."
pnpm add -D prisma @prisma/client

echo "Creating Prisma migration..."
pnpm prisma migrate dev --name init

echo "Database setup complete!"

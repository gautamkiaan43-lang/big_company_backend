# Stop the backend server first (Ctrl+C in the terminal running npm run dev)
# Then run these commands:

# Generate Prisma client with new schema
npx prisma generate

# Create and apply database migration
npx prisma migrate dev --name add_consumer_settings

# Start the server again
npm run dev

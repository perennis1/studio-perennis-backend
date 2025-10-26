import { PrismaClient } from "@prisma/client";

// Create a single Prisma Client instance
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // Helpful for debugging
});

// Test connection on startup
async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to PostgreSQL!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // Exit if database connection fails
  }
}

// Run connection test
testConnection();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log("🔌 Disconnected from PostgreSQL");
});

export default prisma;

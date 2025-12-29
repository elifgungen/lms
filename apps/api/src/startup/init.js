const prisma = require("../db");
const { ROLE_NAMES } = require("../utils/roles");

async function waitForDatabase(maxRetries = 10, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      if (i === maxRetries - 1) {
        throw new Error(`Database not available after ${maxRetries} attempts: ${err.message}`);
      }
      console.log(`Database not ready, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function ensureRoles() {
  await waitForDatabase();
  
  for (const name of ROLE_NAMES) {
    try {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    } catch (err) {
      console.error(`Failed to ensure role ${name}:`, err.message);
      // Don't throw - allow app to start even if role seeding fails
    }
  }
}

module.exports = { ensureRoles };

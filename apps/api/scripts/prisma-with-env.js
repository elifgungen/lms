#!/usr/bin/env node

const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");

// Load .env from root
const rootEnvPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: rootEnvPath });

// Get the command to run (everything after the script name)
const args = process.argv.slice(2);
const command = args.join(" ");

if (!command) {
  console.error("Usage: node prisma-with-env.js <prisma-command>");
  process.exit(1);
}

try {
  execSync(`npx prisma ${command}`, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
} catch (error) {
  process.exit(error.status || 1);
}


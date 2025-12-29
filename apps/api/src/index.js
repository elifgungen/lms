const path = require("path");
const dotenv = require("dotenv");

// Load .env from root directory
dotenv.config({
  path: path.resolve(__dirname, "../../../.env")
});

const app = require("./app");
const config = require("./config");
const { ensureRoles } = require("./startup/init");

async function start() {
  try {
    await ensureRoles();
    app.listen(config.port, () => {
      console.log(`API listening on :${config.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, "../../.env")
});

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-refresh",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || "7d"
};

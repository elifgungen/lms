const jwt = require("jsonwebtoken");
const config = require("../config");

function issueTokens(user, roles) {
  const accessToken = jwt.sign(
    { sub: user.id, roles, type: "access" },
    config.jwtAccessSecret,
    { expiresIn: config.jwtAccessTtl }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: "refresh" },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshTtl }
  );
  const refreshPayload = jwt.decode(refreshToken);
  const refreshExpiresAt = new Date(refreshPayload.exp * 1000);
  return { accessToken, refreshToken, refreshExpiresAt };
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

module.exports = { issueTokens, verifyRefreshToken };

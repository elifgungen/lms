const { v4: uuidv4 } = require("uuid");
const prisma = require("../db");

module.exports = function audit(req, res, next) {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    prisma.auditLog
      .create({
        data: {
          userId: req.user ? req.user.id : null,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          requestId
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "test") {
          console.error("Audit log failed", err);
        }
      });
  });

  next();
};

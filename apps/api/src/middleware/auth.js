const jwt = require("jsonwebtoken");
const prisma = require("../db");
const config = require("../config");

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret);
    if (payload.type !== "access") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((item) => item.role.name)
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

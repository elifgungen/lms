const jwt = require("jsonwebtoken");
const prisma = require("../db");
const config = require("../config");

module.exports = async function auth(req, res, next) {
  let token = "";

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    token = header.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
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
      name: user.name,
      roles: user.roles.map((item) => item.role.name),
      twoFactorEnabled: user.twoFactorEnabled
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

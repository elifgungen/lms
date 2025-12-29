module.exports = function requireRoles(...allowed) {
  return function rbac(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const ok = req.user.roles.some((role) => allowed.includes(role));
    if (!ok) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};

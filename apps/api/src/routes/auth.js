const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../db");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { issueTokens } = require("../utils/tokens");
const config = require("../config");

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.validated.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name }
    });

    const role = await prisma.role.findUnique({
      where: { name: "student" }
    });
    if (role) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id }
      });
    }

    const roles = role ? ["student"] : [];
    const { accessToken, refreshToken, refreshExpiresAt } = issueTokens(
      user,
      roles
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: refreshExpiresAt
      }
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, roles },
      accessToken,
      refreshToken
    });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const roles = user.roles.map((item) => item.role.name);
    const { accessToken, refreshToken, refreshExpiresAt } = issueTokens(
      user,
      roles
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: refreshExpiresAt
      }
    });

    res.json({
      accessToken,
      refreshToken
    });
  })
);

router.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.validated.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } }
    });

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const roles = user.roles.map((item) => item.role.name);
    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt
    } = issueTokens(user, roles);
    const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: refreshExpiresAt
      }
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  })
);

router.post(
  "/logout",
  auth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null }
    });
    res.json({ ok: true });
  })
);

module.exports = router;

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const prisma = require("../db");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { issueTokens } = require("../utils/tokens");
const config = require("../config");
const mailer = require("../services/mailer");

const router = express.Router();

// Schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    role: z.enum(["student", "instructor"]).optional().default("student")
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8)
  })
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const twoFactorVerifySchema = z.object({
  body: z.object({
    token: z.string().min(10),
    code: z.string().min(3)
  })
});

const twoFactorCodeSchema = z.object({
  body: z.object({
    code: z.string().min(3)
  })
});

// Helper: Generate random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// =================== REGISTER ===================
router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, role: selectedRole } = req.validated.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerifyToken = generateToken();
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        emailVerified: false,
        emailVerifyToken,
        emailVerifyExpiry
      }
    });

    // Assign selected role (student or instructor)
    const roleName = selectedRole || "student";
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id }
      });
    }

    // Send verification email
    try {
      await mailer.sendVerificationEmail(email, name, emailVerifyToken);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      user: { id: user.id, email: user.email, name: user.name }
    });
  })
);

// =================== VERIFY EMAIL ===================
router.get(
  "/verify-email/:token",
  asyncHandler(async (req, res) => {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: { gte: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null
      }
    });

    // Send welcome email
    try {
      await mailer.sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      console.error("Failed to send welcome email:", err);
    }

    res.json({ message: "Email verified successfully. You can now log in." });
  })
);

// =================== RESEND VERIFICATION ===================
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.validated.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: "If the email exists, a verification link has been sent." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const emailVerifyToken = generateToken();
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExpiry }
    });

    try {
      await mailer.sendVerificationEmail(email, user.name, emailVerifyToken);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    res.json({ message: "If the email exists, a verification link has been sent." });
  })
);

// =================== FORGOT PASSWORD ===================
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.validated.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If the email exists, a password reset link has been sent." });
    }

    const passwordResetToken = generateToken();
    const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken, passwordResetExpiry }
    });

    try {
      await mailer.sendPasswordResetEmail(email, user.name, passwordResetToken);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }

    res.json({ message: "If the email exists, a password reset link has been sent." });
  })
);

// =================== RESET PASSWORD ===================
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.validated.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gte: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null
      }
    });

    res.json({ message: "Password reset successfully. You can now log in." });
  })
);

// =================== LOGIN ===================
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

    // Check if user has password (OAuth users might not)
    if (!user.passwordHash) {
      return res.status(401).json({ error: "Please use social login for this account" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check email verification (optional: can be disabled for development)
    // if (!user.emailVerified) {
    //   return res.status(403).json({ error: "Please verify your email first" });
    // }

    const roles = user.roles.map((item) => item.role.name);

    // If 2FA is enabled, require OTP before issuing access/refresh tokens
    if (user.twoFactorEnabled) {
      const twoFactorToken = jwt.sign(
        { sub: user.id, type: "2fa" },
        config.jwtAccessSecret,
        { expiresIn: "10m" }
      );

      return res.json({
        twoFactorRequired: true,
        twoFactorToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles,
          emailVerified: user.emailVerified,
          twoFactorEnabled: true
        }
      });
    }

    const { accessToken, refreshToken, refreshExpiresAt } = issueTokens(user, roles);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, refreshTokenExpiresAt: refreshExpiresAt }
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  })
);

// =================== TWO-FACTOR (LOGIN VERIFY) ===================
router.post(
  "/2fa/verify",
  validate(twoFactorVerifySchema),
  asyncHandler(async (req, res) => {
    const { token, code } = req.validated.body;

    let payload;
    try {
      payload = jwt.verify(token, config.jwtAccessSecret);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired 2FA token" });
    }

    if (!payload || payload.type !== "2fa") {
      return res.status(401).json({ error: "Invalid 2FA token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA not enabled for this user" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid code" });
    }

    const roles = user.roles.map((item) => item.role.name);
    const { accessToken, refreshToken, refreshExpiresAt } = issueTokens(user, roles);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, refreshTokenExpiresAt: refreshExpiresAt }
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  })
);

// =================== REFRESH TOKEN ===================
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
      data: { refreshTokenHash, refreshTokenExpiresAt: refreshExpiresAt }
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  })
);

// =================== LOGOUT ===================
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

// =================== TWO-FACTOR (SETUP/STATUS) ===================
router.get(
  "/2fa/status",
  auth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorEnabled: true }
    });

    res.json({ enabled: user?.twoFactorEnabled ?? false });
  })
);

router.post(
  "/2fa/setup",
  auth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, twoFactorEnabled: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA already enabled" });
    }

    const secret = speakeasy.generateSecret({
      name: `LMS (${user.email || "user"})`
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorTempSecret: secret.base32 }
    });

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrDataUrl
    });
  })
);

router.post(
  "/2fa/enable",
  auth,
  validate(twoFactorCodeSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.validated.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorTempSecret: true }
    });

    if (!user?.twoFactorTempSecret) {
      return res.status(400).json({ error: "2FA setup not initialized" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: "base32",
      token: code,
      window: 1
    });

    if (!isValid) {
      return res.status(400).json({ error: "Invalid code" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorTempSecret,
        twoFactorTempSecret: null
      }
    });

    res.json({ enabled: true });
  })
);

router.post(
  "/2fa/disable",
  auth,
  validate(twoFactorCodeSchema),
  asyncHandler(async (req, res) => {
    const { code } = req.validated.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1
    });

    if (!isValid) {
      return res.status(400).json({ error: "Invalid code" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null
      }
    });

    res.json({ enabled: false });
  })
);

// =================== GET CURRENT USER ===================
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      roles: user.roles.map((r) => r.role.name)
    });
  })
);

module.exports = router;

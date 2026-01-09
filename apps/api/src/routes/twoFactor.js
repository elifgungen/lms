const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const prisma = require("../db");
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(auth);

// Get 2FA status
router.get(
    "/status",
    asyncHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { twoFactorEnabled: true }
        });

        res.json({
            enabled: user?.twoFactorEnabled || false
        });
    })
);

// Setup 2FA - generate secret and QR code
router.post(
    "/setup",
    asyncHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: "2FA is already enabled" });
        }

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `LMS (${user.email})`,
            issuer: "LMS Platform"
        });

        // Store temp secret
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorTempSecret: secret.base32 }
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            secret: secret.base32,
            qrCode: qrCodeUrl,
            message: "Scan the QR code with your authenticator app, then verify with a code"
        });
    })
);

// Enable 2FA - verify code and activate
router.post(
    "/enable",
    asyncHandler(async (req, res) => {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Verification code is required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: "2FA is already enabled" });
        }

        if (!user.twoFactorTempSecret) {
            return res.status(400).json({ error: "Please setup 2FA first" });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: "base32",
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        // Enable 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: user.twoFactorTempSecret,
                twoFactorTempSecret: null
            }
        });

        res.json({
            success: true,
            message: "Two-factor authentication enabled successfully"
        });
    })
);

// Disable 2FA
router.post(
    "/disable",
    asyncHandler(async (req, res) => {
        const { code, password } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Verification code is required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: "2FA is not enabled" });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        // Disable 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorTempSecret: null
            }
        });

        res.json({
            success: true,
            message: "Two-factor authentication disabled"
        });
    })
);

// Verify 2FA code (used during login)
router.post(
    "/verify",
    asyncHandler(async (req, res) => {
        const { code, userId } = req.body;

        if (!code || !userId) {
            return res.status(400).json({ error: "Code and userId are required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(400).json({ error: "2FA is not enabled for this user" });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        res.json({
            success: true,
            verified: true
        });
    })
);

module.exports = router;

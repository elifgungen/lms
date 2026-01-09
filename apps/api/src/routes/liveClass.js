const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Schemas
const createLiveClassSchema = z.object({
    body: z.object({
        courseId: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
    }),
});

const updateLiveClassSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        isActive: z.boolean().optional(),
    }),
});

// Helper: Generate unique Jitsi room ID
function generateJitsiRoomId(title, courseId) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    const shortId = courseId.substring(0, 8);
    const timestamp = Date.now().toString(36);
    return `lms-${slug}-${shortId}-${timestamp}`;
}

// =================== CREATE LIVE CLASS ===================
router.post(
    "/",
    auth,
    validate(createLiveClassSchema),
    asyncHandler(async (req, res) => {
        const { courseId, title, description, scheduledAt } = req.validated.body;

        // Check if user has permission (instructor or admin)
        const userRoles = req.user.roles || [];
        if (!userRoles.some((r) => ["instructor", "admin", "super_admin"].includes(r))) {
            return res.status(403).json({ error: "Only instructors can create live classes" });
        }

        // Verify course exists
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const jitsiRoomId = generateJitsiRoomId(title, courseId);

        const liveClass = await prisma.liveClass.create({
            data: {
                courseId,
                title,
                description,
                jitsiRoomId,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                createdById: req.user.id,
            },
        });

        res.status(201).json(liveClass);
    })
);

// =================== GET LIVE CLASSES BY COURSE ===================
router.get(
    "/course/:courseId",
    auth,
    asyncHandler(async (req, res) => {
        const { courseId } = req.params;

        const liveClasses = await prisma.liveClass.findMany({
            where: { courseId },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(liveClasses);
    })
);

// =================== GET LIVE CLASS BY ID ===================
router.get(
    "/:id",
    auth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const liveClass = await prisma.liveClass.findUnique({
            where: { id },
            include: {
                course: { select: { id: true, title: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }

        res.json(liveClass);
    })
);

// =================== UPDATE LIVE CLASS ===================
router.patch(
    "/:id",
    auth,
    validate(updateLiveClassSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.validated.body;

        // Check ownership
        const existing = await prisma.liveClass.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Live class not found" });
        }

        if (existing.createdById !== req.user.id) {
            const userRoles = req.user.roles || [];
            if (!userRoles.some((r) => ["admin", "super_admin"].includes(r))) {
                return res.status(403).json({ error: "Not authorized to update this live class" });
            }
        }

        const liveClass = await prisma.liveClass.update({
            where: { id },
            data: {
                ...updates,
                scheduledAt: updates.scheduledAt ? new Date(updates.scheduledAt) : undefined,
            },
        });

        res.json(liveClass);
    })
);

// =================== START/STOP LIVE CLASS ===================
router.post(
    "/:id/toggle",
    auth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const existing = await prisma.liveClass.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Live class not found" });
        }

        // Only creator or admin can toggle
        if (existing.createdById !== req.user.id) {
            const userRoles = req.user.roles || [];
            if (!userRoles.some((r) => ["admin", "super_admin"].includes(r))) {
                return res.status(403).json({ error: "Not authorized" });
            }
        }

        const liveClass = await prisma.liveClass.update({
            where: { id },
            data: {
                isActive: !existing.isActive,
                endedAt: existing.isActive ? new Date() : null,
            },
        });

        res.json(liveClass);
    })
);

// =================== DELETE LIVE CLASS ===================
router.delete(
    "/:id",
    auth,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const existing = await prisma.liveClass.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Live class not found" });
        }

        if (existing.createdById !== req.user.id) {
            const userRoles = req.user.roles || [];
            if (!userRoles.some((r) => ["admin", "super_admin"].includes(r))) {
                return res.status(403).json({ error: "Not authorized" });
            }
        }

        await prisma.liveClass.delete({ where: { id } });
        res.json({ ok: true });
    })
);

// =================== GET ACTIVE LIVE CLASSES ===================
router.get(
    "/",
    auth,
    asyncHandler(async (req, res) => {
        const userRoles = req.user.roles || [];
        const isInstructor = userRoles.some((r) =>
            ["instructor", "admin", "super_admin", "assistant"].includes(r)
        );

        // Instructors see all their live classes, students only see active ones
        let whereClause = {};

        if (isInstructor) {
            // Show all classes created by this instructor (or all for admin)
            const isAdmin = userRoles.some((r) => ["admin", "super_admin"].includes(r));
            if (!isAdmin) {
                whereClause = { createdById: req.user.id };
            }
        } else {
            // Students only see active classes
            whereClause = { isActive: true };
        }

        const liveClasses = await prisma.liveClass.findMany({
            where: whereClause,
            include: {
                course: { select: { id: true, title: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(liveClasses);
    })
);

module.exports = router;

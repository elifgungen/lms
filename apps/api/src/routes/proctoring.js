const express = require("express");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(auth);

// Get all proctoring sessions (instructor+)
router.get(
    "/sessions",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const sessions = await prisma.proctoringSession.findMany({
            include: {
                attempt: {
                    include: {
                        exam: { select: { id: true, title: true } },
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                events: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                }
            },
            orderBy: { startedAt: "desc" }
        });
        res.json({ data: sessions });
    })
);

// Get proctoring session by ID with all events
router.get(
    "/sessions/:id",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const session = await prisma.proctoringSession.findUnique({
            where: { id: req.params.id },
            include: {
                attempt: {
                    include: {
                        exam: { select: { id: true, title: true } },
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                events: { orderBy: { createdAt: "asc" } }
            }
        });
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({ data: session });
    })
);

module.exports = router;

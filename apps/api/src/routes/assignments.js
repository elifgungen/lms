const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const multer = require("multer");
const Minio = require("minio");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Configure MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin"
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "lms-submissions";

// Ensure bucket exists
(async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME);
            console.log(`Created MinIO bucket: ${BUCKET_NAME}`);
        }
    } catch (err) {
        console.error("MinIO bucket check failed:", err.message);
    }
})();

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Validation schemas
const assignmentSchema = z.object({
    body: z.object({
        courseId: z.string().uuid(),
        title: z.string().min(2),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        allowedFileTypes: z.string().optional(),
        maxFileSizeMb: z.number().int().optional()
    })
});

const gradeSchema = z.object({
    body: z.object({
        score: z.number().min(0).max(100),
        feedback: z.string().optional()
    })
});

router.use(auth);

// List all assignments (optionally filter by courseId)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const { courseId } = req.query;
        const where = courseId ? { courseId: courseId } : {};
        const assignments = await prisma.assignment.findMany({
            where,
            include: { course: true, _count: { select: { submissions: true } } },
            orderBy: { createdAt: "desc" }
        });
        res.json({ data: assignments });
    })
);

// Get single assignment
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const assignment = await prisma.assignment.findUnique({
            where: { id: req.params.id },
            include: { course: true, _count: { select: { submissions: true } } }
        });
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }
        res.json({ data: assignment });
    })
);

// Create assignment (instructor+)
router.post(
    "/",
    rbac("super_admin", "admin", "instructor"),
    validate(assignmentSchema),
    asyncHandler(async (req, res) => {
        const { courseId, title, description, dueDate, allowedFileTypes, maxFileSizeMb } = req.validated.body;
        const assignment = await prisma.assignment.create({
            data: {
                courseId,
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                allowedFileTypes,
                maxFileSizeMb,
                createdById: req.user.id
            }
        });
        res.status(201).json({ data: assignment });
    })
);

// Update assignment (instructor+)
router.put(
    "/:id",
    rbac("super_admin", "admin", "instructor"),
    validate(assignmentSchema),
    asyncHandler(async (req, res) => {
        const { title, description, dueDate, allowedFileTypes, maxFileSizeMb } = req.validated.body;
        const assignment = await prisma.assignment.update({
            where: { id: req.params.id },
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                allowedFileTypes,
                maxFileSizeMb
            }
        });
        res.json({ data: assignment });
    })
);

// Delete assignment (admin+)
router.delete(
    "/:id",
    rbac("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        await prisma.assignment.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    })
);

// Get all my submissions (student) - for gradebook
router.get(
    "/my-submissions",
    asyncHandler(async (req, res) => {
        const submissions = await prisma.submission.findMany({
            where: { studentId: req.user.id },
            include: {
                assignment: {
                    include: { course: { select: { id: true, title: true } } }
                }
            },
            orderBy: { submittedAt: "desc" }
        });
        res.json({ data: submissions });
    })
);

// List submissions for an assignment (instructor+)
router.get(
    "/:id/submissions",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const submissions = await prisma.submission.findMany({
            where: { assignmentId: req.params.id },
            include: { student: { select: { id: true, name: true, email: true } } },
            orderBy: { submittedAt: "desc" }
        });
        res.json({ data: submissions });
    })
);

// Submit file for assignment (student)
router.post(
    "/:id/submit",
    rbac("super_admin", "admin", "instructor", "assistant", "student"),
    upload.single("file"),
    asyncHandler(async (req, res) => {
        const assignmentId = req.params.id;
        const studentId = req.user.id;

        // Check assignment exists
        const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        // Check if file was provided
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        // Check file size
        const maxBytes = (assignment.maxFileSizeMb || 10) * 1024 * 1024;
        if (req.file.size > maxBytes) {
            return res.status(400).json({ error: `File too large. Max size: ${assignment.maxFileSizeMb || 10}MB` });
        }

        // Check file type if restricted
        if (assignment.allowedFileTypes) {
            const allowedTypes = assignment.allowedFileTypes.split(",").map(t => t.trim().toLowerCase());
            const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
            if (!allowedTypes.includes(ext)) {
                return res.status(400).json({ error: `File type not allowed. Allowed: ${assignment.allowedFileTypes}` });
            }
        }

        // Check for existing submission (upsert behavior)
        const existing = await prisma.submission.findUnique({
            where: { assignmentId_studentId: { assignmentId, studentId } }
        });

        // Upload to MinIO
        const fileKey = `submissions/${assignmentId}/${studentId}/${uuidv4()}_${req.file.originalname}`;

        try {
            await minioClient.putObject(BUCKET_NAME, fileKey, req.file.buffer, req.file.size, {
                "Content-Type": req.file.mimetype
            });
        } catch (minioErr) {
            console.error("MinIO upload error:", minioErr.message);
            return res.status(503).json({
                error: "File storage service unavailable. Please try again later or contact support.",
                details: minioErr.message
            });
        }

        let submission;
        if (existing) {
            // Update existing submission
            submission = await prisma.submission.update({
                where: { id: existing.id },
                data: {
                    filePath: fileKey,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    submittedAt: new Date(),
                    score: null,
                    feedback: null,
                    gradedAt: null,
                    gradedById: null
                }
            });
        } else {
            // Create new submission
            submission = await prisma.submission.create({
                data: {
                    assignmentId,
                    studentId,
                    filePath: fileKey,
                    fileName: req.file.originalname,
                    fileSize: req.file.size
                }
            });
        }

        res.status(201).json({ data: submission });
    })
);

// Get my submission for an assignment (student)
router.get(
    "/:id/my-submission",
    asyncHandler(async (req, res) => {
        const submission = await prisma.submission.findUnique({
            where: {
                assignmentId_studentId: {
                    assignmentId: req.params.id,
                    studentId: req.user.id
                }
            },
            include: { assignment: true }
        });
        res.json({ data: submission });
    })
);

// Download submission file
router.get(
    "/submissions/:submissionId/download",
    asyncHandler(async (req, res) => {
        const submission = await prisma.submission.findUnique({
            where: { id: req.params.submissionId }
        });
        if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
        }

        // Authorization: student can download own, instructor+ can download any
        const isOwner = submission.studentId === req.user.id;
        const isPrivileged = req.user.roles.some(role =>
            ["super_admin", "admin", "instructor", "assistant"].includes(role)
        );
        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ error: "Forbidden" });
        }

        try {
            const stream = await minioClient.getObject(BUCKET_NAME, submission.filePath);
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${submission.fileName}"`);
            stream.pipe(res);
        } catch (err) {
            console.error("MinIO download error:", err);
            res.status(500).json({ error: "Failed to download file" });
        }
    })
);

// Grade a submission (instructor+)
router.put(
    "/submissions/:submissionId/grade",
    rbac("super_admin", "admin", "instructor", "assistant"),
    validate(gradeSchema),
    asyncHandler(async (req, res) => {
        const { score, feedback } = req.validated.body;
        const submission = await prisma.submission.update({
            where: { id: req.params.submissionId },
            data: {
                score,
                feedback,
                gradedAt: new Date(),
                gradedById: req.user.id
            }
        });
        res.json({ data: submission });
    })
);

module.exports = router;

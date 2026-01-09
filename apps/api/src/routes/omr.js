const express = require("express");
const multer = require("multer");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");
const omrService = require("../services/omrService");

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/octet-stream"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
        }
    }
});

/**
 * POST /omr/detect
 * Quick detection endpoint - NO AUTH REQUIRED for mobile live scanning
 * Just checks if an OMR sheet is present in frame
 */
router.post(
    "/detect",
    upload.single("image"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        try {
            const result = await omrService.detectSheet(req.file.buffer);
            res.json({
                detected: result.detected,
                corners: result.corners,
                confidence: result.confidence,
                message: result.detected ? "Sheet detected" : "No sheet found"
            });
        } catch (error) {
            res.json({
                detected: false,
                corners: [],
                confidence: 0,
                message: error.message
            });
        }
    })
);

/**
 * POST /omr/process
 * Process OMR image - NO AUTH for mobile demo
 */
router.post(
    "/process",
    upload.single("image"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        // Optional manual corners (JSON string) from client alignment step
        let corners = null;
        let anchors = null;
        if (req.body?.corners) {
            try {
                corners = JSON.parse(req.body.corners);
            } catch (e) {
                console.warn("Invalid corners payload, ignoring");
            }
        }
        if (req.body?.anchors) {
            try {
                anchors = JSON.parse(req.body.anchors);
            } catch (e) {
                console.warn("Invalid anchors payload, ignoring");
            }
        }

        try {
            const result = await omrService.processImage(req.file.buffer, { corners, anchors });
            res.json({ data: result });
        } catch (error) {
            console.error('OMR process error:', error);
            res.status(500).json({ error: error.message || 'Processing failed' });
        }
    })
);

/**
 * POST /omr/preview
 * Perspective-correct preview + auto anchors (no answers) - NO AUTH for demo
 */
router.post(
    "/preview",
    upload.single("image"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        let corners = null;
        let anchors = null;
        if (req.body?.corners) {
            try {
                corners = JSON.parse(req.body.corners);
            } catch {
                // ignore invalid corners input
            }
        }
        if (req.body?.anchors) {
            try {
                anchors = JSON.parse(req.body.anchors);
            } catch {
                // ignore invalid anchors input
            }
        }

        const result = await omrService.processImage(req.file.buffer, { corners, anchors, previewOnly: true });
        res.json({ data: result });
    })
);

// All routes below require authentication
router.use(auth);

/**
 * POST /omr/process
 * Process a single OMR image and return detected answers
 */
// Duplicate process endpoint removed for demo
// See unauthenticated version above

/**
 * POST /omr/answer-key
 * Upload/update answer key for an exam
 */
router.post(
    "/answer-key",
    rbac("super_admin", "admin", "instructor"),
    asyncHandler(async (req, res) => {
        const { examId, answerKey } = req.body;

        if (!examId) {
            return res.status(400).json({ error: "examId is required" });
        }

        if (!answerKey || typeof answerKey !== "object") {
            return res.status(400).json({ error: "answerKey object is required" });
        }

        // Validate answer key format
        const validAnswers = ["A", "B", "C", "D", "E"];
        for (const [question, answer] of Object.entries(answerKey)) {
            const qNum = parseInt(question);
            if (isNaN(qNum) || qNum < 1) {
                return res.status(400).json({ error: `Invalid question number: ${question}` });
            }
            if (!validAnswers.includes(answer)) {
                return res.status(400).json({ error: `Invalid answer for question ${question}: ${answer}` });
            }
        }

        const exam = await prisma.exam.update({
            where: { id: examId },
            data: { answerKey }
        });

        res.json({
            success: true,
            message: `Answer key saved with ${Object.keys(answerKey).length} answers`,
            examId: exam.id
        });
    })
);

/**
 * GET /omr/answer-key/:examId
 * Get answer key for an exam
 */
router.get(
    "/answer-key/:examId",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const exam = await prisma.exam.findUnique({
            where: { id: req.params.examId },
            select: { id: true, title: true, answerKey: true }
        });

        if (!exam) {
            return res.status(404).json({ error: "Exam not found" });
        }

        res.json({
            data: {
                examId: exam.id,
                title: exam.title,
                answerKey: exam.answerKey || {},
                questionCount: exam.answerKey ? Object.keys(exam.answerKey).length : 0
            }
        });
    })
);

/**
 * POST /omr/batch
 * Process multiple OMR images (batch mode)
 */
router.post(
    "/batch",
    rbac("super_admin", "admin", "instructor", "assistant"),
    upload.array("images", 50),
    asyncHandler(async (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No image files provided" });
        }

        const { examId } = req.body;
        const results = [];

        let answerKey = null;
        if (examId) {
            const exam = await prisma.exam.findUnique({ where: { id: examId } });
            if (exam && exam.answerKey) {
                answerKey = exam.answerKey;
            }
        }

        for (const file of req.files) {
            try {
                const result = await omrService.processImage(file.buffer);
                result.filename = file.originalname;

                // Apply answer key if available
                if (answerKey) {
                    let correct = 0, wrong = 0, empty = 0;
                    result.answers = result.answers.map(ans => {
                        const correctAnswer = answerKey[String(ans.question)];
                        if (!ans.answer) {
                            empty++;
                            return { ...ans, status: "empty", correctAnswer };
                        } else if (ans.answer === correctAnswer) {
                            correct++;
                            return { ...ans, status: "correct", correctAnswer };
                        } else {
                            wrong++;
                            return { ...ans, status: "wrong", correctAnswer };
                        }
                    });
                    result.score = {
                        correct, wrong, empty,
                        total: Object.keys(answerKey).length,
                        percentage: Math.round((correct / Object.keys(answerKey).length) * 100)
                    };
                }

                results.push(result);
            } catch (error) {
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            data: {
                total: req.files.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            }
        });
    })
);

/**
 * POST /omr/validate
 * Validate and save OMR results (manual correction)
 */
router.post(
    "/validate",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const { examId, studentId, answers, studentNumber, bookletType } = req.body;

        if (!examId || !answers) {
            return res.status(400).json({ error: "examId and answers are required" });
        }

        // Find student
        let user = null;
        if (studentId) {
            user = await prisma.user.findUnique({ where: { id: studentId } });
        } else if (studentNumber) {
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { name: { contains: studentNumber } },
                        { email: { startsWith: studentNumber } }
                    ]
                }
            });
        }

        // Get exam with answer key
        const exam = await prisma.exam.findUnique({
            where: { id: examId }
        });

        if (!exam) {
            return res.status(404).json({ error: "Exam not found" });
        }

        // Calculate score if answer key exists
        let score = null;
        if (exam.answerKey) {
            const correct = answers.filter(a =>
                a.answer && exam.answerKey[String(a.question)] === a.answer
            ).length;
            const total = Object.keys(exam.answerKey).length;
            score = Math.round((correct / total) * 100);
        }

        // Create attempt if user found
        if (user) {
            let attempt = await prisma.attempt.findFirst({
                where: { examId, userId: user.id }
            });

            if (!attempt) {
                attempt = await prisma.attempt.create({
                    data: {
                        examId,
                        userId: user.id,
                        status: "omr_imported"
                    }
                });
            }

            // Create grade
            if (score !== null) {
                await prisma.grade.upsert({
                    where: { attemptId: attempt.id },
                    create: {
                        attemptId: attempt.id,
                        score,
                        feedback: `OMR Import: ${score}%`
                    },
                    update: {
                        score,
                        feedback: `OMR Import: ${score}%`
                    }
                });
            }

            return res.json({
                success: true,
                message: "Results validated and saved",
                attemptId: attempt.id,
                studentId: user.id,
                score
            });
        }

        res.json({
            success: true,
            message: "Validation recorded (student not linked)",
            studentNumber,
            bookletType,
            answerCount: answers.length,
            score
        });
    })
);

/**
 * GET /omr/templates
 * Get available form templates
 */
router.get(
    "/templates",
    asyncHandler(async (req, res) => {
        const templates = [
            {
                id: "standard_156",
                name: "Standart 156 Soruluk Form",
                description: "3 sütun x 52 soru, A-B-C-D-E seçenekleri",
                questions: 156,
                options: 5,
                columns: 3
            },
            {
                id: "standard_100",
                name: "Standart 100 Soruluk Form",
                description: "4 sütun x 25 soru, A-B-C-D-E seçenekleri",
                questions: 100,
                options: 5,
                columns: 4
            }
        ];
        res.json({ data: templates });
    })
);

/**
 * GET /omr/exams
 * Get exams that can be used for OMR grading
 */
router.get(
    "/exams",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const exams = await prisma.exam.findMany({
            include: {
                course: { select: { id: true, title: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const result = exams.map(exam => ({
            id: exam.id,
            title: exam.title,
            course: exam.course?.title || "Genel",
            hasAnswerKey: exam.answerKey && Object.keys(exam.answerKey).length > 0,
            questionCount: exam.answerKey ? Object.keys(exam.answerKey).length : 0,
            createdAt: exam.createdAt
        }));

        res.json({ data: result });
    })
);

module.exports = router;

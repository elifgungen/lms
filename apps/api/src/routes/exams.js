const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { buildSebConfig, CONFIG_VERSION } = require("../utils/sebConfig");
const { generateSebBrowserKey, validateSebRequest } = require("../middleware/seb");

const router = express.Router();

const examSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    durationMinutes: z.number().int().optional(),
    courseId: z.string().uuid().optional(),
    sebEnabled: z.boolean().optional(),
    sebQuitPassword: z.string().optional(),
    sebConfig: z.object({
      allowedUrls: z.array(z.string()).optional(),
      blockedUrls: z.array(z.string()).optional()
    }).optional()
  })
});

router.use(auth);

// List all exams
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const exams = await prisma.exam.findMany({
      include: { questionBanks: true }
    });
    res.json({ data: exams });
  })
);

// Create exam
router.post(
  "/",
  rbac("super_admin", "admin", "instructor"),
  validate(examSchema),
  asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, courseId, sebEnabled, sebQuitPassword, sebConfig } =
      req.validated.body;

    // Generate SEB browser key if SEB is enabled
    let sebBrowserKey = null;
    if (sebEnabled) {
      sebBrowserKey = generateSebBrowserKey(Date.now().toString());
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        durationMinutes,
        courseId,
        createdById: req.user.id,
        sebEnabled: sebEnabled || false,
        sebBrowserKey,
        sebQuitPassword,
        sebConfig
      }
    });
    res.status(201).json({ data: exam });
  })
);

// Get exam by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const includeQuestions = req.query.includeQuestions === 'true';

    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questionBanks: includeQuestions ? {
          include: { questions: true }
        } : true
      }
    });
    if (!exam) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: exam });
  })
);

// Get questions for an exam (via question banks)
router.get(
  "/:id/questions",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questionBanks: {
          include: {
            questions: true
          }
        }
      }
    });
    if (!exam) {
      return res.status(404).json({ error: "Not found" });
    }
    // Flatten questions from all question banks
    let questions = exam.questionBanks.flatMap(qb =>
      qb.questions.map(q => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        options: q.options,
        // Don't expose answer to students
        // answer: q.answer
      }))
    );

    // Random question selection from pool
    if (exam.randomQuestionCount && exam.randomQuestionCount > 0 && questions.length > exam.randomQuestionCount) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      questions = questions.slice(0, exam.randomQuestionCount);
    }

    res.json({ data: questions });
  })
);

// Update exam
router.put(
  "/:id",
  rbac("super_admin", "admin", "instructor"),
  validate(examSchema),
  asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, courseId, sebEnabled, sebQuitPassword, sebConfig } =
      req.validated.body;

    const existingExam = await prisma.exam.findUnique({ where: { id: req.params.id } });

    // Generate new SEB browser key if SEB is being enabled
    let sebBrowserKey = existingExam?.sebBrowserKey;
    if (sebEnabled && !sebBrowserKey) {
      sebBrowserKey = generateSebBrowserKey(req.params.id);
    } else if (!sebEnabled) {
      sebBrowserKey = null;
    }

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        durationMinutes,
        courseId,
        sebEnabled: sebEnabled || false,
        sebBrowserKey,
        sebQuitPassword,
        sebConfig
      }
    });
    res.json({ data: exam });
  })
);

// Delete exam
router.delete(
  "/:id",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// Update exam question banks
router.put(
  "/:id/question-banks",
  rbac("super_admin", "admin", "instructor"),
  asyncHandler(async (req, res) => {
    const { questionBankIds } = req.body;

    if (!Array.isArray(questionBankIds)) {
      return res.status(400).json({ error: "questionBankIds must be an array" });
    }

    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        questionBanks: {
          set: questionBankIds.map(id => ({ id }))
        }
      },
      include: {
        questionBanks: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ data: exam });
  })
);

// Download SEB config file
router.get(
  "/:id/seb-config",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (!exam.sebEnabled) {
      return res.status(400).json({ error: "SEB is not enabled for this exam" });
    }

    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
    const platform = (req.query.platform || "mac").toString().toLowerCase() === "win" ? "win" : "mac";
    // Direct to dedicated SEB exam page - bypasses dashboard, locks to exam only
    const startUrl = `${webBaseUrl}/seb-exam/${exam.id}`;

    const sebConfig = buildSebConfig({
      startUrl,
      platform,
      // Pass additional config for lockdown
      examId: exam.id,
      browserKey: exam.sebBrowserKey
    });

    // Set headers for file download
    res.setHeader("Content-Type", "application/seb");
    res.setHeader("Content-Disposition", `attachment; filename="exam_${exam.id}_${platform}.seb"`);
    res.send(sebConfig);
  })
);

// Diagnostics endpoint
router.get(
  "/:id/seb-config-info",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const webBaseUrl = process.env.WEB_BASE_URL || "http://localhost:3000";
    const startUrl = `${webBaseUrl}/login?redirect=${encodeURIComponent(`/student/exams/${exam.id}`)}`;

    res.json({
      examId: exam.id,
      sebEnabled: !!exam.sebEnabled,
      startUrlPreview: startUrl,
      platformDefault: "mac",
      configVersion: CONFIG_VERSION
    });
  })
);

// Start exam attempt (with SEB validation and access control)
router.post(
  "/:id/start",
  rbac("super_admin", "admin", "instructor", "assistant", "student"),
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Access Control - check startAt and endAt
    const now = new Date();
    if (exam.startAt && now < new Date(exam.startAt)) {
      return res.status(403).json({
        error: "EXAM_NOT_STARTED",
        message: `Bu sınav henüz başlamadı. Başlangıç: ${new Date(exam.startAt).toLocaleString("tr-TR")}`
      });
    }
    if (exam.endAt && now > new Date(exam.endAt)) {
      return res.status(403).json({
        error: "EXAM_ENDED",
        message: `Bu sınavın süresi doldu. Bitiş: ${new Date(exam.endAt).toLocaleString("tr-TR")}`
      });
    }

    // SEB validation - for academic demo, just check User-Agent
    if (exam.sebEnabled) {
      const sebValidation = validateSebRequest(req, exam);
      if (!sebValidation.ok) {
        console.log(
          `SEB validation failed for exam ${exam.id}: code=${sebValidation.code || "unknown"} ua=${req.headers["user-agent"]
          } hash=${sebValidation.requestHash || "none"}`
        );
        return res.status(403).json({
          error: "SEB_REQUIRED",
          message: "Bu sınav SEB gerektirir. .seb config dosyasını indirip SEB içinde açarak başlatın."
        });
      }

      if (sebValidation.devBypass) {
        console.log(`SEB dev bypass enabled for exam ${exam.id}`);
      }
    }

    // Check for existing attempt - students can only take exam once
    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        examId: req.params.id,
        userId: req.user.id
      }
    });

    if (existingAttempt) {
      // If attempt is in progress, return it
      if (existingAttempt.status === 'in_progress') {
        return res.status(200).json({
          data: existingAttempt,
          message: "Devam eden sınavınız var"
        });
      }
      // If already submitted, reject
      if (existingAttempt.status === 'submitted') {
        return res.status(403).json({
          error: "ATTEMPT_EXISTS",
          message: "Bu sınava zaten giriş yaptınız. Her sınava yalnızca bir kez girilebilir."
        });
      }
    }

    const attempt = await prisma.attempt.create({
      data: {
        examId: req.params.id,
        userId: req.user.id,
        status: "in_progress"
      }
    });

    res.status(201).json({ data: attempt });
  })
);

// Get all attempts for an exam (instructor/admin view)
router.get(
  "/:id/attempts",
  rbac("super_admin", "admin", "instructor", "assistant"),
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id }
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const attempts = await prisma.attempt.findMany({
      where: { examId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        answers: {
          include: {
            question: {
              select: { id: true, prompt: true, answer: true, points: true }
            }
          }
        },
        grade: true,
        proctoringSession: {
          include: { events: true }
        }
      },
      orderBy: { startedAt: "desc" }
    });

    res.json({ data: attempts });
  })
);

module.exports = router;

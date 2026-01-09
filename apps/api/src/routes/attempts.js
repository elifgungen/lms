const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const answerSchema = z.object({
  body: z.object({
    questionId: z.string().uuid().optional(),
    answer: z.record(z.any()).optional()
  })
});

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isPrivileged = req.user.roles.some((role) =>
      ["super_admin", "admin", "instructor", "assistant"].includes(role)
    );
    const attempts = await prisma.attempt.findMany({
      where: isPrivileged ? {} : { userId: req.user.id },
      include: {
        exam: true,
        user: true,
        grade: true,
        proctoringSession: {
          include: { events: true }
        }
      }
    });
    res.json({ data: attempts });
  })
);

router.post(
  "/:id/answer",
  validate(answerSchema),
  asyncHandler(async (req, res) => {
    const attempt = await prisma.attempt.findUnique({
      where: { id: req.params.id }
    });
    if (!attempt) {
      return res.status(404).json({ error: "Not found" });
    }
    if (attempt.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { questionId, answer } = req.validated.body;
    const record = await prisma.answer.create({
      data: {
        attemptId: attempt.id,
        questionId,
        answer
      }
    });
    res.status(201).json({ data: record });
  })
);

router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const attempt = await prisma.attempt.findUnique({
      where: { id: req.params.id }
    });
    if (!attempt) {
      return res.status(404).json({ error: "Not found" });
    }
    if (attempt.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const updated = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: "submitted",
        submittedAt: new Date()
      }
    });
    res.json({ data: updated });
  })
);

router.get(
  "/:id/report",
  asyncHandler(async (req, res) => {
    const attempt = await prisma.attempt.findUnique({
      where: { id: req.params.id },
      include: {
        answers: true,
        grade: true,
        user: true,
        proctoringSession: { include: { events: true } }
      }
    });
    if (!attempt) {
      return res.status(404).json({ error: "Not found" });
    }
    const canManage =
      attempt.userId === req.user.id ||
      req.user.roles.some((role) =>
        ["super_admin", "admin", "instructor", "assistant"].includes(role)
      );
    if (!canManage) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ data: attempt });
  })
);

module.exports = router;

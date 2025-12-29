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
      include: { answers: true, grade: true }
    });
    if (!attempt) {
      return res.status(404).json({ error: "Not found" });
    }
    if (attempt.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ data: attempt });
  })
);

module.exports = router;

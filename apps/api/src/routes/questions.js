const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const questionSchema = z.object({
  body: z.object({
    prompt: z.string().min(2),
    type: z.string().min(2),
    options: z.record(z.any()).optional(),
    answer: z.record(z.any()).optional(),
    questionBankId: z.string().uuid().optional()
  })
});

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const questions = await prisma.question.findMany();
    res.json({ data: questions });
  })
);

router.post(
  "/",
  rbac("super_admin", "admin", "instructor"),
  validate(questionSchema),
  asyncHandler(async (req, res) => {
    const { prompt, type, options, answer, questionBankId } =
      req.validated.body;
    const question = await prisma.question.create({
      data: { prompt, type, options, answer, questionBankId }
    });
    res.status(201).json({ data: question });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id }
    });
    if (!question) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: question });
  })
);

router.put(
  "/:id",
  rbac("super_admin", "admin", "instructor"),
  validate(questionSchema),
  asyncHandler(async (req, res) => {
    const { prompt, type, options, answer, questionBankId } =
      req.validated.body;
    const question = await prisma.question.update({
      where: { id: req.params.id },
      data: { prompt, type, options, answer, questionBankId }
    });
    res.json({ data: question });
  })
);

router.delete(
  "/:id",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;

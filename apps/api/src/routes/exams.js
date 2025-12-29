const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const examSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    durationMinutes: z.number().int().optional(),
    courseId: z.string().uuid().optional()
  })
});

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const exams = await prisma.exam.findMany();
    res.json({ data: exams });
  })
);

router.post(
  "/",
  rbac("super_admin", "admin", "instructor"),
  validate(examSchema),
  asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, courseId } =
      req.validated.body;
    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        durationMinutes,
        courseId,
        createdById: req.user.id
      }
    });
    res.status(201).json({ data: exam });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: exam });
  })
);

router.put(
  "/:id",
  rbac("super_admin", "admin", "instructor"),
  validate(examSchema),
  asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, courseId } =
      req.validated.body;
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { title, description, durationMinutes, courseId }
    });
    res.json({ data: exam });
  })
);

router.delete(
  "/:id",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.post(
  "/:id/start",
  rbac("super_admin", "admin", "instructor", "assistant", "student"),
  asyncHandler(async (req, res) => {
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

module.exports = router;

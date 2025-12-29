const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const questionBankSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    courseId: z.string().uuid().optional()
  })
});

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const banks = await prisma.questionBank.findMany();
    res.json({ data: banks });
  })
);

router.post(
  "/",
  rbac("super_admin", "admin", "instructor"),
  validate(questionBankSchema),
  asyncHandler(async (req, res) => {
    const { name, courseId } = req.validated.body;
    const bank = await prisma.questionBank.create({
      data: { name, courseId, createdById: req.user.id }
    });
    res.status(201).json({ data: bank });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bank = await prisma.questionBank.findUnique({
      where: { id: req.params.id }
    });
    if (!bank) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: bank });
  })
);

router.put(
  "/:id",
  rbac("super_admin", "admin", "instructor"),
  validate(questionBankSchema),
  asyncHandler(async (req, res) => {
    const { name, courseId } = req.validated.body;
    const bank = await prisma.questionBank.update({
      where: { id: req.params.id },
      data: { name, courseId }
    });
    res.json({ data: bank });
  })
);

router.delete(
  "/:id",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.questionBank.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;

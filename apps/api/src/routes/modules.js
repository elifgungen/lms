const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const contentSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    type: z.string().optional(),
    body: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })
});

router.use(auth);

router.get(
  "/:id/contents",
  asyncHandler(async (req, res) => {
    const contents = await prisma.content.findMany({
      where: { moduleId: req.params.id }
    });
    res.json({ data: contents });
  })
);

router.post(
  "/:id/contents",
  rbac("super_admin", "admin", "instructor"),
  validate(contentSchema),
  asyncHandler(async (req, res) => {
    const { title, type, body, metadata } = req.validated.body;
    const content = await prisma.content.create({
      data: { title, type, body, metadata, moduleId: req.params.id }
    });
    res.status(201).json({ data: content });
  })
);

router.get(
  "/:id/contents/:contentId",
  asyncHandler(async (req, res) => {
    const content = await prisma.content.findFirst({
      where: { id: req.params.contentId, moduleId: req.params.id }
    });
    if (!content) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: content });
  })
);

router.put(
  "/:id/contents/:contentId",
  rbac("super_admin", "admin", "instructor"),
  validate(contentSchema),
  asyncHandler(async (req, res) => {
    const { title, type, body, metadata } = req.validated.body;
    const content = await prisma.content.update({
      where: { id: req.params.contentId },
      data: { title, type, body, metadata }
    });
    res.json({ data: content });
  })
);

router.delete(
  "/:id/contents/:contentId",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.content.delete({ where: { id: req.params.contentId } });
    res.json({ ok: true });
  })
);

module.exports = router;

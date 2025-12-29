const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const courseSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional()
  })
});

const moduleSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    order: z.number().int().optional()
  })
});

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const courses = await prisma.course.findMany();
    res.json({ data: courses });
  })
);

router.post(
  "/",
  rbac("super_admin", "admin", "instructor"),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const { title, description } = req.validated.body;
    const course = await prisma.course.create({
      data: { title, description, createdById: req.user.id }
    });
    res.status(201).json({ data: course });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });
    if (!course) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: course });
  })
);

router.put(
  "/:id",
  rbac("super_admin", "admin", "instructor"),
  validate(courseSchema),
  asyncHandler(async (req, res) => {
    const { title, description } = req.validated.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { title, description }
    });
    res.json({ data: course });
  })
);

router.delete(
  "/:id",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.get(
  "/:id/modules",
  asyncHandler(async (req, res) => {
    const modules = await prisma.module.findMany({
      where: { courseId: req.params.id }
    });
    res.json({ data: modules });
  })
);

router.post(
  "/:id/modules",
  rbac("super_admin", "admin", "instructor"),
  validate(moduleSchema),
  asyncHandler(async (req, res) => {
    const { title, order } = req.validated.body;
    const module = await prisma.module.create({
      data: { title, order, courseId: req.params.id }
    });
    res.status(201).json({ data: module });
  })
);

router.get(
  "/:id/modules/:moduleId",
  asyncHandler(async (req, res) => {
    const module = await prisma.module.findFirst({
      where: { id: req.params.moduleId, courseId: req.params.id }
    });
    if (!module) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: module });
  })
);

router.put(
  "/:id/modules/:moduleId",
  rbac("super_admin", "admin", "instructor"),
  validate(moduleSchema),
  asyncHandler(async (req, res) => {
    const { title, order } = req.validated.body;
    const module = await prisma.module.update({
      where: { id: req.params.moduleId },
      data: { title, order }
    });
    res.json({ data: module });
  })
);

router.delete(
  "/:id/modules/:moduleId",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    await prisma.module.delete({ where: { id: req.params.moduleId } });
    res.json({ ok: true });
  })
);

module.exports = router;

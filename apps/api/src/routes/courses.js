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

const courseInclude = {
  createdBy: { select: { name: true, email: true } },
  modules: {
    include: { contents: true },
    orderBy: { order: "asc" }
  }
};

const mapCourse = (course) => {
  const contents = (course.modules || []).flatMap(m => m.contents || []);
  const firstVideo = contents.find((c) => c.type === "video" && c.metadata?.url);
  const firstPdf = contents.find((c) => c.type === "pdf" && c.metadata?.url);

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    createdById: course.createdById,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    instructor: course.createdBy?.name || course.createdBy?.email || "Eğitmen",
    instructorId: course.createdById,
    videoUrl: firstVideo?.metadata?.url || null,
    pdfUrl: firstPdf?.metadata?.url || null,
    progress: typeof course.progress === "number" ? course.progress : 0.35,
    downloadable: true
  };
};

// Public endpoint for registration/course selection
router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const courses = await prisma.course.findMany({
      select: { id: true, title: true, description: true }
    });
    res.json({ data: courses });
  })
);

router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const courses = await prisma.course.findMany({ include: courseInclude });
    res.json({ data: courses.map(mapCourse) });
  })
);

// Get courses current user is enrolled in
router.get(
  "/my",
  asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user.id },
      include: { course: { include: courseInclude } }
    });
    const courses = enrollments
      .map(e => e.course)
      .filter(Boolean)
      .map(mapCourse);
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
      where: { id: req.params.id },
      include: courseInclude
    });
    if (!course) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ data: mapCourse(course) });
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
      where: { courseId: req.params.id },
      include: { contents: true },
      orderBy: { order: 'asc' }
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

// Clone a course (copy with all modules and contents)
router.post(
  "/:id/clone",
  rbac("super_admin", "admin", "instructor"),
  asyncHandler(async (req, res) => {
    const sourceId = req.params.id;
    const source = await prisma.course.findUnique({
      where: { id: sourceId },
      include: {
        modules: {
          include: { contents: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!source) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Create new course
    const newCourse = await prisma.course.create({
      data: {
        title: `${source.title} (Kopya)`,
        description: source.description,
        createdById: req.user.id
      }
    });

    // Clone modules and contents
    for (const mod of source.modules) {
      const newModule = await prisma.module.create({
        data: {
          courseId: newCourse.id,
          title: mod.title,
          order: mod.order
        }
      });

      for (const content of mod.contents) {
        await prisma.content.create({
          data: {
            moduleId: newModule.id,
            title: content.title,
            type: content.type,
            body: content.body,
            metadata: content.metadata
          }
        });
      }
    }

    res.status(201).json({ data: newCourse });
  })
);

// Get/Update course prerequisites
router.get(
  "/:id/prerequisites",
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { prerequisites: { select: { id: true, title: true } } }
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json({ data: course.prerequisites });
  })
);

router.put(
  "/:id/prerequisites",
  rbac("super_admin", "admin", "instructor"),
  asyncHandler(async (req, res) => {
    const { prerequisiteIds } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        prerequisites: {
          set: (prerequisiteIds || []).map(id => ({ id }))
        }
      },
      include: { prerequisites: { select: { id: true, title: true } } }
    });
    res.json({ data: course.prerequisites });
  })
);

// Assign instructor to course (admin only)
router.patch(
  "/:id/instructor",
  rbac("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { instructorId } = req.body;

    if (!instructorId) {
      return res.status(400).json({ error: "instructorId is required" });
    }

    // Verify instructor exists and has instructor role
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
      include: { roles: { include: { role: true } } }
    });

    if (!instructor) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    const hasInstructorRole = instructor.roles.some(r =>
      ["instructor", "assistant", "admin", "super_admin"].includes(r.role.name)
    );

    if (!hasInstructorRole) {
      return res.status(400).json({ error: "User is not an instructor" });
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { createdById: instructorId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ data: course });
  })
);

// Get course enrollments (students)
router.get(
  "/:id/enrollments",
  rbac("super_admin", "admin", "instructor", "assistant"),
  asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
    res.json({ data: enrollments });
  })
);

// Enroll current user to a course
router.post(
  "/:id/enroll",
  rbac("super_admin", "admin", "instructor", "assistant", "student"),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId: req.params.id
        }
      },
      include: { course: true }
    });

    if (existing) {
      return res.json({ data: existing });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.user.id,
        courseId: req.params.id,
        role: "student",
        status: "active"
      },
      include: { course: true }
    });

    res.status(201).json({ data: enrollment });
  })
);

module.exports = router;

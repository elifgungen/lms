const express = require("express");
const prisma = require("../db");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(auth);

// GET /users - Admin only: list all users with their roles
router.get(
    "/",
    rbac("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        const { role, search } = req.query;

        // Build where clause
        let where = {};

        // Filter by role if specified
        if (role) {
            where.roles = {
                some: {
                    role: {
                        name: role
                    }
                }
            };
        }

        // Search by name or email if specified
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform to simpler format
        const data = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status || "active",
            roles: user.roles.map(r => r.role.name),
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
        }));

        res.json({ data });
    })
);

// GET /users/students - Instructor: list students enrolled in their courses
router.get(
    "/students",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const instructorId = req.user.id;
        const isAdmin = req.user.roles.some(r => ["super_admin", "admin"].includes(r));

        let courseFilter = {};

        // If not admin, only show students from courses created by this instructor
        if (!isAdmin) {
            courseFilter = { createdById: instructorId };
        }

        // Get all enrollments with student and course info
        const enrollments = await prisma.enrollment.findMany({
            where: {
                course: courseFilter,
                role: "student"
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        // Group by student
        const studentMap = new Map();

        for (const enrollment of enrollments) {
            const studentId = enrollment.user.id;
            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    id: enrollment.user.id,
                    name: enrollment.user.name,
                    email: enrollment.user.email,
                    status: enrollment.user.status || "active",
                    courses: [],
                    enrollmentCount: 0
                });
            }
            const student = studentMap.get(studentId);
            student.courses.push({
                id: enrollment.course.id,
                title: enrollment.course.title
            });
            student.enrollmentCount++;
        }

        // Get pending exams and assignments count for each student
        const students = Array.from(studentMap.values());

        for (const student of students) {
            const courseIds = student.courses.map(c => c.id);

            // Count exams for courses the student is enrolled in
            const examCount = await prisma.exam.count({
                where: {
                    courseId: { in: courseIds }
                }
            });

            // Count assignments for courses the student is enrolled in
            const assignmentCount = await prisma.assignment.count({
                where: {
                    courseId: { in: courseIds }
                }
            });

            // Count completed attempts by this student
            const attemptCount = await prisma.attempt.count({
                where: {
                    userId: student.id,
                    exam: { courseId: { in: courseIds } },
                    status: "submitted"
                }
            });

            // Count submitted assignments by this student
            const submissionCount = await prisma.submission.count({
                where: {
                    studentId: student.id,
                    assignment: { courseId: { in: courseIds } }
                }
            });

            student.pendingExams = Math.max(0, examCount - attemptCount);
            student.pendingAssignments = Math.max(0, assignmentCount - submissionCount);
        }

        res.json({ data: students });
    })
);

// GET /users/:id/results - Exam/assignment results for a student (instructor/admin)
router.get(
    "/:id/results",
    rbac("super_admin", "admin", "instructor", "assistant"),
    asyncHandler(async (req, res) => {
        const studentId = req.params.id;
        const isAdmin = req.user.roles.some(r => ["super_admin", "admin"].includes(r));

        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, name: true, email: true, status: true }
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const courseFilter = isAdmin ? {} : { createdById: req.user.id };
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId: studentId,
                course: courseFilter
            },
            include: {
                course: { select: { id: true, title: true } }
            }
        });

        if (!isAdmin && enrollments.length === 0) {
            return res.status(403).json({ error: "Not authorized to view this student" });
        }

        const courseIds = enrollments.map(e => e.courseId);
        const courseTitleMap = new Map(enrollments.map(e => [e.courseId, e.course?.title]));

        const attempts = await prisma.attempt.findMany({
            where: {
                userId: studentId,
                ...(courseIds.length > 0 ? { exam: { courseId: { in: courseIds } } } : {})
            },
            include: {
                exam: { select: { id: true, title: true, courseId: true } },
                grade: true
            },
            orderBy: { startedAt: "desc" }
        });

        const submissions = await prisma.submission.findMany({
            where: {
                studentId,
                ...(courseIds.length > 0 ? { assignment: { courseId: { in: courseIds } } } : {})
            },
            include: {
                assignment: { select: { id: true, title: true, courseId: true } }
            },
            orderBy: { submittedAt: "desc" }
        });

        const response = {
            student,
            courses: enrollments.map(e => ({
                id: e.course.id,
                title: e.course.title
            })),
            attempts: attempts.map(a => ({
                ...a,
                courseTitle: a.exam?.courseId ? courseTitleMap.get(a.exam.courseId) || null : null
            })),
            submissions: submissions.map(s => ({
                ...s,
                courseTitle: s.assignment?.courseId ? courseTitleMap.get(s.assignment.courseId) || null : null
            }))
        };

        res.json({ data: response });
    })
);

// GET /users/instructors - Admin: list all instructors
router.get(
    "/instructors",
    rbac("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        const users = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: { in: ["instructor", "assistant"] }
                        }
                    }
                }
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                },
                coursesCreated: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const data = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status || "active",
            roles: user.roles.map(r => r.role.name),
            coursesCount: user.coursesCreated.length,
            courses: user.coursesCreated
        }));

        res.json({ data });
    })
);

// GET /users/:id - Get single user details (admin only)
router.get(
    "/:id",
    rbac("super_admin", "admin"),
    asyncHandler(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                },
                enrollments: {
                    include: {
                        course: { select: { id: true, title: true } }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status || "active",
                roles: user.roles.map(r => r.role.name),
                emailVerified: user.emailVerified,
                enrollments: user.enrollments.map(e => ({
                    courseId: e.course.id,
                    courseTitle: e.course.title,
                    role: e.role,
                    status: e.status
                })),
                createdAt: user.createdAt
            }
        });
    })
);

module.exports = router;

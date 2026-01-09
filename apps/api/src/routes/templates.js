/**
 * Course Templates API Routes
 * Ders şablon yönetimi endpoint'leri
 */

const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { prisma } = require('../db');
const templateService = require('../services/courseTemplates');

/**
 * GET /templates
 * List all available course templates
 */
router.get('/', (req, res) => {
    const locale = req.query.locale || 'tr';
    const templates = templateService.getTemplates(locale);
    res.json({ data: templates });
});

/**
 * GET /templates/:id
 * Get a specific template with full structure
 */
router.get('/:id', (req, res) => {
    const locale = req.query.locale || 'tr';
    const template = templateService.getTemplate(req.params.id, locale);

    if (!template) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Template not found' });
    }

    res.json({ data: template });
});

/**
 * POST /templates/apply
 * Apply a template to an existing course
 * @body {string} courseId - Course to apply template to
 * @body {string} templateId - Template to apply
 */
router.post('/apply', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { courseId, templateId } = req.body;
        const locale = req.query.locale || 'tr';

        if (!courseId || !templateId) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'courseId and templateId are required'
            });
        }

        // Verify course exists
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Course not found' });
        }

        const modules = await templateService.applyTemplate(prisma, courseId, templateId, locale);

        res.status(201).json({
            data: {
                courseId,
                templateId,
                modulesCreated: modules.length
            },
            message: `Template "${templateId}" applied successfully`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /templates/create-from-template
 * Create a new course from a template
 * @body {string} title - Course title
 * @body {string} description - Course description
 * @body {string} templateId - Template to use
 */
router.post('/create-from-template', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { title, description, templateId } = req.body;
        const locale = req.query.locale || 'tr';

        if (!title || !templateId) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'title and templateId are required'
            });
        }

        // Create the course
        const course = await prisma.course.create({
            data: {
                title,
                description: description || '',
                createdById: req.user.id
            }
        });

        // Apply template
        const modules = await templateService.applyTemplate(prisma, course.id, templateId, locale);

        res.status(201).json({
            data: {
                ...course,
                modulesCreated: modules.length
            },
            message: `Course created from template "${templateId}"`
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

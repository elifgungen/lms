/**
 * Plagiarism Detection API Routes
 * Metin benzerlik kontrolü endpoint'leri
 */

const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { prisma } = require('../db');
const plagiarismService = require('../services/plagiarism');

/**
 * POST /plagiarism/check
 * Check a submission text against sources
 * @body {string} text - Text to check
 * @body {string} assignmentId - Assignment ID (optional, to compare with other submissions)
 */
router.post('/check', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { text, assignmentId } = req.body;

        if (!text || text.trim().length < 50) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'Text must be at least 50 characters'
            });
        }

        let sources = [];

        // If assignmentId provided, get other submissions for comparison
        if (assignmentId) {
            const submissions = await prisma.submission.findMany({
                where: {
                    assignmentId,
                    // Only get submissions that have been processed
                },
                select: {
                    id: true,
                    fileName: true,
                    student: { select: { name: true, email: true } },
                }
            });

            // Note: In production, you'd fetch the actual file content from MinIO
            // For demo, we'll use placeholder text
            sources = submissions.map(s => ({
                id: s.id,
                title: `${s.student.name} - ${s.fileName}`,
                text: '' // Would be populated from file content
            }));
        }

        const result = plagiarismService.checkPlagiarism(text, sources);

        res.json({
            data: result,
            message: `Plagiarism check completed. Status: ${result.status}`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /plagiarism/compare
 * Compare two texts directly
 * @body {string} text1 - First text
 * @body {string} text2 - Second text
 */
router.post('/compare', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { text1, text2 } = req.body;

        if (!text1 || !text2) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'Both text1 and text2 are required'
            });
        }

        const result = plagiarismService.compareSubmissions(
            { id: 'text1', text: text1 },
            { id: 'text2', text: text2 }
        );

        res.json({
            data: result,
            message: `Similarity: ${result.overallScore}%`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /plagiarism/batch
 * Batch compare all submissions in an assignment
 * @body {string} assignmentId - Assignment ID
 */
router.post('/batch', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { assignmentId } = req.body;

        if (!assignmentId) {
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'assignmentId is required'
            });
        }

        // Get all submissions for the assignment
        const submissions = await prisma.submission.findMany({
            where: { assignmentId },
            select: {
                id: true,
                fileName: true,
                studentId: true,
                student: { select: { name: true } },
            }
        });

        if (submissions.length < 2) {
            return res.json({
                data: {
                    totalComparisons: 0,
                    flaggedPairs: 0,
                    comparisons: [],
                    message: 'Not enough submissions to compare'
                }
            });
        }

        // In production, fetch actual content from MinIO
        // For demo, using empty texts
        const submissionTexts = submissions.map(s => ({
            id: s.id,
            studentName: s.student.name,
            text: '' // Would be populated from file content
        }));

        const result = plagiarismService.batchCompareSubmissions(submissionTexts);

        res.json({
            data: result,
            message: `Checked ${result.totalComparisons} pairs, ${result.flaggedPairs} flagged`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /plagiarism/report/:submissionId
 * Get plagiarism report for a specific submission
 */
router.get('/report/:submissionId', auth, rbac('instructor', 'admin'), async (req, res, next) => {
    try {
        const { submissionId } = req.params;

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                assignment: true,
                student: { select: { name: true, email: true } }
            }
        });

        if (!submission) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
        }

        // Return mock report structure (would be stored/calculated in production)
        res.json({
            data: {
                submissionId: submission.id,
                studentName: submission.student.name,
                assignmentTitle: submission.assignment.title,
                checkedAt: new Date().toISOString(),
                overallScore: 0, // Would be calculated
                status: 'LOW_SIMILARITY',
                matches: []
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

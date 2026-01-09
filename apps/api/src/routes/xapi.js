/**
 * xAPI (Experience API) Routes
 * Öğrenme kaydı endpoint'leri
 */

const express = require('express');
const router = express.Router();
const xapiService = require('../services/xapi');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

/**
 * GET /xapi/status
 * xAPI entegrasyon durumu
 */
router.get('/status', auth, rbac(['admin', 'super_admin']), (req, res) => {
    const status = xapiService.getStatus();
    res.json({ success: true, data: status });
});

/**
 * POST /xapi/statement
 * Manuel statement gönder (admin için)
 */
router.post('/statement', auth, rbac(['admin', 'super_admin']), async (req, res) => {
    try {
        const { statement } = req.body;

        if (!statement) {
            return res.status(400).json({ success: false, error: 'Statement gerekli' });
        }

        const result = await xapiService.sendStatement(statement);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/course/start
 * Ders başlatıldı kaydı
 */
router.post('/course/start', auth, async (req, res) => {
    try {
        const { courseId, courseTitle, courseDescription } = req.body;

        const result = await xapiService.courseStarted(req.user, {
            id: courseId,
            title: courseTitle,
            description: courseDescription
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/course/complete
 * Ders tamamlandı kaydı
 */
router.post('/course/complete', auth, async (req, res) => {
    try {
        const { courseId, courseTitle, score } = req.body;

        const result = await xapiService.courseCompleted(req.user, {
            id: courseId,
            title: courseTitle
        }, score);

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/video/watch
 * Video izleme kaydı
 */
router.post('/video/watch', auth, async (req, res) => {
    try {
        const { videoId, videoTitle, progress, duration } = req.body;

        const result = await xapiService.videoWatched(req.user, {
            id: videoId,
            title: videoTitle
        }, progress, duration);

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/exam/start
 * Sınav başlatıldı kaydı
 */
router.post('/exam/start', auth, async (req, res) => {
    try {
        const { examId, examTitle } = req.body;

        const result = await xapiService.examStarted(req.user, {
            id: examId,
            title: examTitle
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/exam/complete
 * Sınav tamamlandı kaydı
 */
router.post('/exam/complete', auth, async (req, res) => {
    try {
        const { examId, examTitle, score, passed, duration } = req.body;

        const result = await xapiService.examCompleted(req.user, {
            id: examId,
            title: examTitle
        }, score, passed, duration);

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/assignment/submit
 * Ödev teslimi kaydı
 */
router.post('/assignment/submit', auth, async (req, res) => {
    try {
        const { assignmentId, assignmentTitle } = req.body;

        const result = await xapiService.assignmentSubmitted(req.user, {
            id: assignmentId,
            title: assignmentTitle
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /xapi/content/view
 * İçerik görüntüleme kaydı
 */
router.post('/content/view', auth, async (req, res) => {
    try {
        const { contentId, contentTitle, contentType } = req.body;

        const result = await xapiService.contentViewed(req.user, {
            id: contentId,
            title: contentTitle,
            type: contentType
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

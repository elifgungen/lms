/**
 * Mattermost Integration API Routes
 */

const express = require('express');
const router = express.Router();
const mattermostService = require('../services/mattermost');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

/**
 * GET /mattermost/status
 * Entegrasyon durumunu kontrol et
 */
router.get('/status', auth, rbac(['admin', 'super_admin']), (req, res) => {
    const status = mattermostService.getStatus();
    res.json({ success: true, data: status });
});

/**
 * POST /mattermost/test
 * Test mesajı gönder
 */
router.post('/test', auth, rbac(['admin', 'super_admin']), async (req, res) => {
    try {
        const { channel, message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Mesaj gerekli' });
        }

        const result = await mattermostService.sendWebhookMessage({
            channel: channel || 'general',
            text: message
        });

        if (result.success) {
            res.json({ success: true, message: 'Test mesajı gönderildi' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mattermost/announce
 * Ders duyurusu gönder
 */
router.post('/announce', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { courseName, title, content, channel } = req.body;

        if (!courseName || !title || !content) {
            return res.status(400).json({ success: false, error: 'courseName, title ve content gerekli' });
        }

        const result = await mattermostService.notifyCourseAnnouncement({
            courseName,
            title,
            content,
            instructorName: req.user.name || req.user.email,
            channel
        });

        if (result.success) {
            res.json({ success: true, message: 'Duyuru gönderildi' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mattermost/notify/assignment
 * Yeni ödev bildirimi
 */
router.post('/notify/assignment', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { courseName, assignmentTitle, dueDate, channel } = req.body;

        if (!courseName || !assignmentTitle || !dueDate) {
            return res.status(400).json({ success: false, error: 'Eksik alanlar' });
        }

        const result = await mattermostService.notifyNewAssignment({
            courseName,
            assignmentTitle,
            dueDate,
            channel
        });

        res.json({ success: result.success, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mattermost/notify/exam
 * Sınav hatırlatması
 */
router.post('/notify/exam', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { courseName, examTitle, startTime, channel } = req.body;

        if (!courseName || !examTitle || !startTime) {
            return res.status(400).json({ success: false, error: 'Eksik alanlar' });
        }

        const result = await mattermostService.notifyExamReminder({
            courseName,
            examTitle,
            startTime,
            channel
        });

        res.json({ success: result.success, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mattermost/notify/grade
 * Not bildirimi
 */
router.post('/notify/grade', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { courseName, itemTitle, channel } = req.body;

        if (!courseName || !itemTitle) {
            return res.status(400).json({ success: false, error: 'Eksik alanlar' });
        }

        const result = await mattermostService.notifyGradePublished({
            courseName,
            itemTitle,
            channel
        });

        res.json({ success: result.success, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /mattermost/notify/live
 * Canlı ders bildirimi
 */
router.post('/notify/live', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { courseName, meetingUrl, channel } = req.body;

        if (!courseName || !meetingUrl) {
            return res.status(400).json({ success: false, error: 'Eksik alanlar' });
        }

        const result = await mattermostService.notifyLiveClassStarted({
            courseName,
            meetingUrl,
            instructorName: req.user.name || req.user.email,
            channel
        });

        res.json({ success: result.success, error: result.error });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

/**
 * Storage API Routes
 * MinIO dosya yönetim endpoint'leri
 */

const express = require('express');
const router = express.Router();
const storageService = require('../services/storage');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /storage/health
 * MinIO durumu
 */
router.get('/health', auth, rbac(['admin', 'super_admin']), async (req, res) => {
    const health = await storageService.getHealth();
    res.json(health);
});

/**
 * GET /storage/buckets
 * Bucket listesi ve içerikleri
 */
router.get('/buckets', auth, rbac(['admin', 'super_admin']), async (req, res) => {
    try {
        const health = await storageService.getHealth();
        if (health.status === 'down') {
            return res.status(503).json({ error: 'MinIO servisi çalışmıyor' });
        }

        const bucketsWithFiles = await Promise.all(
            health.buckets.map(async (bucket) => {
                const files = await storageService.listFiles(bucket);
                return {
                    name: bucket,
                    fileCount: files.length,
                    files: files.slice(0, 50) // İlk 50 dosya
                };
            })
        );

        res.json({ success: true, buckets: bucketsWithFiles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /storage/upload
 * Test amaçlı dosya yükleme
 */
router.post('/upload', auth, rbac(['admin', 'super_admin']), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya gerekli' });
        }

        const bucket = req.body.bucket || 'lms-contents';
        const filename = `${Date.now()}-${req.file.originalname}`;

        const result = await storageService.uploadFile(
            bucket,
            filename,
            req.file.buffer,
            { 'Content-Type': req.file.mimetype }
        );

        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

/**
 * QTI 2.1 API Routes
 * Soru import/export endpoint'leri
 */

const express = require('express');
const router = express.Router();
const qtiService = require('../services/qti');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const prisma = require('../db');

/**
 * POST /qti/import
 * QTI XML'den soru import et
 */
router.post('/import', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { xml, questionBankId } = req.body;

        if (!xml) {
            return res.status(400).json({ success: false, error: 'XML içeriği gerekli' });
        }

        const result = qtiService.parseQTIQuestion(xml);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        // Veritabanına kaydet
        const question = await prisma.question.create({
            data: {
                text: result.question.text,
                type: result.question.type,
                options: result.question.options,
                correctAnswer: result.question.correctAnswer,
                points: result.question.points || 1,
                questionBankId: questionBankId || null,
                createdById: req.user.id
            }
        });

        res.json({
            success: true,
            message: 'Soru başarıyla import edildi',
            question: {
                id: question.id,
                text: question.text,
                type: question.type
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /qti/import/batch
 * Çoklu soru import et
 */
router.post('/import/batch', auth, rbac(['instructor', 'admin', 'super_admin']), async (req, res) => {
    try {
        const { xml, questionBankId } = req.body;

        if (!xml) {
            return res.status(400).json({ success: false, error: 'XML içeriği gerekli' });
        }

        const result = qtiService.parseQTIPackage(xml);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        const created = [];
        for (const q of result.questions) {
            try {
                const question = await prisma.question.create({
                    data: {
                        text: q.text,
                        type: q.type,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        points: q.points || 1,
                        questionBankId: questionBankId || null,
                        createdById: req.user.id
                    }
                });
                created.push({ id: question.id, text: question.text });
            } catch (err) {
                console.error('Soru import hatası:', err.message);
            }
        }

        res.json({
            success: true,
            message: `${created.length} soru import edildi`,
            imported: created.length,
            total: result.questions.length,
            questions: created
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /qti/export/:questionId
 * Tek soruyu QTI formatında dışa aktar
 */
router.get('/export/:questionId', auth, async (req, res) => {
    try {
        const { questionId } = req.params;

        const question = await prisma.question.findUnique({
            where: { id: questionId }
        });

        if (!question) {
            return res.status(404).json({ success: false, error: 'Soru bulunamadı' });
        }

        const xml = qtiService.exportToQTI(question);

        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="question_${questionId}.xml"`);
        res.send(xml);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /qti/export/bank/:bankId
 * Soru bankasını QTI formatında dışa aktar
 */
router.get('/export/bank/:bankId', auth, async (req, res) => {
    try {
        const { bankId } = req.params;

        const questions = await prisma.question.findMany({
            where: { questionBankId: bankId }
        });

        if (questions.length === 0) {
            return res.status(404).json({ success: false, error: 'Sorular bulunamadı' });
        }

        // Her soruyu ayrı XML olarak dönüştür ve birleştir
        const xmlParts = questions.map(q => qtiService.exportToQTI(q));
        const combinedXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-items xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1">
${xmlParts.map(x => x.replace('<?xml version="1.0" encoding="UTF-8"?>\n', '')).join('\n')}
</qti-assessment-items>`;

        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="question_bank_${bankId}.xml"`);
        res.send(combinedXml);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

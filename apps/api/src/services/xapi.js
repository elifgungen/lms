/**
 * xAPI (Experience API / Tin Can) Service
 * Öğrenme kayıtları için standart protokol
 */

const axios = require('axios');
const crypto = require('crypto');

class XAPIService {
    constructor() {
        this.lrsEndpoint = process.env.XAPI_LRS_ENDPOINT;
        this.lrsKey = process.env.XAPI_KEY;
        this.lrsSecret = process.env.XAPI_SECRET;
        this.actorHomepage = process.env.XAPI_ACTOR_HOMEPAGE || 'https://lms.example.com';
    }

    /**
     * LRS'ye statement gönder
     */
    async sendStatement(statement) {
        if (!this.lrsEndpoint) {
            console.warn('[xAPI] LRS endpoint tanımlı değil, statement loglandı');
            console.log('[xAPI Statement]', JSON.stringify(statement, null, 2));
            return { success: true, stored: false, statement };
        }

        try {
            const statementId = crypto.randomUUID();
            const fullStatement = {
                id: statementId,
                timestamp: new Date().toISOString(),
                ...statement
            };

            const auth = Buffer.from(`${this.lrsKey}:${this.lrsSecret}`).toString('base64');

            await axios.post(
                `${this.lrsEndpoint}/statements`,
                fullStatement,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${auth}`,
                        'X-Experience-API-Version': '1.0.3'
                    }
                }
            );

            return { success: true, stored: true, statementId };
        } catch (error) {
            console.error('[xAPI] Statement gönderme hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actor (kullanıcı) nesnesi oluştur
     */
    createActor(user) {
        return {
            objectType: 'Agent',
            name: user.name || user.email,
            mbox: `mailto:${user.email}`,
            account: {
                homePage: this.actorHomepage,
                name: user.id
            }
        };
    }

    /**
     * Activity (etkinlik) nesnesi oluştur
     */
    createActivity(type, id, name, description) {
        return {
            objectType: 'Activity',
            id: `${this.actorHomepage}/activities/${type}/${id}`,
            definition: {
                type: `http://adlnet.gov/expapi/activities/${type}`,
                name: { 'tr-TR': name },
                description: { 'tr-TR': description || name }
            }
        };
    }

    // ============ LMS Spesifik Statement'lar ============

    /**
     * Ders başlatıldı
     */
    async courseStarted(user, course) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/launched',
                display: { 'tr-TR': 'başlattı' }
            },
            object: this.createActivity('course', course.id, course.title, course.description)
        });
    }

    /**
     * Ders tamamlandı
     */
    async courseCompleted(user, course, score = null) {
        const statement = {
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/completed',
                display: { 'tr-TR': 'tamamladı' }
            },
            object: this.createActivity('course', course.id, course.title, course.description)
        };

        if (score !== null) {
            statement.result = {
                score: { scaled: score / 100, raw: score, max: 100, min: 0 },
                completion: true,
                success: score >= 60
            };
        }

        return this.sendStatement(statement);
    }

    /**
     * Video izlendi
     */
    async videoWatched(user, video, progress, duration) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/experienced',
                display: { 'tr-TR': 'izledi' }
            },
            object: this.createActivity('media', video.id, video.title, 'Video içerik'),
            result: {
                duration: `PT${Math.floor(duration / 60)}M${Math.floor(duration % 60)}S`,
                extensions: {
                    'https://w3id.org/xapi/video/extensions/progress': progress
                }
            }
        });
    }

    /**
     * Sınav başlatıldı
     */
    async examStarted(user, exam) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/attempted',
                display: { 'tr-TR': 'denedi' }
            },
            object: this.createActivity('assessment', exam.id, exam.title, 'Sınav')
        });
    }

    /**
     * Sınav tamamlandı
     */
    async examCompleted(user, exam, score, passed, duration) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/completed',
                display: { 'tr-TR': 'tamamladı' }
            },
            object: this.createActivity('assessment', exam.id, exam.title, 'Sınav'),
            result: {
                score: { scaled: score / 100, raw: score, max: 100, min: 0 },
                success: passed,
                completion: true,
                duration: `PT${Math.floor(duration / 60)}M${Math.floor(duration % 60)}S`
            }
        });
    }

    /**
     * Ödev teslim edildi
     */
    async assignmentSubmitted(user, assignment) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/answered',
                display: { 'tr-TR': 'cevapladı' }
            },
            object: this.createActivity('assessment', assignment.id, assignment.title, 'Ödev')
        });
    }

    /**
     * İçerik görüntülendi
     */
    async contentViewed(user, content) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://id.tincanapi.com/verb/viewed',
                display: { 'tr-TR': 'görüntüledi' }
            },
            object: this.createActivity('content', content.id, content.title, content.type)
        });
    }

    /**
     * Soru cevaplandı
     */
    async questionAnswered(user, question, correct, response) {
        return this.sendStatement({
            actor: this.createActor(user),
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/answered',
                display: { 'tr-TR': 'cevapladı' }
            },
            object: this.createActivity('interaction', question.id, question.text?.substring(0, 50), 'Soru'),
            result: {
                success: correct,
                response: JSON.stringify(response)
            }
        });
    }

    /**
     * Konfigürasyon durumu
     */
    getStatus() {
        return {
            lrsConfigured: !!this.lrsEndpoint,
            endpoint: this.lrsEndpoint || null
        };
    }
}

module.exports = new XAPIService();

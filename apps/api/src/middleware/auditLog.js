/**
 * Audit Logging Middleware
 * Kritik işlemleri veritabanına kaydeder
 */

const prisma = require('../db');

/**
 * Audit log kaydı oluşturur
 */
async function createAuditLog(userId, action, resource, resourceId, details = {}, req = null) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                resource,
                resourceId,
                details: JSON.stringify(details),
                ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
                userAgent: req?.headers?.['user-agent'] || 'unknown',
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Audit log error:', error);
        // Audit log hatası işlemi engellemez
    }
}

/**
 * Express middleware - kritik route'ları otomatik loglar
 */
function auditMiddleware(action, resource) {
    return async (req, res, next) => {
        // Response tamamlandığında logla
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                await createAuditLog(
                    req.user?.id || 'anonymous',
                    action,
                    resource,
                    req.params?.id || null,
                    {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        body: req.method !== 'GET' ? { ...req.body, password: undefined } : undefined
                    },
                    req
                );
            }
        });
        next();
    };
}

// Loglanacak kritik aksiyonlar
const AUDIT_ACTIONS = {
    // Auth
    LOGIN: 'user.login',
    LOGOUT: 'user.logout',
    PASSWORD_CHANGE: 'user.password_change',

    // Exam
    EXAM_CREATE: 'exam.create',
    EXAM_UPDATE: 'exam.update',
    EXAM_DELETE: 'exam.delete',
    EXAM_START: 'exam.start',
    EXAM_SUBMIT: 'exam.submit',

    // Grade
    GRADE_CREATE: 'grade.create',
    GRADE_UPDATE: 'grade.update',

    // Admin
    USER_CREATE: 'admin.user_create',
    USER_UPDATE: 'admin.user_update',
    USER_DELETE: 'admin.user_delete',
    ROLE_CHANGE: 'admin.role_change',

    // Course
    COURSE_CREATE: 'course.create',
    COURSE_UPDATE: 'course.update',
    COURSE_DELETE: 'course.delete',
    ENROLLMENT: 'course.enrollment'
};

module.exports = {
    createAuditLog,
    auditMiddleware,
    AUDIT_ACTIONS
};

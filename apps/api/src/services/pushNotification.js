/**
 * Push Notification Service
 * Expo Push Notifications için backend servisi
 */

const { Expo } = require('expo-server-sdk');
const config = require('../config');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single user
 * @param {string} pushToken - Expo push token
 * @param {Object} notification - Notification data
 */
async function sendPushNotification(pushToken, notification) {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`Invalid Expo push token: ${pushToken}`);
        return null;
    }

    const message = {
        to: pushToken,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: notification.priority || 'high',
        badge: notification.badge,
        channelId: notification.channelId || 'default',
    };

    try {
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        return tickets[0];
    } catch (error) {
        console.error('Push notification failed:', error);
        throw error;
    }
}

/**
 * Send push notification to multiple users
 * @param {Array<string>} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification data
 */
async function sendBulkPushNotifications(pushTokens, notification) {
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
        console.warn('No valid push tokens provided');
        return [];
    }

    const messages = validTokens.map(token => ({
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: notification.priority || 'high',
        badge: notification.badge,
        channelId: notification.channelId || 'default',
    }));

    try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        return tickets;
    } catch (error) {
        console.error('Bulk push notifications failed:', error);
        throw error;
    }
}

/**
 * Notification templates for common events
 */
const NotificationTemplates = {
    // Course notifications
    courseEnrolled: (courseName) => ({
        title: 'Kursa Kayıt Yapıldı 📚',
        body: `${courseName} kursuna başarıyla kayıt oldunuz.`,
        data: { type: 'course_enrolled' },
    }),

    newContent: (courseName, contentTitle) => ({
        title: 'Yeni İçerik Eklendi 📖',
        body: `${courseName}: ${contentTitle}`,
        data: { type: 'new_content' },
    }),

    // Exam notifications
    examReminder: (examTitle, minutes) => ({
        title: 'Sınav Hatırlatması ⏰',
        body: `${examTitle} sınavı ${minutes} dakika içinde başlayacak.`,
        data: { type: 'exam_reminder' },
    }),

    examAvailable: (examTitle) => ({
        title: 'Sınav Aktif 📝',
        body: `${examTitle} sınavı şimdi aktif. Sınava katılabilirsiniz.`,
        data: { type: 'exam_available' },
    }),

    examGraded: (examTitle, score) => ({
        title: 'Sınav Notlandırıldı 🎯',
        body: `${examTitle}: ${score} puan aldınız.`,
        data: { type: 'exam_graded' },
    }),

    // Assignment notifications
    assignmentDue: (assignmentTitle, hours) => ({
        title: 'Ödev Teslim Hatırlatması ⚠️',
        body: `${assignmentTitle} için ${hours} saat kaldı.`,
        data: { type: 'assignment_due' },
    }),

    assignmentGraded: (assignmentTitle, score) => ({
        title: 'Ödev Notlandırıldı ✅',
        body: `${assignmentTitle}: ${score} puan.`,
        data: { type: 'assignment_graded' },
    }),

    // Live class notifications
    liveClassStarting: (classTitle, minutes) => ({
        title: 'Canlı Ders Başlıyor 🎥',
        body: `${classTitle} ${minutes} dakika içinde başlayacak.`,
        data: { type: 'live_class_starting' },
    }),

    liveClassStarted: (classTitle) => ({
        title: 'Canlı Ders Başladı 🔴',
        body: `${classTitle} şimdi başladı. Katılmak için tıklayın.`,
        data: { type: 'live_class_started' },
    }),

    // Proctoring alerts
    proctoringWarning: (message) => ({
        title: 'Gözetleme Uyarısı ⚠️',
        body: message,
        data: { type: 'proctoring_warning' },
    }),

    // General announcements
    announcement: (title, message) => ({
        title: title,
        body: message,
        data: { type: 'announcement' },
    }),
};

/**
 * Check push receipts for delivery status
 * @param {Array<string>} receiptIds - Array of receipt IDs from tickets
 */
async function checkReceipts(receiptIds) {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    const results = [];

    for (const chunk of receiptIdChunks) {
        try {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

            for (const receiptId in receipts) {
                const receipt = receipts[receiptId];
                if (receipt.status === 'error') {
                    console.error(`Push notification error for ${receiptId}:`, receipt.message);
                    if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
                        // Token is no longer valid - should be removed from database
                        results.push({ receiptId, status: 'invalid_token' });
                    }
                } else {
                    results.push({ receiptId, status: 'ok' });
                }
            }
        } catch (error) {
            console.error('Error checking receipts:', error);
        }
    }

    return results;
}

module.exports = {
    sendPushNotification,
    sendBulkPushNotifications,
    checkReceipts,
    NotificationTemplates,
};

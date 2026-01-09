/**
 * Mattermost Integration Service
 * Webhook tabanlı bildirim ve mesajlaşma entegrasyonu
 */

const axios = require('axios');

class MattermostService {
    constructor() {
        this.webhookUrl = process.env.MATTERMOST_WEBHOOK_URL;
        this.botToken = process.env.MATTERMOST_BOT_TOKEN;
        this.serverUrl = process.env.MATTERMOST_SERVER_URL;
    }

    /**
     * Webhook ile mesaj gönder (en basit yöntem)
     */
    async sendWebhookMessage({ channel, text, username = 'LMS Bot', iconEmoji = ':books:' }) {
        if (!this.webhookUrl) {
            console.warn('[Mattermost] Webhook URL tanımlı değil, mesaj gönderilmedi');
            return { success: false, error: 'Webhook URL not configured' };
        }

        try {
            const payload = {
                channel,
                text,
                username,
                icon_emoji: iconEmoji,
            };

            await axios.post(this.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            return { success: true };
        } catch (error) {
            console.error('[Mattermost] Webhook hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Zengin içerikli mesaj gönder (attachment ile)
     */
    async sendRichMessage({ channel, title, text, color = '#3498db', fields = [] }) {
        if (!this.webhookUrl) {
            return { success: false, error: 'Webhook URL not configured' };
        }

        try {
            const payload = {
                channel,
                username: 'LMS Bot',
                icon_emoji: ':books:',
                attachments: [{
                    fallback: text,
                    color,
                    title,
                    text,
                    fields: fields.map(f => ({
                        short: f.short !== false,
                        title: f.title,
                        value: f.value
                    }))
                }]
            };

            await axios.post(this.webhookUrl, payload);
            return { success: true };
        } catch (error) {
            console.error('[Mattermost] Rich message hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============ LMS Spesifik Bildirimler ============

    /**
     * Yeni ders duyurusu
     */
    async notifyCourseAnnouncement({ courseName, title, content, instructorName, channel }) {
        return this.sendRichMessage({
            channel: channel || 'announcements',
            title: `📢 Duyuru: ${title}`,
            text: content,
            color: '#2ecc71',
            fields: [
                { title: 'Ders', value: courseName },
                { title: 'Eğitmen', value: instructorName }
            ]
        });
    }

    /**
     * Yeni ödev bildirimi
     */
    async notifyNewAssignment({ courseName, assignmentTitle, dueDate, channel }) {
        return this.sendRichMessage({
            channel: channel || 'assignments',
            title: `📝 Yeni Ödev: ${assignmentTitle}`,
            text: `${courseName} dersine yeni bir ödev eklendi.`,
            color: '#e74c3c',
            fields: [
                { title: 'Ders', value: courseName },
                { title: 'Son Teslim', value: new Date(dueDate).toLocaleDateString('tr-TR') }
            ]
        });
    }

    /**
     * Sınav hatırlatması
     */
    async notifyExamReminder({ courseName, examTitle, startTime, channel }) {
        return this.sendRichMessage({
            channel: channel || 'exams',
            title: `⏰ Sınav Hatırlatması: ${examTitle}`,
            text: `${courseName} dersinin sınavı yaklaşıyor!`,
            color: '#f39c12',
            fields: [
                { title: 'Ders', value: courseName },
                { title: 'Başlangıç', value: new Date(startTime).toLocaleString('tr-TR') }
            ]
        });
    }

    /**
     * Not yayınlandı bildirimi
     */
    async notifyGradePublished({ courseName, itemTitle, channel }) {
        return this.sendRichMessage({
            channel: channel || 'grades',
            title: `📊 Notlar Yayınlandı`,
            text: `${courseName} - ${itemTitle} için notlar yayınlandı.`,
            color: '#9b59b6',
            fields: [
                { title: 'Ders', value: courseName },
                { title: 'Öğe', value: itemTitle }
            ]
        });
    }

    /**
     * Canlı ders başladı bildirimi
     */
    async notifyLiveClassStarted({ courseName, meetingUrl, instructorName, channel }) {
        return this.sendRichMessage({
            channel: channel || 'live-classes',
            title: `🔴 Canlı Ders Başladı!`,
            text: `${courseName} dersi için canlı ders başladı. [Katıl](${meetingUrl})`,
            color: '#e91e63',
            fields: [
                { title: 'Ders', value: courseName },
                { title: 'Eğitmen', value: instructorName }
            ]
        });
    }

    // ============ Bot API (Opsiyonel - Token gerektirir) ============

    /**
     * Bot API ile direkt mesaj gönder (daha gelişmiş)
     */
    async sendDirectMessage({ userId, message }) {
        if (!this.botToken || !this.serverUrl) {
            return { success: false, error: 'Bot token veya server URL tanımlı değil' };
        }

        try {
            // Önce DM kanalı oluştur/al
            const channelRes = await axios.post(
                `${this.serverUrl}/api/v4/channels/direct`,
                [userId, 'bot_user_id'], // Bot user ID environment'tan alınmalı
                { headers: { Authorization: `Bearer ${this.botToken}` } }
            );

            // Mesaj gönder
            await axios.post(
                `${this.serverUrl}/api/v4/posts`,
                {
                    channel_id: channelRes.data.id,
                    message
                },
                { headers: { Authorization: `Bearer ${this.botToken}` } }
            );

            return { success: true };
        } catch (error) {
            console.error('[Mattermost] DM hatası:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Konfigürasyon durumunu kontrol et
     */
    getStatus() {
        return {
            webhookConfigured: !!this.webhookUrl,
            botConfigured: !!(this.botToken && this.serverUrl),
            serverUrl: this.serverUrl || null
        };
    }
}

module.exports = new MattermostService();

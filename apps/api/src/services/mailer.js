const nodemailer = require("nodemailer");
const config = require("../config");

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    // Gmail configuration
    if (config.smtpHost) {
        transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort || 587,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
        });
    } else {
        // Fallback: Log emails to console (development)
        transporter = {
            sendMail: async (options) => {
                console.log("=== EMAIL (Development Mode) ===");
                console.log("To:", options.to);
                console.log("Subject:", options.subject);
                console.log("HTML:", options.html?.substring(0, 200) + "...");
                console.log("================================");
                return { messageId: "dev-" + Date.now() };
            },
        };
    }

    return transporter;
}

/**
 * Send verification email to new user
 */
async function sendVerificationEmail(email, name, token) {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0b1224; color: #e5e7eb; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #1a2744; border-radius: 12px; padding: 30px; }
        h1 { color: #22d3ee; margin-bottom: 20px; }
        .button { display: inline-block; background: #22d3ee; color: #0b1224; padding: 12px 24px; 
                  border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .footer { color: #9ca3af; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Email Doğrulama</h1>
        <p>Merhaba ${name || "Kullanıcı"},</p>
        <p>Hesabınızı aktifleştirmek için emailinizi doğrulamanız gerekiyor.</p>
        <a href="${verifyUrl}" class="button">Emaili Doğrula</a>
        <p>Bu isteği siz yapmadıysanız lütfen dikkate almayın.</p>
        <div class="footer">
          <p>LMS Support</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const transport = getTransporter();
    return transport.sendMail({
        from: config.smtpFrom || '"LMS Support" <noreply@lms.local>',
        to: email,
        subject: "Email Doğrulama - LMS",
        html,
    });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, name, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0b1224; color: #e5e7eb; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #1a2744; border-radius: 12px; padding: 30px; }
        h1 { color: #22d3ee; margin-bottom: 20px; }
        .button { display: inline-block; background: #22d3ee; color: #0b1224; padding: 12px 24px; 
                  border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .footer { color: #9ca3af; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Şifre Sıfırlama</h1>
        <p>Merhaba ${name || "Kullanıcı"},</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.</p>
        <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
        <p>Bu link 1 saat geçerlidir.</p>
        <p>Bu isteği siz yapmadıysanız lütfen dikkate almayın.</p>
        <div class="footer">
          <p>LMS Support</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const transport = getTransporter();
    return transport.sendMail({
        from: config.smtpFrom || '"LMS Support" <noreply@lms.local>',
        to: email,
        subject: "Şifre Sıfırlama - LMS",
        html,
    });
}

/**
 * Send welcome email after verification
 */
async function sendWelcomeEmail(email, name) {
    const loginUrl = `${config.frontendUrl}/login`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #0b1224; color: #e5e7eb; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #1a2744; border-radius: 12px; padding: 30px; }
        h1 { color: #22d3ee; margin-bottom: 20px; }
        .button { display: inline-block; background: #22d3ee; color: #0b1224; padding: 12px 24px; 
                  border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .footer { color: #9ca3af; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hoş Geldiniz! 🎉</h1>
        <p>Merhaba ${name || "Kullanıcı"},</p>
        <p>Email adresiniz başarıyla doğrulandı. Artık LMS'e giriş yapabilirsiniz.</p>
        <a href="${loginUrl}" class="button">Giriş Yap</a>
        <div class="footer">
          <p>LMS Support</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const transport = getTransporter();
    return transport.sendMail({
        from: config.smtpFrom || '"LMS Support" <noreply@lms.local>',
        to: email,
        subject: "Hoş Geldiniz - LMS",
        html,
    });
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
};

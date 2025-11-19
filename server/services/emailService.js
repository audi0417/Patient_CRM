/**
 * 電子郵件服務
 *
 * 使用 Resend 提供郵件發送功能
 * 支援預約提醒、通知、報告等
 */

const { Resend } = require('resend');

// 初始化 Resend（如果沒有 API Key 則設為 null）
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn('⚠️  未設定 RESEND_API_KEY，郵件功能將無法使用');
}

/**
 * 郵件服務類別
 */
class EmailService {
  /**
   * 檢查郵件服務是否已啟用
   * @returns {boolean}
   */
  static isEnabled() {
    return resend !== null;
  }

  /**
   * 取得寄件者郵箱（從環境變數）
   * @returns {string}
   */
  static getSenderEmail() {
    return process.env.EMAIL_FROM || 'noreply@example.com';
  }

  /**
   * 發送郵件（通用方法）
   * @param {Object} options - 郵件選項
   * @param {string} options.to - 收件者郵箱
   * @param {string} options.subject - 郵件主旨
   * @param {string} options.html - HTML 內容
   * @param {string} options.text - 純文字內容（可選）
   * @returns {Promise<Object>} 發送結果
   */
  static async sendEmail({ to, subject, html, text }) {
    if (!this.isEnabled()) {
      throw new Error('郵件服務未啟用，請設定 RESEND_API_KEY');
    }

    try {
      const result = await resend.emails.send({
        from: this.getSenderEmail(),
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      });

      console.log(`✅ 郵件已發送: ${to} - ${subject}`);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ 郵件發送失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 發送預約提醒郵件
   * @param {Object} options - 提醒選項
   * @param {string} options.to - 收件者郵箱
   * @param {string} options.patientName - 病患姓名
   * @param {string} options.date - 預約日期
   * @param {string} options.time - 預約時間
   * @param {string} options.type - 預約類型
   * @param {string} options.notes - 備註（可選）
   * @returns {Promise<Object>} 發送結果
   */
  static async sendAppointmentReminder({ to, patientName, date, time, type, notes }) {
    const subject = `預約提醒：${date} ${time}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #06C755; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #06C755; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background: #06C755; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📅 預約提醒</h1>
          </div>
          <div class="content">
            <p>親愛的 <strong>${patientName}</strong>，您好：</p>
            <p>這是您的預約提醒通知。</p>

            <div class="info-box">
              <p><strong>📅 預約日期：</strong>${date}</p>
              <p><strong>🕐 預約時間：</strong>${time}</p>
              <p><strong>📋 預約項目：</strong>${type}</p>
              ${notes ? `<p><strong>📝 備註：</strong>${notes}</p>` : ''}
            </div>

            <p>請準時前往，如有任何變更或取消需求，請提前通知我們。</p>
            <p>若您有任何問題，歡迎隨時與我們聯繫。</p>
          </div>
          <div class="footer">
            <p>本郵件由系統自動發送，請勿直接回覆。</p>
            <p>© ${new Date().getFullYear()} Patient CRM System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * 發送預約確認郵件
   * @param {Object} options - 確認選項
   * @returns {Promise<Object>} 發送結果
   */
  static async sendAppointmentConfirmation({ to, patientName, date, time, type, notes }) {
    const subject = `預約確認：${date} ${time}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #06C755; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #06C755; }
          .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ 預約已確認</h1>
          </div>
          <div class="content">
            <p>親愛的 <strong>${patientName}</strong>，您好：</p>

            <div class="success">
              <strong>✅ 您的預約已成功建立！</strong>
            </div>

            <div class="info-box">
              <p><strong>📅 預約日期：</strong>${date}</p>
              <p><strong>🕐 預約時間：</strong>${time}</p>
              <p><strong>📋 預約項目：</strong>${type}</p>
              ${notes ? `<p><strong>📝 備註：</strong>${notes}</p>` : ''}
            </div>

            <p>我們將在預約前一天再次提醒您。</p>
            <p>期待您的到來！</p>
          </div>
          <div class="footer">
            <p>本郵件由系統自動發送，請勿直接回覆。</p>
            <p>© ${new Date().getFullYear()} Patient CRM System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * 發送預約取消通知
   * @param {Object} options - 取消選項
   * @returns {Promise<Object>} 發送結果
   */
  static async sendAppointmentCancellation({ to, patientName, date, time, type, reason }) {
    const subject = `預約取消通知：${date} ${time}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">❌ 預約已取消</h1>
          </div>
          <div class="content">
            <p>親愛的 <strong>${patientName}</strong>，您好：</p>

            <div class="warning">
              <strong>⚠️ 您的預約已被取消</strong>
            </div>

            <div class="info-box">
              <p><strong>📅 原預約日期：</strong>${date}</p>
              <p><strong>🕐 原預約時間：</strong>${time}</p>
              <p><strong>📋 預約項目：</strong>${type}</p>
              ${reason ? `<p><strong>📝 取消原因：</strong>${reason}</p>` : ''}
            </div>

            <p>如需重新預約，歡迎隨時與我們聯繫。</p>
          </div>
          <div class="footer">
            <p>本郵件由系統自動發送，請勿直接回覆。</p>
            <p>© ${new Date().getFullYear()} Patient CRM System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * 發送一般通知郵件
   * @param {Object} options - 通知選項
   * @param {string} options.to - 收件者郵箱
   * @param {string} options.patientName - 病患姓名
   * @param {string} options.title - 通知標題
   * @param {string} options.message - 通知內容
   * @returns {Promise<Object>} 發送結果
   */
  static async sendNotification({ to, patientName, title, message }) {
    const subject = title;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #06C755; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .message-box { background: white; padding: 20px; margin: 15px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📬 通知</h1>
          </div>
          <div class="content">
            <p>親愛的 <strong>${patientName}</strong>，您好：</p>

            <div class="message-box">
              ${message}
            </div>

            <p>如有任何問題，歡迎隨時與我們聯繫。</p>
          </div>
          <div class="footer">
            <p>本郵件由系統自動發送，請勿直接回覆。</p>
            <p>© ${new Date().getFullYear()} Patient CRM System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * 發送用戶帳號密碼郵件（新建診所用戶時使用）
   * @param {Object} options - 帳號資訊
   * @param {string} options.to - 收件者郵箱
   * @param {string} options.userName - 用戶姓名
   * @param {string} options.username - 帳號名稱
   * @param {string} options.password - 密碼
   * @param {string} options.organizationName - 組織名稱
   * @param {string} options.loginUrl - 登入網址（可選）
   * @returns {Promise<Object>} 發送結果
   */
  static async sendUserCredentials({ to, userName, username, password, organizationName, loginUrl }) {
    const subject = `歡迎加入 ${organizationName} - 您的帳號資訊`;
    const defaultLoginUrl = loginUrl || 'https://your-domain.com/login';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .credentials-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .credential-item { background: #f3f4f6; padding: 12px; margin: 10px 0; border-radius: 4px; font-family: monospace; }
          .credential-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
          .credential-value { color: #1f2937; font-size: 16px; }
          .warning-box { background: #fef3c7; color: #92400e; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 歡迎加入 ${organizationName}</h1>
          </div>
          <div class="content">
            <p>親愛的 <strong>${userName}</strong>，您好：</p>
            <p>您的管理帳號已建立成功！以下是您的登入資訊：</p>

            <div class="credentials-box">
              <div class="credential-item">
                <div class="credential-label">👤 帳號 (Username)</div>
                <div class="credential-value">${username}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">🔑 密碼 (Password)</div>
                <div class="credential-value">${password}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">🏥 組織 (Organization)</div>
                <div class="credential-value">${organizationName}</div>
              </div>
            </div>

            <div class="warning-box">
              <strong>⚠️ 重要提醒：</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>請妥善保管您的帳號密碼</li>
                <li>首次登入後，建議立即修改密碼</li>
                <li>請勿將密碼分享給他人</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${defaultLoginUrl}" class="button">立即登入系統</a>
            </div>

            <p>如有任何問題或需要協助，歡迎隨時與我們聯繫。</p>
          </div>
          <div class="footer">
            <p>本郵件包含重要的帳號資訊，請妥善保管。</p>
            <p>© ${new Date().getFullYear()} Patient CRM System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * 移除 HTML 標籤（用於純文字版本）
   * @param {string} html - HTML 字串
   * @returns {string} 純文字
   */
  static stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = EmailService;

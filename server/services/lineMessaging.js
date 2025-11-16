/**
 * Line 訊息服務
 *
 * 提供 Line Bot 訊息發送、接收處理功能
 * 支援文字訊息、貼圖、系統通知
 */

const crypto = require('crypto');
const { decrypt } = require('../utils/encryption');
const { queryOne, queryAll, execute } = require('../database/helpers');

// Line API 端點
const LINE_API_BASE = 'https://api.line.me/v2/bot';
const LINE_API_REPLY = `${LINE_API_BASE}/message/reply`;
const LINE_API_PUSH = `${LINE_API_BASE}/message/push`;
const LINE_API_PROFILE = `${LINE_API_BASE}/profile`;
const LINE_API_BOT_INFO = `${LINE_API_BASE}/info`;

/**
 * Line 訊息服務類別
 */
class LineMessagingService {
  /**
   * 取得組織的 Line 配置
   * @param {string} organizationId - 組織 ID
   * @returns {Object|null} Line 配置（已解密）
   */
  static async getLineConfig(organizationId) {
    try {
      const config = await queryOne(
        'SELECT * FROM line_configs WHERE "organizationId" = ? AND "isActive" = 1',
        [organizationId]
      );

      if (!config) {
        return null;
      }

      // 解密敏感欄位
      return {
        ...config,
        channelSecret: decrypt(config.channelSecret),
        accessToken: decrypt(config.accessToken)
      };
    } catch (error) {
      console.error('取得 Line 配置失敗:', error);
      return null;
    }
  }

  /**
   * 驗證 Line Webhook 簽名
   * @param {string} body - 請求 body（原始字串）
   * @param {string} signature - X-Line-Signature header
   * @param {string} channelSecret - Line Channel Secret
   * @returns {boolean} 簽名是否有效
   */
  static verifySignature(body, signature, channelSecret) {
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    return signature === `sha256=${hash}`;
  }

  /**
   * 發送文字訊息（Reply）
   * @param {string} replyToken - Line Reply Token
   * @param {string} text - 訊息文字
   * @param {string} accessToken - Line Access Token
   * @returns {Promise<boolean>} 是否成功
   */
  static async replyTextMessage(replyToken, text, accessToken) {
    try {
      const response = await fetch(LINE_API_REPLY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          replyToken,
          messages: [
            {
              type: 'text',
              text
            }
          ]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('發送 Line 文字訊息失敗:', error);
      return false;
    }
  }

  /**
   * 發送文字訊息（Push）
   * @param {string} userId - Line User ID
   * @param {string} text - 訊息文字
   * @param {Object} config - Line 配置
   * @returns {Promise<boolean>} 是否成功
   */
  static async pushTextMessage(userId, text, config) {
    try {
      // 檢查訊息限制
      const limitCheck = await this.checkMessageLimit(config);
      if (!limitCheck.allowed) {
        console.warn('訊息發送超過限制:', limitCheck.reason);
        return false;
      }

      const response = await fetch(LINE_API_PUSH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.accessToken}`
        },
        body: JSON.stringify({
          to: userId,
          messages: [
            {
              type: 'text',
              text
            }
          ]
        })
      });

      if (response.ok) {
        // 更新統計
        await this.updateMessageStats(config.id);
      }

      return response.ok;
    } catch (error) {
      console.error('推送 Line 文字訊息失敗:', error);
      await this.recordError(config.id, error.message);
      return false;
    }
  }

  /**
   * 發送貼圖訊息（Push）
   * @param {string} userId - Line User ID
   * @param {string} packageId - 貼圖包 ID
   * @param {string} stickerId - 貼圖 ID
   * @param {Object} config - Line 配置
   * @returns {Promise<boolean>} 是否成功
   */
  static async pushStickerMessage(userId, packageId, stickerId, config) {
    try {
      // 檢查訊息限制
      const limitCheck = await this.checkMessageLimit(config);
      if (!limitCheck.allowed) {
        console.warn('訊息發送超過限制:', limitCheck.reason);
        return false;
      }

      const response = await fetch(LINE_API_PUSH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.accessToken}`
        },
        body: JSON.stringify({
          to: userId,
          messages: [
            {
              type: 'sticker',
              packageId,
              stickerId
            }
          ]
        })
      });

      if (response.ok) {
        await this.updateMessageStats(config.id);
      }

      return response.ok;
    } catch (error) {
      console.error('推送 Line 貼圖訊息失敗:', error);
      await this.recordError(config.id, error.message);
      return false;
    }
  }

  /**
   * 取得 Line 用戶資料
   * @param {string} userId - Line User ID
   * @param {string} accessToken - Line Access Token
   * @returns {Promise<Object|null>} 用戶資料
   */
  static async getUserProfile(userId, accessToken) {
    try {
      const response = await fetch(`${LINE_API_PROFILE}/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('取得 Line 用戶資料失敗:', error);
      return null;
    }
  }

  /**
   * 驗證 Access Token 有效性
   * @param {string} accessToken - Line Access Token
   * @returns {Promise<Object|null>} Bot 資訊或 null
   */
  static async verifyAccessToken(accessToken) {
    try {
      const response = await fetch(LINE_API_BOT_INFO, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('驗證 Line Access Token 失敗:', error);
      return null;
    }
  }

  /**
   * 檢查訊息發送限制
   * @param {Object} config - Line 配置
   * @returns {Object} { allowed: boolean, reason?: string }
   */
  static async checkMessageLimit(config) {
    // 檢查日限制
    if (config.messagesSentToday >= config.dailyMessageLimit) {
      return {
        allowed: false,
        reason: `已達每日訊息限制 (${config.dailyMessageLimit})`
      };
    }

    // 檢查月限制
    if (config.messagesSentThisMonth >= config.monthlyMessageLimit) {
      return {
        allowed: false,
        reason: `已達每月訊息限制 (${config.monthlyMessageLimit})`
      };
    }

    return { allowed: true };
  }

  /**
   * 更新訊息統計
   * @param {string} configId - Line 配置 ID
   */
  static async updateMessageStats(configId) {
    try {
      await execute(
        `UPDATE line_configs
         SET "messagesSentToday" = "messagesSentToday" + 1,
             "messagesSentThisMonth" = "messagesSentThisMonth" + 1,
             "totalMessagesSent" = "totalMessagesSent" + 1,
             "lastActivityAt" = ?,
             "updatedAt" = ?
         WHERE id = ?`,
        [new Date().toISOString(), new Date().toISOString(), configId]
      );
    } catch (error) {
      console.error('更新訊息統計失敗:', error);
    }
  }

  /**
   * 記錄錯誤
   * @param {string} configId - Line 配置 ID
   * @param {string} errorMessage - 錯誤訊息
   */
  static async recordError(configId, errorMessage) {
    try {
      await execute(
        `UPDATE line_configs
         SET "lastError" = ?,
             "errorCount" = "errorCount" + 1,
             "lastErrorAt" = ?,
             "updatedAt" = ?
         WHERE id = ?`,
        [errorMessage, new Date().toISOString(), new Date().toISOString(), configId]
      );
    } catch (error) {
      console.error('記錄錯誤失敗:', error);
    }
  }

  /**
   * 儲存訊息到資料庫
   * @param {Object} messageData - 訊息資料
   */
  static async saveMessage(messageData) {
    const {
      id,
      conversationId,
      organizationId,
      messageType,
      messageContent,
      senderId,
      recipientId,
      senderType,
      recipientType,
      lineMessageId,
      replyToken,
      status = 'SENT',
      isReply = false,
      quotedMessageId = null,
      metadata = null
    } = messageData;

    try {
      const now = new Date().toISOString();

      await execute(
        `INSERT INTO line_messages (
          id, "conversationId", "organizationId", "messageType", "messageContent",
          "senderId", "recipientId", "senderType", "recipientType",
          "lineMessageId", "replyToken", status, "sentAt", "isReply",
          "quotedMessageId", metadata, "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          conversationId,
          organizationId,
          messageType,
          typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent),
          senderId,
          recipientId,
          senderType,
          recipientType,
          lineMessageId,
          replyToken,
          status,
          now,
          isReply ? 1 : 0,
          quotedMessageId,
          metadata ? JSON.stringify(metadata) : null,
          now
        ]
      );
    } catch (error) {
      console.error('儲存訊息失敗:', error);
      throw error;
    }
  }

  /**
   * 取得或建立對話
   * @param {string} patientId - 患者 ID
   * @param {string} organizationId - 組織 ID
   * @returns {Promise<Object>} 對話記錄
   */
  static async getOrCreateConversation(patientId, organizationId) {
    try {
      // 查詢現有對話
      let conversation = await queryOne(
        'SELECT * FROM conversations WHERE "patientId" = ? AND "organizationId" = ?',
        [patientId, organizationId]
      );

      // 如不存在，建立新對話
      if (!conversation) {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await execute(
          `INSERT INTO conversations (
            id, "patientId", "organizationId", status, priority,
            "unreadCount", "lastMessageAt", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, patientId, organizationId, 'ACTIVE', 'MEDIUM', 0, now, now, now]
        );

        conversation = await queryOne('SELECT * FROM conversations WHERE id = ?', [id]);
      }

      return conversation;
    } catch (error) {
      console.error('取得或建立對話失敗:', error);
      throw error;
    }
  }

  /**
   * 更新對話的最後訊息資訊
   * @param {string} conversationId - 對話 ID
   * @param {string} messagePreview - 訊息預覽
   */
  static async updateConversation(conversationId, messagePreview) {
    try {
      const now = new Date().toISOString();

      await execute(
        `UPDATE conversations
         SET "lastMessageAt" = ?,
             "lastMessagePreview" = ?,
             "unreadCount" = "unreadCount" + 1,
             "updatedAt" = ?
         WHERE id = ?`,
        [now, messagePreview, now, conversationId]
      );
    } catch (error) {
      console.error('更新對話失敗:', error);
    }
  }
}

module.exports = LineMessagingService;

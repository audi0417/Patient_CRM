/**
 * Line 訊息服務
 *
 * 提供 Line Bot 訊息發送、接收處理功能
 * 支援文字訊息、貼圖、系統通知
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { decrypt } = require('../utils/encryption');
const { queryOne, queryAll, execute } = require('../database/helpers');

// Line API 端點
const LINE_API_BASE = 'https://api.line.me/v2/bot';
const LINE_API_REPLY = `${LINE_API_BASE}/message/reply`;
const LINE_API_PUSH = `${LINE_API_BASE}/message/push`;
const LINE_API_PROFILE = `${LINE_API_BASE}/profile`;
const LINE_API_BOT_INFO = `${LINE_API_BASE}/info`;
const LINE_API_CONTENT = `${LINE_API_BASE}/message`;

// 圖片儲存路徑
const IMAGE_STORAGE_BASE = path.join(process.cwd(), 'data', 'line_images');

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

    // LINE 平台發送的簽名是純 Base64，不包含 'sha256=' 前綴
    return signature === hash;
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
   * 取得或建立 LINE 用戶
   * @param {string} lineUserId - LINE User ID
   * @param {string} organizationId - 組織 ID
   * @param {Object} profile - LINE 用戶資料
   * @returns {Promise<Object>} LINE 用戶記錄
   */
  static async getOrCreateLineUser(lineUserId, organizationId, profile = null) {
    try {
      // 查詢現有 LINE 用戶
      let lineUser = await queryOne(
        'SELECT * FROM line_users WHERE "lineUserId" = ? AND "organizationId" = ?',
        [lineUserId, organizationId]
      );

      if (lineUser) {
        // 更新用戶資料（如果有提供新的 profile）
        if (profile) {
          const now = new Date().toISOString();
          await execute(
            `UPDATE line_users
             SET "displayName" = ?,
                 "pictureUrl" = ?,
                 "statusMessage" = ?,
                 "lastInteractionAt" = ?,
                 "updatedAt" = ?
             WHERE id = ?`,
            [
              profile.displayName || lineUser.displayName,
              profile.pictureUrl || lineUser.pictureUrl,
              profile.statusMessage || lineUser.statusMessage,
              now,
              now,
              lineUser.id
            ]
          );

          lineUser = await queryOne('SELECT * FROM line_users WHERE id = ?', [lineUser.id]);
        }

        return lineUser;
      }

      // 建立新 LINE 用戶
      if (profile) {
        const id = `lu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await execute(
          `INSERT INTO line_users (
            id, "lineUserId", "organizationId", "displayName", "pictureUrl",
            "statusMessage", "language", "isActive", "followedAt", "lastInteractionAt",
            "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            lineUserId,
            organizationId,
            profile.displayName || `LINE 用戶 ${lineUserId.slice(-8)}`,
            profile.pictureUrl || null,
            profile.statusMessage || null,
            profile.language || null,
            1, // isActive
            now,
            now,
            now,
            now
          ]
        );

        lineUser = await queryOne('SELECT * FROM line_users WHERE id = ?', [id]);
      }

      return lineUser;
    } catch (error) {
      console.error('取得或建立 LINE 用戶失敗:', error);
      throw error;
    }
  }

  /**
   * 取得或建立對話
   * @param {string} lineUserId - LINE 用戶 ID（line_users.id，不是 lineUserId）
   * @param {string} organizationId - 組織 ID
   * @param {string} patientId - 患者 ID（可選）
   * @returns {Promise<Object>} 對話記錄
   */
  static async getOrCreateConversation(lineUserId, organizationId, patientId = null) {
    try {
      // 查詢現有對話
      let conversation = await queryOne(
        'SELECT * FROM conversations WHERE "lineUserId" = ? AND "organizationId" = ?',
        [lineUserId, organizationId]
      );

      // 如不存在，建立新對話
      if (!conversation) {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await execute(
          `INSERT INTO conversations (
            id, "lineUserId", "patientId", "organizationId", status, priority,
            "unreadCount", "lastMessageAt", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, lineUserId, patientId, organizationId, 'ACTIVE', 'MEDIUM', 0, now, now, now]
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
   * 綁定 LINE 用戶到患者
   * @param {string} lineUserIdDb - LINE 用戶 ID（line_users.id）
   * @param {string} patientId - 患者 ID
   */
  static async bindLineUserToPatient(lineUserIdDb, patientId) {
    try {
      const now = new Date().toISOString();

      await execute(
        `UPDATE line_users
         SET "patientId" = ?, "updatedAt" = ?
         WHERE id = ?`,
        [patientId, now, lineUserIdDb]
      );

      // 同時更新對話的 patientId
      await execute(
        `UPDATE conversations
         SET "patientId" = ?, "updatedAt" = ?
         WHERE "lineUserId" = ?`,
        [patientId, now, lineUserIdDb]
      );
    } catch (error) {
      console.error('綁定 LINE 用戶到患者失敗:', error);
      throw error;
    }
  }

  /**
   * 解除 LINE 用戶與患者的綁定
   * @param {string} lineUserIdDb - LINE 用戶 ID（line_users.id）
   */
  static async unbindLineUserFromPatient(lineUserIdDb) {
    try {
      const now = new Date().toISOString();

      await execute(
        `UPDATE line_users
         SET "patientId" = NULL, "updatedAt" = ?
         WHERE id = ?`,
        [now, lineUserIdDb]
      );

      await execute(
        `UPDATE conversations
         SET "patientId" = NULL, "updatedAt" = ?
         WHERE "lineUserId" = ?`,
        [now, lineUserIdDb]
      );
    } catch (error) {
      console.error('解除 LINE 用戶綁定失敗:', error);
      throw error;
    }
  }

  /**
   * 更新對話的最後訊息資訊
   * @param {string} conversationId - 對話 ID
   * @param {string} messagePreview - 訊息預覽
   * @param {boolean} incrementUnread - 是否增加未讀計數（只有當 PATIENT 發送訊息時為 true）
   */
  static async updateConversation(conversationId, messagePreview, incrementUnread = false) {
    try {
      const now = new Date().toISOString();

      if (incrementUnread) {
        // 患者發送訊息，增加未讀計數
        await execute(
          `UPDATE conversations
           SET "lastMessageAt" = ?,
               "lastMessagePreview" = ?,
               "unreadCount" = "unreadCount" + 1,
               "updatedAt" = ?
           WHERE id = ?`,
          [now, messagePreview, now, conversationId]
        );
      } else {
        // 管理員發送訊息，不增加未讀計數
        await execute(
          `UPDATE conversations
           SET "lastMessageAt" = ?,
               "lastMessagePreview" = ?,
               "updatedAt" = ?
           WHERE id = ?`,
          [now, messagePreview, now, conversationId]
        );
      }
    } catch (error) {
      console.error('更新對話失敗:', error);
    }
  }

  /**
   * 處理圖片訊息（下載、生成縮圖、儲存）
   * @param {string} messageId - 訊息 ID（資料庫）
   * @param {string} lineMessageId - LINE 訊息 ID
   * @param {string} organizationId - 組織 ID
   * @param {string} accessToken - LINE Access Token
   */
  static async processImageMessage(messageId, lineMessageId, organizationId, accessToken) {
    try {
      console.log(`[圖片處理] 開始處理 - Message ID: ${lineMessageId}`);

      // 1. 從 LINE API 下載圖片
      const imageBuffer = await this.downloadImageFromLine(lineMessageId, accessToken);
      if (!imageBuffer) {
        throw new Error('下載圖片失敗');
      }

      console.log(`[圖片處理] 下載完成，大小: ${imageBuffer.length} bytes`);

      // 2. 取得圖片後設資料
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height, format } = metadata;

      console.log(`[圖片處理] 圖片資訊 - 尺寸: ${width}x${height}, 格式: ${format}`);

      // 3. 儲存原圖和生成縮圖
      const { originalPath, thumbnailPath, originalSize, thumbnailSize } =
        await this.saveImageFiles(imageBuffer, lineMessageId, organizationId);

      console.log(`[圖片處理] 檔案儲存完成 - 原圖: ${originalSize} bytes, 縮圖: ${thumbnailSize} bytes`);

      // 4. 構建圖片 URL
      const imageUrl = `/api/line/images/${organizationId}/${path.basename(originalPath)}`;
      const thumbnailUrl = `/api/line/images/${organizationId}/${path.basename(thumbnailPath)}`;

      // 5. 更新訊息記錄
      await execute(
        `UPDATE line_messages
         SET metadata = ?,
             "messageContent" = ?
         WHERE id = ?`,
        [
          JSON.stringify({
            imageUrl,
            thumbnailUrl,
            originalSize,
            thumbnailSize,
            width,
            height,
            format,
            lineMessageId,
            processing: false
          }),
          JSON.stringify({ text: '[圖片]' }),
          messageId
        ]
      );

      console.log(`[圖片處理] 完成 - Message ID: ${lineMessageId}`);
    } catch (error) {
      console.error(`[圖片處理] 失敗:`, error);

      // 更新訊息記錄為處理失敗
      await execute(
        `UPDATE line_messages
         SET metadata = ?
         WHERE id = ?`,
        [
          JSON.stringify({
            error: error.message,
            processing: false,
            failed: true
          }),
          messageId
        ]
      );
    }
  }

  /**
   * 從 LINE API 下載圖片
   * @param {string} messageId - LINE 訊息 ID
   * @param {string} accessToken - LINE Access Token
   * @returns {Promise<Buffer>} 圖片 Buffer
   */
  static async downloadImageFromLine(messageId, accessToken) {
    try {
      const response = await fetch(`${LINE_API_CONTENT}/${messageId}/content`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        console.error(`LINE API 回應錯誤: ${response.status} ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('下載圖片失敗:', error);
      return null;
    }
  }

  /**
   * 儲存原圖和生成縮圖
   * @param {Buffer} imageBuffer - 圖片 Buffer
   * @param {string} messageId - LINE 訊息 ID
   * @param {string} organizationId - 組織 ID
   * @returns {Promise<Object>} 檔案路徑和大小資訊
   */
  static async saveImageFiles(imageBuffer, messageId, organizationId) {
    const timestamp = Date.now();
    const sanitizedMessageId = messageId.replace(/[^a-zA-Z0-9]/g, '_');

    // 確保目錄存在
    const orgDir = path.join(IMAGE_STORAGE_BASE, organizationId);
    const originalsDir = path.join(orgDir, 'originals');
    const thumbnailsDir = path.join(orgDir, 'thumbnails');

    await fs.mkdir(originalsDir, { recursive: true });
    await fs.mkdir(thumbnailsDir, { recursive: true });

    // 檔案名稱
    const originalFilename = `msg_${sanitizedMessageId}_${timestamp}.jpg`;
    const thumbnailFilename = `msg_${sanitizedMessageId}_${timestamp}_thumb.jpg`;

    const originalPath = path.join(originalsDir, originalFilename);
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

    // 儲存原圖（轉換為 JPEG 格式）
    await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toFile(originalPath);

    // 生成縮圖（最大寬度 400px，保持比例）
    await sharp(imageBuffer)
      .resize(400, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // 取得檔案大小
    const originalStats = await fs.stat(originalPath);
    const thumbnailStats = await fs.stat(thumbnailPath);

    return {
      originalPath,
      thumbnailPath,
      originalSize: originalStats.size,
      thumbnailSize: thumbnailStats.size
    };
  }
}

module.exports = LineMessagingService;

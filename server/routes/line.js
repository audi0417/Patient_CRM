/**
 * Line 整合 API 路由
 *
 * 提供 Line 配置管理、訊息查詢、Webhook 處理等功能
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenantContext');
const { requireModule } = require('../middleware/moduleAccess');
const { queryOne, queryAll, execute } = require('../database/helpers');
const { encrypt, decrypt, encryptFields, decryptFields } = require('../utils/encryption');
const LineMessagingService = require('../services/lineMessaging');

/**
 * 取得 API 端點 URL（支援動態生成）
 * 優先順序：
 * 1. 環境變數 API_ENDPOINT
 * 2. 從請求中推導（適用於 Zeabur 等雲端平台）
 * 3. 本地開發預設值
 */
function getApiEndpoint(req) {
  // 如果有設置環境變數，直接使用
  if (process.env.API_ENDPOINT) {
    return process.env.API_ENDPOINT;
  }

  // 從請求推導（生產環境）
  if (req) {
    const protocol = req.protocol || 'https';
    const host = req.get('host');
    if (host && !host.includes('localhost')) {
      return `${protocol}://${host}`;
    }
  }

  // 本地開發預設值
  return 'http://localhost:3001';
}

// 所有 Line 路由都需要認證和租戶上下文
router.use(authenticateToken);
router.use(requireTenant);

/**
 * GET /api/line/config
 * 取得當前組織的 Line 配置
 */
router.get('/config', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const config = await queryOne(
      'SELECT * FROM line_configs WHERE "organizationId" = ?',
      [organizationId]
    );

    if (!config) {
      return res.json({
        success: true,
        data: null,
        message: '尚未配置 Line 整合'
      });
    }

    // 生成 Webhook URL
    const webhookUrl = `${getApiEndpoint(req)}/api/line/webhook/${organizationId}`;

    // 解密敏感欄位（但不回傳完整的 access token 和 secret）
    const safeConfig = {
      id: config.id,
      organizationId: config.organizationId,
      channelId: config.channelId,
      webhookUrl, // 使用動態生成的 Webhook URL
      isActive: config.isActive,
      isVerified: config.isVerified,
      lastVerifiedAt: config.lastVerifiedAt,
      enabledFeatures: config.enabledFeatures ? JSON.parse(config.enabledFeatures) : {},
      messagesSentToday: config.messagesSentToday,
      messagesSentThisMonth: config.messagesSentThisMonth,
      totalMessagesSent: config.totalMessagesSent,
      totalMessagesReceived: config.totalMessagesReceived,
      dailyMessageLimit: config.dailyMessageLimit,
      monthlyMessageLimit: config.monthlyMessageLimit,
      lastActivityAt: config.lastActivityAt,
      lastError: config.lastError,
      errorCount: config.errorCount,
      lastErrorAt: config.lastErrorAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      // 只顯示部分 token（安全性考量）
      accessTokenPreview: config.accessToken ? `${decrypt(config.accessToken).slice(0, 20)}...` : null
    };

    res.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('取得 Line 配置失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得 Line 配置失敗'
    });
  }
});

/**
 * POST /api/line/config
 * 建立或更新 Line 配置（需管理員權限）
 */
router.post('/config', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    // 只有 admin 和 super_admin 可以配置
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '需要管理員權限'
      });
    }

    const {
      channelId,
      channelSecret,
      accessToken,
      webhookUrl,
      dailyMessageLimit = 1000,
      monthlyMessageLimit = 30000,
      enabledFeatures = {}
    } = req.body;

    // 驗證必填欄位
    if (!channelId || !channelSecret || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'channelId, channelSecret 和 accessToken 為必填欄位'
      });
    }

    // 驗證 Access Token
    const botInfo = await LineMessagingService.verifyAccessToken(accessToken);
    if (!botInfo) {
      return res.status(400).json({
        success: false,
        error: 'Line Access Token 無效，請檢查是否正確'
      });
    }

    // 檢查是否已存在配置
    const existingConfig = await queryOne(
      'SELECT id FROM line_configs WHERE "organizationId" = ?',
      [organizationId]
    );

    const now = new Date().toISOString();

    if (existingConfig) {
      // 更新現有配置
      await execute(
        `UPDATE line_configs
         SET "channelId" = ?,
             "channelSecret" = ?,
             "accessToken" = ?,
             "webhookUrl" = ?,
             "dailyMessageLimit" = ?,
             "monthlyMessageLimit" = ?,
             "enabledFeatures" = ?,
             "isVerified" = ?,
             "lastVerifiedAt" = ?,
             "updatedAt" = ?
         WHERE "organizationId" = ?`,
        [
          channelId,
          encrypt(channelSecret),
          encrypt(accessToken),
          webhookUrl,
          dailyMessageLimit,
          monthlyMessageLimit,
          JSON.stringify(enabledFeatures),
          1, // isVerified
          now,
          now,
          organizationId
        ]
      );

      // 生成 Webhook URL
      const generatedWebhookUrl = `${getApiEndpoint(req)}/api/line/webhook/${organizationId}`;

      res.json({
        success: true,
        message: 'Line 配置已更新',
        data: {
          id: existingConfig.id,
          webhookUrl: generatedWebhookUrl,
          botInfo
        }
      });
    } else {
      // 建立新配置
      const id = uuidv4();

      // 生成 Webhook URL
      const generatedWebhookUrl = `${getApiEndpoint(req)}/api/line/webhook/${organizationId}`;

      await execute(
        `INSERT INTO line_configs (
          id, "organizationId", "channelId", "channelSecret", "accessToken",
          "webhookUrl", "isActive", "isVerified", "lastVerifiedAt",
          "enabledFeatures", "dailyMessageLimit", "monthlyMessageLimit",
          "configuredById", "configuredAt", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          channelId,
          encrypt(channelSecret),
          encrypt(accessToken),
          generatedWebhookUrl, // 使用自動生成的 URL
          1, // isActive
          1, // isVerified
          now,
          JSON.stringify(enabledFeatures),
          dailyMessageLimit,
          monthlyMessageLimit,
          req.user.userId,
          now,
          now,
          now
        ]
      );

      res.json({
        success: true,
        message: 'Line 配置已建立',
        data: {
          id,
          webhookUrl: generatedWebhookUrl,
          botInfo
        }
      });
    }
  } catch (error) {
    console.error('建立/更新 Line 配置失敗:', error);
    res.status(500).json({
      success: false,
      error: '建立/更新 Line 配置失敗'
    });
  }
});

/**
 * DELETE /api/line/config
 * 停用 Line 配置（需管理員權限）
 */
router.delete('/config', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    // 只有 admin 和 super_admin 可以停用
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '需要管理員權限'
      });
    }

    await execute(
      `UPDATE line_configs
       SET "isActive" = 0,
           "updatedAt" = ?
       WHERE "organizationId" = ?`,
      [new Date().toISOString(), organizationId]
    );

    res.json({
      success: true,
      message: 'Line 配置已停用'
    });
  } catch (error) {
    console.error('停用 Line 配置失敗:', error);
    res.status(500).json({
      success: false,
      error: '停用 Line 配置失敗'
    });
  }
});

/**
 * GET /api/line/conversations
 * 取得當前組織的所有對話
 */
router.get('/conversations', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { status = 'ACTIVE', limit = 50, offset = 0 } = req.query;

    const conversations = await queryAll(
      `SELECT
         c.id,
         c."lineUserId",
         c."patientId",
         c."organizationId",
         c.status,
         c.priority,
         c."unreadCount",
         c."lastMessageAt",
         c."lastMessagePreview",
         c."createdAt",
         c."updatedAt",
         lu.id as lineUserDbId,
         lu."displayName" as lineUserName,
         lu."pictureUrl" as lineUserPicture,
         lu."lineUserId" as linePlatformUserId,
         lu."isActive" as lineUserActive,
         p.id as patientDbId,
         p.name as patientName,
         p.phone as patientPhone,
         p.email as patientEmail
       FROM conversations c
       LEFT JOIN line_users lu ON c."lineUserId" = lu.id
       LEFT JOIN patients p ON c."patientId" = p.id
       WHERE c."organizationId" = ? AND c.status = ?
       ORDER BY c."lastMessageAt" DESC
       LIMIT ? OFFSET ?`,
      [organizationId, status, parseInt(limit), parseInt(offset)]
    );

    // 格式化對話資料
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      lineUserId: conv.lineUserId,  // line_users.id (資料庫 ID)
      patientId: conv.patientId,
      organizationId: conv.organizationId,
      status: conv.status,
      priority: conv.priority,
      unreadCount: conv.unreadCount,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lineUser: {
        displayName: conv.lineUserName,
        pictureUrl: conv.lineUserPicture,
        lineUserId: conv.linePlatformUserId,  // LINE 平台的 User ID
        isActive: conv.lineUserActive
      },
      patient: conv.patientDbId ? {
        id: conv.patientDbId,
        name: conv.patientName,
        phone: conv.patientPhone,
        email: conv.patientEmail
      } : null,
      // 顯示名稱：優先使用患者名稱，其次使用 LINE 顯示名稱
      displayName: conv.patientName || conv.lineUserName || '未知用戶'
    }));

    res.json({
      success: true,
      data: formattedConversations
    });
  } catch (error) {
    console.error('取得對話列表失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得對話列表失敗'
    });
  }
});

/**
 * GET /api/line/conversations/:conversationId/messages
 * 取得特定對話的訊息記錄
 */
router.get('/conversations/:conversationId/messages', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { conversationId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // 驗證對話屬於該組織
    const conversation = await queryOne(
      'SELECT id FROM conversations WHERE id = ? AND "organizationId" = ?',
      [conversationId, organizationId]
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: '對話不存在'
      });
    }

    const messages = await queryAll(
      `SELECT * FROM line_messages
       WHERE "conversationId" = ?
       ORDER BY "sentAt" DESC
       LIMIT ? OFFSET ?`,
      [conversationId, parseInt(limit), parseInt(offset)]
    );

    // 解析 JSON 欄位（安全處理）
    const formattedMessages = messages.map(msg => {
      let messageContent = msg.messageContent;
      let metadata = msg.metadata;

      // 安全解析 messageContent
      if (typeof messageContent === 'string') {
        try {
          messageContent = JSON.parse(messageContent);
        } catch (error) {
          // 如果解析失敗，保持原字串或包裝為 { text: ... }
          messageContent = { text: messageContent };
        }
      }

      // 安全解析 metadata
      if (metadata && typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (error) {
          metadata = null;
        }
      }

      return {
        ...msg,
        messageContent,
        metadata
      };
    });

    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    console.error('取得訊息記錄失敗:', error);
    res.status(500).json({
      success: false,
      error: '取得訊息記錄失敗'
    });
  }
});

/**
 * POST /api/line/send/text
 * 發送文字訊息給 LINE 用戶
 */
router.post('/send/text', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { lineUserId, text } = req.body;

    if (!lineUserId || !text) {
      return res.status(400).json({
        success: false,
        error: 'lineUserId 和 text 為必填欄位'
      });
    }

    // 取得 Line 配置
    const config = await LineMessagingService.getLineConfig(organizationId);
    if (!config || !config.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Line 整合未啟用'
      });
    }

    // 取得 LINE 用戶資料（line_users 表的 ID）
    const lineUser = await queryOne(
      'SELECT * FROM line_users WHERE id = ? AND "organizationId" = ?',
      [lineUserId, organizationId]
    );

    if (!lineUser) {
      return res.status(404).json({
        success: false,
        error: 'LINE 用戶不存在'
      });
    }

    if (!lineUser.isActive) {
      return res.status(400).json({
        success: false,
        error: 'LINE 用戶已取消關注'
      });
    }

    // 發送訊息（使用 LINE Platform User ID）
    const sent = await LineMessagingService.pushTextMessage(
      lineUser.lineUserId,  // LINE 平台的 User ID
      text,
      config
    );

    if (!sent) {
      return res.status(500).json({
        success: false,
        error: '訊息發送失敗'
      });
    }

    // 儲存訊息記錄
    const conversation = await LineMessagingService.getOrCreateConversation(
      lineUser.id,  // line_users.id
      organizationId,
      lineUser.patientId  // 可選的患者綁定
    );
    const messageId = uuidv4();

    await LineMessagingService.saveMessage({
      id: messageId,
      conversationId: conversation.id,
      organizationId,
      messageType: 'TEXT',
      messageContent: text,
      senderId: null,  // 系統發送
      recipientId: lineUser.id,  // LINE 用戶 ID
      senderType: 'ADMIN',
      recipientType: 'PATIENT',
      status: 'DELIVERED'
    });

    await LineMessagingService.updateConversation(conversation.id, text.substring(0, 100));

    res.json({
      success: true,
      message: '訊息已發送',
      data: {
        messageId
      }
    });
  } catch (error) {
    console.error('發送文字訊息失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送文字訊息失敗'
    });
  }
});

/**
 * POST /api/line/send/sticker
 * 發送貼圖給 LINE 用戶
 */
router.post('/send/sticker', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { lineUserId, packageId, stickerId } = req.body;

    if (!lineUserId || !packageId || !stickerId) {
      return res.status(400).json({
        success: false,
        error: 'lineUserId, packageId 和 stickerId 為必填欄位'
      });
    }

    // 取得 Line 配置
    const config = await LineMessagingService.getLineConfig(organizationId);
    if (!config || !config.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Line 整合未啟用'
      });
    }

    // 取得 LINE 用戶資料（line_users 表的 ID）
    const lineUser = await queryOne(
      'SELECT * FROM line_users WHERE id = ? AND "organizationId" = ?',
      [lineUserId, organizationId]
    );

    if (!lineUser) {
      return res.status(404).json({
        success: false,
        error: 'LINE 用戶不存在'
      });
    }

    if (!lineUser.isActive) {
      return res.status(400).json({
        success: false,
        error: 'LINE 用戶已取消關注'
      });
    }

    // 發送貼圖（使用 LINE Platform User ID）
    const sent = await LineMessagingService.pushStickerMessage(
      lineUser.lineUserId,  // LINE 平台的 User ID
      packageId,
      stickerId,
      config
    );

    if (!sent) {
      return res.status(500).json({
        success: false,
        error: '貼圖發送失敗'
      });
    }

    // 儲存訊息記錄
    const conversation = await LineMessagingService.getOrCreateConversation(
      lineUser.id,  // line_users.id
      organizationId,
      lineUser.patientId  // 可選的患者綁定
    );
    const messageId = uuidv4();

    await LineMessagingService.saveMessage({
      id: messageId,
      conversationId: conversation.id,
      organizationId,
      messageType: 'STICKER',
      messageContent: JSON.stringify({ packageId, stickerId }),
      senderId: null,  // 系統發送
      recipientId: lineUser.id,  // LINE 用戶 ID
      senderType: 'ADMIN',
      recipientType: 'PATIENT',
      status: 'DELIVERED',
      metadata: {
        packageId,
        stickerId,
        stickerUrl: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`
      }
    });

    await LineMessagingService.updateConversation(conversation.id, '[貼圖]');

    res.json({
      success: true,
      message: '貼圖已發送',
      data: {
        messageId
      }
    });
  } catch (error) {
    console.error('發送貼圖失敗:', error);
    res.status(500).json({
      success: false,
      error: '發送貼圖失敗'
    });
  }
});

/**
 * POST /api/line/conversations/:conversationId/mark-read
 * 將對話標記為已讀（重置未讀計數）
 */
router.post('/conversations/:conversationId/mark-read', requireModule('lineMessaging'), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { conversationId } = req.params;

    // 驗證對話是否屬於該組織
    const conversation = await queryOne(
      'SELECT * FROM conversations WHERE id = ? AND "organizationId" = ?',
      [conversationId, organizationId]
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: '對話不存在'
      });
    }

    // 重置未讀計數
    await execute(
      'UPDATE conversations SET "unreadCount" = 0 WHERE id = ?',
      [conversationId]
    );

    res.json({
      success: true,
      message: '已標記為已讀'
    });
  } catch (error) {
    console.error('標記對話已讀失敗:', error);
    res.status(500).json({
      success: false,
      error: '標記對話已讀失敗'
    });
  }
});

module.exports = router;

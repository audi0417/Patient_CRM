/**
 * Line Webhook 處理路由
 *
 * 接收 Line Bot 的 Webhook 事件（訊息、Follow、Unfollow 等）
 * 不需要認證（由 Line 簽名驗證）
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, execute } = require('../database/helpers');
const LineMessagingService = require('../services/lineMessaging');

/**
 * POST /api/line/webhook/:organizationId
 * Line Bot Webhook 端點（依組織 ID 區分）
 */
router.post('/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    // 1. 取得簽名和 body
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);

    if (!signature) {
      console.warn(`[Webhook] 缺少簽名 - 組織: ${organizationId}`);
      return res.status(401).json({ error: '缺少 X-Line-Signature' });
    }

    // 2. 根據 organizationId 取得 Line 配置
    const validConfig = await queryOne(
      'SELECT * FROM line_configs WHERE "organizationId" = ? AND "isActive" = 1',
      [organizationId]
    );

    if (!validConfig) {
      console.warn(`[Webhook] 找不到組織配置 - 組織: ${organizationId}`);
      return res.status(404).json({ error: '找不到 Line 配置或配置未啟用' });
    }

    // 3. 驗證簽名
    const channelSecret = require('../utils/encryption').decrypt(validConfig.channelSecret);
    const isValid = LineMessagingService.verifySignature(body, signature, channelSecret);

    if (!isValid) {
      console.warn(`[Webhook] 簽名驗證失敗 - 組織: ${organizationId}`);
      return res.status(401).json({ error: '簽名驗證失敗' });
    }

    console.log(`[Webhook] 簽名驗證成功 - 組織: ${organizationId}, 事件數: ${req.body.events?.length || 0}`);

    // 3. 處理事件
    const { events } = req.body;

    for (const event of events) {
      try {
        switch (event.type) {
          case 'message':
            await handleMessageEvent(event, validConfig);
            break;
          case 'follow':
            await handleFollowEvent(event, validConfig);
            break;
          case 'unfollow':
            await handleUnfollowEvent(event, validConfig);
            break;
          default:
            console.log(`未處理的事件類型: ${event.type}`);
        }
      } catch (error) {
        console.error(`處理事件失敗 (${event.type}):`, error);
        // 繼續處理其他事件
      }
    }

    // 4. 更新接收統計
    await execute(
      `UPDATE line_configs
       SET "totalMessagesReceived" = "totalMessagesReceived" + ?,
           "lastActivityAt" = ?,
           "updatedAt" = ?
       WHERE id = ?`,
      [events.length, new Date().toISOString(), new Date().toISOString(), validConfig.id]
    );

    // 5. 回應 Line 平台
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook 處理失敗:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 處理訊息事件
 */
async function handleMessageEvent(event, config) {
  const { message, source, replyToken } = event;
  const userId = source.userId;

  // 取得或建立 LINE 用戶
  const accessToken = require('../utils/encryption').decrypt(config.accessToken);
  let lineUser = await LineMessagingService.getOrCreateLineUser(userId, config.organizationId);

  // 如果 LINE 用戶不存在，嘗試取得用戶資料並建立
  if (!lineUser) {
    const profile = await LineMessagingService.getUserProfile(userId, accessToken);
    lineUser = await LineMessagingService.getOrCreateLineUser(userId, config.organizationId, profile);
  }

  if (!lineUser) {
    console.warn(`找不到或無法建立 LINE 用戶 (Line User ID: ${userId})`);
    return;
  }

  // 取得或建立對話
  const conversation = await LineMessagingService.getOrCreateConversation(
    lineUser.id,
    config.organizationId,
    lineUser.patientId // 如果已綁定患者，傳入患者 ID
  );

  // 根據訊息類型處理
  switch (message.type) {
    case 'text':
      await handleTextMessage(message, lineUser, conversation, config, replyToken);
      break;
    case 'sticker':
      await handleStickerMessage(message, lineUser, conversation, config, replyToken);
      break;
    default:
      console.log(`未處理的訊息類型: ${message.type}`);
  }
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(message, lineUser, conversation, config, replyToken) {
  const text = message.text;
  const messageId = message.id;

  // 儲存訊息（發送者是 LINE 用戶，不是病患）
  await LineMessagingService.saveMessage({
    id: uuidv4(),
    conversationId: conversation.id,
    organizationId: config.organizationId,
    messageType: 'TEXT',
    messageContent: text,
    senderId: lineUser.id, // LINE 用戶 ID（顯示 LINE 頭貼和名字）
    recipientId: null,
    senderType: 'PATIENT',
    recipientType: 'ADMIN',
    lineMessageId: messageId,
    replyToken,
    status: 'DELIVERED'
  });

  // 更新對話
  await LineMessagingService.updateConversation(conversation.id, text.substring(0, 100));

  // 關鍵字回應
  const accessToken = require('../utils/encryption').decrypt(config.accessToken);
  let replyText = null;
  let patient = null;

  if (text.includes('預約') || text.includes('約診')) {
    // 只有已綁定患者才能查詢預約
    if (lineUser.patientId) {
      patient = await queryOne('SELECT * FROM patients WHERE id = ?', [lineUser.patientId]);
      replyText = await handleAppointmentQuery(patient, config);
    } else {
      replyText = '您尚未綁定患者資料，無法查詢預約記錄。\n\n請聯絡我們的服務人員進行綁定。';
    }
  } else if (text.includes('幫助') || text.includes('說明')) {
    replyText = '您好！我是客服機器人。\n\n您可以:\n• 輸入「預約」查詢您的預約記錄\n• 輸入「說明」查看功能介紹\n\n如需進一步協助，請聯絡我們的服務人員。';
  } else {
    replyText = '感謝您的訊息！我們已收到您的留言，客服人員會盡快為您回覆。';
  }

  // 回覆訊息
  if (replyText) {
    await LineMessagingService.replyTextMessage(replyToken, replyText, accessToken);

    // 儲存回覆訊息（接收者是 LINE 用戶）
    await LineMessagingService.saveMessage({
      id: uuidv4(),
      conversationId: conversation.id,
      organizationId: config.organizationId,
      messageType: 'SYSTEM',
      messageContent: replyText,
      senderId: null,
      recipientId: lineUser.id, // 回覆給 LINE 用戶（顯示 LINE 頭貼和名字）
      senderType: 'SYSTEM',
      recipientType: 'PATIENT',
      status: 'SENT',
      isReply: true
    });
  }
}

/**
 * 處理貼圖訊息
 */
async function handleStickerMessage(message, lineUser, conversation, config, replyToken) {
  const { packageId, stickerId, id: messageId } = message;

  // 儲存貼圖訊息（發送者是 LINE 用戶）
  await LineMessagingService.saveMessage({
    id: uuidv4(),
    conversationId: conversation.id,
    organizationId: config.organizationId,
    messageType: 'STICKER',
    messageContent: JSON.stringify({ packageId, stickerId }),
    senderId: lineUser.id, // LINE 用戶 ID（顯示 LINE 頭貼和名字）
    recipientId: null,
    senderType: 'PATIENT',
    recipientType: 'ADMIN',
    lineMessageId: messageId,
    replyToken,
    status: 'DELIVERED',
    metadata: {
      packageId,
      stickerId,
      stickerUrl: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`
    }
  });

  // 更新對話
  await LineMessagingService.updateConversation(conversation.id, '[貼圖]');

  // 回覆貼圖
  const accessToken = require('../utils/encryption').decrypt(config.accessToken);
  const replyText = '😊 收到您的貼圖了！';

  await LineMessagingService.replyTextMessage(replyToken, replyText, accessToken);

  // 儲存回覆訊息
  await LineMessagingService.saveMessage({
    id: uuidv4(),
    conversationId: conversation.id,
    organizationId: config.organizationId,
    messageType: 'SYSTEM',
    messageContent: replyText,
    senderId: null,
    recipientId: lineUser.id, // 回覆給 LINE 用戶（顯示 LINE 頭貼和名字）
    senderType: 'SYSTEM',
    recipientType: 'PATIENT',
    status: 'SENT',
    isReply: true
  });
}

/**
 * 處理 Follow 事件（用戶加入好友）
 */
async function handleFollowEvent(event, config) {
  const { source } = event;
  const userId = source.userId;

  console.log(`LINE 用戶 ${userId} 加入好友`);

  // 取得用戶資料
  const accessToken = require('../utils/encryption').decrypt(config.accessToken);
  const profile = await LineMessagingService.getUserProfile(userId, accessToken);

  // 建立或更新 LINE 用戶
  const lineUser = await LineMessagingService.getOrCreateLineUser(userId, config.organizationId, profile);

  if (lineUser) {
    // 發送歡迎訊息
    const welcomeMessage = `歡迎使用我們的 LINE 服務！\n\n您可以透過 LINE 與我們聯繫。\n\n輸入「說明」查看可用功能。`;

    await LineMessagingService.pushTextMessage(userId, welcomeMessage, config);

    // 建立對話並儲存歡迎訊息
    const conversation = await LineMessagingService.getOrCreateConversation(
      lineUser.id,
      config.organizationId,
      lineUser.patientId
    );

    await LineMessagingService.saveMessage({
      id: uuidv4(),
      conversationId: conversation.id,
      organizationId: config.organizationId,
      messageType: 'SYSTEM',
      messageContent: welcomeMessage,
      senderId: null,
      recipientId: lineUser.id, // 發送給 LINE 用戶（顯示 LINE 頭貼和名字）
      senderType: 'SYSTEM',
      recipientType: 'PATIENT',
      status: 'SENT'
    });

    await LineMessagingService.updateConversation(conversation.id, welcomeMessage.substring(0, 100));
  }
}

/**
 * 處理 Unfollow 事件（用戶取消關注）
 */
async function handleUnfollowEvent(event, config) {
  const { source } = event;
  const userId = source.userId;

  console.log(`LINE 用戶 ${userId} 取消關注`);

  // 更新 LINE 用戶狀態
  try {
    const now = new Date().toISOString();
    await execute(
      `UPDATE line_users
       SET "isActive" = 0, "unfollowedAt" = ?, "updatedAt" = ?
       WHERE "lineUserId" = ? AND "organizationId" = ?`,
      [now, now, userId, config.organizationId]
    );
  } catch (error) {
    console.error('更新 LINE 用戶狀態失敗:', error);
  }
}

/**
 * 處理預約查詢
 */
async function handleAppointmentQuery(patient, config) {
  try {
    const appointments = await queryAll(
      `SELECT * FROM appointments
       WHERE "patientId" = ? AND "organizationId" = ? AND status = 'scheduled'
       ORDER BY date ASC, time ASC
       LIMIT 5`,
      [patient.id, config.organizationId]
    );

    if (appointments.length === 0) {
      return '您目前沒有預約記錄。\n\n如需預約，請聯絡我們的服務人員。';
    }

    let message = '📅 您的預約記錄：\n\n';

    appointments.forEach((apt, index) => {
      const date = new Date(apt.date).toLocaleDateString('zh-TW');
      message += `${index + 1}. ${date} ${apt.time} - ${apt.type}\n`;
      if (apt.notes) {
        message += `   備註：${apt.notes}\n`;
      }
    });

    message += '\n如需變更預約，請聯絡我們的服務人員。';

    return message;
  } catch (error) {
    console.error('查詢預約失敗:', error);
    return '抱歉，查詢預約時發生錯誤，請稍後再試。';
  }
}

module.exports = router;

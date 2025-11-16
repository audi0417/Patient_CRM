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
 * POST /api/line/webhook
 * Line Bot Webhook 端點
 */
router.post('/', async (req, res) => {
  try {
    // 1. 取得簽名和 body
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.status(401).json({ error: '缺少 X-Line-Signature' });
    }

    // 2. 驗證簽名（嘗試所有活躍的 Line 配置）
    const configs = await queryAll('SELECT * FROM line_configs WHERE "isActive" = 1');

    let validConfig = null;
    for (const config of configs) {
      const channelSecret = require('../utils/encryption').decrypt(config.channelSecret);
      const isValid = LineMessagingService.verifySignature(body, signature, channelSecret);

      if (isValid) {
        validConfig = config;
        break;
      }
    }

    if (!validConfig) {
      console.warn('Line Webhook 簽名驗證失敗');
      return res.status(401).json({ error: '簽名驗證失敗' });
    }

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

  // 取得或建立患者
  const patient = await getOrCreatePatient(userId, config);
  if (!patient) {
    console.warn(`找不到或無法建立患者 (Line User ID: ${userId})`);
    return;
  }

  // 取得或建立對話
  const conversation = await LineMessagingService.getOrCreateConversation(
    patient.id,
    config.organizationId
  );

  // 根據訊息類型處理
  switch (message.type) {
    case 'text':
      await handleTextMessage(message, patient, conversation, config, replyToken);
      break;
    case 'sticker':
      await handleStickerMessage(message, patient, conversation, config, replyToken);
      break;
    default:
      console.log(`未處理的訊息類型: ${message.type}`);
  }
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(message, patient, conversation, config, replyToken) {
  const text = message.text;
  const messageId = message.id;

  // 儲存訊息
  await LineMessagingService.saveMessage({
    id: uuidv4(),
    conversationId: conversation.id,
    organizationId: config.organizationId,
    messageType: 'TEXT',
    messageContent: text,
    senderId: patient.id,
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

  if (text.includes('預約') || text.includes('約診')) {
    replyText = await handleAppointmentQuery(patient, config);
  } else if (text.includes('幫助') || text.includes('說明')) {
    replyText = '您好！我是客服機器人。\n\n您可以:\n• 輸入「預約」查詢您的預約記錄\n• 輸入「說明」查看功能介紹\n\n如需進一步協助，請聯絡我們的服務人員。';
  } else {
    replyText = '感謝您的訊息！我們已收到您的留言，客服人員會盡快為您回覆。';
  }

  // 回覆訊息
  if (replyText) {
    await LineMessagingService.replyTextMessage(replyToken, replyText, accessToken);

    // 儲存回覆訊息
    await LineMessagingService.saveMessage({
      id: uuidv4(),
      conversationId: conversation.id,
      organizationId: config.organizationId,
      messageType: 'SYSTEM',
      messageContent: replyText,
      senderId: null,
      recipientId: patient.id,
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
async function handleStickerMessage(message, patient, conversation, config, replyToken) {
  const { packageId, stickerId, id: messageId } = message;

  // 儲存貼圖訊息
  await LineMessagingService.saveMessage({
    id: uuidv4(),
    conversationId: conversation.id,
    organizationId: config.organizationId,
    messageType: 'STICKER',
    messageContent: JSON.stringify({ packageId, stickerId }),
    senderId: patient.id,
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
    recipientId: patient.id,
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

  console.log(`Line 用戶 ${userId} 加入好友`);

  // 取得用戶資料
  const accessToken = require('../utils/encryption').decrypt(config.accessToken);
  const profile = await LineMessagingService.getUserProfile(userId, accessToken);

  // 建立或更新患者
  const patient = await getOrCreatePatient(userId, config, profile);

  if (patient) {
    // 發送歡迎訊息
    const welcomeMessage = `歡迎使用我們的 Line 服務！\n\n您已成功綁定帳號，可以透過 Line 與我們聯繫。\n\n輸入「說明」查看可用功能。`;

    await LineMessagingService.pushTextMessage(userId, welcomeMessage, config);

    // 建立對話並儲存歡迎訊息
    const conversation = await LineMessagingService.getOrCreateConversation(
      patient.id,
      config.organizationId
    );

    await LineMessagingService.saveMessage({
      id: uuidv4(),
      conversationId: conversation.id,
      organizationId: config.organizationId,
      messageType: 'SYSTEM',
      messageContent: welcomeMessage,
      senderId: null,
      recipientId: patient.id,
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

  console.log(`Line 用戶 ${userId} 取消關注`);

  // 可選：更新患者狀態或記錄日誌
  // 不刪除患者資料，保留歷史記錄
}

/**
 * 取得或建立患者
 */
async function getOrCreatePatient(lineUserId, config, profile = null) {
  try {
    // 查詢現有患者
    let patient = await queryOne(
      'SELECT * FROM patients WHERE "lineUserId" = ? AND "organizationId" = ?',
      [lineUserId, config.organizationId]
    );

    if (patient) {
      return patient;
    }

    // 建立新患者（如有提供 profile）
    if (profile) {
      const id = uuidv4();
      const now = new Date().toISOString();

      await execute(
        `INSERT INTO patients (
          id, name, "lineUserId", "organizationId", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          profile.displayName || `Line 用戶 ${lineUserId.slice(-8)}`,
          lineUserId,
          config.organizationId,
          now,
          now
        ]
      );

      patient = await queryOne('SELECT * FROM patients WHERE id = ?', [id]);
    }

    return patient;
  } catch (error) {
    console.error('取得或建立患者失敗:', error);
    return null;
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

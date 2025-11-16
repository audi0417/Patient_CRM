# Line 訊息整合功能

Patient CRM 系統整合了 Line 官方帳號(Line@)功能,讓醫療機構可以透過 Line 與患者進行即時溝通。

## 功能特色

### ✅ 核心功能

- **一對一綁定**: 每個組織(客戶)對應一個 Line@ 帳號
- **模組化設計**: 透過模組系統開啟/關閉 Line 功能
- **安全加密**: Channel Secret 和 Access Token 使用 AES-256-GCM 加密儲存
- **雙向訊息**: 支援文字訊息和貼圖的接收與發送
- **自動綁定**: 用戶加入好友時自動建立患者記錄
- **對話管理**: 完整的對話記錄和未讀訊息追蹤
- **預約查詢**: 患者可透過 Line 查詢預約資訊
- **訊息限制**: 支援每日/每月訊息發送限制,防止濫用

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    Line Platform                        │
│                  (Messaging API)                        │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         Webhook    Profile API  Push API
              │          │          │
              ▼          ▼          ▼
┌──────────────────────────────────────────────────────────┐
│              Patient CRM Backend                         │
├──────────────────────────────────────────────────────────┤
│  API 層                                                  │
│  ├─ /api/line/config      (配置管理)                    │
│  ├─ /api/line/webhook     (訊息接收)                    │
│  ├─ /api/line/conversations (對話列表)                  │
│  ├─ /api/line/send/text   (發送文字)                    │
│  └─ /api/line/send/sticker (發送貼圖)                   │
│                                                          │
│  服務層                                                  │
│  ├─ LineMessagingService  (核心服務)                    │
│  └─ Encryption Utils      (加密工具)                    │
│                                                          │
│  資料層                                                  │
│  ├─ line_configs          (Line 配置)                   │
│  ├─ conversations         (對話記錄)                    │
│  ├─ line_messages         (訊息記錄)                    │
│  └─ patients.lineUserId   (用戶綁定)                    │
└──────────────────────────────────────────────────────────┘
```

## 快速開始

### 1. 準備 Line 官方帳號

1. 前往 [Line Developers Console](https://developers.line.biz/)
2. 建立 Provider 和 Messaging API Channel
3. 取得以下資訊:
   - **Channel ID**: 頻道 ID
   - **Channel Secret**: 頻道密鑰
   - **Channel Access Token**: 長期存取權杖

### 2. 設定環境變數

確保 `.env` 檔案中已設定加密金鑰:

```bash
# 用於加密 Line Channel Secret 等敏感資料
ENCRYPTION_KEY=your_32_character_encryption_key_here

# 生成方式:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 執行資料庫 Migration

```bash
# 執行 migration 建立 Line 相關表
node server/database/migrate.js up
```

這會建立以下資料表:
- `line_configs` - Line 配置
- `conversations` - 對話管理
- `line_messages` - 訊息記錄
- `patients.lineUserId` - 用戶綁定欄位

### 4. 啟用 Line 模組

以管理員身份登入系統,前往組織管理頁面啟用「Line 訊息互動」模組。

### 5. 配置 Line Channel

透過 API 或前端介面設定 Line 配置:

```bash
POST /api/line/config
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "channelId": "2008189666",
  "channelSecret": "your_channel_secret",
  "accessToken": "your_long_lived_access_token",
  "webhookUrl": "https://your-domain.com/api/line/webhook",
  "dailyMessageLimit": 1000,
  "monthlyMessageLimit": 30000
}
```

### 6. 設定 Line Webhook

在 Line Developers Console 中設定 Webhook URL:

```
https://your-domain.com/api/line/webhook
```

並啟用 Webhook。

## API 使用說明

### 取得 Line 配置

```bash
GET /api/line/config
Authorization: Bearer <jwt_token>
```

回應範例:
```json
{
  "success": true,
  "data": {
    "id": "config-id",
    "organizationId": "org-id",
    "channelId": "2008189666",
    "isActive": true,
    "isVerified": true,
    "messagesSentToday": 10,
    "messagesSentThisMonth": 150,
    "dailyMessageLimit": 1000,
    "monthlyMessageLimit": 30000
  }
}
```

### 發送文字訊息

```bash
POST /api/line/send/text
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "patientId": "patient-id",
  "text": "您好！這是測試訊息。"
}
```

### 發送貼圖

```bash
POST /api/line/send/sticker
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "patientId": "patient-id",
  "packageId": "1",
  "stickerId": "1"
}
```

### 取得對話列表

```bash
GET /api/line/conversations?status=ACTIVE&limit=50&offset=0
Authorization: Bearer <jwt_token>
```

### 取得對話訊息

```bash
GET /api/line/conversations/{conversationId}/messages?limit=100&offset=0
Authorization: Bearer <jwt_token>
```

## Webhook 事件處理

系統會自動處理以下 Line 事件:

### 1. Message 事件(訊息接收)

**文字訊息**:
- 自動儲存到 `line_messages` 表
- 關鍵字偵測:
  - 「預約」「約診」→ 查詢預約記錄
  - 「幫助」「說明」→ 顯示功能說明
  - 其他 → 預設回應

**貼圖訊息**:
- 儲存貼圖資訊(packageId, stickerId)
- 自動回覆友善訊息

### 2. Follow 事件(加入好友)

- 自動取得用戶資料(displayName, pictureUrl)
- 建立患者記錄並綁定 lineUserId
- 發送歡迎訊息

### 3. Unfollow 事件(取消關注)

- 記錄日誌
- 保留患者資料(不刪除)

## 資料庫 Schema

### line_configs 表

儲存組織的 Line 配置:

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | TEXT | 配置 ID (主鍵) |
| organizationId | TEXT | 組織 ID (唯一) |
| channelId | TEXT | Line Channel ID |
| channelSecret | TEXT | Channel Secret (加密) |
| accessToken | TEXT | Access Token (加密) |
| webhookUrl | TEXT | Webhook URL |
| isActive | BOOLEAN | 是否啟用 |
| isVerified | BOOLEAN | 是否驗證成功 |
| messagesSentToday | INTEGER | 今日已發送訊息數 |
| messagesSentThisMonth | INTEGER | 本月已發送訊息數 |
| totalMessagesSent | INTEGER | 總發送訊息數 |
| totalMessagesReceived | INTEGER | 總接收訊息數 |
| dailyMessageLimit | INTEGER | 每日限制 (預設 1000) |
| monthlyMessageLimit | INTEGER | 每月限制 (預設 30000) |
| lastActivityAt | TIMESTAMP | 最後活動時間 |
| lastError | TEXT | 最後錯誤訊息 |
| errorCount | INTEGER | 錯誤計數 |

### conversations 表

管理與患者的對話:

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | TEXT | 對話 ID (主鍵) |
| patientId | TEXT | 患者 ID |
| organizationId | TEXT | 組織 ID |
| status | TEXT | 狀態 (ACTIVE, ARCHIVED, CLOSED) |
| priority | TEXT | 優先級 (LOW, MEDIUM, HIGH, URGENT) |
| unreadCount | INTEGER | 未讀訊息數 |
| lastMessageAt | TIMESTAMP | 最後訊息時間 |
| lastMessagePreview | TEXT | 最後訊息預覽 |

### line_messages 表

儲存所有訊息記錄:

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | TEXT | 訊息 ID (主鍵) |
| conversationId | TEXT | 對話 ID |
| organizationId | TEXT | 組織 ID |
| messageType | TEXT | 訊息類型 (TEXT, STICKER, IMAGE, SYSTEM) |
| messageContent | TEXT | 訊息內容 (JSON) |
| senderId | TEXT | 發送者 ID |
| recipientId | TEXT | 接收者 ID |
| senderType | TEXT | 發送者類型 (PATIENT, ADMIN, SYSTEM) |
| recipientType | TEXT | 接收者類型 (PATIENT, ADMIN) |
| lineMessageId | TEXT | Line 訊息 ID |
| replyToken | TEXT | 回覆 Token |
| status | TEXT | 狀態 (SENT, DELIVERED, READ, FAILED) |
| sentAt | TIMESTAMP | 發送時間 |
| deliveredAt | TIMESTAMP | 送達時間 |
| readAt | TIMESTAMP | 已讀時間 |
| isReply | BOOLEAN | 是否為回覆 |
| quotedMessageId | TEXT | 被引用的訊息 ID |
| metadata | TEXT | 後設資料 (JSON) |

## 安全性考量

### 1. 加密儲存

所有敏感資料使用 AES-256-GCM 加密:
- Channel Secret
- Access Token

加密格式: `iv:authTag:encrypted`

### 2. 簽名驗證

所有 Webhook 請求都會驗證 `X-Line-Signature`:
```javascript
signature = base64(HMAC-SHA256(channel_secret, body))
```

### 3. 多租戶隔離

- 每個組織的 Line 配置完全隔離
- 患者只能綁定到所屬組織的 Line 帳號
- API 請求自動注入 organizationId 過濾

### 4. 訊息限制

- 每日訊息限制(預設 1000)
- 每月訊息限制(預設 30000)
- 防止訊息濫用和超額費用

## 常見 Line 貼圖

系統支援 Line 官方貼圖,常用貼圖包:

| Package ID | 名稱 | 說明 |
|------------|------|------|
| 1 | 基本表情 | 開心、愛心、生氣等 |
| 2 | Moon 表情 | 月亮系列貼圖 |
| 789 | Sally 特別版 | Sally 角色貼圖 |
| 446 | 饅頭人(特別篇) | 饅頭人系列 |

貼圖 URL 格式:
```
https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png
```

## 測試清單

### 基本功能測試

- [ ] 建立 Line 配置
- [ ] 驗證 Access Token 有效性
- [ ] 加密/解密敏感資料
- [ ] 設定 Webhook URL

### 訊息測試

- [ ] 用戶加入好友(Follow 事件)
- [ ] 接收文字訊息
- [ ] 接收貼圖訊息
- [ ] 發送文字訊息給患者
- [ ] 發送貼圖給患者
- [ ] 訊息儲存到資料庫

### 關鍵字測試

- [ ] 輸入「預約」→ 顯示預約記錄
- [ ] 輸入「幫助」→ 顯示功能說明
- [ ] 輸入其他文字 → 預設回應

### 整合測試

- [ ] 患者綁定 Line 帳號
- [ ] 對話自動建立
- [ ] 未讀訊息計數
- [ ] 訊息統計更新
- [ ] 訊息限制檢查

## 故障排除

### 1. Webhook 簽名驗證失敗

**原因**: Channel Secret 不正確或未加密

**解決**:
```bash
# 重新設定 Line 配置
POST /api/line/config
{
  "channelSecret": "correct_channel_secret"
}
```

### 2. 無法發送訊息

**原因**: Access Token 過期或無效

**檢查**:
```bash
# 驗證 Token
curl -X GET https://api.line.me/v2/bot/info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. 患者未綁定 Line

**原因**: 用戶未加入好友或 lineUserId 遺失

**解決**: 請用戶重新加入 Line 好友

### 4. 訊息超過限制

**原因**: 達到每日/每月限制

**檢查**:
```sql
SELECT messagesSentToday, messagesSentThisMonth,
       dailyMessageLimit, monthlyMessageLimit
FROM line_configs
WHERE organizationId = 'your_org_id';
```

## 效能優化

### 1. 索引優化

系統已建立以下索引:
- `idx_line_configs_org` - 組織 ID
- `idx_conversations_org` - 組織 ID + 狀態
- `idx_line_messages_conversation` - 對話 ID + 發送時間
- `idx_patients_org_line` - 組織 ID + Line User ID

### 2. 批次處理

Webhook 事件批次處理,減少資料庫連線數。

### 3. 快取策略

Line 配置在記憶體中快取,減少資料庫查詢。

## 未來擴充

計劃中的功能:

- [ ] Rich Menu 管理
- [ ] Flex Message 支援
- [ ] 圖片訊息處理
- [ ] 群組訊息支援
- [ ] 訊息範本管理
- [ ] 自動回覆規則
- [ ] Line Login 整合
- [ ] LIFF App 支援

## 相關資源

- [Line Messaging API 官方文檔](https://developers.line.biz/en/docs/messaging-api/)
- [Line Developers Console](https://developers.line.biz/)
- [Line 官方貼圖列表](https://developers.line.biz/en/docs/messaging-api/sticker-list/)

## 授權與支援

本功能為 Patient CRM 系統的一部分,遵循相同的授權條款。

如需技術支援,請聯繫開發團隊。

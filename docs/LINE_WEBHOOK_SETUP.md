# LINE Webhook 設定指南

## 架構說明

本系統採用 **單一端點 + 組織 ID 區分** 的架構設計：

```
https://your-domain.com/api/line/webhook/:organizationId
```

### 為什麼這樣設計？

1. **效能最佳化** - 直接定位組織配置，無需循環查詢
2. **可追蹤性** - 日誌中清楚顯示是哪個組織的請求
3. **符合 LINE 設計** - 每個 LINE Channel 對應一個組織
4. **易於管理** - 新增組織無需修改基礎設施

---

## 設定步驟

### 1. 取得組織 ID

登入系統後，在資料庫中查詢您的組織 ID：

```sql
SELECT id, name FROM organizations;
```

或透過 API：

```bash
GET /api/organizations/current
```

範例回應：
```json
{
  "id": "org-a1b2c3d4-e5f6-7890",
  "name": "台北診所"
}
```

### 2. 在 LINE Developers 控制台設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Messaging API Channel
3. 點選「Messaging API」分頁
4. 找到「Webhook settings」區塊
5. 設定 Webhook URL：

```
https://your-domain.com/api/line/webhook/org-a1b2c3d4-e5f6-7890
                                          ↑
                                    您的組織 ID
```

6. 啟用「Use webhook」
7. 點選「Verify」測試連線

### 3. 在系統中配置 LINE

使用管理員帳號登入系統，前往「LINE 設定」頁面：

1. 輸入 **Channel ID**
2. 輸入 **Channel Secret**
3. 輸入 **Access Token** (Long-lived Channel Access Token)
4. 點選「儲存」

系統會自動：
- 驗證 Access Token 有效性
- 生成 Webhook URL
- 顯示完整的 Webhook URL 供您複製

---

## 開發環境設定

### 使用 ngrok 建立公開 URL

LINE Webhook 需要公開的 HTTPS URL，開發時可使用 ngrok：

```bash
# 安裝 ngrok
brew install ngrok

# 啟動本地伺服器
npm run dev

# 在另一個終端視窗
ngrok http 3001
```

ngrok 會提供一個臨時 URL，例如：
```
https://abc123.ngrok.io
```

將這個 URL 設定到 LINE：
```
https://abc123.ngrok.io/api/line/webhook/your-org-id
```

---

## 生產環境設定

### 環境變數配置

在 `.env` 檔案中設定：

```bash
# 您的實際域名
API_ENDPOINT=https://your-domain.com

# 範例
API_ENDPOINT=https://crm.hospital.com
```

系統會自動生成完整的 Webhook URL：
```
https://crm.hospital.com/api/line/webhook/{organizationId}
```

---

## 驗證與測試

### 1. 查看系統日誌

啟動伺服器後，當 LINE 發送事件時，您會看到：

```
[Webhook] 簽名驗證成功 - 組織: org-xxx, 事件數: 1
```

### 2. LINE 驗證功能

在 LINE Developers Console 點選「Verify」：

- ✅ **Success** - Webhook 設定正確
- ❌ **Failed** - 檢查以下項目：
  - URL 是否正確（包含組織 ID）
  - 伺服器是否運行中
  - 是否有防火牆阻擋
  - Channel Secret 是否正確

### 3. 發送測試訊息

1. 在 LINE App 中掃描您的 LINE@ QR Code
2. 加入好友
3. 發送訊息「測試」
4. 應該收到自動回覆

---

## 常見問題

### Q1: 簽名驗證失敗

**原因：** Channel Secret 不正確

**解決：**
1. 前往 LINE Developers Console
2. 確認 Channel Secret
3. 在系統中重新設定

### Q2: 找不到組織配置

**原因：** 組織 ID 錯誤或配置未啟用

**解決：**
1. 確認 URL 中的組織 ID 正確
2. 在系統中確認 LINE 模組已啟用
3. 檢查資料庫中的 `line_configs` 表

```sql
SELECT * FROM line_configs WHERE "organizationId" = 'your-org-id';
```

### Q3: Webhook 沒有收到事件

**檢查清單：**
- [ ] LINE Webhook URL 設定正確
- [ ] LINE Webhook 已啟用
- [ ] 伺服器正在運行
- [ ] 防火牆允許 LINE 伺服器連線
- [ ] SSL 憑證有效（生產環境）

### Q4: 如何查看詳細日誌？

修改環境變數：

```bash
LOG_LEVEL=debug
```

重啟伺服器後會顯示更詳細的日誌。

---

## 多組織範例

如果您管理多個組織：

| 組織 | 組織 ID | Webhook URL |
|------|---------|-------------|
| 台北診所 | `org-taipei-001` | `https://your-domain.com/api/line/webhook/org-taipei-001` |
| 台中醫院 | `org-taichung-002` | `https://your-domain.com/api/line/webhook/org-taichung-002` |
| 高雄診所 | `org-kaohsiung-003` | `https://your-domain.com/api/line/webhook/org-kaohsiung-003` |

每個組織都有：
- 獨立的 LINE Official Account
- 獨立的 Channel ID/Secret
- 獨立的 Webhook URL
- 獨立的病患資料

---

## 安全性建議

1. **使用 HTTPS** - 生產環境必須使用 SSL 憑證
2. **保護 Channel Secret** - 加密儲存，不要寫入日誌
3. **驗證簽名** - 系統會自動驗證每個請求的簽名
4. **限制 IP** - 可選：只允許 LINE 伺服器 IP
5. **監控異常** - 設定錯誤告警

---

## 技術細節

### Webhook 請求流程

```
LINE 平台
    ↓ POST /api/line/webhook/:organizationId
    ↓ Headers: X-Line-Signature
    ↓
[1] 取得 organizationId 參數
    ↓
[2] 查詢該組織的 LINE 配置
    ↓
[3] 使用 Channel Secret 驗證簽名
    ↓
[4] 處理事件（訊息、Follow、Unfollow）
    ↓
[5] 儲存訊息記錄
    ↓
[6] 自動回覆（根據關鍵字）
    ↓
[7] 更新統計資料
    ↓
回應 200 OK 給 LINE
```

### 簽名驗證演算法

```javascript
const signature = HMAC-SHA256(request_body, channel_secret)
const header = `sha256=${base64(signature)}`
```

---

## 相關文件

- [LINE Messaging API 官方文件](https://developers.line.biz/en/docs/messaging-api/)
- [Webhook 事件參考](https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects)
- [訊息類型參考](https://developers.line.biz/en/reference/messaging-api/#message-objects)

---

## 支援

如有問題，請：
1. 查看伺服器日誌
2. 檢查 LINE Developers Console 的錯誤訊息
3. 參考本文件的常見問題章節
4. 聯繫系統管理員

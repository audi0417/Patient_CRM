/**
 * LINE 配置管理頁面
 * 讓管理員設定 LINE Channel 資訊
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { lineApi, LineConfig, LineConfigInput } from '@/lib/api/lineApi';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Save, Trash2, Copy, ExternalLink, Check, Zap, ZapOff } from 'lucide-react';

const LineSettings = () => {
  const [config, setConfig] = useState<LineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [formData, setFormData] = useState<LineConfigInput>({
    channelId: '',
    channelSecret: '',
    accessToken: '',
    webhookUrl: '',
    dailyMessageLimit: 1000,
    monthlyMessageLimit: 30000,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // 載入現有配置
  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await lineApi.config.get();

      if (response.success && response.data) {
        setConfig(response.data);
        setFormData({
          channelId: response.data.channelId,
          channelSecret: '', // 安全考量，不顯示
          accessToken: '', // 安全考量，不顯示
          webhookUrl: response.data.webhookUrl || '',
          dailyMessageLimit: response.data.dailyMessageLimit,
          monthlyMessageLimit: response.data.monthlyMessageLimit,
        });
      }
    } catch (error: unknown) {
      // 沒有配置是正常的，不需要顯示錯誤
      const message = error instanceof Error ? error.message : '未知錯誤';
      if (!message.includes('404')) {
        toast({
          title: '載入失敗',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 驗證必填欄位
    if (!formData.channelId || !formData.channelSecret || !formData.accessToken) {
      toast({
        title: '資料不完整',
        description: '請填寫所有必填欄位',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await lineApi.config.save(formData);

      if (response.success) {
        toast({
          title: '儲存成功',
          description: 'LINE 配置已更新',
        });
        await loadConfig();
      }
    } catch (error: unknown) {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setShowDisableDialog(false);
    try {
      setSaving(true);
      const response = await lineApi.config.disable();

      if (response.success) {
        toast({
          title: '已停用',
          description: 'LINE 整合已停用',
        });
        setConfig(null);
        setFormData({
          channelId: '',
          channelSecret: '',
          accessToken: '',
          webhookUrl: '',
          dailyMessageLimit: 1000,
          monthlyMessageLimit: 30000,
        });
      }
    } catch (error: unknown) {
      toast({
        title: '操作失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = async () => {
    if (!config?.webhookUrl) return;

    try {
      await navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      toast({
        title: '已複製',
        description: 'Webhook URL 已複製到剪貼簿',
      });

      // 2 秒後重置圖示
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: '複製失敗',
        description: '請手動複製 URL',
        variant: 'destructive',
      });
    }
  };

  const testWebhook = async () => {
    if (!config?.webhookUrl) return;

    try {
      setTesting(true);

      // 發送測試請求到我們的 webhook 端點
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Line-Signature': 'test-signature'
        },
        body: JSON.stringify({
          events: []
        })
      });

      if (response.status === 401) {
        // 401 表示簽名驗證失敗，但端點存在
        toast({
          title: '✅ Webhook 端點運作正常',
          description: '路由已正確註冊，簽名驗證機制正常運作。現在可以在 LINE Developers Console 設定此 URL。',
        });
      } else if (response.status === 404) {
        toast({
          title: '❌ Webhook 端點不存在',
          description: '路由未找到。請確認：1) 伺服器正在運行 2) 組織 ID 正確 3) 路由已正確註冊',
          variant: 'destructive',
        });
      } else if (response.ok) {
        toast({
          title: '✅ Webhook 完全正常',
          description: 'Webhook 端點已就緒並通過所有測試',
        });
      } else {
        toast({
          title: `⚠️ 收到非預期回應 (${response.status})`,
          description: '端點存在但返回異常狀態碼，請檢查伺服器日誌',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知錯誤';
      if (errMsg.includes('Failed to fetch')) {
        toast({
          title: '❌ 無法連線到伺服器',
          description: `無法連接到 ${config.webhookUrl.split('/api')[0]}。請確認：1) 伺服器正在運行 2) API_ENDPOINT 環境變數正確 3) 沒有防火牆阻擋`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '❌ 測試失敗',
          description: `錯誤訊息：${errMsg}`,
          variant: 'destructive',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LINE 整合設定</h1>
        <p className="text-muted-foreground mt-2">
          設定 LINE 官方帳號的連線資訊
        </p>
      </div>

      {/* Webhook URL 卡片 */}
      {config?.webhookUrl && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <CardTitle>Webhook URL</CardTitle>
                  <CardDescription className="mt-1">
                    將此 URL 設定到 LINE Developers Console
                  </CardDescription>
                </div>
              </div>

              {/* 狀態燈號 */}
              <div className="flex items-center gap-2 sm:shrink-0">
                {config.isActive ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">已啟用</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 rounded-full">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-400">未啟用</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL 顯示區 */}
            <div className="relative group">
              <div className="p-4 bg-muted/50 border-2 border-dashed border-primary/20 rounded-lg hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">您的專屬 Webhook URL</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">可選取複製</Badge>
                    </div>
                    <p className="font-mono text-sm break-all select-all text-foreground leading-relaxed">
                      {config.webhookUrl}
                    </p>
                  </div>
                </div>
              </div>
              {/* 懸浮提示 */}
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-md shadow-lg">
                  點選文字可複製
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={copied ? "default" : "outline"}
                onClick={copyWebhookUrl}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    複製 URL
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={testWebhook}
                disabled={testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    測試中...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    測試連線
                  </>
                )}
              </Button>
            </div>

            {/* 設定提示 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>快速設定：</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>點選「複製 URL」按鈕</li>
                  <li>前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">LINE Developers Console</a></li>
                  <li>選擇您的 Messaging API Channel</li>
                  <li>在「Messaging API」→「Webhook settings」貼上 URL</li>
                  <li>啟用「Use webhook」開關</li>
                  <li>點選「Verify」按鈕（應顯示 Success）</li>
                  <li>回到本頁面點選「測試連線」確認</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 狀態卡片 */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>整合狀態</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">連線狀態</span>
              {config.isActive ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已啟用
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  已停用
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">驗證狀態</span>
              {config.isVerified ? (
                <Badge variant="default" className="bg-blue-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已驗證
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  未驗證
                </Badge>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">今日訊息</p>
                <p className="text-2xl font-bold">
                  {config.messagesSentToday} / {config.dailyMessageLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">本月訊息</p>
                <p className="text-2xl font-bold">
                  {config.messagesSentThisMonth} / {config.monthlyMessageLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累計發送</p>
                <p className="text-2xl font-bold">{config.totalMessagesSent}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累計接收</p>
                <p className="text-2xl font-bold">{config.totalMessagesReceived}</p>
              </div>
            </div>

            {config.lastError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>最後錯誤:</strong> {config.lastError}
                  {config.lastErrorAt && (
                    <span className="block text-xs mt-1">
                      發生時間: {new Date(config.lastErrorAt).toLocaleString('zh-TW')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 配置表單 */}
      <Card>
        <CardHeader>
          <CardTitle>LINE Channel 設定</CardTitle>
          <CardDescription>
            請至 LINE Developers Console 取得以下資訊
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelId">
              Channel ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="channelId"
              value={formData.channelId}
              onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
              placeholder="例如: 2008189666"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channelSecret">
              Channel Secret <span className="text-red-500">*</span>
            </Label>
            <Input
              id="channelSecret"
              type="password"
              value={formData.channelSecret}
              onChange={(e) => setFormData({ ...formData, channelSecret: e.target.value })}
              placeholder={config ? '留空表示不修改' : '輸入 Channel Secret'}
            />
            {config && (
              <p className="text-xs text-muted-foreground">
                基於安全考量，已儲存的 Secret 不會顯示。留空表示保持原值。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Channel Access Token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accessToken"
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder={config ? '留空表示不修改' : '輸入 Channel Access Token'}
            />
            {config?.accessTokenPreview && (
              <p className="text-xs text-muted-foreground">
                目前 Token: {config.accessTokenPreview}
              </p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">每日訊息限制</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={formData.dailyMessageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, dailyMessageLimit: parseInt(e.target.value) })
                }
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">每月訊息限制</Label>
              <Input
                id="monthlyLimit"
                type="number"
                value={formData.monthlyMessageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyMessageLimit: parseInt(e.target.value) })
                }
                min={0}
              />
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>提示:</strong> 請確保已在 LINE Developers Console 啟用 Messaging API
              並正確設定 Webhook URL。
            </AlertDescription>
          </Alert>

          <div className="flex justify-between pt-4">
            <div>
              {config && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  停用整合
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/settings')}
                disabled={saving}
              >
                返回
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    儲存設定
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 設定指南 */}
      <Card>
        <CardHeader>
          <CardTitle>完整設定指南</CardTitle>
          <CardDescription>
            從零開始設定 LINE 官方帳號整合
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">步驟 1: 建立 LINE Channel</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LINE Developers Console</a></li>
              <li>選擇或建立一個 Provider</li>
              <li>建立一個 Messaging API Channel</li>
              <li>填寫基本資訊（名稱、描述、圖示等）</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">步驟 2: 取得認證資訊</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>在 Channel「Basic settings」分頁取得 <strong>Channel ID</strong></li>
              <li>在同一頁面取得 <strong>Channel Secret</strong></li>
              <li>前往「Messaging API」分頁</li>
              <li>點選「Issue」發行 <strong>Channel Access Token (長期)</strong></li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">步驟 3: 在本系統設定</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>將上方取得的 Channel ID、Channel Secret 和 Access Token 填入表單</li>
              <li>設定每日和每月訊息限制（可選）</li>
              <li>點選「儲存設定」按鈕</li>
              <li>系統會自動生成專屬的 Webhook URL</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">步驟 4: 設定 Webhook</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>從上方「Webhook URL」卡片複製系統生成的 URL</li>
              <li>回到 LINE Developers Console 的「Messaging API」分頁</li>
              <li>在「Webhook settings」區塊貼上 URL</li>
              <li>點選「Update」儲存</li>
              <li>啟用「Use webhook」開關</li>
              <li>點選「Verify」按鈕測試連線（應顯示 Success）</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">步驟 5: 關閉自動回覆</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
              <li>在「Messaging API」分頁向下捲動</li>
              <li>關閉「Auto-reply messages」（自動回應訊息）</li>
              <li>關閉「Greeting messages」（加入好友的歡迎訊息，可選）</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">完成！開始測試</h3>
            <p className="text-sm text-muted-foreground mb-2">
              使用 LINE App 掃描您的 LINE@ QR Code，加入好友後發送訊息測試。
            </p>
            <p className="text-sm text-muted-foreground">
              您應該會收到系統的自動回覆，訊息也會顯示在本系統的對話記錄中。
            </p>
          </div>
        </CardContent>
      </Card>
      {/* 停用確認對話框 */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要停用 LINE 整合？</AlertDialogTitle>
            <AlertDialogDescription>
              停用後將無法接收和發送 LINE 訊息。您可以隨時重新啟用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認停用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LineSettings;

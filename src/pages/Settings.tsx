import { useState } from "react";
import { DatabaseManagement } from "@/components/DatabaseManagement";
import GroupManagement from "@/components/GroupManagement";
import ServiceTypeManagement from "@/components/ServiceTypeManagement";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import LineSettingsContent from "@/components/LineSettingsContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Users, Shield, Palette, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/hooks/useModules";
import { cn } from "@/lib/utils";

type SettingTab = "account" | "data" | "integration" | "system";

export default function Settings() {
  const isElectron = window.electronAPI?.isElectron === true;
  const appVersion = "1.0.0";
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();
  const [activeTab, setActiveTab] = useState<SettingTab>("account");

  // 超級管理員不需要看到群組管理和服務類別管理（企業層級功能）
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const menuItems = [
    { id: "account" as SettingTab, label: "帳號安全", icon: Shield },
    { id: "data" as SettingTab, label: "資料管理", icon: Users },
    ...(isModuleEnabled('lineMessaging') && isAdmin ? [{ id: "integration" as SettingTab, label: "整合設定", icon: MessageSquare }] : []),
    { id: "system" as SettingTab, label: "系統資訊", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">系統設定</h1>
          <p className="text-muted-foreground mt-1">管理您的應用程式設定與資料</p>
        </div>

        <div className="flex gap-6">
          {/* 左側導航 */}
          <aside className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          activeTab === item.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* 右側內容 */}
          <div className="flex-1 space-y-6">

            {/* 帳號安全 */}
            {activeTab === "account" && (
              <Card>
                <CardHeader>
                  <CardTitle>帳號安全</CardTitle>
                  <CardDescription>
                    管理您的帳號安全設定
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">當前登入使用者</p>
                    <p className="text-sm text-muted-foreground">{user?.username} ({user?.name})</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">密碼管理</p>
                    <ChangePasswordDialog />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 資料管理 */}
            {activeTab === "data" && (
              <>
                {/* 群組管理 - 僅組織使用者可見 */}
                {!isSuperAdmin && (
                  <Card>
                    <CardHeader>
                      <CardTitle>群組管理</CardTitle>
                      <CardDescription>
                        建立和管理個案群組以更好地組織和分類
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GroupManagement />
                    </CardContent>
                  </Card>
                )}

                {/* 服務類別管理 - 僅組織使用者可見 */}
                {!isSuperAdmin && (
                  <Card>
                    <CardHeader>
                      <CardTitle>服務類別管理</CardTitle>
                      <CardDescription>
                        管理預約的服務類別及其對應的顏色設定
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ServiceTypeManagement />
                    </CardContent>
                  </Card>
                )}

                {/* 資料庫管理 */}
                <DatabaseManagement />
              </>
            )}

            {/* 整合設定 - 僅在 LINE 模組啟用且為管理員時顯示 */}
            {activeTab === "integration" && isModuleEnabled('lineMessaging') && isAdmin && (
              <LineSettingsContent />
            )}

            {/* 系統資訊 */}
            {activeTab === "system" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>系統資訊</CardTitle>
                    <CardDescription>
                      應用程式版本與環境資訊
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">應用程式名稱</p>
                        <p className="text-sm text-muted-foreground">患者管理系統 (Patient CRM)</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">版本</p>
                        <p className="text-sm text-muted-foreground">v{appVersion}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">運行環境</p>
                        <p className="text-sm text-muted-foreground">
                          {isElectron ? "桌面應用程式 (Electron)" : "網頁應用程式"}
                        </p>
                      </div>
                      {isElectron && (
                        <div>
                          <p className="text-sm font-medium">平台</p>
                          <p className="text-sm text-muted-foreground">
                            {window.electronAPI?.platform === "darwin"
                              ? "macOS"
                              : window.electronAPI?.platform === "win32"
                              ? "Windows"
                              : "Linux"}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>關於本系統</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      患者管理系統是一款專為醫療機構設計的客戶關係管理軟體，提供完整的患者資料管理、
                      健康記錄追蹤、預約排程等功能。
                    </p>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">主要功能</h3>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>完整的患者資料管理（基本資料、聯絡資訊、緊急聯絡人）</li>
                        <li>健康記錄追蹤（體重、血壓、心率、體溫等）</li>
                        <li>預約排程與管理</li>
                        <li>健康數據分析與趨勢圖表</li>
                        <li>資料備份與還原功能</li>
                        <li>多平台支援（Windows、macOS、Linux）</li>
                      </ul>
                    </div>

                    {isElectron && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">資料儲存位置</h3>
                        <p className="text-sm text-muted-foreground">
                          您的資料安全地儲存在本機電腦上，位於應用程式的使用者資料目錄中。
                          所有資料都使用 SQLite 資料庫格式儲存，確保資料的完整性與安全性。
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

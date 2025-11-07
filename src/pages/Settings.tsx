import { DatabaseManagement } from "@/components/DatabaseManagement";
import GroupManagement from "@/components/GroupManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Info, Users } from "lucide-react";

export default function Settings() {
  const isElectron = window.electronAPI?.isElectron === true;
  const appVersion = "1.0.0";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">系統設定</h1>
          <p className="text-muted-foreground">管理您的應用程式設定與資料</p>
        </div>
      </div>

      {/* 群組管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            群組管理
          </CardTitle>
          <CardDescription>
            建立和管理個案群組以更好地組織和分類
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupManagement />
        </CardContent>
      </Card>

      {/* 資料庫管理 */}
      <DatabaseManagement />

      {/* 系統資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            系統資訊
          </CardTitle>
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

      {/* 關於 */}
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
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, Upload, FileJson } from "lucide-react";
import { toast } from "sonner";
import { backupDatabase, restoreDatabase, exportDatabaseJSON } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DatabaseManagement() {
  const isElectron = window.electronAPI?.isElectron === true;

  if (!isElectron) {
    return null; // 只在 Electron 環境顯示
  }

  const handleBackup = async () => {
    try {
      const result = await backupDatabase();
      if (result.success) {
        toast.success("資料庫備份成功", {
          description: `備份檔案已儲存至: ${result.path}`,
        });
      } else {
        toast.info("備份已取消");
      }
    } catch (error) {
      console.error("備份失敗:", error);
      toast.error("備份失敗", {
        description: "無法建立資料庫備份",
      });
    }
  };

  const handleRestore = async () => {
    try {
      const result = await restoreDatabase();
      if (result.success) {
        toast.success("資料庫還原成功", {
          description: "請重新整理頁面以查看還原的資料",
        });
        // 延遲後重新載入頁面
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.info("還原已取消");
      }
    } catch (error) {
      console.error("還原失敗:", error);
      toast.error("還原失敗", {
        description: "無法還原資料庫",
      });
    }
  };

  const handleExportJSON = async () => {
    try {
      const result = await exportDatabaseJSON();
      if (result.success) {
        toast.success("資料匯出成功", {
          description: `資料已匯出至: ${result.path}`,
        });
      } else {
        toast.info("匯出已取消");
      }
    } catch (error) {
      console.error("匯出失敗:", error);
      toast.error("匯出失敗", {
        description: "無法匯出資料",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          資料庫管理
        </CardTitle>
        <CardDescription>
          備份、還原和匯出您的資料
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleBackup}
            variant="outline"
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            備份資料庫
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                還原資料庫
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確認還原資料庫？</AlertDialogTitle>
                <AlertDialogDescription>
                  這將會覆蓋當前的所有資料。在進行此操作前，建議先備份當前資料。
                  此操作無法復原，請確認您選擇的是正確的備份檔案。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>
                  確認還原
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleExportJSON}
            variant="outline"
            className="w-full"
          >
            <FileJson className="mr-2 h-4 w-4" />
            匯出 JSON
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>備份資料庫：</strong> 建立完整的資料庫備份檔案（.db 格式）</p>
          <p><strong>還原資料庫：</strong> 從備份檔案還原資料（會覆蓋現有資料）</p>
          <p><strong>匯出 JSON：</strong> 將所有資料匯出為 JSON 格式，方便閱讀和轉移</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Trash2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { treatmentApi, api } from "@/lib/api";
import type { PackageDetail, PackageItem, ExecutePackageData, PackageUsageLog } from "@/types/treatment";
import type { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  suspended: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  active: "進行中",
  suspended: "已暫停",
  completed: "已完成",
  cancelled: "已取消",
};

export default function TreatmentPackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PackageItem | null>(null);
  const [executeData, setExecuteData] = useState<ExecutePackageData>({
    serviceItemId: 0,
    quantity: 1,
    usageDate: new Date().toISOString().split("T")[0],
    performedBy: "",
    notes: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // 載入方案詳情
  const loadPackageDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await treatmentApi.packages.getById(parseInt(id));
      setPackageDetail(data);
    } catch (error: any) {
      toast({
        title: "載入失敗",
        description: error.message,
        variant: "destructive",
      });
      navigate("/treatment-packages");
    } finally {
      setLoading(false);
    }
  };

  // 載入使用者列表（用於選擇執行人）
  const loadUsers = async () => {
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    loadPackageDetail();
    loadUsers();
  }, [id]);

  // 開啟執行對話框
  const handleExecute = (item: PackageItem) => {
    setSelectedItem(item);
    setExecuteData({
      serviceItemId: item.serviceItemId,
      quantity: 1,
      usageDate: new Date().toISOString().split("T")[0],
      performedBy: user?.id || "",
      notes: "",
    });
    setShowExecuteDialog(true);
  };

  // 執行療程
  const handleSubmitExecute = async () => {
    if (!packageDetail || !selectedItem) return;

    try {
      const remainingQuantity = selectedItem.totalQuantity - selectedItem.usedQuantity;
      if (executeData.quantity > remainingQuantity) {
        toast({
          title: "數量超出",
          description: `剩餘數量僅有 ${remainingQuantity} ${selectedItem.unit}`,
          variant: "destructive",
        });
        return;
      }

      console.log('[Execute] 提交資料:', executeData);
      await treatmentApi.packages.execute(packageDetail.id, executeData);
      toast({
        title: "執行成功",
        description: "療程執行記錄已建立",
      });
      setShowExecuteDialog(false);
      loadPackageDetail();
    } catch (error: any) {
      console.error('[Execute] 失敗:', error);
      toast({
        title: "執行失敗",
        description: error.message || "無法執行療程，請檢查輸入資料",
        variant: "destructive",
      });
    }
  };

  // 刪除使用記錄
  const handleDeleteLog = async (log: PackageUsageLog) => {
    if (!packageDetail) return;
    if (!confirm(`確定要刪除此執行記錄嗎？\n\n將會還原 ${log.quantity} ${log.unit}的使用次數。`)) {
      return;
    }

    try {
      await treatmentApi.packages.deleteUsageLog(packageDetail.id, log.id);
      toast({
        title: "刪除成功",
        description: "執行記錄已刪除，使用次數已還原",
      });
      loadPackageDetail();
    } catch (error: any) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 計算單一項目的使用百分比
  const getItemPercentage = (item: PackageItem) => {
    return Math.round((item.usedQuantity / item.totalQuantity) * 100);
  };

  // 檢查方案是否過期
  const isExpired = () => {
    if (!packageDetail?.expiryDate) return false;
    return new Date(packageDetail.expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (!packageDetail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        {/* 標題列 */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/treatment-packages")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{packageDetail.packageName}</h1>
            <p className="text-muted-foreground mt-1">方案編號：{packageDetail.packageNumber}</p>
          </div>
          <Badge variant={statusColors[packageDetail.status]} className="ml-auto">
            {statusLabels[packageDetail.status]}
          </Badge>
        </div>

        {/* 過期提醒 */}
        {isExpired() && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>方案已過期</AlertTitle>
            <AlertDescription>
              此方案已於 {packageDetail.expiryDate} 過期
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：方案資訊 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>方案資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">病患姓名</p>
                  <p className="text-sm font-semibold">{packageDetail.patientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">開始日期</p>
                  <p className="text-sm">{packageDetail.startDate || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">到期日期</p>
                  <p className="text-sm">{packageDetail.expiryDate || "無期限"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">備註</p>
                  <p className="text-sm">{packageDetail.notes || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">建立時間</p>
                  <p className="text-sm">{new Date(packageDetail.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：項目與記錄 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 服務項目使用狀況 */}
            <Card>
              <CardHeader>
                <CardTitle>服務項目使用狀況</CardTitle>
                <CardDescription>追蹤每個項目的使用進度</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {packageDetail.items.map((item) => (
                  <div key={item.serviceItemId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          已使用 {item.usedQuantity} / {item.totalQuantity} {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getItemPercentage(item)}%
                        </span>
                        {packageDetail.status === "active" && item.usedQuantity < item.totalQuantity && (
                          <Button size="sm" onClick={() => handleExecute(item)}>
                            <Play className="mr-2 h-4 w-4" />
                            執行
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={getItemPercentage(item)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 執行記錄 */}
            <Card>
              <CardHeader>
                <CardTitle>執行記錄</CardTitle>
                <CardDescription>共 {packageDetail.usageLogs?.length || 0} 筆記錄</CardDescription>
              </CardHeader>
              <CardContent>
                {!packageDetail.usageLogs || packageDetail.usageLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">尚無執行記錄</div>
                ) : (
                  <div className="space-y-3">
                    {packageDetail.usageLogs.map((log) => (
                      <div
                        key={log.id}
                        className="border rounded-lg p-4 flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.usageDate}</span>
                          </div>
                          <p className="text-sm">
                            {log.serviceName} × {log.quantity} {log.unit}
                          </p>
                          {log.performedByName && (
                            <p className="text-sm text-muted-foreground">
                              執行人：{log.performedByName}
                            </p>
                          )}
                          {log.notes && (
                            <p className="text-sm text-muted-foreground">備註：{log.notes}</p>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLog(log)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 執行療程對話框 */}
        <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>執行療程</DialogTitle>
              <DialogDescription>
                {selectedItem && `${selectedItem.serviceName}（剩餘 ${selectedItem.totalQuantity - selectedItem.usedQuantity} ${selectedItem.unit}）`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usageDate">執行日期 *</Label>
                <Input
                  id="usageDate"
                  type="date"
                  value={executeData.usageDate}
                  onChange={(e) => setExecuteData({ ...executeData, usageDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">使用數量 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={executeData.quantity}
                  onChange={(e) =>
                    setExecuteData({ ...executeData, quantity: parseFloat(e.target.value) || 1 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {selectedItem && `剩餘：${selectedItem.totalQuantity - selectedItem.usedQuantity} ${selectedItem.unit}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="performedBy">執行人員（選填）</Label>
                <Select
                  value={executeData.performedBy}
                  onValueChange={(value) => setExecuteData({ ...executeData, performedBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇執行人員" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註（選填）</Label>
                <Textarea
                  id="notes"
                  value={executeData.notes}
                  onChange={(e) => setExecuteData({ ...executeData, notes: e.target.value })}
                  placeholder="記錄執行情況、患者反應等"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSubmitExecute}>確定執行</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

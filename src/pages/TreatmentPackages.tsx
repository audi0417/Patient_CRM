import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { treatmentApi } from "@/lib/api";
import { api } from "@/lib/api";
import type { TreatmentPackage, CreatePackageData, PackageItem } from "@/types/treatment";
import type { Patient } from "@/types/patient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PatientCombobox } from "@/components/PatientCombobox";

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

export default function TreatmentPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TreatmentPackage[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [packageName, setPackageName] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ itemName: string; totalQuantity: number }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // 載入療程方案
  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await treatmentApi.packages.getAll();
      setPackages(data || []);
    } catch (error: any) {
      toast({
        title: "載入失敗",
        description: error.message,
        variant: "destructive",
      });
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  // 載入病患列表
  const loadPatients = async () => {
    try {
      const data = await api.patients.getAll();
      setPatients(data || []);
    } catch (error) {
      console.error("Failed to load patients:", error);
      setPatients([]);
    }
  };

  useEffect(() => {
    loadPackages();
    loadPatients();
  }, []);

  // 取得病患名稱
  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient ? patient.name : patientId;
  };

  // 篩選後的方案
  const filteredPackages = packages.filter((pkg) => {
    const patientName = getPatientName(pkg.patientId);
    const matchesSearch =
      pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.packageNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 計算方案的總使用率
  const getUsagePercentage = (items: PackageItem[]) => {
    if (items.length === 0) return 0;
    const totalUsage = items.reduce((sum, item) => {
      return sum + (item.usedQuantity / item.totalQuantity) * 100;
    }, 0);
    return Math.round(totalUsage / items.length);
  };

  // 開啟新增對話框
  const handleAdd = () => {
    setSelectedPatient("");
    setPackageName("");
    setSelectedItems([]);
    setStartDate(new Date().toISOString().split("T")[0]);
    setExpiryDate("");
    setNotes("");
    setShowDialog(true);
  };

  // 新增服務項目到方案
  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { itemName: "", totalQuantity: 1 }]);
  };

  // 移除服務項目
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // 更新項目資料
  const updateItem = (index: number, field: "itemName" | "totalQuantity", value: string | number) => {
    const newItems = [...selectedItems];
    if (field === "itemName") {
      newItems[index].itemName = value as string;
    } else {
      newItems[index].totalQuantity = value as number;
    }
    setSelectedItems(newItems);
  };

  // 建立方案
  const handleCreate = async () => {
    try {
      if (!selectedPatient || !packageName || selectedItems.length === 0) {
        toast({
          title: "驗證失敗",
          description: "請填寫完整資訊並至少選擇一個服務項目",
          variant: "destructive",
        });
        return;
      }

      // 檢查是否有重複的服務項目名稱
      const itemNames = selectedItems.map((item) => item.itemName.trim());
      if (new Set(itemNames).size !== itemNames.length) {
        toast({
          title: "驗證失敗",
          description: "不可重複輸入相同的服務項目",
          variant: "destructive",
        });
        return;
      }

      // 檢查是否所有項目都有名稱
      if (selectedItems.some((item) => !item.itemName.trim())) {
        toast({
          title: "驗證失敗",
          description: "請填寫所有服務項目名稱",
          variant: "destructive",
        });
        return;
      }

      const createData: CreatePackageData = {
        patientId: selectedPatient,
        packageName,
        items: selectedItems,
        startDate: startDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
      };

      await treatmentApi.packages.create(createData);
      toast({
        title: "建立成功",
        description: "療程方案已建立",
      });
      setShowDialog(false);
      loadPackages();
    } catch (error: any) {
      toast({
        title: "建立失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 刪除方案
  const handleDelete = async (pkg: TreatmentPackage) => {
    if (!confirm(`確定要刪除「${pkg.packageName}」嗎？\n\n此操作無法復原！`)) {
      return;
    }

    try {
      await treatmentApi.packages.delete(pkg.id);
      toast({
        title: "刪除成功",
        description: "療程方案已刪除",
      });
      loadPackages();
    } catch (error: any) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 查看詳情
  const handleView = (id: number) => {
    navigate(`/treatment-packages/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">療程方案管理</h1>
          <p className="text-muted-foreground mt-1">管理病患的療程方案，追蹤使用進度</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>療程方案列表</CardTitle>
                <CardDescription>共 {filteredPackages.length} 個方案</CardDescription>
              </div>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                新增療程方案
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* 篩選與搜尋 */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋方案名稱、編號或病患姓名..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有狀態</SelectItem>
                  <SelectItem value="active">進行中</SelectItem>
                  <SelectItem value="suspended">已暫停</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 表格 */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "找不到符合條件的方案" : "尚無療程方案"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>方案編號</TableHead>
                    <TableHead>方案名稱</TableHead>
                    <TableHead>病患</TableHead>
                    <TableHead>包含項目</TableHead>
                    <TableHead>使用進度</TableHead>
                    <TableHead>效期</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-mono text-sm">{pkg.packageNumber}</TableCell>
                      <TableCell className="font-medium">{pkg.packageName}</TableCell>
                      <TableCell>{getPatientName(pkg.patientId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pkg.items.length} 個項目
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={getUsagePercentage(pkg.items)} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {getUsagePercentage(pkg.items)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {pkg.expiryDate ? pkg.expiryDate : "無期限"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[pkg.status]}>
                          {statusLabels[pkg.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleView(pkg.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 新增對話框 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新增療程方案</DialogTitle>
              <DialogDescription>為病患建立新的療程方案</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">病患 *</Label>
                <PatientCombobox
                  patients={patients}
                  value={selectedPatient}
                  onValueChange={setSelectedPatient}
                  placeholder="搜尋病患姓名或電話..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageName">方案名稱 *</Label>
                <Input
                  id="packageName"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="例：復健療程 10 次、產後恢復套餐"
                />
              </div>

              <div className="space-y-2">
                <Label>服務項目 *</Label>
                <div className="space-y-2">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateItem(index, "itemName", e.target.value)}
                        className="flex-1"
                        placeholder="輸入服務項目名稱（例：物理治療、針灸治療）"
                      />

                      <Input
                        type="number"
                        min="1"
                        value={item.totalQuantity}
                        onChange={(e) => updateItem(index, "totalQuantity", parseInt(e.target.value) || 1)}
                        className="w-24"
                        placeholder="數量"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" onClick={handleAddItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    新增項目
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">開始日期（選填）</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">到期日期（選填）</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註（選填）</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="特殊約定、注意事項等"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreate}>建立方案</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

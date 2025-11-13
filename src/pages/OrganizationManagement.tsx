import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Building2,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "basic" | "professional" | "enterprise";
  maxUsers: number;
  maxPatients: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  billingEmail?: string;
  isActive: boolean;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  createdAt: string;
  stats?: {
    users: number;
    patients: number;
  };
}

interface OrganizationFormData {
  name: string;
  slug: string;
  plan: "basic" | "professional" | "enterprise";
  maxUsers: string;
  maxPatients: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingEmail: string;
  isActive: boolean;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
}

const PLAN_LIMITS = {
  basic: { maxUsers: 9999, maxPatients: 100 },
  professional: { maxUsers: 9999, maxPatients: 500 },
  enterprise: { maxUsers: 9999, maxPatients: 99999 }
};

const PLAN_LABELS = {
  basic: "基礎版",
  professional: "專業版",
  enterprise: "企業版"
};

const PLAN_COLORS = {
  basic: "secondary",
  professional: "default",
  enterprise: "destructive"
} as const;

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    slug: "",
    plan: "basic",
    maxUsers: "",
    maxPatients: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    billingEmail: "",
    isActive: true,
    subscriptionStartDate: "",
    subscriptionEndDate: "",
  });
  const [manuallyEditedQuota, setManuallyEditedQuota] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch("/api/organizations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("無法載入組織列表");
      }

      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: error instanceof Error ? error.message : "無法載入組織列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOrg(null);
    setManuallyEditedQuota(false);
    const now = new Date().toISOString().slice(0, 16);
    setFormData({
      name: "",
      slug: "",
      plan: "basic",
      maxUsers: PLAN_LIMITS.basic.maxUsers.toString(),
      maxPatients: PLAN_LIMITS.basic.maxPatients.toString(),
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      billingEmail: "",
      isActive: true,
      subscriptionStartDate: now,
      subscriptionEndDate: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setManuallyEditedQuota(false);

    // 檢查是否為自訂患者配額（不等於預設值）
    const defaultLimits = PLAN_LIMITS[org.plan];
    const isCustomQuota = org.maxPatients !== defaultLimits.maxPatients;
    setManuallyEditedQuota(isCustomQuota);

    setFormData({
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      maxUsers: org.maxUsers.toString(),
      maxPatients: org.maxPatients.toString(),
      contactName: org.contactName || "",
      contactEmail: org.contactEmail || "",
      contactPhone: org.contactPhone || "",
      billingEmail: org.billingEmail || "",
      isActive: org.isActive,
      subscriptionStartDate: org.subscriptionStartDate
        ? new Date(org.subscriptionStartDate).toISOString().slice(0, 16)
        : "",
      subscriptionEndDate: org.subscriptionEndDate
        ? new Date(org.subscriptionEndDate).toISOString().slice(0, 16)
        : "",
    });
    setIsDialogOpen(true);
  };

  const handlePlanChange = (newPlan: "basic" | "professional" | "enterprise") => {
    const limits = PLAN_LIMITS[newPlan];

    // 如果用戶沒有手動編輯過患者配額，則自動更新
    if (!manuallyEditedQuota) {
      setFormData({
        ...formData,
        plan: newPlan,
        maxUsers: limits.maxUsers.toString(),
        maxPatients: limits.maxPatients.toString(),
      });
    } else {
      // 如果已手動編輯，只更新方案和用戶數
      setFormData({
        ...formData,
        plan: newPlan,
        maxUsers: limits.maxUsers.toString(),
      });
    }
  };

  const handleQuotaChange = (value: string) => {
    setManuallyEditedQuota(true);
    setFormData({
      ...formData,
      maxPatients: value,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "驗證失敗",
        description: "組織名稱和識別碼為必填項目",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const url = editingOrg
        ? `/api/organizations/${editingOrg.id}`
        : "/api/organizations";

      const payload = {
        ...formData,
        maxUsers: formData.maxUsers ? parseInt(formData.maxUsers) : undefined,
        maxPatients: formData.maxPatients ? parseInt(formData.maxPatients) : undefined,
        subscriptionStartDate: formData.subscriptionStartDate || undefined,
        subscriptionEndDate: formData.subscriptionEndDate || undefined,
      };

      const response = await fetch(url, {
        method: editingOrg ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "操作失敗");
      }

      toast({
        title: "成功",
        description: editingOrg ? "組織已更新" : "組織已創建",
      });

      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "操作失敗",
        description: error instanceof Error ? error.message : "無法完成操作",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (org: Organization) => {
    // 只有停用狀態才能刪除
    if (org.isActive) {
      toast({
        title: "無法刪除",
        description: "請先停用組織後才能刪除",
        variant: "destructive",
      });
      return;
    }

    setDeletingOrgId(org.id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingOrgId) return;

    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      // 使用 force=true 參數進行硬刪除
      const response = await fetch(`/api/organizations/${deletingOrgId}?force=true`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "刪除失敗");
      }

      toast({
        title: "成功",
        description: "組織已永久刪除",
      });

      setIsDeleteDialogOpen(false);
      setDeletingOrgId(null);
      loadData();
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "無法刪除組織",
        variant: "destructive",
      });
    }
  };

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-[90vw] py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <div className="text-lg text-muted-foreground">載入中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">企業管理</h1>
            <p className="text-muted-foreground">管理所有租戶組織與訂閱方案</p>
          </div>
          <Button size="lg" onClick={handleCreate}>
            <Plus className="mr-2 h-5 w-5" />
            創建組織
          </Button>
        </div>

        {/* 搜尋區域 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋組織名稱、識別碼或聯絡信箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 組織列表 */}
        {filteredOrganizations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "找不到符合的組織" : "尚無組織"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? "請嘗試其他搜尋條件" : "點擊上方按鈕開始創建組織"}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  創建第一個組織
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>組織列表</CardTitle>
              <CardDescription>共 {filteredOrganizations.length} 個組織</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>組織名稱</TableHead>
                      <TableHead>方案</TableHead>
                      <TableHead>患者數</TableHead>
                      <TableHead>聯絡人</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-muted-foreground">{org.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={PLAN_COLORS[org.plan]}>
                            {PLAN_LABELS[org.plan]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {org.stats?.patients || 0}/{org.maxPatients === 99999 ? '∞' : org.maxPatients}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {org.stats?.users || 0} 位用戶
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{org.contactName}</div>
                            <div className="text-xs text-muted-foreground">{org.contactEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              啟用
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              停用
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(org)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(org)}
                              disabled={org.isActive}
                              className={org.isActive ? "opacity-50 cursor-not-allowed" : ""}
                              title={org.isActive ? "請先停用組織後才能刪除" : "刪除組織"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 創建/編輯對話框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? "編輯組織" : "創建新組織"}
              </DialogTitle>
              <DialogDescription>
                {editingOrg
                  ? "更新組織資訊和訂閱方案"
                  : "創建新的租戶組織並設定訂閱方案"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">組織名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="例：台北醫學中心"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">識別碼 (Slug) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="例：taipei-medical"
                    disabled={!!editingOrg}
                  />
                </div>
              </div>

              {/* 訂閱方案與啟用狀態 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">訂閱方案</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">基礎版 (100患者)</SelectItem>
                      <SelectItem value="professional">專業版 (500患者)</SelectItem>
                      <SelectItem value="enterprise">企業版 (無限患者)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">啟用狀態</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      {formData.isActive ? "啟用" : "停用"}
                    </Label>
                  </div>
                </div>
              </div>

              {/* 配額設置 */}
              <div className="space-y-2">
                <Label htmlFor="maxPatients">
                  患者數量上限
                  {manuallyEditedQuota && (
                    <span className="ml-2 text-xs text-amber-600">(已自訂)</span>
                  )}
                </Label>
                <Input
                  id="maxPatients"
                  type="number"
                  value={formData.maxPatients}
                  onChange={(e) => handleQuotaChange(e.target.value)}
                  placeholder="例：500"
                />
                <p className="text-xs text-muted-foreground">
                  用戶帳號數量不限制，可依需求自由創建
                </p>
              </div>

              {/* 訂閱時間設置 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionStartDate">
                    啟用時間 (自動啟用)
                  </Label>
                  <Input
                    id="subscriptionStartDate"
                    type="datetime-local"
                    value={formData.subscriptionStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, subscriptionStartDate: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    設定後將在指定時間自動啟用組織
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionEndDate">
                    停權時間 (自動停用)
                  </Label>
                  <Input
                    id="subscriptionEndDate"
                    type="datetime-local"
                    value={formData.subscriptionEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, subscriptionEndDate: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    設定後將在指定時間自動停用組織
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">聯絡人姓名</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    placeholder="例：王小明"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">聯絡電話</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    placeholder="例：02-1234-5678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">聯絡信箱</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    placeholder="例：contact@taipei-medical.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingEmail">帳務信箱</Label>
                  <Input
                    id="billingEmail"
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, billingEmail: e.target.value })
                    }
                    placeholder="例：billing@taipei-medical.com"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    處理中...
                  </>
                ) : editingOrg ? (
                  "更新組織"
                ) : (
                  "創建組織"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 刪除確認對話框 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認永久刪除組織？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作將<strong className="text-destructive">永久刪除</strong>該組織及其所有相關資料，包括：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>組織下所有用戶帳號</li>
                  <li>所有患者資料</li>
                  <li>預約紀錄、諮詢紀錄</li>
                  <li>健康數據、目標設定</li>
                </ul>
                <p className="mt-3 text-destructive font-semibold">
                  此操作無法復原，請謹慎確認！
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                確認刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default OrganizationManagement;

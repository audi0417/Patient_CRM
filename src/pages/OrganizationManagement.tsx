import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Search,
  TrendingUp,
  AlertCircle,
  Key,
  Copy,
  RefreshCw,
  UserPlus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  isActive: boolean;
  createdAt: string;
  subscriptionEndDate?: string;
  currentUsers?: number;
  currentPatients?: number;
}

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
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [searchTerm, filterPlan, organizations]);

  const fetchOrganizations = async () => {
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

  const filterOrganizations = () => {
    let filtered = organizations;

    if (searchTerm) {
      filtered = filtered.filter(
        (org) =>
          org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPlan !== "all") {
      filtered = filtered.filter((org) => org.plan === filterPlan);
    }

    setFilteredOrgs(filtered);
  };

  const handleDeleteOrganization = async (orgId: string, force: boolean = false) => {
    if (!confirm(force ? "確定要永久刪除此組織嗎？此操作無法恢復！" : "確定要停用此組織嗎？")) {
      return;
    }

    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(`/api/organizations/${orgId}${force ? '?force=true' : ''}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("刪除失敗");
      }

      toast({
        title: "成功",
        description: force ? "組織已永久刪除" : "組織已停用",
      });

      fetchOrganizations();
    } catch (error) {
      toast({
        title: "操作失敗",
        description: error instanceof Error ? error.message : "無法刪除組織",
        variant: "destructive",
      });
    }
  };

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 80) return "text-orange-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            組織管理
          </h1>
          <p className="text-muted-foreground mt-1">管理所有租戶組織</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              創建組織
            </Button>
          </DialogTrigger>
          <CreateOrganizationDialog
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              fetchOrganizations();
            }}
          />
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>篩選與搜尋</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋組織名稱、識別碼或聯絡信箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="選擇方案" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有方案</SelectItem>
              <SelectItem value="basic">基礎版</SelectItem>
              <SelectItem value="professional">專業版</SelectItem>
              <SelectItem value="enterprise">企業版</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>組織列表</CardTitle>
          <CardDescription>
            共 {filteredOrgs.length} 個組織 {searchTerm || filterPlan !== "all" ? `（已篩選）` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>組織名稱</TableHead>
                <TableHead>方案</TableHead>
                <TableHead>用戶數</TableHead>
                <TableHead>患者數</TableHead>
                <TableHead>聯絡人</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    沒有找到符合條件的組織
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
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
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className={getUsageColor(org.currentUsers || 0, org.maxUsers)}>
                          {org.currentUsers || 0}/{org.maxUsers}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className={getUsageColor(org.currentPatients || 0, org.maxPatients)}>
                          {org.currentPatients || 0}/{org.maxPatients}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{org.contactName}</div>
                        <div className="text-xs text-muted-foreground">{org.contactEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "啟用" : "停用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrg(org);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrganization(org.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedOrg && (
        <EditOrganizationDialog
          organization={selectedOrg}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedOrg(null);
          }}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setSelectedOrg(null);
            fetchOrganizations();
          }}
        />
      )}
    </div>
  );
};

// Create Organization Dialog Component
const CreateOrganizationDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "basic",
    contactName: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "創建失敗");
      }

      toast({
        title: "成功",
        description: "組織已創建",
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "創建失敗",
        description: error instanceof Error ? error.message : "無法創建組織",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>創建新組織</DialogTitle>
          <DialogDescription>填寫組織基本資訊</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">組織名稱</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="slug">識別碼</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="例如: taipei-hospital"
              required
            />
          </div>
          <div>
            <Label htmlFor="plan">訂閱方案</Label>
            <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">基礎版 - TWD 99/月</SelectItem>
                <SelectItem value="professional">專業版 - TWD 499/月</SelectItem>
                <SelectItem value="enterprise">企業版 - TWD 1,999/月</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contactName">聯絡人姓名</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">聯絡信箱</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "創建中..." : "創建組織"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

// Edit Organization Dialog Component with Admin Management
const EditOrganizationDialog = ({
  organization,
  isOpen,
  onClose,
  onSuccess,
}: {
  organization: Organization;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: organization.name,
    plan: organization.plan,
    maxUsers: organization.maxUsers,
    maxPatients: organization.maxPatients,
    isActive: organization.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showCredentials, setShowCredentials] = useState<any>(null);
  const [newAdminForm, setNewAdminForm] = useState({ name: "", email: "", username: "" });
  const [showNewAdminForm, setShowNewAdminForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAdmins();
    }
  }, [isOpen]);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(`/api/organizations/${organization.id}/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "更新失敗");
      }

      toast({
        title: "成功",
        description: "組織資訊已更新",
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "無法更新組織",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(`/api/organizations/${organization.id}/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAdminForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "創建失敗");
      }

      const data = await response.json();
      setShowCredentials(data.credentials);
      setNewAdminForm({ name: "", email: "", username: "" });
      setShowNewAdminForm(false);
      fetchAdmins();

      toast({
        title: "成功",
        description: "管理員帳號已創建",
      });
    } catch (error) {
      toast({
        title: "創建失敗",
        description: error instanceof Error ? error.message : "無法創建管理員",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(
        `/api/organizations/${organization.id}/admins/${userId}/reset-password`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "重置失敗");
      }

      const data = await response.json();
      setShowCredentials(data.credentials);

      toast({
        title: "成功",
        description: "密碼已重置",
      });
    } catch (error) {
      toast({
        title: "重置失敗",
        description: error instanceof Error ? error.message : "無法重置密碼",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    if (!confirm("確定要刪除此管理員嗎？")) return;

    try {
      const token = localStorage.getItem("hospital_crm_auth_token");
      const response = await fetch(`/api/organizations/${organization.id}/admins/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "刪除失敗");
      }

      fetchAdmins();
      toast({
        title: "成功",
        description: "管理員已刪除",
      });
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "無法刪除管理員",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "已複製", description: "已複製到剪貼簿" });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯組織</DialogTitle>
            <DialogDescription>{organization.name}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">組織資訊</TabsTrigger>
              <TabsTrigger value="admins">管理員</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="edit-name">組織名稱</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-plan">訂閱方案</Label>
                    <Select
                      value={formData.plan}
                      onValueChange={(value: any) => setFormData({ ...formData, plan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">基礎版</SelectItem>
                        <SelectItem value="professional">專業版</SelectItem>
                        <SelectItem value="enterprise">企業版</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-maxUsers">最大用戶數</Label>
                    <Input
                      id="edit-maxUsers"
                      type="number"
                      value={formData.maxUsers}
                      onChange={(e) =>
                        setFormData({ ...formData, maxUsers: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-maxPatients">最大患者數</Label>
                    <Input
                      id="edit-maxPatients"
                      type="number"
                      value={formData.maxPatients}
                      onChange={(e) =>
                        setFormData({ ...formData, maxPatients: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <Label htmlFor="edit-isActive">啟用組織</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    取消
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "更新中..." : "儲存變更"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="admins" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">組織管理員</h3>
                <Button
                  size="sm"
                  onClick={() => setShowNewAdminForm(!showNewAdminForm)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  新增管理員
                </Button>
              </div>

              {showNewAdminForm && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label htmlFor="admin-name">姓名</Label>
                      <Input
                        id="admin-name"
                        value={newAdminForm.name}
                        onChange={(e) =>
                          setNewAdminForm({ ...newAdminForm, name: e.target.value })
                        }
                        placeholder="留空則自動生成"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-email">電子郵件</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={newAdminForm.email}
                        onChange={(e) =>
                          setNewAdminForm({ ...newAdminForm, email: e.target.value })
                        }
                        placeholder="選填"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-username">使用者名稱</Label>
                      <Input
                        id="admin-username"
                        value={newAdminForm.username}
                        onChange={(e) =>
                          setNewAdminForm({ ...newAdminForm, username: e.target.value })
                        }
                        placeholder="留空則自動生成"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateAdmin}>創建</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewAdminForm(false);
                          setNewAdminForm({ name: "", email: "", username: "" });
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {loadingAdmins ? (
                  <div className="text-center py-4">載入中...</div>
                ) : admins.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>此組織尚無管理員</AlertDescription>
                  </Alert>
                ) : (
                  admins.map((admin) => (
                    <Card key={admin.id}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex-1">
                          <div className="font-medium">{admin.name}</div>
                          <div className="text-sm text-muted-foreground">
                            @{admin.username}
                          </div>
                          {admin.email && (
                            <div className="text-sm text-muted-foreground">{admin.email}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(admin.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            重置密碼
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAdmin(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <AlertDialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              帳號資訊
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showCredentials?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {showCredentials && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">使用者名稱：</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {showCredentials.username}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(showCredentials.username)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">密碼：</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded font-mono">
                      {showCredentials.password}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(showCredentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  此密碼僅顯示一次，請務必複製並妥善保管
                </AlertDescription>
              </Alert>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCredentials(null)}>
              我已複製密碼
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrganizationManagement;

import { useState, useEffect } from "react";
import { Plus, Search, Building2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  isActive: boolean;
  createdAt: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
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

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-[90vw] py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">載入中...</div>
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
          <Button size="lg">
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
                <Button>
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
                      <TableHead>用戶數</TableHead>
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
                            {org.currentUsers || 0}/{org.maxUsers}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {org.currentPatients || 0}/{org.maxPatients}
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
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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
      </div>
    </div>
  );
};

export default OrganizationManagement;

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { treatmentApi } from "@/lib/api";
import type { ServiceItem, CreateServiceItemData } from "@/types/treatment";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ServiceItems() {
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState<CreateServiceItemData>({
    name: "",
    code: "",
    category: "",
    unit: "次",
    description: "",
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // 載入服務項目
  const loadServiceItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await treatmentApi.serviceItems.getAll();
      setServiceItems(items || []);
    } catch (error: unknown) {
      toast({
        title: "載入失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
      setServiceItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 載入分類
  const loadCategories = useCallback(async () => {
    try {
      const cats = await treatmentApi.serviceItems.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, []);

  useEffect(() => {
    loadServiceItems();
    loadCategories();
  }, [loadServiceItems, loadCategories]);

  // 篩選後的項目
  const filteredItems = serviceItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // 開啟新增對話框
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      code: "",
      category: "",
      unit: "次",
      description: "",
    });
    setShowDialog(true);
  };

  // 開啟編輯對話框
  const handleEdit = (item: ServiceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || "",
      category: item.category || "",
      unit: item.unit,
      description: item.description || "",
    });
    setShowDialog(true);
  };

  // 儲存（新增或更新）
  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast({
          title: "驗證失敗",
          description: "服務名稱為必填欄位",
          variant: "destructive",
        });
        return;
      }

      if (editingItem) {
        await treatmentApi.serviceItems.update(editingItem.id, formData);
        toast({
          title: "更新成功",
          description: "服務項目已更新",
        });
      } else {
        await treatmentApi.serviceItems.create(formData);
        toast({
          title: "新增成功",
          description: "服務項目已建立",
        });
      }

      setShowDialog(false);
      loadServiceItems();
      loadCategories();
    } catch (error: unknown) {
      toast({
        title: editingItem ? "更新失敗" : "新增失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  // 刪除
  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`確定要刪除「${item.name}」嗎？\n\n如果有療程方案正在使用此項目，將無法刪除。`)) {
      return;
    }

    try {
      await treatmentApi.serviceItems.delete(item.id);
      toast({
        title: "刪除成功",
        description: "服務項目已刪除",
      });
      loadServiceItems();
      loadCategories();
    } catch (error: unknown) {
      toast({
        title: "刪除失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  // 切換啟用/停用
  const handleToggleActive = async (item: ServiceItem) => {
    try {
      await treatmentApi.serviceItems.update(item.id, {
        isActive: !item.isActive,
      });
      toast({
        title: "更新成功",
        description: `已${!item.isActive ? "啟用" : "停用"}服務項目`,
      });
      loadServiceItems();
    } catch (error: unknown) {
      toast({
        title: "更新失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">服務項目管理</h1>
          <p className="text-muted-foreground mt-1">
            管理所有可提供的療程服務項目（復健、注射劑、雷射等）
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>服務項目列表</CardTitle>
                <CardDescription>共 {filteredItems.length} 個項目</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={handleAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增服務項目
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* 篩選與搜尋 */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋服務名稱或代碼..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分類</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 表格 */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || categoryFilter !== "all" ? "找不到符合條件的項目" : "尚無服務項目"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>代碼</TableHead>
                    <TableHead>服務名稱</TableHead>
                    <TableHead>分類</TableHead>
                    <TableHead>單位</TableHead>
                    <TableHead>說明</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.code || "-"}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "啟用" : "停用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(item)}
                              >
                                {item.isActive ? "停用" : "啟用"}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
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

        {/* 新增/編輯對話框 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "編輯服務項目" : "新增服務項目"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "修改服務項目資訊" : "建立新的服務項目"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">服務名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：復健治療-A、瘦瘦針"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">服務代碼（選填）</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例：REHAB-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">分類（選填）</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="例：復健、醫美、注射劑"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">計量單位 *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="次">次</SelectItem>
                    <SelectItem value="劑">劑</SelectItem>
                    <SelectItem value="堂">堂</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="支">支</SelectItem>
                    <SelectItem value="瓶">瓶</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">說明（選填）</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="簡短說明此服務項目"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>{editingItem ? "更新" : "建立"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

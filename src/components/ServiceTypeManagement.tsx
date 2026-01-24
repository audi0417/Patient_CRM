import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Palette, GripVertical } from "lucide-react";
import { api } from "@/lib/api";

interface ServiceType {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 預設顏色選項 - 對應現有的預約類型顏色
const PRESET_COLORS = [
  { color: "#8b5cf6", label: "紫色", tailwind: "purple" },
  { color: "#3b82f6", label: "藍色", tailwind: "blue" },
  { color: "#22c55e", label: "綠色", tailwind: "green" },
  { color: "#f97316", label: "橙色", tailwind: "orange" },
  { color: "#6366f1", label: "靛青", tailwind: "indigo" },
  { color: "#06b6d4", label: "青色", tailwind: "cyan" },
  { color: "#ec4899", label: "粉色", tailwind: "pink" },
  { color: "#eab308", label: "黃色", tailwind: "yellow" },
  { color: "#10b981", label: "翠綠", tailwind: "emerald" },
  { color: "#ef4444", label: "紅色", tailwind: "red" },
  { color: "#64748b", label: "灰色", tailwind: "slate" },
];

const ServiceTypeManagement = () => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    color: PRESET_COLORS[0].color,
    description: "",
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.serviceTypes.getAll();
      setServiceTypes(data || []);
    } catch (error) {
      toast.error("載入服務類別失敗");
      console.error("Load service types error:", error);
      setServiceTypes([]);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入服務類別名稱");
      return;
    }

    try {
      const serviceTypeData = {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive ? 1 : 0,
        displayOrder: editingItem?.displayOrder || serviceTypes.length,
      };

      if (editingItem) {
        await api.serviceTypes.update(editingItem.id, serviceTypeData);
        toast.success("服務類別已更新");
      } else {
        await api.serviceTypes.create(serviceTypeData);
        toast.success("服務類別已建立");
      }

      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "儲存失敗");
      console.error("Save service type error:", error);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await api.serviceTypes.delete(itemToDelete.id);
      toast.success("服務類別已刪除");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
      console.error("Delete service type error:", error);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      color: PRESET_COLORS[0].color,
      description: "",
      isActive: true,
    });
    setEditingItem(null);
  };

  const openEdit = (item: ServiceType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      color: item.color,
      description: item.description || "",
      isActive: item.isActive === 1,
    });
    setShowDialog(true);
  };

  const getColorLabel = (color: string) => {
    const preset = PRESET_COLORS.find(p => p.color.toLowerCase() === color.toLowerCase());
    return preset?.label || "自訂";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>服務類別</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                共 {serviceTypes.length} 個服務類別 ({serviceTypes.filter(t => t.isActive === 1).length} 個啟用)
              </p>
            </div>
            <Button onClick={() => {
              resetForm();
              setShowDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              新增服務類別
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {serviceTypes.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">尚無服務類別</h3>
              <p className="text-sm text-muted-foreground mb-6">
                建立服務類別來管理預約類型和對應的顏色
              </p>
              <Button onClick={() => {
                resetForm();
                setShowDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個服務類別
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[200px]">類別名稱</TableHead>
                  <TableHead className="w-[120px]">顏色</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead className="w-[100px]">狀態</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-16 rounded border"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getColorLabel(item.color)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell>
                      {item.isActive === 1 ? (
                        <Badge variant="default" className="bg-green-500">啟用</Badge>
                      ) : (
                        <Badge variant="secondary">停用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemToDelete({ id: item.id, name: item.name });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 編輯/新增對話框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "編輯服務類別" : "新增服務類別"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">
                類別名稱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="service-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：初診、營養諮詢、運動指導"
              />
            </div>

            <div className="space-y-2">
              <Label>類別顏色</Label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.color}
                    className={`h-10 rounded transition-all flex flex-col items-center justify-center ${
                      formData.color === preset.color ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => setFormData({ ...formData, color: preset.color })}
                    title={preset.label}
                  >
                    <span className="text-[10px] text-white font-medium opacity-75">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">說明</Label>
              <Textarea
                id="service-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="服務類別的用途說明..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="service-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="service-active" className="cursor-pointer">
                啟用此服務類別
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? "更新" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除服務類別「{itemToDelete?.name}」嗎？
              <span className="block mt-2 text-destructive">
                此操作無法復原。如果有預約使用此類別，將無法刪除。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceTypeManagement;

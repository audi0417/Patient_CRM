import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { getGroups, saveGroup, deleteGroup } from "@/lib/storage";
import { PatientGroup } from "@/types/patient";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#6b7280", "#78716c"
];

const GroupManagement = () => {
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PatientGroup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);

  const [groupForm, setGroupForm] = useState({
    name: "",
    color: PRESET_COLORS[0],
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const groupsData = await getGroups();
    setGroups(groupsData);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error("請輸入群組名稱");
      return;
    }

    const group: PatientGroup = {
      id: editingGroup?.id || `group_${Date.now()}`,
      name: groupForm.name.trim(),
      color: groupForm.color,
      description: groupForm.description.trim() || undefined,
      patientIds: editingGroup?.patientIds || [],
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveGroup(group);
    toast.success(editingGroup ? "群組已更新" : "群組已建立");
    setShowGroupDialog(false);
    resetGroupForm();
    loadData();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteGroup(itemToDelete.id);
      toast.success("群組已刪除");
      loadData();
    } catch (error) {
      toast.error("刪除失敗");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      color: PRESET_COLORS[0],
      description: "",
    });
    setEditingGroup(null);
  };

  const openEditGroup = (group: PatientGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      color: group.color,
      description: group.description || "",
    });
    setShowGroupDialog(true);
  };

  const getGroupPatientCount = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group?.patientIds.length || 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>群組列表</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                共 {groups.length} 個群組
              </p>
            </div>
            <Button onClick={() => {
              resetGroupForm();
              setShowGroupDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              新增群組
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">尚無個案群組</h3>
              <p className="text-sm text-muted-foreground mb-6">
                建立群組來組織和管理相關的個案
              </p>
              <Button onClick={() => {
                resetGroupForm();
                setShowGroupDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個群組
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">群組名稱</TableHead>
                  <TableHead className="w-[100px]">顏色</TableHead>
                  <TableHead className="w-[120px]">個案數量</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-6 w-16 rounded border"
                        style={{ backgroundColor: group.color }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getGroupPatientCount(group.id)} 位
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditGroup(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemToDelete({ id: group.id, name: group.name });
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

      {/* 群組對話框 */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "編輯群組" : "新增群組"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">
                群組名稱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="例如：定期追蹤、新個案"
              />
            </div>

            <div className="space-y-2">
              <Label>群組顏色</Label>
              <div className="grid grid-cols-10 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded transition-all ${
                      groupForm.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setGroupForm({ ...groupForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">說明</Label>
              <Textarea
                id="group-description"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                rows={3}
                placeholder="群組的用途說明..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveGroup}>
              {editingGroup ? "更新" : "建立"}
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
              確定要刪除群組「{itemToDelete?.name}」嗎？
              <span className="block mt-2 text-destructive">
                此群組將被刪除，但個案資料不會受影響。
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

export default GroupManagement;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { saveAppointment, deleteAppointment } from "@/lib/storage";
import { Appointment, Patient } from "@/types/patient";
import { toast } from "sonner";
import { Calendar, Clock, User, FileText, Trash2, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

interface AppointmentDetailDialogProps {
  appointment: Appointment;
  patient: Patient | undefined;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const AppointmentDetailDialog = ({
  appointment,
  patient,
  open,
  onClose,
  onUpdate,
}: AppointmentDetailDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<{
    date: string;
    time: string;
    type: string;
    notes: string;
    status: "scheduled" | "completed" | "cancelled";
    reminderDays: number | "";
  }>({
    date: appointment.date,
    time: appointment.time,
    type: appointment.type,
    notes: appointment.notes || "",
    status: appointment.status,
    reminderDays: appointment.reminderDays || 1,
  });

  // 當 appointment 更新時，同步更新表單資料
  useEffect(() => {
    setFormData({
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      notes: appointment.notes || "",
      status: appointment.status,
      reminderDays: appointment.reminderDays || 1,
    });
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.type) {
      toast.error("請填寫必填欄位");
      return;
    }

    const updatedAppointment: Appointment = {
      ...appointment,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      notes: formData.notes || undefined,
      status: formData.status,
      reminderDays: typeof formData.reminderDays === "number" ? formData.reminderDays : 1,
    };

    await saveAppointment(updatedAppointment);
    toast.success("預約已更新");
    setIsEditing(false);
    onUpdate?.();
    // 不關閉對話框，讓用戶可以繼續查看
  };

  const handleDelete = async () => {
    await deleteAppointment(appointment.id);
    toast.success("預約已刪除");
    setShowDeleteDialog(false);
    onUpdate?.();
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      notes: appointment.notes || "",
      status: appointment.status,
      reminderDays: appointment.reminderDays || 1,
    });
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              預約詳細資訊
            </DialogTitle>
          </DialogHeader>

          {!isEditing ? (
            // 檢視模式
            <div className="space-y-6">
              {/* 病患資訊 */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{patient?.name || "未知患者"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {patient?.phone || "無電話資料"}
                  </p>
                </div>
                <Badge
                  variant={
                    appointment.status === "scheduled"
                      ? "default"
                      : appointment.status === "completed"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-sm"
                >
                  {appointment.status === "scheduled"
                    ? "已預約"
                    : appointment.status === "completed"
                    ? "已完成"
                    : "已取消"}
                </Badge>
              </div>

              {/* 預約資訊 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>日期</span>
                  </div>
                  <p className="font-medium">
                    {format(parseISO(appointment.date), "yyyy年M月d日 (EEEE)", {
                      locale: zhTW,
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>時間</span>
                  </div>
                  <p className="font-medium">{appointment.time}</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>類型</span>
                  </div>
                  <p className="font-medium">{appointment.type}</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>提醒設定</span>
                  </div>
                  <p className="font-medium">
                    預約前 {appointment.reminderDays || 1} 天提醒
                  </p>
                </div>

                {appointment.notes && (
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>備註</span>
                    </div>
                    <p className="text-sm p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                      {appointment.notes}
                    </p>
                  </div>
                )}

                {appointment.isRecurring && (
                  <div className="col-span-2">
                    <Badge variant="outline">定期回診</Badge>
                  </div>
                )}
              </div>

              {/* 操作按鈕 */}
              <DialogFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  刪除
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  關閉
                </Button>
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  編輯
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // 編輯模式
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 病患資訊顯示 */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{patient?.name || "未知患者"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {patient?.phone || "無電話資料"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    日期 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">
                    時間 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  類型 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="定期回診">定期回診</SelectItem>
                    <SelectItem value="追蹤檢查">追蹤檢查</SelectItem>
                    <SelectItem value="健康檢查">健康檢查</SelectItem>
                    <SelectItem value="復健治療">復健治療</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">狀態</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, status: value as "scheduled" | "completed" | "cancelled" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">已預約</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderDays">提前提醒天數</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.reminderDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 允許空值，讓用戶可以刪除後重新輸入
                    if (value === "") {
                      setFormData({ ...formData, reminderDays: "" });
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
                        setFormData({ ...formData, reminderDays: numValue });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // 失去焦點時，如果是空值則設為 1
                    if (e.target.value === "") {
                      setFormData({ ...formData, reminderDays: 1 });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  系統將在預約前 {formData.reminderDays || 1} 天提醒您聯絡病患
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  儲存變更
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除預約</AlertDialogTitle>
            <AlertDialogDescription>
              您確定要刪除這個預約嗎？此操作無法復原。
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="font-medium">{patient?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(appointment.date), "yyyy年M月d日", { locale: zhTW })}{" "}
                  {appointment.time}
                </p>
                <p className="text-sm text-muted-foreground">{appointment.type}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentDetailDialog;

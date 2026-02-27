import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveAppointment, getPatients } from "@/lib/storage";
import { Appointment, Patient } from "@/types/patient";
import { toast } from "sonner";
import { addDays, addWeeks, addMonths, addYears, isBefore, format } from "date-fns";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { PatientCombobox } from "@/components/PatientCombobox";

interface RecurringAppointmentFormProps {
  patientId?: string;
  defaultDate?: string;
  onClose: () => void;
}

const RecurringAppointmentForm = ({
  patientId,
  defaultDate,
  onClose,
}: RecurringAppointmentFormProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { serviceTypes, loading: loadingTypes } = useServiceTypes();
  const [formData, setFormData] = useState({
    patientId: patientId || "",
    date: defaultDate || "",
    time: "",
    type: "",
    notes: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    isRecurring: false,
    recurringPattern: "weekly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
    recurringEndDate: "",
    reminderDays: 1,
  });

  useEffect(() => {
    const loadPatients = async () => {
      const allPatients = await getPatients();
      setPatients(allPatients);
    };
    loadPatients();
  }, []);

  const generateRecurringAppointments = (baseDate: Date, endDate: Date, pattern: string) => {
    const appointments: Date[] = [];
    let currentDate = new Date(baseDate);

    while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
      appointments.push(new Date(currentDate));

      switch (pattern) {
        case "daily":
          currentDate = addDays(currentDate, 1);
          break;
        case "weekly":
          currentDate = addWeeks(currentDate, 1);
          break;
        case "biweekly":
          currentDate = addWeeks(currentDate, 2);
          break;
        case "monthly":
          currentDate = addMonths(currentDate, 1);
          break;
        case "quarterly":
          currentDate = addMonths(currentDate, 3);
          break;
        case "yearly":
          currentDate = addYears(currentDate, 1);
          break;
      }
    }

    return appointments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.date || !formData.time || !formData.type) {
      toast.error("請填寫必填欄位");
      return;
    }

    if (formData.isRecurring && !formData.recurringEndDate) {
      toast.error("定期回診需要設定結束日期");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.isRecurring) {
        // 產生定期回診的所有預約
        const startDate = new Date(formData.date);
        const endDate = new Date(formData.recurringEndDate);

        if (isBefore(endDate, startDate)) {
          toast.error("結束日期不能早於開始日期");
          return;
        }

        const dates = generateRecurringAppointments(
          startDate,
          endDate,
          formData.recurringPattern
        );

        // 建立第一個預約（作為父預約）
        const parentAppointment: Appointment = {
          id: '', // Let backend generate ID
          patientId: formData.patientId,
          date: formData.date,
          time: formData.time,
          type: formData.type,
          notes: formData.notes || undefined,
          status: formData.status,
          reminderSent: false,
          isRecurring: true,
          recurringPattern: formData.recurringPattern,
          recurringEndDate: formData.recurringEndDate,
          reminderDays: formData.reminderDays,
        };

        await saveAppointment(parentAppointment);

        // 建立後續的預約
        let successCount = 1; // 第一筆已成功
        let failCount = 0;
        for (let i = 1; i < dates.length; i++) {
          const appointment: Appointment = {
            id: '', // Let backend generate ID
            patientId: formData.patientId,
            date: format(dates[i], "yyyy-MM-dd"), // 使用 date-fns format 避免時區問題
            time: formData.time,
            type: formData.type,
            notes: formData.notes || undefined,
            status: formData.status,
            reminderSent: false,
            isRecurring: true,
            recurringPattern: formData.recurringPattern,
            parentAppointmentId: undefined, // Will be handled by backend
            reminderDays: formData.reminderDays,
          };
          try {
            await saveAppointment(appointment);
            successCount++;
          } catch {
            failCount++;
          }
        }

        if (failCount > 0) {
          toast.warning(`已建立 ${successCount}/${dates.length} 個預約，${failCount} 個建立失敗`);
        } else {
          toast.success(`已建立 ${dates.length} 個定期回診預約`);
        }
      } else {
        // 單次預約
        const appointment: Appointment = {
          id: '', // Let backend generate ID
          patientId: formData.patientId,
          date: formData.date,
          time: formData.time,
          type: formData.type,
          notes: formData.notes || undefined,
          status: formData.status,
          reminderSent: false,
          reminderDays: formData.reminderDays,
        };

        await saveAppointment(appointment);
        toast.success("預約已新增");
      }

      onClose();
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error("儲存預約時發生錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const recurringPatternLabels: Record<string, string> = {
    daily: "每天",
    weekly: "每週",
    biweekly: "每兩週",
    monthly: "每月",
    quarterly: "每季（三個月）",
    yearly: "每年",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增回診預約</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">
              病患 <span className="text-destructive">*</span>
            </Label>
            <PatientCombobox
              patients={patients}
              value={formData.patientId}
              onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              disabled={!!patientId}
              placeholder="搜尋病患姓名或電話..."
            />
            {patientId && (
              <p className="text-xs text-muted-foreground">
                已指定病患，無法變更
              </p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="type">
              類型 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              disabled={loadingTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTypes ? "載入中..." : "請選擇服務類別"} />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.length === 0 && !loadingTypes ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    尚無可用的服務類別<br/>
                    請至設定頁面建立服務類別
                  </div>
                ) : (
                  serviceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">狀態</Label>
            <Select
              value={formData.status}
              onValueChange={(value: string) =>
                setFormData({ ...formData, status: value })
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
              min="0"
              max="30"
              value={formData.reminderDays}
              onChange={(e) =>
                setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 1 })
              }
            />
            <p className="text-xs text-muted-foreground">
              系統將在預約前 {formData.reminderDays} 天提醒您聯絡病患
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="isRecurring" className="text-base">
                定期回診
              </Label>
              <p className="text-sm text-muted-foreground">
                自動建立多個定期回診預約
              </p>
            </div>
            <Switch
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isRecurring: checked })
              }
            />
          </div>

          {formData.isRecurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recurringPattern">回診頻率</Label>
                <Select
                  value={formData.recurringPattern}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, recurringPattern: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(recurringPatternLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurringEndDate">
                  定期回診結束日期 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recurringEndDate"
                  type="date"
                  value={formData.recurringEndDate}
                  onChange={(e) =>
                    setFormData({ ...formData, recurringEndDate: e.target.value })
                  }
                  required={formData.isRecurring}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                "儲存"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringAppointmentForm;

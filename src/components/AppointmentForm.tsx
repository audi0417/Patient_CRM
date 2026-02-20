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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAppointment } from "@/lib/storage";
import { Appointment } from "@/types/patient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface ServiceType {
  id: string;
  name: string;
  color: string;
  isActive: number;
}

interface AppointmentFormProps {
  patientId: string;
  onClose: () => void;
}

const AppointmentForm = ({ patientId, onClose }: AppointmentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    type: "",
    notes: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
  });

  useEffect(() => {
    loadServiceTypes();
  }, []);

  const loadServiceTypes = async () => {
    try {
      const types = await api.serviceTypes.getActive();
      setServiceTypes(types);
    } catch (error) {
      console.error("Failed to load service types:", error);
      toast.error("載入服務類別失敗");
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.type) {
      toast.error("請填寫必填欄位");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const appointment: Appointment = {
        id: '',
        patientId,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        notes: formData.notes || undefined,
        status: formData.status,
        reminderSent: false,
      };

      saveAppointment(appointment);
      toast.success("預約已新增");
      onClose();
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
      console.error("Failed to save appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增回診預約</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

export default AppointmentForm;

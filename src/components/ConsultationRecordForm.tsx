import { useState } from "react";
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
import { saveConsultationRecord } from "@/lib/storage";
import { ConsultationRecord } from "@/types/patient";
import { toast } from "sonner";
import { getTodayDateString } from "@/lib/utils";

interface ConsultationRecordFormProps {
  patientId: string;
  onClose: () => void;
  existingRecord?: ConsultationRecord | null;
}

const ConsultationRecordForm = ({ patientId, onClose, existingRecord }: ConsultationRecordFormProps) => {
  const isEditMode = !!existingRecord;

  const [formData, setFormData] = useState({
    date: existingRecord?.date || getTodayDateString(),
    notes: existingRecord?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.notes.trim()) {
      toast.error("請輸入備註內容");
      return;
    }

    const now = new Date().toISOString();
    const record: ConsultationRecord = {
      id: existingRecord?.id || '',
      patientId,
      date: formData.date,
      notes: formData.notes,
      createdAt: existingRecord?.createdAt || now,
      updatedAt: now,
    };

    saveConsultationRecord(record);
    toast.success(isEditMode ? "看診紀錄已更新" : "看診紀錄已新增");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "編輯看診紀錄" : "新增看診紀錄"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">看診日期</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">營養師備註</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={6}
              placeholder="記錄患者狀況、飲食建議、追蹤要點等..."
              required
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {isEditMode ? "更新" : "儲存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationRecordForm;

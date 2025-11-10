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
import { saveHealthRecord } from "@/lib/storage";
import { HealthRecord } from "@/types/patient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/utils";

interface HealthRecordFormProps {
  patientId: string;
  onClose: () => void;
}

const HealthRecordForm = ({ patientId, onClose }: HealthRecordFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayDateString(),
    weight: "",
    height: "",
    bodyFat: "",
    muscleMass: "",
    bmi: "",
    visceralFat: "",
    boneMass: "",
    bodyWater: "",
    bmr: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const record: HealthRecord = {
        id: '',
        patientId,
        date: formData.date,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
        muscleMass: formData.muscleMass ? parseFloat(formData.muscleMass) : undefined,
        bmi: formData.bmi ? parseFloat(formData.bmi) : undefined,
        visceralFat: formData.visceralFat ? parseFloat(formData.visceralFat) : undefined,
        boneMass: formData.boneMass ? parseFloat(formData.boneMass) : undefined,
        bodyWater: formData.bodyWater ? parseFloat(formData.bodyWater) : undefined,
        bmr: formData.bmr ? parseFloat(formData.bmr) : undefined,
        bloodPressureSystolic: formData.bloodPressureSystolic
          ? parseInt(formData.bloodPressureSystolic)
          : undefined,
        bloodPressureDiastolic: formData.bloodPressureDiastolic
          ? parseInt(formData.bloodPressureDiastolic)
          : undefined,
        heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
        temperature: formData.temperature
          ? parseFloat(formData.temperature)
          : undefined,
        notes: formData.notes || undefined,
      };

      saveHealthRecord(record);
      toast.success("健康記錄已新增");
      onClose();
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
      console.error("Failed to save health record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增健康記錄</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">體重 (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">身高 (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFat">體脂率 (%)</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                value={formData.bodyFat}
                onChange={(e) =>
                  setFormData({ ...formData, bodyFat: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscleMass">肌肉量 (kg)</Label>
              <Input
                id="muscleMass"
                type="number"
                step="0.1"
                value={formData.muscleMass}
                onChange={(e) =>
                  setFormData({ ...formData, muscleMass: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bmi">BMI</Label>
              <Input
                id="bmi"
                type="number"
                step="0.1"
                value={formData.bmi}
                onChange={(e) =>
                  setFormData({ ...formData, bmi: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visceralFat">內臟脂肪等級</Label>
              <Input
                id="visceralFat"
                type="number"
                step="0.1"
                value={formData.visceralFat}
                onChange={(e) =>
                  setFormData({ ...formData, visceralFat: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="boneMass">骨量 (kg)</Label>
              <Input
                id="boneMass"
                type="number"
                step="0.1"
                value={formData.boneMass}
                onChange={(e) =>
                  setFormData({ ...formData, boneMass: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyWater">體水分 (%)</Label>
              <Input
                id="bodyWater"
                type="number"
                step="0.1"
                value={formData.bodyWater}
                onChange={(e) =>
                  setFormData({ ...formData, bodyWater: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bmr">基礎代謝率 (kcal)</Label>
              <Input
                id="bmr"
                type="number"
                value={formData.bmr}
                onChange={(e) =>
                  setFormData({ ...formData, bmr: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heartRate">心率 (bpm)</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) =>
                  setFormData({ ...formData, heartRate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressureSystolic">收縮壓 (mmHg)</Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                value={formData.bloodPressureSystolic}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bloodPressureSystolic: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressureDiastolic">舒張壓 (mmHg)</Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                value={formData.bloodPressureDiastolic}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bloodPressureDiastolic: e.target.value,
                  })
                }
              />
            </div>
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

export default HealthRecordForm;

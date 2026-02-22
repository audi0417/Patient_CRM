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
import { saveVitalSignsRecord } from "@/lib/storage";
import { VitalSignsRecord } from "@/types/patient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/utils";
import { useVitalSignsMapping, useDataMode } from "@/contexts/DataModeContext";

interface VitalSignsFormProps {
  patientId: string;
  onClose: () => void;
}

const VitalSignsForm = ({ patientId, onClose }: VitalSignsFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { labels, units } = useVitalSignsMapping();
  const { getChartTitles } = useDataMode();
  
  const [formData, setFormData] = useState({
    date: getTodayDateString(),
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    bloodGlucose: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const record: VitalSignsRecord = {
        id: '',
        patientId,
        date: formData.date,
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
        respiratoryRate: formData.respiratoryRate
          ? parseInt(formData.respiratoryRate)
          : undefined,
        oxygenSaturation: formData.oxygenSaturation
          ? parseInt(formData.oxygenSaturation)
          : undefined,
        bloodGlucose: formData.bloodGlucose
          ? parseInt(formData.bloodGlucose)
          : undefined,
        notes: formData.notes || undefined,
      };

      saveVitalSignsRecord(record);
      toast.success(`${getChartTitle('records')}已新增`);
      onClose();
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
      console.error("Failed to save vital signs record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增{getChartTitle('records')}</DialogTitle>
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
              <Label htmlFor="bloodPressureSystolic">{labels.bloodPressureSystolic} ({units.bloodPressureSystolic})</Label>
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
              <Label htmlFor="bloodPressureDiastolic">{labels.bloodPressureDiastolic} ({units.bloodPressureDiastolic})</Label>
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

            <div className="space-y-2">
              <Label htmlFor="heartRate">{labels.heartRate} ({units.heartRate})</Label>
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
              <Label htmlFor="temperature">{labels.temperature} ({units.temperature})</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">{labels.respiratoryRate} ({units.respiratoryRate})</Label>
              <Input
                id="respiratoryRate"
                type="number"
                value={formData.respiratoryRate}
                onChange={(e) =>
                  setFormData({ ...formData, respiratoryRate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation">{labels.oxygenSaturation} ({units.oxygenSaturation})</Label>
              <Input
                id="oxygenSaturation"
                type="number"
                value={formData.oxygenSaturation}
                onChange={(e) =>
                  setFormData({ ...formData, oxygenSaturation: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodGlucose">{labels.bloodGlucose} ({units.bloodGlucose})</Label>
              <Input
                id="bloodGlucose"
                type="number"
                value={formData.bloodGlucose}
                onChange={(e) =>
                  setFormData({ ...formData, bloodGlucose: e.target.value })
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

export default VitalSignsForm;

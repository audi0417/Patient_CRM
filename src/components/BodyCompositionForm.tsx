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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveBodyCompositionRecord } from "@/lib/storage";
import { BodyCompositionRecord } from "@/types/patient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/utils";

interface BodyCompositionFormProps {
  patientId: string;
  onClose: () => void;
  existingRecord?: BodyCompositionRecord | null;
}

type MetricType = "weight" | "height" | "bodyFat" | "muscleMass" | "bmi" | "visceralFat" | "boneMass" | "bodyWater" | "bmr";

const metricOptions: { value: MetricType; label: string; unit: string; step: string }[] = [
  { value: "weight", label: "體重", unit: "kg", step: "0.1" },
  { value: "height", label: "身高", unit: "cm", step: "0.1" },
  { value: "bodyFat", label: "體脂率", unit: "%", step: "0.1" },
  { value: "muscleMass", label: "肌肉量", unit: "kg", step: "0.1" },
  { value: "bmi", label: "BMI", unit: "", step: "0.1" },
  { value: "visceralFat", label: "內臟脂肪等級", unit: "", step: "0.1" },
  { value: "boneMass", label: "骨量", unit: "kg", step: "0.1" },
  { value: "bodyWater", label: "體水分", unit: "%", step: "0.1" },
  { value: "bmr", label: "基礎代謝率", unit: "kcal", step: "1" },
];

const BodyCompositionForm = ({ patientId, onClose, existingRecord }: BodyCompositionFormProps) => {
  const isEditMode = !!existingRecord;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | "">("");
  const [formData, setFormData] = useState({
    date: existingRecord?.date || getTodayDateString(),
    weight: existingRecord?.weight?.toString() || "",
    height: existingRecord?.height?.toString() || "",
    bodyFat: existingRecord?.bodyFat?.toString() || "",
    muscleMass: existingRecord?.muscleMass?.toString() || "",
    bmi: existingRecord?.bmi?.toString() || "",
    visceralFat: existingRecord?.visceralFat?.toString() || "",
    boneMass: existingRecord?.boneMass?.toString() || "",
    bodyWater: existingRecord?.bodyWater?.toString() || "",
    bmr: existingRecord?.bmr?.toString() || "",
    notes: existingRecord?.notes || "",
    value: "",
  });

  // 自動計算 BMI
  const calculateBMI = (weight: string, height: string): string => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!weightNum || !heightNum || heightNum === 0) {
      return "";
    }

    // BMI = 體重(kg) / (身高(m))²
    const heightInMeters = heightNum / 100;
    const bmi = weightNum / (heightInMeters * heightInMeters);

    return bmi.toFixed(1);
  };

  // 當體重或身高改變時，自動更新 BMI
  const handleWeightChange = (value: string) => {
    const newFormData = { ...formData, weight: value };
    const calculatedBMI = calculateBMI(value, formData.height);
    if (calculatedBMI) {
      newFormData.bmi = calculatedBMI;
    }
    setFormData(newFormData);
  };

  const handleHeightChange = (value: string) => {
    const newFormData = { ...formData, height: value };
    const calculatedBMI = calculateBMI(formData.weight, value);
    if (calculatedBMI) {
      newFormData.bmi = calculatedBMI;
    }
    setFormData(newFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode) {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        // 編輯模式：保存所有欄位
        const record: BodyCompositionRecord = {
          id: existingRecord.id,
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
          notes: formData.notes || undefined,
        };

        saveBodyCompositionRecord(record);
        toast.success("體組成記錄已更新");
        onClose();
      } catch (error) {
        toast.error("儲存失敗，請稍後再試");
        console.error("Failed to save body composition record:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // 新增模式：只保存選定的指標
      if (!selectedMetric) {
        toast.error("請選擇要記錄的數據類型");
        return;
      }

      if (!formData.value) {
        toast.error("請輸入數值");
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const record: BodyCompositionRecord = {
          id: '',
          patientId,
          date: formData.date,
          [selectedMetric]: parseFloat(formData.value),
          notes: formData.notes || undefined,
        };

        saveBodyCompositionRecord(record);

        const metricLabel = metricOptions.find(m => m.value === selectedMetric)?.label;
        toast.success(`${metricLabel}記錄已新增`);
        onClose();
      } catch (error) {
        toast.error("儲存失敗，請稍後再試");
        console.error("Failed to save body composition record:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const selectedMetricInfo = metricOptions.find(m => m.value === selectedMetric);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "編輯體組成記錄" : "新增體組成記錄"}</DialogTitle>
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

          {isEditMode ? (
            // 編輯模式：顯示所有欄位
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">體重 (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="輸入體重"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">身高 (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  placeholder="輸入身高"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bmi">BMI</Label>
                <Input
                  id="bmi"
                  type="number"
                  step="0.1"
                  value={formData.bmi}
                  onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                  placeholder="自動計算或手動輸入"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyFat">體脂率 (%)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                  placeholder="輸入體脂率"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="muscleMass">肌肉量 (kg)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  value={formData.muscleMass}
                  onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                  placeholder="輸入肌肉量"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visceralFat">內臟脂肪等級</Label>
                <Input
                  id="visceralFat"
                  type="number"
                  step="0.1"
                  value={formData.visceralFat}
                  onChange={(e) => setFormData({ ...formData, visceralFat: e.target.value })}
                  placeholder="輸入內臟脂肪等級"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boneMass">骨量 (kg)</Label>
                <Input
                  id="boneMass"
                  type="number"
                  step="0.1"
                  value={formData.boneMass}
                  onChange={(e) => setFormData({ ...formData, boneMass: e.target.value })}
                  placeholder="輸入骨量"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyWater">體水分 (%)</Label>
                <Input
                  id="bodyWater"
                  type="number"
                  step="0.1"
                  value={formData.bodyWater}
                  onChange={(e) => setFormData({ ...formData, bodyWater: e.target.value })}
                  placeholder="輸入體水分"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bmr">基礎代謝率 (kcal)</Label>
                <Input
                  id="bmr"
                  type="number"
                  step="1"
                  value={formData.bmr}
                  onChange={(e) => setFormData({ ...formData, bmr: e.target.value })}
                  placeholder="輸入基礎代謝率"
                />
              </div>
            </div>
          ) : (
            // 新增模式：選擇單一指標
            <>
              <div className="space-y-2">
                <Label htmlFor="metricType">選擇數據類型</Label>
                <Select value={selectedMetric} onValueChange={(value) => {
                  setSelectedMetric(value as MetricType);
                  setFormData({ ...formData, value: "" });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇要記錄的數據" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} {option.unit && `(${option.unit})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMetric && (
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {selectedMetricInfo?.label}
                    {selectedMetricInfo?.unit && ` (${selectedMetricInfo.unit})`}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step={selectedMetricInfo?.step}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={`輸入${selectedMetricInfo?.label}`}
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="選填"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditMode && (!selectedMetric || !formData.value))}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "更新中..." : "儲存中..."}
                </>
              ) : (
                isEditMode ? "更新" : "儲存"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BodyCompositionForm;

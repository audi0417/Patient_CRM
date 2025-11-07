import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAssessment } from "@/lib/storage";
import { InitialAssessment } from "@/types/patient";
import { toast } from "sonner";

interface InitialAssessmentFormProps {
  patientId: string;
  existingAssessment?: InitialAssessment;
  onClose: () => void;
}

const InitialAssessmentForm = ({ patientId, existingAssessment, onClose }: InitialAssessmentFormProps) => {
  const [formData, setFormData] = useState({
    assessmentDate: existingAssessment?.assessmentDate || new Date().toISOString().split("T")[0],
    baselineWeight: existingAssessment?.baselineWeight?.toString() || "",
    baselineHeight: existingAssessment?.baselineHeight?.toString() || "",
    baselineBodyFat: existingAssessment?.baselineBodyFat?.toString() || "",
    baselineMuscleMass: existingAssessment?.baselineMuscleMass?.toString() || "",
    targetWeight: existingAssessment?.targetWeight?.toString() || "",
    targetBodyFat: existingAssessment?.targetBodyFat?.toString() || "",
    targetMuscleMass: existingAssessment?.targetMuscleMass?.toString() || "",
    activityLevel: existingAssessment?.activityLevel || "moderate" as InitialAssessment["activityLevel"],
    assessedBy: existingAssessment?.assessedBy || "",
    notes: existingAssessment?.notes || "",
  });

  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.baselineWeight || !formData.baselineHeight) {
      toast.error("請填寫基本體重和身高");
      return;
    }

    const weight = parseFloat(formData.baselineWeight);
    const height = parseFloat(formData.baselineHeight);
    const bmi = calculateBMI(weight, height);

    const assessment: InitialAssessment = {
      id: existingAssessment?.id || `assessment_${Date.now()}`,
      patientId,
      assessmentDate: formData.assessmentDate,
      baselineWeight: weight,
      baselineHeight: height,
      baselineBodyFat: formData.baselineBodyFat ? parseFloat(formData.baselineBodyFat) : undefined,
      baselineMuscleMass: formData.baselineMuscleMass ? parseFloat(formData.baselineMuscleMass) : undefined,
      baselineBMI: bmi,
      targetWeight: formData.targetWeight ? parseFloat(formData.targetWeight) : undefined,
      targetBodyFat: formData.targetBodyFat ? parseFloat(formData.targetBodyFat) : undefined,
      targetMuscleMass: formData.targetMuscleMass ? parseFloat(formData.targetMuscleMass) : undefined,
      activityLevel: formData.activityLevel,
      assessedBy: formData.assessedBy || undefined,
      notes: formData.notes || undefined,
    };

    saveAssessment(assessment);
    toast.success(existingAssessment ? "評估已更新" : "初始評估已建立");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingAssessment ? "編輯" : "建立"}初始評估</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="assessmentDate">評估日期</Label>
            <Input
              id="assessmentDate"
              type="date"
              value={formData.assessmentDate}
              onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">基準數值</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baselineWeight">體重 (kg) *</Label>
                <Input
                  id="baselineWeight"
                  type="number"
                  step="0.1"
                  value={formData.baselineWeight}
                  onChange={(e) => setFormData({ ...formData, baselineWeight: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baselineHeight">身高 (cm) *</Label>
                <Input
                  id="baselineHeight"
                  type="number"
                  step="0.1"
                  value={formData.baselineHeight}
                  onChange={(e) => setFormData({ ...formData, baselineHeight: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baselineBodyFat">體脂率 (%)</Label>
                <Input
                  id="baselineBodyFat"
                  type="number"
                  step="0.1"
                  value={formData.baselineBodyFat}
                  onChange={(e) => setFormData({ ...formData, baselineBodyFat: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baselineMuscleMass">肌肉量 (kg)</Label>
                <Input
                  id="baselineMuscleMass"
                  type="number"
                  step="0.1"
                  value={formData.baselineMuscleMass}
                  onChange={(e) => setFormData({ ...formData, baselineMuscleMass: e.target.value })}
                />
              </div>
            </div>

            {formData.baselineWeight && formData.baselineHeight && (
              <div className="bg-primary/10 p-3 rounded-md">
                <p className="text-sm">
                  計算 BMI: <span className="font-bold">
                    {calculateBMI(parseFloat(formData.baselineWeight), parseFloat(formData.baselineHeight))}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">目標數值</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWeight">目標體重 (kg)</Label>
                <Input
                  id="targetWeight"
                  type="number"
                  step="0.1"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetBodyFat">目標體脂率 (%)</Label>
                <Input
                  id="targetBodyFat"
                  type="number"
                  step="0.1"
                  value={formData.targetBodyFat}
                  onChange={(e) => setFormData({ ...formData, targetBodyFat: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetMuscleMass">目標肌肉量 (kg)</Label>
                <Input
                  id="targetMuscleMass"
                  type="number"
                  step="0.1"
                  value={formData.targetMuscleMass}
                  onChange={(e) => setFormData({ ...formData, targetMuscleMass: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityLevel">活動量</Label>
            <Select
              value={formData.activityLevel}
              onValueChange={(value: InitialAssessment["activityLevel"]) =>
                setFormData({ ...formData, activityLevel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">久坐（幾乎不運動）</SelectItem>
                <SelectItem value="light">輕度活動（每週1-3天運動）</SelectItem>
                <SelectItem value="moderate">中度活動（每週3-5天運動）</SelectItem>
                <SelectItem value="active">高度活動（每週6-7天運動）</SelectItem>
                <SelectItem value="very_active">非常活躍（每天高強度運動）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessedBy">評估者</Label>
            <Input
              id="assessedBy"
              value={formData.assessedBy}
              onChange={(e) => setFormData({ ...formData, assessedBy: e.target.value })}
              placeholder="醫師或營養師名稱"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="特殊健康狀況、飲食限制、運動建議等"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">儲存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InitialAssessmentForm;

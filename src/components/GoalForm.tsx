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
import { saveGoal } from "@/lib/storage";
import { PatientGoal } from "@/types/patient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/utils";

interface GoalFormProps {
  patientId: string;
  onClose: () => void;
}

const GoalForm = ({ patientId, onClose }: GoalFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "weight" as PatientGoal["category"],
    title: "",
    description: "",
    currentValue: "",
    targetValue: "",
    unit: "kg",
    startDate: getTodayDateString(),
    targetDate: "",
  });

  const categoryOptions = [
    { value: "weight", label: "減重目標", unit: "kg" },
    { value: "bodyFat", label: "體脂率", unit: "%" },
    { value: "muscleMass", label: "肌肉量", unit: "kg" },
    { value: "bmi", label: "BMI", unit: "" },
    { value: "exercise", label: "每週運動", unit: "次/週" },
    { value: "health", label: "每日卡路里", unit: "kcal" },
    { value: "custom", label: "自訂", unit: "" },
  ];

  const handleCategoryChange = (value: PatientGoal["category"]) => {
    const option = categoryOptions.find((opt) => opt.value === value);
    setFormData({
      ...formData,
      category: value,
      unit: option?.unit || "",
      title: option?.label || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.currentValue || !formData.targetValue || !formData.targetDate) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const currentValue = parseFloat(formData.currentValue);
      const targetValue = parseFloat(formData.targetValue);

      const goal: PatientGoal = {
        id: '',
        patientId,
        category: formData.category,
        title: formData.title,
        description: formData.description || undefined,
        currentValue,
        targetValue,
        unit: formData.unit,
        startDate: formData.startDate,
        targetDate: formData.targetDate,
        status: "active",
        progress: 0,
        milestones: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveGoal(goal);
      toast.success("目標已新增");
      onClose();
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
      console.error("Failed to save goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增目標</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">目標類別 *</Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">目標名稱 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例如：減重5公斤"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">目標描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="詳細說明此目標的內容與意義"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentValue">目前數值 *</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.1"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetValue">目標數值 *</Label>
              <Input
                id="targetValue"
                type="number"
                step="0.1"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">單位</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, %, 次"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">開始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">目標日期 *</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
              />
            </div>
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

export default GoalForm;

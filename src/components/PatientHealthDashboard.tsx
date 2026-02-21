import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBodyCompositionRecords,
  getVitalSignsRecords,
  deleteBodyCompositionRecord,
  deleteVitalSignsRecord,
  getGoals,
} from "@/lib/storage";
import { api } from "@/lib/api";
import { Patient, BodyCompositionRecord, VitalSignsRecord, PatientGoal } from "@/types/patient";
import HealthDataCharts from "./HealthDataCharts";
import BodyCompositionForm from "./BodyCompositionForm";
import VitalSignsForm from "./VitalSignsForm";
import GoalForm from "./GoalForm";
import HealthRecordImportDialog from "./HealthRecordImportDialog";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Weight,
  Heart,
  Droplet,
  Calendar,
  Trash2,
  Edit,
  Target,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
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

interface PatientHealthDashboardProps {
  patient: Patient;
}

const PatientHealthDashboard = ({ patient }: PatientHealthDashboardProps) => {
  const [bodyCompositionRecords, setBodyCompositionRecords] = useState<BodyCompositionRecord[]>([]);
  const [vitalSignsRecords, setVitalSignsRecords] = useState<VitalSignsRecord[]>([]);
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [showBodyCompositionForm, setShowBodyCompositionForm] = useState(false);
  const [showVitalSignsForm, setShowVitalSignsForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showBodyCompositionImportDialog, setShowBodyCompositionImportDialog] = useState(false);
  const [showVitalSignsImportDialog, setShowVitalSignsImportDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ type: 'body' | 'vital', id: string } | null>(null);
  const [editingBodyRecord, setEditingBodyRecord] = useState<BodyCompositionRecord | null>(null);
  const [editingVitalRecord, setEditingVitalRecord] = useState<VitalSignsRecord | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, showBodyCompositionForm, showVitalSignsForm, showGoalForm]);

  const loadData = async () => {
    const bodyRecords = await getBodyCompositionRecords(patient.id);
    const vitalRecords = await getVitalSignsRecords(patient.id);
    const patientGoals = await getGoals(patient.id);

    setBodyCompositionRecords(
      bodyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    setVitalSignsRecords(
      vitalRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    setGoals(patientGoals);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      if (recordToDelete.type === 'body') {
        await deleteBodyCompositionRecord(recordToDelete.id);
        toast.success("體組成記錄已刪除");
      } else {
        await deleteVitalSignsRecord(recordToDelete.id);
        toast.success("營養記錄已刪除");
      }
      await loadData();
    } catch (error) {
      toast.error("刪除失敗");
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleExportBodyComposition = async () => {
    try {
      await api.health.bodyComposition.exportExcel(patient.id);
      toast.success("體組成記錄已導出");
    } catch (error) {
      toast.error("導出失敗");
      console.error('Export body composition error:', error);
    }
  };

  const handleExportVitalSigns = async () => {
    try {
      await api.health.vitalSigns.exportExcel(patient.id);
      toast.success("營養記錄已導出");
    } catch (error) {
      toast.error("導出失敗");
      console.error('Export vital signs error:', error);
    }
  };

  const handleImportBodyComposition = async (file: File) => {
    try {
      toast.info("正在匯入體組成記錄...");
      await api.health.bodyComposition.importExcel(file, patient.id);
      toast.success("體組成記錄匯入成功");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "匯入失敗");
      console.error('Import body composition error:', error);
    }
  };

  const handleImportVitalSigns = async (file: File) => {
    try {
      toast.info("正在匯入營養記錄...");
      await api.health.vitalSigns.importExcel(file, patient.id);
      toast.success("營養記錄匯入成功");
      await loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "匯入失敗");
      console.error('Import vital signs error:', error);
    }
  };

  const getTrend = (current?: number, previous?: number) => {
    if (!current || !previous) return { icon: <Minus className="h-4 w-4" />, color: "text-muted-foreground" };
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return { icon: <Minus className="h-4 w-4" />, color: "text-muted-foreground" };
    if (diff > 0) return { icon: <TrendingUp className="h-4 w-4" />, color: "text-orange-500" };
    return { icon: <TrendingDown className="h-4 w-4" />, color: "text-green-500" };
  };

  const latestBodyComposition = bodyCompositionRecords[0];
  const previousBodyComposition = bodyCompositionRecords[1];
  const latestVitalSigns = vitalSignsRecords[0];
  const previousVitalSigns = vitalSignsRecords[1];

  return (
    <div className="space-y-6">
      {/* 關鍵指標卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 體重 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">體重</span>
              </div>
              {getTrend(latestBodyComposition?.weight, previousBodyComposition?.weight).icon}
            </div>
            {latestBodyComposition?.weight ? (
              <p className="text-2xl font-bold">{latestBodyComposition.weight} kg</p>
            ) : (
              <p className="text-sm text-muted-foreground">無數據</p>
            )}
          </CardContent>
        </Card>

        {/* BMI */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">BMI</span>
              </div>
            </div>
            {latestBodyComposition?.bmi ? (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{latestBodyComposition.bmi.toFixed(1)}</p>
                <Badge variant={
                  latestBodyComposition.bmi < 18.5 ? "outline" :
                  latestBodyComposition.bmi < 24 ? "secondary" :
                  latestBodyComposition.bmi < 27 ? "default" : "destructive"
                }>
                  {latestBodyComposition.bmi < 18.5 ? "過輕" :
                   latestBodyComposition.bmi < 24 ? "正常" :
                   latestBodyComposition.bmi < 27 ? "過重" : "肥胖"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">無數據</p>
            )}
          </CardContent>
        </Card>

        {/* 體脂率 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">體脂率</span>
              </div>
              {getTrend(latestBodyComposition?.bodyFat, previousBodyComposition?.bodyFat).icon}
            </div>
            {latestBodyComposition?.bodyFat ? (
              <p className="text-2xl font-bold">{latestBodyComposition.bodyFat}%</p>
            ) : (
              <p className="text-sm text-muted-foreground">無數據</p>
            )}
          </CardContent>
        </Card>

        {/* 每日卡路里 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">每日卡路里</span>
            </div>
            {latestVitalSigns?.bloodPressureSystolic ? (
              <p className="text-2xl font-bold">
                {latestVitalSigns.bloodPressureSystolic} <span className="text-sm font-normal text-muted-foreground">kcal</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">無數據</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 目標列表 */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                減重目標
              </CardTitle>
              <Button onClick={() => setShowGoalForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                新增目標
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.filter(g => g.status === "active").map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{goal.title}</h4>
                      <Badge variant="secondary">{goal.category === "weight" ? "減重" : goal.category === "bodyFat" ? "體脂率" : goal.category === "muscleMass" ? "肌肉量" : goal.category === "bmi" ? "BMI" : goal.category === "exercise" ? "運動" : goal.category === "health" ? "卡路里" : goal.category}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      目標: {goal.targetValue} {goal.unit}
                      {goal.targetDate && ` • 目標日期: ${format(new Date(goal.targetDate), "yyyy年M月d日", { locale: zhTW })}`}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-primary">{goal.progress}%</div>
                    <div className="text-xs text-muted-foreground">完成度</div>
                  </div>
                </div>
              ))}
              {goals.filter(g => g.status === "active").length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  尚無活躍的減重目標
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 圖表區域 */}
      <HealthDataCharts
        bodyCompositionRecords={bodyCompositionRecords}
        vitalSignsRecords={vitalSignsRecords}
        goals={goals}
      />

      {/* 記錄列表 */}
      <Tabs defaultValue="bodyComposition" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bodyComposition">
            體組成記錄 ({bodyCompositionRecords.length})
          </TabsTrigger>
          <TabsTrigger value="vitalSigns">
            營養記錄 ({vitalSignsRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bodyComposition" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>體組成記錄</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportBodyComposition}
                    disabled={bodyCompositionRecords.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    導出 Excel
                  </Button>
                  <Button onClick={() => setShowBodyCompositionImportDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增記錄
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bodyCompositionRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Weight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">尚無體組成記錄</p>
                  <Button onClick={() => setShowBodyCompositionForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增第一筆記錄
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">日期</TableHead>
                        <TableHead className="text-right">體重 (kg)</TableHead>
                        <TableHead className="text-right">BMI</TableHead>
                        <TableHead className="text-right">體脂率 (%)</TableHead>
                        <TableHead className="text-right">肌肉量 (kg)</TableHead>
                        <TableHead className="text-right">內臟脂肪</TableHead>
                        <TableHead className="text-right">體水分 (%)</TableHead>
                        <TableHead className="text-right">基礎代謝 (kcal)</TableHead>
                        <TableHead className="min-w-[100px]">備註</TableHead>
                        <TableHead className="w-[100px] text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bodyCompositionRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="sticky left-0 bg-background font-medium min-w-[140px]">
                            {format(new Date(record.date), "yyyy年M月d日 (EEE)", { locale: zhTW })}
                          </TableCell>
                          <TableCell className="text-right">{record.weight ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.bmi ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.bodyFat ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.muscleMass?.toFixed(2) ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.visceralFat ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.bodyWater ?? "-"}</TableCell>
                          <TableCell className="text-right">{record.bmr ?? "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.notes || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingBodyRecord(record);
                                  setShowBodyCompositionForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRecordToDelete({ type: 'body', id: record.id });
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitalSigns" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>營養記錄</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportVitalSigns}
                    disabled={vitalSignsRecords.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    導出 Excel
                  </Button>
                  <Button onClick={() => setShowVitalSignsImportDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增記錄
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vitalSignsRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">尚無營養記錄</p>
                  <Button onClick={() => setShowVitalSignsForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增第一筆記錄
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {vitalSignsRecords.map((record) => (
                    <Card key={record.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {format(new Date(record.date), "yyyy年M月d日 (EEEE)", { locale: zhTW })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setRecordToDelete({ type: 'vital', id: record.id });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {record.bloodPressureSystolic && (
                            <div>
                              <p className="text-muted-foreground">卡路里</p>
                              <p className="font-medium">{record.bloodPressureSystolic} kcal</p>
                            </div>
                          )}
                          {record.bloodPressureDiastolic && (
                            <div>
                              <p className="text-muted-foreground">蛋白質</p>
                              <p className="font-medium">{record.bloodPressureDiastolic} g</p>
                            </div>
                          )}
                          {record.heartRate && (
                            <div>
                              <p className="text-muted-foreground">碳水化合物</p>
                              <p className="font-medium">{record.heartRate} g</p>
                            </div>
                          )}
                          {record.temperature && (
                            <div>
                              <p className="text-muted-foreground">脂肪</p>
                              <p className="font-medium">{record.temperature} g</p>
                            </div>
                          )}
                          {record.respiratoryRate && (
                            <div>
                              <p className="text-muted-foreground">纖維</p>
                              <p className="font-medium">{record.respiratoryRate} g</p>
                            </div>
                          )}
                          {record.oxygenSaturation && (
                            <div>
                              <p className="text-muted-foreground">水分</p>
                              <p className="font-medium">{record.oxygenSaturation} ml</p>
                            </div>
                          )}
                          {record.bloodGlucose && (
                            <div>
                              <p className="text-muted-foreground">血糖</p>
                              <p className="font-medium">{record.bloodGlucose} mg/dL</p>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                            {record.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 表單對話框 */}
      {showBodyCompositionForm && (
        <BodyCompositionForm
          patientId={patient.id}
          existingRecord={editingBodyRecord}
          onClose={() => {
            setShowBodyCompositionForm(false);
            setEditingBodyRecord(null);
          }}
        />
      )}

      {showVitalSignsForm && (
        <VitalSignsForm
          patientId={patient.id}
          onClose={() => {
            setShowVitalSignsForm(false);
            setEditingVitalRecord(null);
          }}
        />
      )}

      {showGoalForm && (
        <GoalForm
          patientId={patient.id}
          onClose={() => setShowGoalForm(false)}
        />
      )}

      {/* 體組成記錄選擇對話框 */}
      <HealthRecordImportDialog
        open={showBodyCompositionImportDialog}
        onOpenChange={setShowBodyCompositionImportDialog}
        onManualEntry={() => setShowBodyCompositionForm(true)}
        onImportExcel={handleImportBodyComposition}
        recordType="bodyComposition"
      />

      {/* 營養記錄選擇對話框 */}
      <HealthRecordImportDialog
        open={showVitalSignsImportDialog}
        onOpenChange={setShowVitalSignsImportDialog}
        onManualEntry={() => setShowVitalSignsForm(true)}
        onImportExcel={handleImportVitalSigns}
        recordType="vitalSigns"
      />

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除這筆記錄嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientHealthDashboard;

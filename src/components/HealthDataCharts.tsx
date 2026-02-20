import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BodyCompositionRecord, VitalSignsRecord, PatientGoal } from "@/types/patient";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Activity, Heart, Weight, Droplet, TrendingUp, Target } from "lucide-react";

interface HealthDataChartsProps {
  bodyCompositionRecords: BodyCompositionRecord[];
  vitalSignsRecords: VitalSignsRecord[];
  goals?: PatientGoal[];
}

const HealthDataCharts = ({
  bodyCompositionRecords,
  vitalSignsRecords,
  goals = [],
}: HealthDataChartsProps) => {
  const [showGoals, setShowGoals] = useState(true);

  // 找到對應類別的目標值
  const getGoalValue = (category: string): number | undefined => {
    const goal = goals.find((g) => g.category === category && g.status === "active");
    return goal?.targetValue;
  };

  // 格式化目標完成日期
  const getGoalTargetDate = (category: string): string | undefined => {
    const goal = goals.find((g) => g.category === category && g.status === "active");
    return goal?.targetDate;
  };

  // 準備體組成數據
  const bodyCompositionData = bodyCompositionRecords
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record) => ({
      date: format(new Date(record.date), "M/d", { locale: zhTW }),
      fullDate: format(new Date(record.date), "yyyy-MM-dd"),
      weight: record.weight,
      bodyFat: record.bodyFat,
      muscleMass: record.muscleMass,
      bmi: record.bmi,
      visceralFat: record.visceralFat,
      bodyWater: record.bodyWater,
      bmr: record.bmr,
    }));

  // 準備生命徵象數據
  const vitalSignsData = vitalSignsRecords
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record) => ({
      date: format(new Date(record.date), "M/d", { locale: zhTW }),
      fullDate: format(new Date(record.date), "yyyy-MM-dd"),
      systolic: record.bloodPressureSystolic,
      diastolic: record.bloodPressureDiastolic,
      heartRate: record.heartRate,
      temperature: record.temperature,
      oxygen: record.oxygenSaturation,
      glucose: record.bloodGlucose,
    }));

  const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
    if (active && payload && (payload as unknown[]).length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label as string}</p>
          {(payload as Record<string, unknown>[]).map((entry: Record<string, unknown>, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value?.toFixed(1)} {entry.unit || ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 檢查是否有活躍的目標
  const hasActiveGoals = goals.some((g) => g.status === "active");

  return (
    <div className="space-y-6">
      {/* 體組成圖表 */}
      {bodyCompositionRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Weight className="h-5 w-5" />
                體組成趨勢
              </CardTitle>
              {hasActiveGoals && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-goals" className="text-sm cursor-pointer text-muted-foreground">
                    顯示目標線
                  </Label>
                  <Switch
                    id="show-goals"
                    checked={showGoals}
                    onCheckedChange={setShowGoals}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weight" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="weight">體重 & BMI</TabsTrigger>
                <TabsTrigger value="bodyFat">體脂 & 肌肉</TabsTrigger>
                <TabsTrigger value="metabolism">代謝</TabsTrigger>
                <TabsTrigger value="composition">身體組成</TabsTrigger>
              </TabsList>

              <TabsContent value="weight" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bodyCompositionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {showGoals && getGoalValue("weight") && (
                      <ReferenceLine
                        yAxisId="left"
                        y={getGoalValue("weight")}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `目標: ${getGoalValue("weight")} kg`,
                          position: "right",
                          style: { fontSize: "12px", fill: "#10b981", fontWeight: "bold" },
                        }}
                      />
                    )}
                    {showGoals && getGoalValue("bmi") && (
                      <ReferenceLine
                        yAxisId="right"
                        y={getGoalValue("bmi")}
                        stroke="#059669"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `BMI目標: ${getGoalValue("bmi")}`,
                          position: "left",
                          style: { fontSize: "12px", fill: "#059669", fontWeight: "bold" },
                        }}
                      />
                    )}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="weight"
                      stroke="#8884d8"
                      name="體重 (kg)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bmi"
                      stroke="#82ca9d"
                      name="BMI"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="bodyFat" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bodyCompositionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {showGoals && getGoalValue("bodyFat") && (
                      <ReferenceLine
                        yAxisId="left"
                        y={getGoalValue("bodyFat")}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `體脂目標: ${getGoalValue("bodyFat")}%`,
                          position: "right",
                          style: { fontSize: "12px", fill: "#10b981", fontWeight: "bold" },
                        }}
                      />
                    )}
                    {showGoals && getGoalValue("muscleMass") && (
                      <ReferenceLine
                        yAxisId="right"
                        y={getGoalValue("muscleMass")}
                        stroke="#059669"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `肌肉目標: ${getGoalValue("muscleMass")} kg`,
                          position: "left",
                          style: { fontSize: "12px", fill: "#059669", fontWeight: "bold" },
                        }}
                      />
                    )}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="bodyFat"
                      stroke="#ff7c7c"
                      name="體脂率 (%)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="muscleMass"
                      stroke="#ffc658"
                      name="肌肉量 (kg)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="metabolism" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bodyCompositionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="bmr" fill="#8884d8" name="基礎代謝率 (kcal)" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="composition" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bodyCompositionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bodyWater"
                      stroke="#00C49F"
                      name="體水分 (%)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="visceralFat"
                      stroke="#FF8042"
                      name="內臟脂肪"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 生命徵象圖表 */}
      {vitalSignsRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              生命徵象趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bloodPressure" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bloodPressure">血壓 & 心率</TabsTrigger>
                <TabsTrigger value="temperature">體溫 & 血氧</TabsTrigger>
                <TabsTrigger value="glucose">血糖</TabsTrigger>
              </TabsList>

              <TabsContent value="bloodPressure" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vitalSignsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="systolic"
                      stroke="#ff6b6b"
                      name="收縮壓 (mmHg)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#4ecdc4"
                      name="舒張壓 (mmHg)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#ffa726"
                      name="心率 (bpm)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="temperature" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vitalSignsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" domain={[35, 40]} />
                    <YAxis yAxisId="right" orientation="right" domain={[90, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ff6b6b"
                      name="體溫 (°C)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="oxygen"
                      stroke="#51cf66"
                      name="血氧飽和度 (%)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="glucose" className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vitalSignsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="glucose" fill="#845ef7" name="血糖 (mg/dL)" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 無數據提示 */}
      {bodyCompositionRecords.length === 0 && vitalSignsRecords.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">尚無健康數據</h3>
            <p className="text-muted-foreground">請新增體組成或生命徵象記錄</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HealthDataCharts;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientGoal, HealthRecord, BodyCompositionRecord } from "@/types/patient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface GoalProgressChartProps {
  goal: PatientGoal;
  healthRecords?: HealthRecord[];
  bodyCompositionRecords?: BodyCompositionRecord[];
}

const GoalProgressChart = ({ goal, healthRecords = [], bodyCompositionRecords = [] }: GoalProgressChartProps) => {
  // 根據目標類別從記錄中提取對應數據
  const getMetricFromBodyComp = (record: BodyCompositionRecord): number | undefined => {
    switch (goal.category) {
      case "weight":
        return record.weight;
      case "bodyFat":
        return record.bodyFat;
      case "muscleMass":
        return record.muscleMass;
      case "bmi":
        return record.bmi;
      default:
        return undefined;
    }
  };

  const getMetricFromHealth = (record: HealthRecord): number | undefined => {
    switch (goal.category) {
      case "weight":
        return record.weight;
      case "bodyFat":
        return record.bodyFat;
      case "muscleMass":
        return record.muscleMass;
      case "bmi":
        return record.bmi;
      default:
        return undefined;
    }
  };

  // 合併並準備圖表數據
  const bodyCompData = bodyCompositionRecords
    .filter((record) => getMetricFromBodyComp(record) !== undefined)
    .map((record) => ({
      date: record.date,
      value: getMetricFromBodyComp(record)!,
    }));

  const healthData = healthRecords
    .filter((record) => getMetricFromHealth(record) !== undefined)
    .map((record) => ({
      date: record.date,
      value: getMetricFromHealth(record)!,
    }));

  const allData = [...bodyCompData, ...healthData]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = allData.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
    }),
    value: item.value,
    target: goal.targetValue,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">目標進度趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            尚無數據可顯示，請新增健康記錄
          </p>
        </CardContent>
      </Card>
    );
  }

  // 計算 Y 軸範圍
  const allValues = chartData.map((d) => d.value);
  const minValue = Math.min(...allValues, goal.targetValue);
  const maxValue = Math.max(...allValues, goal.targetValue);
  const padding = (maxValue - minValue) * 0.1;
  const yAxisMin = Math.max(0, minValue - padding);
  const yAxisMax = maxValue + padding;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {goal.title} - 進度趨勢圖
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              style={{ fontSize: "12px" }}
              label={{
                value: goal.unit,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "12px" },
              }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} ${goal.unit}`, ""]}
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <ReferenceLine
              y={goal.targetValue}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{
                value: `目標: ${goal.targetValue} ${goal.unit}`,
                position: "right",
                style: { fontSize: "12px", fill: "#10b981" },
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              name={`實際 (${goal.unit})`}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">起始值</p>
            <p className="text-lg font-semibold">
              {chartData[0]?.value.toFixed(1)} {goal.unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">最新值</p>
            <p className="text-lg font-semibold">
              {chartData[chartData.length - 1]?.value.toFixed(1)} {goal.unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">目標值</p>
            <p className="text-lg font-semibold text-green-600">
              {goal.targetValue.toFixed(1)} {goal.unit}
            </p>
          </div>
        </div>

        {chartData.length >= 2 && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md">
            <p className="text-sm">
              {(() => {
                const firstValue = chartData[0].value;
                const lastValue = chartData[chartData.length - 1].value;
                const change = lastValue - firstValue;
                const changePercent = ((change / firstValue) * 100).toFixed(1);
                const isImproving =
                  goal.targetValue > goal.currentValue
                    ? change > 0
                    : change < 0;

                return (
                  <>
                    <span className="font-semibold">
                      {isImproving ? "✓ " : "⚠ "}
                      變化:
                    </span>{" "}
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)} {goal.unit} ({changePercent}%)
                    {isImproving ? " - 朝目標前進中！" : " - 需要調整方向"}
                  </>
                );
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalProgressChart;

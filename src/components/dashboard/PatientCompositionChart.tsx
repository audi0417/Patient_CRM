import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { UserPlus, Users } from "lucide-react";

interface PatientCompositionChartProps {
  total: number;
  newThisMonth: number;
}

const COLORS = ["#10b981", "#e2e8f0"]; // emerald for new, light gray for existing

export default function PatientCompositionChart({ total, newThisMonth }: PatientCompositionChartProps) {
  const existing = total - newThisMonth;
  const newPercent = total > 0 ? ((newThisMonth / total) * 100).toFixed(1) : "0";

  const chartData = [
    { name: "本月新客", value: newThisMonth },
    { name: "既有病患", value: existing },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 pt-4 px-4 flex-shrink-0">
        <CardTitle className="text-lg">病患組成</CardTitle>
        <CardDescription className="text-sm">新客 vs 既有病患佔比</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4 px-4 flex items-center">
        <div className="flex items-center gap-4 w-full">
          {/* Pie Chart */}
          <div className="relative w-[130px] h-[130px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} 人`, ""]}
                  contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-emerald-600">{newPercent}%</span>
              <span className="text-xs text-muted-foreground">新客比</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">本月新客</p>
                <p className="text-xl font-bold leading-tight">{newThisMonth}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">既有病患</p>
                <p className="text-xl font-bold leading-tight">{existing.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

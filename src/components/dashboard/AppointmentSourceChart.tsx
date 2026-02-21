import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AppointmentSourceChartProps {
  data: {
    online: number;
    offline: number;
    lineBooking: number;
    phoneCall: number;
    walkIn: number;
  };
}

const SOURCE_CONFIG = [
  { key: "lineBooking" as const, name: "LINE 預約", color: "#06C755" },
  { key: "phoneCall" as const, name: "電話預約", color: "#3b82f6" },
  { key: "walkIn" as const, name: "現場掛號", color: "#f59e0b" },
];

export default function AppointmentSourceChart({ data }: AppointmentSourceChartProps) {
  const chartData = SOURCE_CONFIG.map((s) => ({
    name: s.name,
    value: data[s.key],
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const topSource = chartData.length > 0
    ? chartData.reduce((a, b) => (a.value > b.value ? a : b))
    : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 pt-4 px-4 flex-shrink-0">
        <CardTitle className="text-lg">預約來源</CardTitle>
        <CardDescription className="text-sm">各管道預約佔比</CardDescription>
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
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} 筆`, ""]}
                  contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">總預約</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 min-w-0">
            {SOURCE_CONFIG.map((source) => {
              const value = data[source.key];
              const percent = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
              const isTop = topSource?.name === source.name;
              return (
                <div key={source.key} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground leading-none">{source.name}</p>
                    <p className={`text-lg font-bold leading-tight ${isTop ? "text-foreground" : "text-muted-foreground"}`}>
                      {value} <span className="text-sm font-normal text-muted-foreground">({percent}%)</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

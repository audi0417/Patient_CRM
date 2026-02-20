import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AppointmentTrendProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

export default function AppointmentTrend({ data }: AppointmentTrendProps) {
  // 格式化日期顯示
  const formattedData = data.map(item => ({
    date: formatDate(item.date),
    預約數: item.count
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>預約趨勢</CardTitle>
        <CardDescription>
          過去 {data.length} 天的預約數量變化
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="預約數" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暫無預約數據
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

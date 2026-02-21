import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AppointmentTrendProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

export default function AppointmentTrend({ data }: AppointmentTrendProps) {
  const formattedData = data.map(item => ({
    date: formatDate(item.date),
    預約數: item.count
  }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 pt-4 px-4 flex-shrink-0">
        <CardTitle className="text-lg">預約趨勢</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-4 pb-4">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="預約數"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            暫無預約數據
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

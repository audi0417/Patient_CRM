import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PatientGrowthProps {
  data: Array<{
    month: string;
    count: number;
  }>;
}

export default function PatientGrowth({ data }: PatientGrowthProps) {
  // 格式化月份顯示
  const formattedData = data.map(item => ({
    月份: formatMonth(item.month),
    新增病患: item.count
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>病患成長</CardTitle>
        <CardDescription>
          每月新增病患數量
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="月份" 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="新增病患" 
                fill="#10b981" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暫無病患數據
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-');
  return `${year.slice(2)}年${month}月`;
}

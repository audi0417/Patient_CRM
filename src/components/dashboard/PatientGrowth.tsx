import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PatientGrowthProps {
  data: Array<{
    month: string;
    count: number;
  }>;
}

export default function PatientGrowth({ data }: PatientGrowthProps) {
  const formattedData = data.map(item => ({
    月份: formatMonth(item.month),
    新增病患: item.count
  }));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 pt-4 px-4 flex-shrink-0">
        <CardTitle className="text-lg">病患成長</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-4 pb-4">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="月份" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Bar
                dataKey="新增病患"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
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

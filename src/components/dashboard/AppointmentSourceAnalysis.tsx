import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

interface AppointmentSourceAnalysisProps {
  data: {
    online: number;
    offline: number;
    lineBooking: number;
    phoneCall: number;
    walkIn: number;
  };
}

const COLORS = {
  line: '#06C755',
  phone: '#3b82f6',
  walkIn: '#f59e0b',
};

export default function AppointmentSourceAnalysis({ data }: AppointmentSourceAnalysisProps) {
  const total = data.online + data.offline;
  const onlinePercentage = total > 0 ? ((data.online / total) * 100).toFixed(1) : '0';
  const offlinePercentage = total > 0 ? ((data.offline / total) * 100).toFixed(1) : '0';

  const onlineOfflineData = [
    { name: '線上預約', value: data.online, color: '#10b981' },
    { name: '現場掛號', value: data.offline, color: '#6b7280' },
  ];

  const sourceDetailData = [
    { name: 'LINE 預約', value: data.lineBooking, color: COLORS.line },
    { name: '電話預約', value: data.phoneCall, color: COLORS.phone },
    { name: '現場掛號', value: data.walkIn, color: COLORS.walkIn },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 線上 vs 線下 */}
      <Card>
        <CardHeader>
          <CardTitle>線上 vs 線下診量分布</CardTitle>
          <CardDescription>
            掌握病患預約習慣，優化服務渠道
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={onlineOfflineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  dataKey="value"
                >
                  {onlineOfflineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">線上預約</p>
                <p className="text-2xl font-bold text-green-600">{onlinePercentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">{data.online} 筆</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">現場掛號</p>
                <p className="text-2xl font-bold text-gray-600">{offlinePercentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">{data.offline} 筆</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 預約來源詳細分析 */}
      <Card>
        <CardHeader>
          <CardTitle>預約來源詳細分析</CardTitle>
          <CardDescription>
            了解各渠道的使用情況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sourceDetailData.map((source, index) => {
              const percentage = total > 0 ? ((source.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{source.value} 筆</Badge>
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: source.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">💡 數位化洞察</p>
            <p className="text-xs text-blue-700 mt-1">
              {data.online > data.offline 
                ? '您的診所數位化程度良好！線上預約已成為主要渠道。'
                : '建議加強線上預約推廣，提升病患使用便利性。'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

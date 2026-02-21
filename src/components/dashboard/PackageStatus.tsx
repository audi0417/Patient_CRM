import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PackageStatusProps {
  data: {
    active: number;
    completed: number;
    expired: number;
    expiringSoon: number;
    topServices: Array<{
      name: string;
      usageCount: number;
    }>;
  };
}

export default function PackageStatus({ data }: PackageStatusProps) {
  const maxUsage = data.topServices[0]?.usageCount || 1;
  const total = data.active + data.completed + data.expired;

  // Donut-style status bar data
  const segments = [
    { label: "進行中", value: data.active, color: "bg-blue-500" },
    { label: "已完成", value: data.completed, color: "bg-emerald-500" },
    { label: "已過期", value: data.expired, color: "bg-red-400" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 h-full">
      {/* 療程狀態分佈 */}
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">療程狀態分佈</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Stacked bar */}
          <div className="flex rounded-full h-3 overflow-hidden mb-4">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className={`${seg.color} transition-all`}
                style={{ width: total > 0 ? `${(seg.value / total) * 100}%` : "0%" }}
              />
            ))}
          </div>
          <div className="space-y-3">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                  <span className="text-sm">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{seg.value}</span>
                  <span className="text-xs text-muted-foreground">
                    ({total > 0 ? ((seg.value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 熱門服務排行 */}
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">熱門服務排行</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.topServices.length > 0 ? (
            <div className="space-y-3">
              {data.topServices.slice(0, 5).map((service, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-5 justify-center text-[10px] px-0">
                        {index + 1}
                      </Badge>
                      <span className="font-medium text-sm">{service.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{service.usageCount} 次</span>
                  </div>
                  <Progress
                    value={(service.usageCount / maxUsage) * 100}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              暫無服務使用記錄
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

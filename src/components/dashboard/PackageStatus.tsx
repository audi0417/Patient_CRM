import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, CheckCircle2, XCircle } from "lucide-react";

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

  return (
    <div className="space-y-4">
      {/* 方案狀態摘要 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">進行中</p>
                <p className="text-2xl font-bold">{data.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">即將到期</p>
                <p className="text-2xl font-bold">{data.expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold">{data.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">已過期</p>
                <p className="text-2xl font-bold">{data.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 熱門服務項目排行 */}
      <Card>
        <CardHeader>
          <CardTitle>熱門服務項目排行</CardTitle>
          <CardDescription>
            根據療程使用記錄統計
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topServices.length > 0 ? (
            <div className="space-y-4">
              {data.topServices.map((service, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {service.usageCount} 次
                    </span>
                  </div>
                  <Progress 
                    value={(service.usageCount / maxUsage) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              暫無服務使用記錄
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

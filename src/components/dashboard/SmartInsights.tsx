import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, TrendingUp, Award } from "lucide-react";

interface Insight {
  type: 'success' | 'warning' | 'info' | 'highlight';
  title: string;
  description: string;
  action?: string;
}

interface SmartInsightsProps {
  data: {
    patients: {
      total: number;
      newThisMonth: number;
      returningRate: number;
      dormant: any[];
    };
    appointments: {
      completionRate: number;
      cancellationRate: number;
    };
    line: {
      unreadConversations: number;
      activeConversations: number;
    };
  };
}

export default function SmartInsights({ data }: SmartInsightsProps) {
  const insights: Insight[] = [];

  // 生成營運洞察建議
  // 1. 回訪率分析
  if (data.patients.returningRate > 0.7) {
    insights.push({
      type: 'success',
      title: '客戶黏著度優秀',
      description: `回訪率達 ${(data.patients.returningRate * 100).toFixed(0)}%，顯示病患對診所服務高度滿意。`,
      action: '持續保持服務品質'
    });
  } else if (data.patients.returningRate < 0.5) {
    insights.push({
      type: 'warning',
      title: '回訪率偏低需關注',
      description: `回訪率僅 ${(data.patients.returningRate * 100).toFixed(0)}%，建議加強術後追蹤與客戶關係維護。`,
      action: '建立自動化回診提醒'
    });
  }

  // 2. 沉睡客戶警示
  if (data.patients.dormant.length > 10) {
    insights.push({
      type: 'warning',
      title: '沉睡客戶數量偏高',
      description: `目前有 ${data.patients.dormant.length} 位病患超過 90 天未回診，建議主動關懷。`,
      action: '發送 LINE 關懷訊息'
    });
  }

  // 3. 預約完成率分析
  if (data.appointments.completionRate > 0.85) {
    insights.push({
      type: 'success',
      title: '預約完成率表現優異',
      description: `完成率達 ${(data.appointments.completionRate * 100).toFixed(0)}%，約診提醒系統運作良好。`,
      action: '維持現有提醒機制'
    });
  }

  // 4. 取消率警示
  if (data.appointments.cancellationRate > 0.15) {
    insights.push({
      type: 'warning',
      title: '預約取消率偏高',
      description: `取消率達 ${(data.appointments.cancellationRate * 100).toFixed(0)}%，可能影響營運效率。`,
      action: '優化預約確認流程'
    });
  }

  // 5. LINE 客服待辦
  if (data.line.unreadConversations > 5) {
    insights.push({
      type: 'warning',
      title: 'LINE 訊息待處理',
      description: `目前有 ${data.line.unreadConversations} 則未讀訊息，請盡快回覆避免影響服務品質。`,
      action: '立即處理訊息'
    });
  }

  // 6. 成長趨勢
  if (data.patients.newThisMonth > data.patients.total * 0.1) {
    insights.push({
      type: 'highlight',
      title: '新客成長強勁',
      description: `本月新增 ${data.patients.newThisMonth} 位病患，成長動能良好。`,
      action: '加強新客轉換為忠實客戶'
    });
  }

  // 7. 活躍度分析
  const activityRate = data.patients.total > 0 
    ? (data.line.activeConversations / data.patients.total) * 100 
    : 0;
  
  if (activityRate > 30) {
    insights.push({
      type: 'success',
      title: 'LINE 互動率優秀',
      description: `${activityRate.toFixed(0)}% 的病患近期有互動，數位化經營成效顯著。`,
      action: '持續推廣 LINE 服務'
    });
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Award className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'highlight':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-purple-600" />;
    }
  };

  const getBadgeVariant = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'highlight':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <CardTitle>營運洞察與建議</CardTitle>
          <Badge variant="outline" className="ml-auto">
            {insights.length} 則建議
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${getBgColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge variant={getBadgeVariant(insight.type)} className="text-xs">
                        {insight.type === 'success' ? '優秀' : 
                         insight.type === 'warning' ? '需改善' : 
                         insight.type === 'highlight' ? '亮點' : '建議'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <p className="text-xs font-medium text-gray-700">
                        💡 行動建議：{insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">目前沒有特別需要關注的項目</p>
            <p className="text-xs mt-1">您的診所營運狀況良好！</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

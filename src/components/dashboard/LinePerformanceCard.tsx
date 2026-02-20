import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, MessageCircle, Clock, CheckCircle } from "lucide-react";

interface LinePerformanceCardProps {
  data: {
    totalFriends: number;
    friendsGrowth: number;
    bindingRate: number;
    unreadConversations: number;
    activeConversations: number;
    averageReplyTime: number; // 分鐘
    messagesSent: number;
    messagesReceived: number;
  };
}

export default function LinePerformanceCard({ data }: LinePerformanceCardProps) {
  const metrics = [
    {
      icon: Users,
      label: 'LINE 好友總數',
      value: data.totalFriends?.toLocaleString() || '0',
      trend: data.friendsGrowth,
      trendLabel: '本期成長',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: CheckCircle,
      label: '綁定率',
      value: `${(data.bindingRate * 100).toFixed(1)}%`,
      description: '已綁定病歷的比例',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: MessageCircle,
      label: '活躍對話',
      value: data.activeConversations,
      description: '近7天有互動',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Clock,
      label: '平均回覆時間',
      value: data.averageReplyTime > 60 
        ? `${Math.floor(data.averageReplyTime / 60)}小時` 
        : `${data.averageReplyTime}分鐘`,
      description: '客服回應速度',
      color: data.averageReplyTime < 30 ? 'text-green-600' : 'text-amber-600',
      bgColor: data.averageReplyTime < 30 ? 'bg-green-50' : 'bg-amber-50',
      alert: data.averageReplyTime > 60
    }
  ];

  const interactionRate = data.messagesReceived > 0 
    ? ((data.messagesSent / data.messagesReceived) * 100).toFixed(1) 
    : '0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              LINE OA 推廣表現
            </CardTitle>
            <CardDescription className="mt-1">
              追蹤 LINE 官方帳號的經營成果與推播效益
            </CardDescription>
          </div>
          {data.unreadConversations > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {data.unreadConversations} 則未讀
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className={`p-4 rounded-lg ${metric.bgColor} relative`}>
                <div className="flex items-start justify-between mb-2">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  {metric.alert && (
                    <Badge variant="outline" className="text-xs py-0">
                      需改善
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </p>
                {metric.trend !== undefined && (
                  <div className={`flex items-center mt-2 text-xs ${
                    metric.trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {metric.trend > 0 ? '+' : ''}{metric.trend} {metric.trendLabel}
                  </div>
                )}
                {metric.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 互動分析 */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">本期訊息互動</p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">發送：</span>
                  <span className="text-sm font-bold text-blue-600 ml-1">
                    {data.messagesSent}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">接收：</span>
                  <span className="text-sm font-bold text-green-600 ml-1">
                    {data.messagesReceived}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">回覆率：</span>
                  <span className="text-sm font-bold text-purple-600 ml-1">
                    {interactionRate}%
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              {Number(interactionRate) > 80 ? '優秀' : Number(interactionRate) > 50 ? '良好' : '待改善'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

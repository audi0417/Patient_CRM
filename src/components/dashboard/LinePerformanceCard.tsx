import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, MessageCircle, Clock, CheckCircle, Send, Inbox } from "lucide-react";

interface LinePerformanceCardProps {
  data: {
    totalFriends: number;
    friendsGrowth: number;
    bindingRate: number;
    unreadConversations: number;
    activeConversations: number;
    averageReplyTime: number;
    messagesSent: number;
    messagesReceived: number;
    dailyMessageTrend: Array<{
      date: string;
      sent: number;
      received: number;
    }>;
  };
}

export default function LinePerformanceCard({ data }: LinePerformanceCardProps) {
  const interactionRate = data.messagesReceived > 0
    ? ((data.messagesSent / data.messagesReceived) * 100).toFixed(0)
    : '0';

  const metrics = [
    {
      icon: Users,
      label: '好友總數',
      value: data.totalFriends?.toLocaleString() || '0',
      trend: data.friendsGrowth,
      color: 'text-[#06C755]',
      bgColor: 'bg-green-50'
    },
    {
      icon: CheckCircle,
      label: '綁定率',
      value: `${(data.bindingRate * 100).toFixed(0)}%`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: MessageCircle,
      label: '活躍對話',
      value: String(data.activeConversations),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Clock,
      label: '平均回覆',
      value: data.averageReplyTime > 60
        ? `${Math.floor(data.averageReplyTime / 60)}hr`
        : `${data.averageReplyTime}min`,
      color: data.averageReplyTime < 30 ? 'text-green-600' : 'text-amber-600',
      bgColor: data.averageReplyTime < 30 ? 'bg-green-50' : 'bg-amber-50',
    }
  ];

  const last7 = data.dailyMessageTrend?.slice(-7) || [];

  return (
    <div className="grid gap-3 md:grid-cols-2 h-full">
      {/* Left: 核心指標 */}
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#06C755] flex items-center justify-center">
              <MessageCircle className="h-3 w-3 text-white" />
            </div>
            LINE OA 指標
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className={`${m.bgColor} rounded-lg p-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  {m.trend !== undefined && (
                    <div className={`flex items-center text-[11px] mt-0.5 ${m.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                      {m.trend > 0 ? '+' : ''}{m.trend}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Right: 訊息互動 + 近7日 */}
      <Card className="h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">訊息互動</CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5">
              回覆率 {interactionRate}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* 發送/接收摘要 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-blue-600" />
              <div>
                <p className="text-[11px] text-muted-foreground">發送</p>
                <p className="text-lg font-bold text-blue-600">{data.messagesSent}</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5 text-green-600" />
              <div>
                <p className="text-[11px] text-muted-foreground">接收</p>
                <p className="text-lg font-bold text-green-600">{data.messagesReceived}</p>
              </div>
            </div>
          </div>

          {/* 近 7 日趨勢 */}
          {last7.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">近 7 日</p>
              {last7.map((day, i) => {
                const maxVal = Math.max(...last7.map(d => d.sent + d.received), 1);
                const dayTotal = day.sent + day.received;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-10 flex-shrink-0">
                      {new Date(day.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                    </span>
                    <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-blue-400 h-full" style={{ width: `${(day.sent / maxVal) * 100}%` }} />
                      <div className="bg-green-400 h-full" style={{ width: `${(day.received / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-muted-foreground w-6 text-right flex-shrink-0">{dayTotal}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

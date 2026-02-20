import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  MessageSquare, 
  UserPlus, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SummaryCardsProps {
  data: {
    todayAppointments: number;
    todayAppointmentsDiff: number;
    unreadMessages: number;
    newPatientsThisMonth: number;
    newPatientsGrowthRate: number;
    expiringPackages: number;
  };
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const cards = [
    {
      title: "今日預約",
      value: data.todayAppointments,
      icon: Calendar,
      description: "已安排的預約",
      trend: data.todayAppointmentsDiff,
      trendLabel: "vs 昨日"
    },
    {
      title: "未讀訊息",
      value: data.unreadMessages,
      icon: MessageSquare,
      description: "LINE 待回覆訊息",
      showBadge: data.unreadMessages > 0,
      badgeVariant: "destructive" as const
    },
    {
      title: "本月新客",
      value: data.newPatientsThisMonth,
      icon: UserPlus,
      description: "本月新增病患",
      trend: data.newPatientsGrowthRate,
      trendLabel: "相較上月",
      trendType: "percentage" as const
    },
    {
      title: "到期療程",
      value: data.expiringPackages,
      icon: AlertCircle,
      description: "7天內到期",
      showBadge: data.expiringPackages > 0,
      badgeVariant: "default" as const,
      badgeText: "需處理"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
              
              {card.trend !== undefined && (
                <div className={`flex items-center mt-2 text-xs ${
                  card.trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {card.trend > 0 ? '+' : ''}
                  {card.trend}
                  {card.trendType === 'percentage' ? '%' : ''}
                  {card.trendLabel && (
                    <span className="ml-1 text-muted-foreground">
                      {card.trendLabel}
                    </span>
                  )}
                </div>
              )}
              
              {card.showBadge && card.badgeText && (
                <Badge variant={card.badgeVariant} className="mt-2">
                  {card.badgeText}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

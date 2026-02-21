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
      trend: data.todayAppointmentsDiff,
      trendLabel: "vs 昨日"
    },
    {
      title: "未讀訊息",
      value: data.unreadMessages,
      icon: MessageSquare,
      showBadge: data.unreadMessages > 0,
    },
    {
      title: "本月新客",
      value: data.newPatientsThisMonth,
      icon: UserPlus,
      trend: data.newPatientsGrowthRate,
      trendLabel: "vs 上月",
      trendType: "percentage" as const
    },
    {
      title: "到期療程",
      value: data.expiringPackages,
      icon: AlertCircle,
      showBadge: data.expiringPackages > 0,
      badgeText: "需處理"
    }
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-shrink-0">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-card rounded-lg border px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground leading-none">{card.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold leading-tight">{card.value}</span>
                {card.trend !== undefined && (
                  <span className={`flex items-center text-xs font-medium ${
                    card.trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {card.trend > 0 ? '+' : ''}{card.trend}{card.trendType === 'percentage' ? '%' : ''}
                  </span>
                )}
                {card.showBadge && card.badgeText && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-200 bg-amber-50">
                    {card.badgeText}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

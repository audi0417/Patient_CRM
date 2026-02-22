import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  RefreshCw,
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Award,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import AppointmentTrend from "@/components/dashboard/AppointmentTrend";
import PatientGrowth from "@/components/dashboard/PatientGrowth";
import ServiceDistribution from "@/components/dashboard/ServiceDistribution";
import DormantPatients from "@/components/dashboard/DormantPatients";
import AppointmentSourceAnalysis from "@/components/dashboard/AppointmentSourceAnalysis";
import LinePerformanceCard from "@/components/dashboard/LinePerformanceCard";
import ComparisonCard from "@/components/dashboard/ComparisonCard";
import SmartInsights from "@/components/dashboard/SmartInsights";
import PatientCompositionChart from "@/components/dashboard/PatientCompositionChart";
import AppointmentSourceChart from "@/components/dashboard/AppointmentSourceChart";

interface DashboardData {
  summary: {
    todayAppointments: number;
    todayAppointmentsDiff: number;
    unreadMessages: number;
    newPatientsThisMonth: number;
    newPatientsGrowthRate: number;
    expiringPackages: number;
  };
  patients: {
    total: number;
    newThisMonth: number;
    growthTrend: Array<{ month: string; count: number }>;
    genderDistribution: Record<string, number>;
    ageDistribution: Array<{ range: string; count: number }>;
    returningRate: number;
    previousReturningRate: number;
    dormant: Array<{
      id: string;
      name: string;
      lastVisitDate: string;
      daysSinceLastVisit: number;
    }>;
  };
  appointments: {
    total: number;
    lastPeriodTotal: number;
    completionRate: number;
    previousCompletionRate: number;
    cancellationRate: number;
    trend: Array<{ date: string; count: number }>;
    byTimeSlot: Array<{ time: string; count: number }>;
    byServiceType: Array<{ type: string; count: number }>;
    sourceAnalysis: {
      online: number;
      offline: number;
      lineBooking: number;
      phoneCall: number;
      walkIn: number;
    };
  };
  packages: {
    active: number;
    completed: number;
    expired: number;
    expiringSoon: number;
    topServices: Array<{ name: string; usageCount: number }>;
  };
  line: {
    unreadConversations: number;
    activeConversations: number;
    totalFriends: number;
    friendsGrowth: number;
    bindingRate: number;
    averageReplyTime: number;
    messagesSent: number;
    messagesReceived: number;
    dailyMessageTrend: Array<{
      date: string;
      sent: number;
      received: number;
    }>;
  };
  period: string;
  generatedAt: string;
}

type SheetPanel = null | "insights" | "appointmentSource" | "serviceType" | "dormant" | "lineDetail" | "messageTrend";

function StatCard({
  label,
  value,
  color,
  suffix,
  onClick,
}: {
  label: string;
  value: string | number;
  color?: string;
  suffix?: string;
  onClick?: () => void;
}) {
  const colorClass = color ? `text-${color}-600` : "";
  const interactive = !!onClick;
  return (
    <div
      className={`bg-card px-4 py-3 rounded-lg border ${interactive ? "cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {interactive && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />}
      </div>
      <p className={`text-3xl font-bold ${colorClass}`}>
        {value}
        {suffix && <span className="text-base font-normal text-muted-foreground"> {suffix}</span>}
      </p>
    </div>
  );
}


function MiniMetric({
  label,
  value,
  diff,
  positive,
}: {
  label: string;
  value: string;
  diff: number;
  positive: boolean;
}) {
  return (
    <div className="bg-card rounded-lg border px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
        positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
      }`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : "-"}{diff}%
      </div>
    </div>
  );
}

const tabTriggerClass = "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 rounded-none transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

export default function ClinicDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [activeSheet, setActiveSheet] = useState<SheetPanel>(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("hospital_crm_auth_token");

      const response = await fetch(
        `/api/analytics/clinic-dashboard?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("無法載入儀表板數據");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-[95vw] py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <div className="text-lg">載入儀表板數據中...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-[95vw] py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchDashboardData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 計算變化率的輔助函數
  const calculateChangeRate = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // 計算回訪率變化
  const returningRateChange = calculateChangeRate(
    data.patients.returningRate,
    data.patients.previousReturningRate
  );

  // 計算預約完成率變化
  const completionRateChange = calculateChangeRate(
    data.appointments.completionRate,
    data.appointments.previousCompletionRate
  );

  const sheetConfig: Record<Exclude<SheetPanel, null>, { title: string; description: string }> = {
    insights: { title: "營運建議", description: "根據數據自動產生的營運分析與建議" },
    appointmentSource: { title: "預約來源分析", description: "各管道預約來源佔比與趨勢" },
    serviceType: { title: "服務類型分佈", description: "各服務項目的預約比例" },
    dormant: { title: "沉睡病患名單", description: "超過 90 天未回訪的病患" },
    lineDetail: { title: "LINE 績效詳情", description: "完整的 LINE OA 互動指標" },
    messageTrend: { title: "近 7 日訊息量", description: "每日發送與接收訊息統計" },
  };

  {/*
    高度拆解（硬算，不用 flex-1）:
    - Header: 64px
    - 本頁 py: 12*2 = 24px
    - 標題列: 36px + mb-2(8px) = 44px
    - TabsList: 42px
    - TabContent pt: 12px + gap: 12px
    - StatCard 列: 58px
    - gap: 12px
    合計固定 = 64+24+44+42+12+12+58+12 = 268px
    圖表區高度 = calc(100vh - 268px)
  */}
  return (
    <div className="h-[calc(100vh-64px)] bg-background overflow-hidden">
      <div className="w-[95vw] mx-auto px-2 py-3">
        {/* 標題列 + 篩選器 */}
        <div className="flex items-center justify-between mb-2 h-9">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            營運儀表板
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {user?.organizationId || "診所"}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden lg:inline">
              更新：{new Date(data.generatedAt).toLocaleString("zh-TW")}
            </span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="時間範圍" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">過去 7 天</SelectItem>
                <SelectItem value="30d">過去 30 天</SelectItem>
                <SelectItem value="90d">過去 90 天</SelectItem>
                <SelectItem value="1y">過去 1 年</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* 頁籤 */}
        <Tabs defaultValue="overview">
          <TabsList className="inline-flex h-[42px] p-0 bg-transparent border-b w-full justify-start">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              <LayoutDashboard className="h-4 w-4" />
              總覽
            </TabsTrigger>
            <TabsTrigger value="appointments" className={tabTriggerClass}>
              <Calendar className="h-4 w-4" />
              預約分析
            </TabsTrigger>
            <TabsTrigger value="patients" className={tabTriggerClass}>
              <Users className="h-4 w-4" />
              病患分析
            </TabsTrigger>
            <TabsTrigger value="line" className={tabTriggerClass}>
              <MessageSquare className="h-4 w-4" />
              LINE 通訊
            </TabsTrigger>
          </TabsList>

          {/* ===== 總覽 ===== */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            <SummaryCards data={data.summary} />
            <div className="grid grid-cols-3 gap-3 h-[calc(100vh-268px)]">
              <PatientCompositionChart
                total={data.patients.total}
                newThisMonth={data.patients.newThisMonth}
              />
              <AppointmentSourceChart data={data.appointments.sourceAnalysis} />
              <div className="flex flex-col gap-2">
                <MiniMetric
                  label="回訪率"
                  value={`${(data.patients.returningRate * 100).toFixed(0)}%`}
                  diff={Math.abs(returningRateChange)}
                  positive={returningRateChange >= 0}
                />
                <MiniMetric
                  label="預約完成率"
                  value={`${(data.appointments.completionRate * 100).toFixed(0)}%`}
                  diff={Math.abs(completionRateChange)}
                  positive={completionRateChange >= 0}
                />
                <div className="bg-card rounded-lg border px-4 py-3 flex-1 overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-2">營運建議</p>
                  <div className="space-y-2">
                    {(() => {
                      const insights: Array<{ type: string; title: string; desc: string }> = [];
                      if (data.patients.returningRate > 0.7) {
                        insights.push({ type: "success", title: "客戶黏著度優秀", desc: `回訪率達 ${(data.patients.returningRate * 100).toFixed(0)}%` });
                      } else if (data.patients.returningRate < 0.5) {
                        insights.push({ type: "warning", title: "回訪率偏低", desc: "建議加強術後追蹤" });
                      }
                      if (data.patients.dormant.length > 10) {
                        insights.push({ type: "warning", title: "沉睡客戶偏高", desc: `${data.patients.dormant.length} 位超過 90 天未回診` });
                      }
                      if (data.appointments.completionRate > 0.85) {
                        insights.push({ type: "success", title: "預約完成率優異", desc: `完成率 ${(data.appointments.completionRate * 100).toFixed(0)}%` });
                      }
                      if (data.appointments.cancellationRate > 0.15) {
                        insights.push({ type: "warning", title: "取消率偏高", desc: `取消率 ${(data.appointments.cancellationRate * 100).toFixed(0)}%` });
                      }
                      if (data.line.unreadConversations > 5) {
                        insights.push({ type: "warning", title: "LINE 待處理", desc: `${data.line.unreadConversations} 則未讀` });
                      }
                      if (data.patients.newThisMonth > data.patients.total * 0.1) {
                        insights.push({ type: "success", title: "新客成長強勁", desc: `本月新增 ${data.patients.newThisMonth} 位` });
                      }
                      if (insights.length === 0) {
                        return (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Award className="h-4 w-4" />
                            <span className="text-sm font-medium">營運狀況良好！</span>
                          </div>
                        );
                      }
                      return insights.map((ins, i) => (
                        <div key={i} className="flex items-start gap-2">
                          {ins.type === "warning"
                            ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            : <Award className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          }
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{ins.title}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{ins.desc}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== 預約分析 ===== */}
          <TabsContent value="appointments" className="mt-3 space-y-3">
            <div className="grid gap-3 grid-cols-4">
              <StatCard label="總預約數" value={data.appointments.total} onClick={() => setActiveSheet("appointmentSource")} />
              <StatCard label="完成率" value={`${(data.appointments.completionRate * 100).toFixed(0)}%`} color="emerald" />
              <StatCard label="取消率" value={`${(data.appointments.cancellationRate * 100).toFixed(0)}%`} color="red" />
              <StatCard label="服務分佈" value={`${data.appointments.byServiceType.length} 類`} onClick={() => setActiveSheet("serviceType")} />
            </div>
            <div className="h-[calc(100vh-268px)]">
              <AppointmentTrend data={data.appointments.trend} />
            </div>
          </TabsContent>

          {/* ===== 病患分析 ===== */}
          <TabsContent value="patients" className="mt-3 space-y-3">
            <div className="grid gap-3 grid-cols-3">
              <StatCard label="總病患數" value={data.patients.total} />
              <StatCard label="本月新增" value={data.patients.newThisMonth} color="emerald" />
              <StatCard
                label="沉睡病患"
                value={data.patients.dormant.length}
                color="amber"
                onClick={() => setActiveSheet("dormant")}
              />
            </div>
            <div className="h-[calc(100vh-268px)]">
              <PatientGrowth data={data.patients.growthTrend} />
            </div>
          </TabsContent>


          {/* ===== LINE 通訊 ===== */}
          <TabsContent value="line" className="mt-3 space-y-3">
            <div className="grid gap-3 grid-cols-4">
              <StatCard label="好友總數" value={data.line.totalFriends} />
              <StatCard label="未讀對話" value={data.line.unreadConversations} color="red" />
              <StatCard label="活躍對話" value={data.line.activeConversations} color="emerald" />
              <StatCard label="平均回覆" value={data.line.averageReplyTime} suffix="分鐘" />
            </div>
            <div className="h-[calc(100vh-268px)]">
              <LinePerformanceCard data={data.line} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 右側滑出面板 */}
      <Sheet open={activeSheet !== null} onOpenChange={(open) => { if (!open) setActiveSheet(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {activeSheet && (
            <>
              <SheetHeader>
                <SheetTitle>{sheetConfig[activeSheet].title}</SheetTitle>
                <SheetDescription>{sheetConfig[activeSheet].description}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                {activeSheet === "insights" && <SmartInsights data={data} />}
                {activeSheet === "appointmentSource" && <AppointmentSourceAnalysis data={data.appointments.sourceAnalysis} />}
                {activeSheet === "serviceType" && <ServiceDistribution data={data.appointments.byServiceType} />}
                {activeSheet === "dormant" && <DormantPatients data={data.patients.dormant} />}
                {activeSheet === "lineDetail" && <LinePerformanceCard data={data.line} />}
                {activeSheet === "messageTrend" && (
                  <div className="space-y-3">
                    {data.line.dailyMessageTrend.slice(-7).map((day, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">
                          {new Date(day.date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                        </span>
                        <span className="text-sm">
                          <span className="text-blue-600">發送: {day.sent}</span>
                          <span className="mx-2">/</span>
                          <span className="text-green-600">接收: {day.received}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

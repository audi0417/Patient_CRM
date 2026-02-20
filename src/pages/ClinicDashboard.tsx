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
  RefreshCw, 
  TrendingUp, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  MessageSquare,
  Lightbulb
} from "lucide-react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import AppointmentTrend from "@/components/dashboard/AppointmentTrend";
import PatientGrowth from "@/components/dashboard/PatientGrowth";
import ServiceDistribution from "@/components/dashboard/ServiceDistribution";
import DormantPatients from "@/components/dashboard/DormantPatients";
import PackageStatus from "@/components/dashboard/PackageStatus";
import AppointmentSourceAnalysis from "@/components/dashboard/AppointmentSourceAnalysis";
import LinePerformanceCard from "@/components/dashboard/LinePerformanceCard";
import ComparisonCard from "@/components/dashboard/ComparisonCard";
import SmartInsights from "@/components/dashboard/SmartInsights";

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

export default function ClinicDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[95vw] py-8">
        {/* 標題與篩選器 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              診所營運儀表板
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.organizationName || ""}的營運數據總覽
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="選擇時間範圍" />
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
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 分頁籤導航 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="border-b">
            <TabsList className="inline-flex h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <LayoutDashboard className="h-4 w-4" />
                總覽
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Lightbulb className="h-4 w-4" />
                營運建議
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Calendar className="h-4 w-4" />
                預約分析
              </TabsTrigger>
              <TabsTrigger 
                value="patients" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Users className="h-4 w-4" />
                病患分析
              </TabsTrigger>
              <TabsTrigger 
                value="packages" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Package className="h-4 w-4" />
                療程管理
              </TabsTrigger>
              <TabsTrigger 
                value="line" 
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <MessageSquare className="h-4 w-4" />
                LINE 通訊
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 總覽頁面 */}
          <TabsContent value="overview" className="space-y-6">
            <SummaryCards data={data.summary} />
            
            <div className="grid gap-4 md:grid-cols-4">
              <ComparisonCard 
                title="總病患數"
                currentValue={data.patients.total}
                previousValue={data.patients.total - data.patients.newThisMonth}
              />
              <ComparisonCard 
                title="回訪率"
                currentValue={data.patients.returningRate * 100}
                previousValue={(data.patients.returningRate - 0.05) * 100}
                unit="%"
                format="number"
              />
              <ComparisonCard 
                title="預約完成率"
                currentValue={data.appointments.completionRate * 100}
                previousValue={(data.appointments.completionRate - 0.02) * 100}
                unit="%"
                format="number"
              />
              <ComparisonCard 
                title="取消率"
                currentValue={data.appointments.cancellationRate * 100}
                previousValue={(data.appointments.cancellationRate + 0.01) * 100}
                unit="%"
                format="number"
                reverseColor={true}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <AppointmentTrend data={data.appointments.trend} />
              <PatientGrowth data={data.patients.growthTrend} />
            </div>
          </TabsContent>

          {/* 營運建議頁面 */}
          <TabsContent value="insights" className="space-y-6">
            <SmartInsights data={data} />
            
            <div className="grid gap-6 md:grid-cols-2">
              <ServiceDistribution data={data.appointments.byServiceType} />
              <PackageStatus data={data.packages} />
            </div>
          </TabsContent>

          {/* 預約分析頁面 */}
          <TabsContent value="appointments" className="space-y-6">
            <AppointmentSourceAnalysis data={data.appointments.sourceAnalysis} />
            
            <div className="grid gap-6 md:grid-cols-2">
              <AppointmentTrend data={data.appointments.trend} />
              <ServiceDistribution data={data.appointments.byServiceType} />
            </div>
            
            <div className="grid gap-4 md:grid-cols-4">
              <ComparisonCard 
                title="總預約數"
                currentValue={data.appointments.total}
                previousValue={data.appointments.lastPeriodTotal}
              />
              <ComparisonCard 
                title="預約完成率"
                currentValue={data.appointments.completionRate * 100}
                previousValue={(data.appointments.completionRate - 0.02) * 100}
                unit="%"
                format="number"
              />
              <ComparisonCard 
                title="預約取消率"
                currentValue={data.appointments.cancellationRate * 100}
                previousValue={(data.appointments.cancellationRate + 0.01) * 100}
                unit="%"
                format="number"
                reverseColor={true}
              />
              <div className="bg-card p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">數位化率</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {data.appointments.total > 0 
                    ? ((data.appointments.sourceAnalysis.online / data.appointments.total) * 100).toFixed(0)
                    : '0'}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">線上預約佔比  {(data.appointments.completionRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">取消率</p>
                <p className="text-3xl font-bold text-red-600">
                  {(data.appointments.cancellationRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </TabsContent>

          {/* 病患分析頁面 */}
          <TabsContent value="patients" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <PatientGrowth data={data.patients.growthTrend} />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-2">總病患數</p>
                  <p className="text-3xl font-bold">{data.patients.total}</p>
             LinePerformanceCard data={data.line} /
            <DormantPatients data={data.patients.dormant} />
          </TabsContent>

          {/* 療程管理頁面 */}
          <TabsContent value="packages" className="space-y-6">
            <PackageStatus data={data.packages} />
          </TabsContent>

          {/* LINE 通訊頁面 */}
          <TabsContent value="line" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-card p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">未讀對話</p>
                <p className="text-3xl font-bold text-red-600">
                  {data.line.unreadConversations}
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">活躍對話</p>
                <p className="text-3xl font-bold text-green-600">
                  {data.line.activeConversations}
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">本期訊息</p>
                <p className="text-3xl font-bold">
                  {data.line.dailyMessageTrend.reduce((sum, day) => sum + day.sent + day.received, 0)}
                </p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">訊息量趨勢</h3>
              <div className="space-y-2">
                {data.line.dailyMessageTrend.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="text-blue-600">發送: {day.sent}</span>
                        <span className="mx-2">/</span>
                        <span className="text-green-600">接收: {day.received}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 最後更新時間 */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          最後更新：{new Date(data.generatedAt).toLocaleString('zh-TW')}
        </div>
      </div>
    </div>
  );
}

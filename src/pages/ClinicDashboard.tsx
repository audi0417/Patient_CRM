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
import { RefreshCw, TrendingUp } from "lucide-react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import AppointmentTrend from "@/components/dashboard/AppointmentTrend";
import PatientGrowth from "@/components/dashboard/PatientGrowth";
import ServiceDistribution from "@/components/dashboard/ServiceDistribution";
import DormantPatients from "@/components/dashboard/DormantPatients";
import PackageStatus from "@/components/dashboard/PackageStatus";

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
    completionRate: number;
    cancellationRate: number;
    trend: Array<{ date: string; count: number }>;
    byTimeSlot: Array<{ time: string; count: number }>;
    byServiceType: Array<{ type: string; count: number }>;
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
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

        <div className="space-y-8">
          {/* 今日摘要卡片 */}
          <SummaryCards data={data.summary} />

          {/* 預約與服務分析 */}
          <div className="grid gap-6 md:grid-cols-2">
            <AppointmentTrend data={data.appointments.trend} />
            <ServiceDistribution data={data.appointments.byServiceType} />
          </div>

          {/* 病患成長與沉睡客戶 */}
          <div className="grid gap-6 md:grid-cols-2">
            <PatientGrowth data={data.patients.growthTrend} />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">總病患數</p>
                  <p className="text-3xl font-bold mt-1">{data.patients.total}</p>
                </div>
                <div className="bg-card p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">回訪率</p>
                  <p className="text-3xl font-bold mt-1">
                    {(data.patients.returningRate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">預約完成率</p>
                  <p className="text-3xl font-bold mt-1">
                    {(data.appointments.completionRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-card p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">活躍對話</p>
                  <p className="text-3xl font-bold mt-1">
                    {data.line.activeConversations}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 沉睡客戶清單 */}
          <DormantPatients data={data.patients.dormant} />

          {/* 療程方案狀態 */}
          <PackageStatus data={data.packages} />
        </div>

        {/* 最後更新時間 */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          最後更新：{new Date(data.generatedAt).toLocaleString('zh-TW')}
        </div>
      </div>
    </div>
  );
}

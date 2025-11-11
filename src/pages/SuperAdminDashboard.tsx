import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  UserCheck,
  Calendar,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  organizations: {
    total: number;
    active: number;
    byPlan: {
      basic: number;
      professional: number;
      enterprise: number;
    };
  };
  users: {
    total: number;
    admins: number;
    active: number;
  };
  patients: {
    total: number;
    thisMonth: number;
  };
  appointments: {
    scheduled: number;
    completed: number;
  };
  quotaWarnings: Array<{
    organizationId: string;
    organizationName: string;
    type: string;
    usage: number;
  }>;
  monthlyGrowth: {
    organizations: number;
    users: number;
    patients: number;
  };
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/superadmin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("無法載入儀表板數據");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">載入中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    trend
  }: {
    title: string;
    value: number | string;
    description: string;
    icon: any;
    trend?: number;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend > 0 ? '+' : ''}{trend} 本月
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">超級管理員控制台</h1>
          <p className="text-muted-foreground mt-1">系統總覽與管理</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/superadmin/organizations">管理組織</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/superadmin/revenue">收入報表</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="組織總數"
          value={stats.organizations.total}
          description={`${stats.organizations.active} 個活躍中`}
          icon={Building2}
          trend={stats.monthlyGrowth.organizations}
        />
        <StatCard
          title="用戶總數"
          value={stats.users.total}
          description={`${stats.users.admins} 位管理員`}
          icon={Users}
          trend={stats.monthlyGrowth.users}
        />
        <StatCard
          title="患者總數"
          value={stats.patients.total}
          description={`本月新增 ${stats.patients.thisMonth} 位`}
          icon={UserCheck}
          trend={stats.monthlyGrowth.patients}
        />
        <StatCard
          title="預約統計"
          value={stats.appointments.scheduled}
          description={`${stats.appointments.completed} 筆已完成`}
          icon={Calendar}
        />
      </div>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            訂閱方案分布
          </CardTitle>
          <CardDescription>各方案的組織數量</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Basic</p>
                <p className="text-2xl font-bold">{stats.organizations.byPlan.basic}</p>
                <p className="text-xs text-muted-foreground mt-1">TWD 99/月</p>
              </div>
              <Badge variant="outline">基礎版</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Professional</p>
                <p className="text-2xl font-bold">{stats.organizations.byPlan.professional}</p>
                <p className="text-xs text-muted-foreground mt-1">TWD 499/月</p>
              </div>
              <Badge>專業版</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                <p className="text-2xl font-bold">{stats.organizations.byPlan.enterprise}</p>
                <p className="text-xs text-muted-foreground mt-1">TWD 1,999/月</p>
              </div>
              <Badge variant="secondary">企業版</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quota Warnings */}
      {stats.quotaWarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              配額警告
            </CardTitle>
            <CardDescription>以下組織接近或超過配額限制</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.quotaWarnings.map((warning, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{warning.organizationName}</p>
                    <p className="text-sm text-muted-foreground">
                      {warning.type === 'users' ? '用戶數' : '患者數'}使用率: {warning.usage}%
                    </p>
                  </div>
                  <Badge variant={warning.usage >= 100 ? "destructive" : "secondary"}>
                    {warning.usage >= 100 ? '已超限' : '即將滿額'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            本月增長趨勢
          </CardTitle>
          <CardDescription>與上月相比的增長情況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">新增組織</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.monthlyGrowth.organizations}</span>
                <Badge variant="outline">組織</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">新增用戶</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.monthlyGrowth.users}</span>
                <Badge variant="outline">用戶</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">新增患者</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.monthlyGrowth.patients}</span>
                <Badge variant="outline">患者</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用管理功能</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/superadmin/organizations">查看所有組織</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/superadmin/organizations/new">創建新組織</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/superadmin/analytics">使用量分析</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/superadmin/activity-log">活動日誌</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;

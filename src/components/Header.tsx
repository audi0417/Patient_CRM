import { Activity, Settings, LogOut, Users, User as UserIcon, Shield, BarChart3, MessageSquare, UsersRound, Heart, Calendar, Package, TrendingUp } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useModules } from "@/hooks/useModules";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types/user";
import NotificationBell from "@/components/NotificationBell";
import { useState, useEffect } from "react";
import { lineApi } from "@/lib/api/lineApi";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, permissions } = useAuth();
  const { isModuleEnabled } = useModules();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  // 定期檢查未讀 LINE 訊息數量
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!isModuleEnabled('lineMessaging')) return;

      try {
        const response = await lineApi.conversations.getAll({ status: 'ACTIVE' });
        if (response.success && response.data) {
          const total = response.data.reduce((sum, conv) => sum + conv.unreadCount, 0);
          setTotalUnreadMessages(total);
        }
      } catch (error) {
        // 靜默失敗，不影響其他功能
        console.error('Failed to check unread messages:', error);
      }
    };

    // 立即執行一次
    checkUnreadMessages();

    // 每 5 秒檢查一次
    const interval = setInterval(checkUnreadMessages, 5000);

    return () => clearInterval(interval);
  }, [isModuleEnabled]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="w-full">
        <div className="container max-w-[90vw] flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">醫療CRM系統</span>
            </Link>

            <nav className="flex gap-6">
            {user?.role === "super_admin" ? (
              <>
                <Link
                  to="/analytics"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname === "/analytics"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  統計報表
                </Link>
                <Link
                  to="/superadmin"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    location.pathname.startsWith("/superadmin")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  企業管理
                </Link>
                <Link
                  to="/"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    isActive("/")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <UsersRound className="h-4 w-4" />
                  患者列表
                </Link>
              </>
            ) : (
              <>
                {isModuleEnabled('clinicDashboard') && (
                <Link
                  to="/dashboard"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    isActive("/dashboard")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  營運儀表板
                </Link>
                )}
                <Link
                  to="/"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                    isActive("/")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <UsersRound className="h-4 w-4" />
                  患者列表
                </Link>
                {isModuleEnabled('healthManagement') && (
                  <Link
                    to="/health-analytics"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                      isActive("/health-analytics")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    營養管理
                  </Link>
                )}
                {isModuleEnabled('appointments') && (
                  <Link
                    to="/appointments"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                      isActive("/appointments")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    回診管理
                  </Link>
                )}
                {isModuleEnabled('lineMessaging') && (
                  <Link
                    to="/line/messages"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 relative",
                      location.pathname.startsWith("/line")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    LINE訊息
                    {totalUnreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
                    )}
                  </Link>
                )}
                {isModuleEnabled('treatmentPackages') && (
                  <Link
                    to="/treatment-packages"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                      location.pathname.startsWith("/treatment-packages") || location.pathname.startsWith("/service-items")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Package className="h-4 w-4" />
                    療程管理
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="w-fit mt-1">
                    {user && ROLE_LABELS[user.role]}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {permissions?.canManageUsers && (
                <DropdownMenuItem onClick={() => navigate("/users")}>
                  <Users className="mr-2 h-4 w-4" />
                  使用者管理
                </DropdownMenuItem>
              )}
              {(user?.role === 'super_admin' || user?.role === 'admin') && (
                <DropdownMenuItem onClick={() => navigate("/organization/settings")}>
                  <Activity className="mr-2 h-4 w-4" />
                  組織設定
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                系統設定
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

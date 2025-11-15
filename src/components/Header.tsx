import { Activity, Settings, LogOut, Users, User as UserIcon, Shield, BarChart3 } from "lucide-react";
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

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, permissions } = useAuth();
  const { isModuleEnabled } = useModules();

  const isActive = (path: string) => location.pathname === path;

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
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive("/")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  患者列表
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive("/")
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  患者列表
                </Link>
                {isModuleEnabled('healthManagement') && (
                  <Link
                    to="/health-analytics"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive("/health-analytics")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    健康管理
                  </Link>
                )}
                {isModuleEnabled('appointments') && (
                  <Link
                    to="/appointments"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive("/appointments")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    回診管理
                  </Link>
                )}
                {permissions?.canManageUsers && (
                  <Link
                    to="/users"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive("/users")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    使用者管理
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
              isActive("/settings")
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            設定
          </Link>

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

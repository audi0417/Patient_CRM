import { Bell } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/contexts/NotificationContext";
import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil === 0) return "text-red-500";
    if (daysUntil === 1) return "text-orange-500";
    return "text-blue-500";
  };

  const getUrgencyLabel = (daysUntil: number) => {
    if (daysUntil === 0) return "今天";
    if (daysUntil === 1) return "明天";
    return `${daysUntil}天後`;
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    navigate(`/patient/${notification.patient.id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>通知</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={markAllAsRead}
            >
              全部標為已讀
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            目前沒有通知
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !notification.read ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm">
                    {notification.patient.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={getUrgencyColor(notification.daysUntil)}
                  >
                    {getUrgencyLabel(notification.daysUntil)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {notification.appointment.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(notification.appointment.date), "yyyy年M月d日 (EEEE)", {
                    locale: zhTW,
                  })}{" "}
                  {notification.appointment.time}
                </p>
                <p className="text-xs text-muted-foreground">
                  電話: {notification.patient.phone}
                </p>
                {!notification.read && (
                  <span className="absolute right-2 top-3 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-primary"
              onClick={() => navigate("/appointments")}
            >
              查看所有預約
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;

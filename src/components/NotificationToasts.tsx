import { useEffect, useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, User, Calendar, Clock, Phone, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const NotificationToasts = () => {
  const { notifications, markAsRead } = useNotifications();
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
  const [visibleToasts, setVisibleToasts] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // 只在初次載入時顯示未讀通知
    const unreadNotifications = notifications.filter((n) => !n.read && !shownNotifications.has(n.id));

    if (unreadNotifications.length > 0) {
      // 延遲顯示，讓頁面先載入
      setTimeout(() => {
        unreadNotifications.forEach((notification, index) => {
          // 每個通知間隔 500ms 顯示
          setTimeout(() => {
            setVisibleToasts((prev) => [...prev, notification.id]);
            setShownNotifications((prev) => new Set([...prev, notification.id]));

            // 10秒後自動消失
            setTimeout(() => {
              handleDismiss(notification.id);
            }, 10000);
          }, index * 500);
        });
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  const handleDismiss = (notificationId: string) => {
    setVisibleToasts((prev) => prev.filter((id) => id !== notificationId));
  };

  const handleClick = (notificationId: string, patientId: string) => {
    markAsRead(notificationId);
    handleDismiss(notificationId);
    navigate(`/patient/${patientId}`);
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil === 0) return "border-red-500 bg-red-50 dark:bg-red-950";
    if (daysUntil === 1) return "border-orange-500 bg-orange-50 dark:bg-orange-950";
    return "border-blue-500 bg-blue-50 dark:bg-blue-950";
  };

  const getUrgencyLabel = (daysUntil: number) => {
    if (daysUntil === 0) return { label: "今天", variant: "destructive" as const };
    if (daysUntil === 1) return { label: "明天", variant: "default" as const };
    return { label: `${daysUntil}天後`, variant: "secondary" as const };
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {visibleToasts.map((toastId) => {
        const notification = notifications.find((n) => n.id === toastId);
        if (!notification) return null;

        const urgency = getUrgencyLabel(notification.daysUntil);

        return (
          <Card
            key={notification.id}
            className={`p-4 shadow-lg border-l-4 animate-in slide-in-from-right ${getUrgencyColor(
              notification.daysUntil
            )}`}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-primary animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">回診提醒</span>
                    <Badge variant={urgency.variant}>{urgency.label}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => handleDismiss(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{notification.patient.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(parseISO(notification.appointment.date), "M月d日 (EEEE)", {
                        locale: zhTW,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{notification.appointment.time}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{notification.patient.phone}</span>
                  </div>
                </div>

                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-primary"
                  onClick={() => handleClick(notification.id, notification.patient.id)}
                >
                  查看患者資料
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NotificationToasts;

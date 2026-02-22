import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getAppointments, getPatients } from "@/lib/storage";
import { Appointment, Patient } from "@/types/patient";
import { differenceInDays, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export interface AppointmentNotification {
  id: string;
  type: "appointment";
  appointment: Appointment;
  patient: Patient;
  daysUntil: number;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppointmentNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY_PREFIX = "hospital_crm_notification_read_status";

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>(() => {
    // 初始化時就從 localStorage 載入，使用組織ID隔離
    if (!user?.organizationId) return {};
    const storageKey = `${NOTIFICATIONS_STORAGE_KEY_PREFIX}_${user.organizationId}`;
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
  });

  const refreshNotifications = useCallback(async () => {
    try {
      const appointments = await getAppointments();
      const patients = await getPatients();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingNotifications = appointments
        .filter((apt) => {
          if (apt.status !== "scheduled") return false;

          const appointmentDate = parseISO(apt.date);
          const reminderDays = apt.reminderDays || 1;
          const daysUntil = differenceInDays(appointmentDate, today);

          return daysUntil >= 0 && daysUntil <= reminderDays;
        })
        .map((apt) => {
          const patient = patients.find((p) => p.id === apt.patientId);
          const appointmentDate = parseISO(apt.date);
          const daysUntil = differenceInDays(appointmentDate, today);
          const notificationId = `appointment_${apt.id}`;

          return {
            id: notificationId,
            type: "appointment" as const,
            appointment: apt,
            patient: patient!,
            daysUntil,
            read: readStatus[notificationId] || false,
            createdAt: apt.date,
          };
        })
        .filter((item) => item.patient)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setNotifications(upcomingNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // 发生错误时不更新通知列表，避免无限重试
    }
  }, [readStatus]);

  useEffect(() => {
    // 如果用戶未登入，不載入通知
    if (!user) {
      setNotifications([]);
      setReadStatus({});
      return;
    }

    // 超級管理員不需要載入預約通知
    if (user.role === 'super_admin') {
      setNotifications([]);
      return;
    }

    // 當組織ID變化時，重新載入該組織的已讀狀態
    const storageKey = `${NOTIFICATIONS_STORAGE_KEY_PREFIX}_${user.organizationId}`;
    const saved = localStorage.getItem(storageKey);
    const orgReadStatus = saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
    setReadStatus(orgReadStatus);

    // 初始載入通知
    refreshNotifications();

    // 每分鐘檢查一次
    const interval = setInterval(refreshNotifications, 60000);
    return () => clearInterval(interval);
  }, [user?.organizationId, user?.role]); // 移除 refreshNotifications 依賴，避免循環

  // 當 readStatus 改變時，重新整理通知以更新已讀狀態
  useEffect(() => {
    if (notifications.length > 0) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: readStatus[n.id] || false,
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readStatus]);

  const markAsRead = (notificationId: string) => {
    if (!user?.organizationId) return;
    const newReadStatus = { ...readStatus, [notificationId]: true };
    setReadStatus(newReadStatus);
    const storageKey = `${NOTIFICATIONS_STORAGE_KEY_PREFIX}_${user.organizationId}`;
    localStorage.setItem(storageKey, JSON.stringify(newReadStatus));

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    if (!user?.organizationId) return;
    const newReadStatus = { ...readStatus };
    notifications.forEach((n) => {
      newReadStatus[n.id] = true;
    });
    setReadStatus(newReadStatus);
    const storageKey = `${NOTIFICATIONS_STORAGE_KEY_PREFIX}_${user.organizationId}`;
    localStorage.setItem(storageKey, JSON.stringify(newReadStatus));

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

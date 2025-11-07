import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, User, Calendar, Clock, Phone, X } from "lucide-react";
import { Appointment, Patient } from "@/types/patient";
import { getAppointments, getPatients, saveAppointment } from "@/lib/storage";
import { toast } from "sonner";
import { differenceInDays, format, isBefore, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const AppointmentReminders = () => {
  const [reminders, setReminders] = useState<
    Array<{ appointment: Appointment; patient: Patient; daysUntil: number }>
  >([]);
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );
  const navigate = useNavigate();

  useEffect(() => {
    loadReminders();
    // 每分鐘檢查一次（或可調整為更長間隔）
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    const appointments = await getAppointments();
    const patients = await getPatients();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingReminders = appointments
      .filter((apt) => {
        // 只顯示已預約的
        if (apt.status !== "scheduled") return false;

        // 檢查是否已被使用者暫時關閉
        if (dismissedReminders.has(apt.id)) return false;

        const appointmentDate = parseISO(apt.date);
        const reminderDays = apt.reminderDays || 1;

        // 計算距離預約日期的天數
        const daysUntil = differenceInDays(appointmentDate, today);

        // 如果在提醒天數範圍內，且還沒過期
        return daysUntil >= 0 && daysUntil <= reminderDays;
      })
      .map((apt) => {
        const patient = patients.find((p) => p.id === apt.patientId);
        const appointmentDate = parseISO(apt.date);
        const daysUntil = differenceInDays(appointmentDate, today);

        return {
          appointment: apt,
          patient: patient!,
          daysUntil,
        };
      })
      .filter((item) => item.patient) // 確保找到病患
      .sort((a, b) => a.daysUntil - b.daysUntil);

    setReminders(upcomingReminders);
  };

  const handleDismiss = (appointmentId: string) => {
    setDismissedReminders((prev) => new Set(prev).add(appointmentId));
    setReminders((prev) => prev.filter((r) => r.appointment.id !== appointmentId));
  };

  const handleMarkContacted = async (appointmentId: string) => {
    try {
      const appointments = await getAppointments();
      const appointment = appointments.find((a) => a.id === appointmentId);

      if (appointment) {
        appointment.reminderSent = true;
        await saveAppointment(appointment);
        toast.success("已標記為已聯絡");
        handleDismiss(appointmentId);
      }
    } catch (error) {
      console.error("Error marking as contacted:", error);
      toast.error("標記失敗");
    }
  };

  const getReminderUrgency = (daysUntil: number) => {
    if (daysUntil === 0) return { variant: "destructive" as const, label: "今天" };
    if (daysUntil === 1) return { variant: "default" as const, label: "明天" };
    return { variant: "secondary" as const, label: `${daysUntil}天後` };
  };

  if (reminders.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Bell className="h-5 w-5 animate-pulse" />
          <span>回診提醒</span>
          <Badge variant="secondary">{reminders.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {reminders.map(({ appointment, patient, daysUntil }) => {
              const urgency = getReminderUrgency(daysUntil);
              return (
                <Card
                  key={appointment.id}
                  className="border-orange-300 dark:border-orange-800 relative"
                >
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleDismiss(appointment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{patient.name}</h4>
                          <Badge variant={urgency.variant}>{urgency.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.type}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(parseISO(appointment.date), "yyyy年M月d日 (EEEE)", {
                            locale: zhTW,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{patient.phone}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/patient/${patient.id}`)}
                      >
                        查看病患
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleMarkContacted(appointment.id)}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        已聯絡
                      </Button>
                    </div>

                    {appointment.notes && (
                      <p className="mt-3 text-xs text-muted-foreground border-t pt-2">
                        備註：{appointment.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AppointmentReminders;

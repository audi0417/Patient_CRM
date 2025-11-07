import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Appointment, Patient } from "@/types/patient";
import { format, isSameDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Clock, User, CalendarDays, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppointmentCalendarProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment?: () => void;
}

const AppointmentCalendar = ({
  appointments,
  patients,
  onAddAppointment,
}: AppointmentCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<Appointment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // 篩選選定日期的預約
    const filtered = appointments.filter((apt) =>
      isSameDay(new Date(apt.date), selectedDate)
    );
    setSelectedDateAppointments(filtered);
  }, [selectedDate, appointments]);

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.name || "未知患者";
  };

  const getStatusBadge = (status: Appointment["status"]) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      scheduled: { variant: "default", label: "已預約" },
      completed: { variant: "secondary", label: "已完成" },
      cancelled: { variant: "destructive", label: "已取消" },
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 標記有預約的日期
  const modifiers = {
    hasAppointment: appointments.map((apt) => new Date(apt.date)),
  };

  const modifiersStyles = {
    hasAppointment: {
      fontWeight: "bold",
      textDecoration: "underline",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 左側：行事曆 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span>回診行事曆</span>
            </div>
            {onAddAppointment && (
              <Button size="sm" onClick={onAddAppointment}>
                <Plus className="h-4 w-4 mr-1" />
                新增預約
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={zhTW}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* 右側：選定日期的預約列表 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {format(selectedDate, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedDateAppointments.length} 個預約
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {selectedDateAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">此日期沒有預約</p>
                {onAddAppointment && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={onAddAppointment}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    新增預約
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appointment) => (
                    <Card
                      key={appointment.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => navigate(`/patient/${appointment.patientId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">
                                {getPatientName(appointment.patientId)}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {appointment.type}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.time}</span>
                        </div>
                        {appointment.notes && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {appointment.notes}
                          </p>
                        )}
                        {appointment.isRecurring && (
                          <Badge variant="outline" className="mt-2">
                            定期回診
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentCalendar;

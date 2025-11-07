import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Appointment, Patient } from "@/types/patient";
import { ChevronLeft, ChevronRight, User, Clock, CalendarDays, Plus } from "lucide-react";
import AppointmentDetailDialog from "./AppointmentDetailDialog";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CustomCalendarProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment?: (date?: Date) => void;
  onSelectDate?: (date: Date) => void;
  onDataUpdate?: () => void;
}

const CustomCalendar = ({
  appointments,
  patients,
  onAddAppointment,
  onSelectDate,
  onDataUpdate,
}: CustomCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const navigate = useNavigate();

  // 當 appointments 更新時，同步更新 selectedAppointment
  useEffect(() => {
    if (selectedAppointment) {
      const updatedAppointment = appointments.find(
        (apt) => apt.id === selectedAppointment.id
      );
      if (updatedAppointment) {
        setSelectedAppointment(updatedAppointment);
      }
    }
  }, [appointments]);

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.name || "未知患者";
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.date);
      return isSameDay(aptDate, date);
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDetailOpen(true);
    onSelectDate?.(date);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h2 className="text-2xl font-bold">
            {format(currentMonth, "yyyy年 M月", { locale: zhTW })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            共 {appointments.length} 個預約
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              handleDateClick(today);
            }}
          >
            今天
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onAddAppointment && (
            <Button onClick={() => onAddAppointment(selectedDate || new Date())}>
              <Plus className="h-4 w-4 mr-2" />
              新增預約
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ["日", "一", "二", "三", "四", "五", "六"];
    return (
      <div className="grid grid-cols-7 gap-3 mb-3">
        {days.map((day, index) => (
          <div
            key={index}
            className="text-center py-4 text-base font-semibold text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: zhTW });
    const endDate = endOfWeek(monthEnd, { locale: zhTW });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayAppointments = getAppointmentsForDate(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[140px] border rounded-lg p-3 transition-all cursor-pointer",
              !isCurrentMonth && "bg-muted/30 opacity-50",
              isSelected && "ring-2 ring-primary bg-primary/5",
              isTodayDate && "border-primary border-2",
              "hover:shadow-lg hover:bg-accent/50 hover:scale-[1.02]"
            )}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={cn(
                  "text-base font-semibold h-8 w-8 flex items-center justify-center rounded-full",
                  isTodayDate && "bg-primary text-primary-foreground",
                  !isCurrentMonth && "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {dayAppointments.length > 0 && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  {dayAppointments.length}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[90px]">
              <div className="space-y-1.5">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "text-xs p-2 rounded truncate font-medium pointer-events-none",
                      apt.status === "scheduled" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                      apt.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                      apt.status === "cancelled" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    )}
                  >
                    <div className="font-semibold truncate">{apt.time}</div>
                    <div className="truncate opacity-90">
                      {getPatientName(apt.patientId)}
                    </div>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                    +{dayAppointments.length - 3} 更多
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-3" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-3">{rows}</div>;
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <>
      {/* 全螢幕單一行事曆區塊 */}
      <Card className="w-full">
        <CardContent className="p-6">
          {renderHeader()}
          {renderDaysOfWeek()}
          {renderCells()}
        </CardContent>
      </Card>

      {/* 右側滑出的浮動面板 */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {selectedDate && format(selectedDate, "M月d日 (EEEE)", { locale: zhTW })}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDateAppointments.length} 個預約
            </p>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
            {selectedDateAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">此日期沒有預約</p>
                {onAddAppointment && selectedDate && (
                  <Button variant="outline" size="sm" onClick={() => onAddAppointment(selectedDate)}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增預約
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appointment) => (
                    <Card
                      key={appointment.id}
                      className="cursor-pointer transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] active:translate-y-0 border border-border/50"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setIsAppointmentDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-5">
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
                          <Badge
                            variant={
                              appointment.status === "scheduled"
                                ? "default"
                                : appointment.status === "completed"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {appointment.status === "scheduled"
                              ? "已預約"
                              : appointment.status === "completed"
                              ? "已完成"
                              : "已取消"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Clock className="h-4 w-4" />
                          <span>{appointment.time}</span>
                        </div>

                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 pt-2 border-t">
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
        </SheetContent>
      </Sheet>

      {/* 預約詳細資訊對話框 */}
      {selectedAppointment && (
        <AppointmentDetailDialog
          appointment={selectedAppointment}
          patient={patients.find((p) => p.id === selectedAppointment.patientId)}
          open={isAppointmentDialogOpen}
          onClose={() => {
            setIsAppointmentDialogOpen(false);
            setSelectedAppointment(null);
          }}
          onUpdate={() => {
            // 觸發父組件的資料更新
            onDataUpdate?.();
          }}
        />
      )}
    </>
  );
};

export default CustomCalendar;

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Appointment, Patient } from "@/types/patient";
import { ChevronLeft, ChevronRight, User, Clock, CalendarDays, Plus, GripVertical } from "lucide-react";
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
import { saveAppointment } from "@/lib/storage";

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
  const [lastMonthSwitch, setLastMonthSwitch] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"left" | "right" | null>(null);
  const [pendingTimeouts, setPendingTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  // 使用 ref 來立即檢查是否正在處理切換,避免 state 更新延遲
  const isProcessingRef = useRef(false);
  const lastTriggerTimeRef = useRef(0);
  const dragCountRef = useRef(0); // 追蹤拖曳計數

  const handleDragOverEdge = (e: React.DragEvent) => {
    const now = Date.now();

    // Debounce: 如果距離上次觸發小於100ms,直接忽略
    if (now - lastTriggerTimeRef.current < 100) {
      return;
    }

    // 使用 ref 立即檢查,避免 state 更新延遲導致的重複觸發
    if (isProcessingRef.current) {
      return;
    }

    // 如果正在轉換中,直接返回
    if (isTransitioning) {
      return;
    }

    // 如果有待執行的 timeout,也返回(避免重複觸發)
    if (pendingTimeouts.length > 0) {
      return;
    }

    // 如果距離上次切換太近,也返回
    if (now - lastMonthSwitch < 1500) {
      return;
    }

    // 獲取 Card 容器的位置
    const cardElement = document.querySelector('[data-calendar-wrapper] > div') as HTMLElement;
    if (!cardElement) return;

    const cardRect = cardElement.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const triggerWidth = 48; // w-12 = 48px

    // 檢查鼠標是否在 Card 範圍內
    if (mouseY < cardRect.top || mouseY > cardRect.bottom) {
      return;
    }

    // 檢查是否在左側觸發區（Card 左邊 48px）
    if (mouseX >= cardRect.left && mouseX < cardRect.left + triggerWidth) {
      const triggerId = Math.random().toString(36).substring(7);
      console.log(`📅 [${triggerId}] 向右滑動切換到上一個月份`);

      // 立即設定 ref,防止重複觸發
      isProcessingRef.current = true;
      lastTriggerTimeRef.current = now;

      setIsTransitioning(true);
      setTransitionDirection("right");
      setLastMonthSwitch(now);

      const timeout1 = setTimeout(() => {
        console.log(`⏰ [${triggerId}] 執行月份切換`);

        const container = document.querySelector('[data-calendar-container]') as HTMLElement;
        if (container) {
          // 暫時關閉動畫
          container.style.transition = 'none';
        }

        // 在同一幀內更新月份和重置位置
        setCurrentMonth(prev => {
          const newMonth = subMonths(prev, 1);
          console.log(`📅 [${triggerId}] 更新: ${format(prev, "yyyy-MM")} -> ${format(newMonth, "yyyy-MM")}`);
          return newMonth;
        });
        setTransitionDirection(null);

        // 等待瀏覽器完成渲染 - 單層 RAF 足夠
        requestAnimationFrame(() => {
          if (container) {
            container.style.transition = '';
          }
          setIsTransitioning(false);
          setPendingTimeouts([]);
          isProcessingRef.current = false;
          // 不隱藏 isDragging，讓用戶可以繼續拖曳到其他月份
        });
      }, 500);

      setPendingTimeouts([timeout1]);
    }
    // 檢查是否在右側觸發區（Card 右邊 48px）
    else if (mouseX > cardRect.right - triggerWidth && mouseX <= cardRect.right) {
      const triggerId = Math.random().toString(36).substring(7);
      console.log(`📅 [${triggerId}] 向左滑動切換到下一個月份`);

      // 立即設定 ref,防止重複觸發
      isProcessingRef.current = true;
      lastTriggerTimeRef.current = now;

      setIsTransitioning(true);
      setTransitionDirection("left");
      setLastMonthSwitch(now);

      const timeout1 = setTimeout(() => {
        console.log(`⏰ [${triggerId}] 執行月份切換`);

        const container = document.querySelector('[data-calendar-container]') as HTMLElement;
        if (container) {
          // 暫時關閉動畫
          container.style.transition = 'none';
        }

        // 在同一幀內更新月份和重置位置
        setCurrentMonth(prev => {
          const newMonth = addMonths(prev, 1);
          console.log(`📅 [${triggerId}] 更新: ${format(prev, "yyyy-MM")} -> ${format(newMonth, "yyyy-MM")}`);
          return newMonth;
        });
        setTransitionDirection(null);

        // 等待瀏覽器完成渲染 - 單層 RAF 足夠
        requestAnimationFrame(() => {
          if (container) {
            container.style.transition = '';
          }
          setIsTransitioning(false);
          setPendingTimeouts([]);
          isProcessingRef.current = false;
          // 不隱藏 isDragging，讓用戶可以繼續拖曳到其他月份
        });
      }, 500);

      setPendingTimeouts([timeout1]);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 檢查是否真的離開了容器
    const calendarElement = e.currentTarget as HTMLElement;
    if (!calendarElement) return;

    const rect = calendarElement.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 如果滑鼠在容器外，則取消切換
    if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
      // 只在有待執行的切換時才處理
      if (pendingTimeouts.length === 0 && !isTransitioning) {
        return;
      }

      console.log("🚫 滑鼠離開容器，取消切換");

      // 清除所有待執行的超時
      pendingTimeouts.forEach(timeout => {
        console.log("🚫 清除 timeout");
        clearTimeout(timeout);
      });
      setPendingTimeouts([]);

      // 重置 ref
      isProcessingRef.current = false;

      // 重置動畫狀態
      const container = document.querySelector('[data-calendar-container]') as HTMLElement;
      if (container) {
        container.style.transition = 'none';
        // 強制重置到中間位置
        requestAnimationFrame(() => {
          setTransitionDirection(null);
          requestAnimationFrame(() => {
            if (container) {
              container.style.transition = '';
            }
            setIsTransitioning(false);
          });
        });
      } else {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }
    }
  };

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

  // 監控拖曳狀態，防止卡住
  useEffect(() => {
    if (!isDragging) return;

    // 添加全局 drop 和 dragend 監聽器
    const handleGlobalDragEnd = () => {
      console.log("🔚 全局拖曳結束");
      setIsDragging(false);
      dragCountRef.current = 0;
    };

    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, [isDragging]);

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

  // 根據預約類型返回背景顏色（填滿整個卡片）
  const getAppointmentTypeColors = (type: string) => {
    const colorMap: Record<string, string> = {
      // 表單中使用的類型
      "定期回診": "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-100",
      "追蹤檢查": "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
      "健康檢查": "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
      "復健治療": "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
      // 資料庫 seed 中使用的類型
      "初診": "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
      "複診": "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-100",
      "定期檢查": "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
      "營養諮詢": "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
      "運動指導": "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
      "健康評估": "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100",
      "其他": "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    };

    return colorMap[type] || colorMap["其他"];
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
            disabled={isTransitioning}
            onClick={() => {
              if (isTransitioning) return;
              setIsTransitioning(true);
              setTransitionDirection("right");
              setLastMonthSwitch(Date.now());
              setTimeout(() => {
                const container = document.querySelector('[data-calendar-container]') as HTMLElement;
                if (container) {
                  container.style.transition = 'none';
                }
                setCurrentMonth(prev => subMonths(prev, 1));
                setTransitionDirection(null);
                requestAnimationFrame(() => {
                  if (container) {
                    container.style.transition = '';
                  }
                  setIsTransitioning(false);
                });
              }, 500);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={isTransitioning}
            onClick={() => {
              if (isTransitioning) return;
              setIsTransitioning(true);
              setTransitionDirection("left");
              setLastMonthSwitch(Date.now());
              setTimeout(() => {
                const container = document.querySelector('[data-calendar-container]') as HTMLElement;
                if (container) {
                  container.style.transition = 'none';
                }
                setCurrentMonth(prev => addMonths(prev, 1));
                setTransitionDirection(null);
                requestAnimationFrame(() => {
                  if (container) {
                    container.style.transition = '';
                  }
                  setIsTransitioning(false);
                });
              }, 500);
            }}
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

  const renderMonthCells = (monthToRender: Date) => {
    const monthStart = startOfMonth(monthToRender);
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
        const dateId = format(cloneDay, "yyyy-MM-dd");

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[200px] border rounded-lg p-3 transition-all cursor-pointer bg-card",
              !isCurrentMonth && "bg-muted/30 opacity-50",
              isSelected && "ring-2 ring-primary bg-primary/5",
              isTodayDate && "border-primary border-2",
              "hover:shadow-lg hover:bg-accent/50"
            )}
            onClick={() => handleDateClick(cloneDay)}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("bg-accent/70", "border-primary", "border-2");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("bg-accent/70", "border-primary", "border-2");
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("bg-accent/70", "border-primary", "border-2");
              
              const appointmentId = e.dataTransfer?.getData("appointmentId");
              if (appointmentId && appointmentId !== dateId) {
                const appointment = appointments.find((apt) => apt.id === appointmentId);
                if (appointment && appointment.date !== dateId) {
                  try {
                    setIsUpdating(true);
                    const updatedAppointment: Appointment = {
                      ...appointment,
                      date: dateId,
                    };
                    await saveAppointment(updatedAppointment);
                    onDataUpdate?.();
                  } catch (error) {
                    console.error("更新預約日期失敗:", error);
                  } finally {
                    setIsUpdating(false);
                  }
                }
              }
            }}
            data-date-id={dateId}
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

            <ScrollArea className="h-[140px]">
              <div className="space-y-2 pr-4">
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer!.effectAllowed = "move";
                      e.dataTransfer!.setData("appointmentId", apt.id);
                      e.currentTarget.style.opacity = "0.5";
                      dragCountRef.current += 1;
                      setIsDragging(true);
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = "1";
                      dragCountRef.current = 0;
                      setIsDragging(false);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOverEdge(e as any);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppointment(apt);
                      setIsAppointmentDialogOpen(true);
                    }}
                    className={cn(
                      "text-xs p-1.5 rounded font-medium cursor-grab active:cursor-grabbing transition-all hover:shadow-md border border-opacity-30",
                      "hover:scale-[1.02]",
                      // 根據預約類型設定背景和文字顏色
                      getAppointmentTypeColors(apt.type),
                      isUpdating ? "opacity-50 pointer-events-none" : ""
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
                      <div className="font-semibold truncate min-w-fit">{apt.time}</div>
                      <div className="truncate opacity-90 text-xs flex-1">
                        {getPatientName(apt.patientId)}
                      </div>
                    </div>
                  </div>
                ))}
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

  const renderCells = () => {
    return renderMonthCells(currentMonth);
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <>
      {/* 行事曆外層容器 - 調整寬度並居中 */}
      <div data-calendar-wrapper className="w-full max-w-[100%] mx-auto">
        {/* 全螢幕單一行事曆區塊 */}
        <Card className="w-full relative">
          {/* 拖曳區域觸發區 - 左側（始終存在但條件顯示視覺效果） */}
          <div
            data-trigger-left
            className={cn(
              "absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center transition-all",
              isDragging ? "bg-blue-500/20" : "bg-transparent"
            )}
            onDragOver={(e) => {
              if (!isDragging) return;
              e.preventDefault();
              handleDragOverEdge(e as any);
            }}
          >
            {isDragging && <ChevronLeft className="h-8 w-8 text-blue-600 pointer-events-none" />}
          </div>

          {/* 拖曳區域觸發區 - 右側（始終存在但條件顯示視覺效果） */}
          <div
            data-trigger-right
            className={cn(
              "absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center transition-all",
              isDragging ? "bg-blue-500/20" : "bg-transparent"
            )}
            onDragOver={(e) => {
              if (!isDragging) return;
              e.preventDefault();
              handleDragOverEdge(e as any);
            }}
          >
            {isDragging && <ChevronRight className="h-8 w-8 text-blue-600 pointer-events-none" />}
          </div>

          <CardContent className="px-12 py-6">
            {renderHeader()}
            {renderDaysOfWeek()}

            {/* 雙月份容器，用 overflow-hidden 限制範圍 */}
            <div className="overflow-hidden" onDragLeave={(e) => handleDragLeave(e as any)}>
              <div
                data-calendar-container
                className={cn(
                  "flex transition-transform duration-500 ease-in-out",
                  // 預設位置：顯示中間的「當前月份」
                  !transitionDirection && "-translate-x-full",
                  // 向左滑動（切換到下個月）：從中間移到左邊
                  transitionDirection === "left" && "-translate-x-[200%]",
                  // 向右滑動（切換到上個月）：從中間移到右邊
                  transitionDirection === "right" && "translate-x-0"
                )}
                onDragOver={(e) => { e.preventDefault(); handleDragOverEdge(e as any); }}
              >
                {/* 前一個月份（向右滑時會看到） */}
                <div className="w-full flex-shrink-0">
                  {renderMonthCells(subMonths(currentMonth, 1))}
                </div>

                {/* 當前月份 */}
                <div className="w-full flex-shrink-0">
                  {renderMonthCells(currentMonth)}
                </div>

                {/* 下一個月份（向左滑時會看到） */}
                <div className="w-full flex-shrink-0">
                  {renderMonthCells(addMonths(currentMonth, 1))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppointments, getPatients } from "@/lib/storage";
import { Appointment, Patient } from "@/types/patient";
import CustomCalendar from "@/components/CustomCalendar";
import RecurringAppointmentForm from "@/components/RecurringAppointmentForm";
import { CalendarDays, List } from "lucide-react";
import { format } from "date-fns";

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [showAddForm]); // 當表單關閉時重新載入資料

  const loadData = async () => {
    setAppointments(await getAppointments());
    setPatients(await getPatients());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8 space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">回診管理</h1>
          <p className="text-muted-foreground">
            使用行事曆追蹤和管理所有預約回診，自動提醒您聯絡病患
          </p>
        </div>

        {/* 主要內容 */}
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              行事曆檢視
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              列表檢視
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <CustomCalendar
              appointments={appointments}
              patients={patients}
              onAddAppointment={(date) => {
                if (date) {
                  setDefaultDate(format(date, "yyyy-MM-dd"));
                }
                setShowAddForm(true);
              }}
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>所有預約</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      目前無預約
                    </h3>
                    <p className="text-muted-foreground">
                      點擊「行事曆檢視」中的「新增預約」按鈕來建立回診預約
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments
                      .sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map((appointment) => {
                        const patient = patients.find(
                          (p) => p.id === appointment.patientId
                        );
                        return (
                          <Card
                            key={appointment.id}
                            className="hover:shadow-md transition-all"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {patient?.name || "未知病患"}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {appointment.type}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(appointment.date).toLocaleDateString(
                                      "zh-TW"
                                    )}{" "}
                                    {appointment.time}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full text-sm ${
                                      appointment.status === "scheduled"
                                        ? "bg-blue-100 text-blue-700"
                                        : appointment.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {appointment.status === "scheduled"
                                      ? "已預約"
                                      : appointment.status === "completed"
                                      ? "已完成"
                                      : "已取消"}
                                  </span>
                                  {appointment.isRecurring && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      定期回診
                                    </p>
                                  )}
                                </div>
                              </div>
                              {appointment.notes && (
                                <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                                  {appointment.notes}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 新增預約表單 */}
        {showAddForm && (
          <RecurringAppointmentForm
            defaultDate={defaultDate}
            onClose={() => {
              setShowAddForm(false);
              setDefaultDate("");
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Appointments;

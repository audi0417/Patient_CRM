import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  FileText,
} from "lucide-react";
import {
  getPatients,
  deletePatient,
  getConsultationRecords,
  deleteConsultationRecord,
} from "@/lib/storage";
import { Patient, ConsultationRecord } from "@/types/patient";
import { toast } from "sonner";
import { useDemo } from "@/contexts/DemoContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ConsultationRecordForm from "@/components/ConsultationRecordForm";

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultationRecords, setConsultationRecords] = useState<ConsultationRecord[]>([]);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConsultationRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const demo = useDemo();
  const isDemo = demo.isActive && demo.phase === 'simulation';

  const loadPatientData = useCallback(async () => {
    if (!id) return;

    // Demo 模式：使用模擬資料
    if (isDemo) {
      const foundPatient = demo.demoPatients.find((p) => p.id === id);
      if (foundPatient) {
        setPatient(foundPatient);
        setConsultationRecords([]);
      } else {
        toast.error("找不到患者資料");
        navigate("/patients");
      }
      return;
    }

    const patients = await getPatients();
    const foundPatient = patients.find((p) => p.id === id);
    if (foundPatient) {
      setPatient(foundPatient);
      const records = await getConsultationRecords(id);
      setConsultationRecords(records);
    } else {
      toast.error("找不到患者資料");
      navigate("/");
    }
  }, [id, isDemo, demo.demoPatients, navigate]);

  useEffect(() => {
    if (id) {
      loadPatientData();
    }
  }, [id, loadPatientData]);

  const handleDelete = async () => {
    if (id) {
      try {
        await deletePatient(id);
        toast.success("患者資料已刪除");
        navigate("/");
      } catch (error) {
        console.error("刪除患者失敗:", error);
        toast.error(error instanceof Error ? error.message : "刪除患者失敗");
      }
    }
  };

  const handleDeleteConsultation = async () => {
    if (recordToDelete) {
      try {
        await deleteConsultationRecord(recordToDelete);
        toast.success("看診紀錄已刪除");
        loadPatientData();
        setDeleteDialogOpen(false);
        setRecordToDelete(null);
      } catch (error) {
        console.error("刪除看診紀錄失敗:", error);
        toast.error(error instanceof Error ? error.message : "刪除看診紀錄失敗");
      }
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/patient/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              編輯
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確認刪除</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作無法復原。確定要刪除此患者及所有相關記錄嗎？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>刪除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{patient.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>{patient.gender === "male" ? "男性" : patient.gender === "female" ? "女性" : "其他"}</Badge>
                    <span className="text-muted-foreground">
                      {calculateAge(patient.birthDate)} 歲
                    </span>
                    {patient.bloodType && (
                      <Badge variant="outline">{patient.bloodType}型</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>出生日期: {new Date(patient.birthDate).toLocaleDateString("zh-TW")}</span>
              </div>
              {patient.emergencyContact && (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>緊急聯絡人: {patient.emergencyContact}</span>
                  </div>
                  {patient.emergencyPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>緊急電話: {patient.emergencyPhone}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 看診紀錄表格 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>看診紀錄</CardTitle>
              </div>
              <Button onClick={() => {
                setEditingRecord(null);
                setShowConsultationForm(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                新增紀錄
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {consultationRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">尚無看診紀錄</p>
                <Button onClick={() => {
                  setEditingRecord(null);
                  setShowConsultationForm(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增第一筆紀錄
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">看診日期</TableHead>
                      <TableHead>營養師備註</TableHead>
                      <TableHead className="w-[100px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultationRecords
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {new Date(record.date).toLocaleDateString("zh-TW", {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </TableCell>
                          <TableCell className="max-w-2xl">
                            <div className="line-clamp-2">{record.notes}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingRecord(record);
                                  setShowConsultationForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRecordToDelete(record.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 看診紀錄表單 */}
        {showConsultationForm && (
          <ConsultationRecordForm
            patientId={id!}
            existingRecord={editingRecord}
            onClose={() => {
              setShowConsultationForm(false);
              setEditingRecord(null);
              loadPatientData();
            }}
          />
        )}

        {/* 刪除確認對話框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>
                確定要刪除這筆看診紀錄嗎？此操作無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToDelete(null)}>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConsultation}>刪除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
};

export default PatientDetail;

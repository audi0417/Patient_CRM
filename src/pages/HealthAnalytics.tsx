import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPatients, getBodyCompositionRecords, getVitalSignsRecords, getGroups } from "@/lib/storage";
import { Patient, PatientGroup } from "@/types/patient";
import PatientHealthDashboard from "@/components/PatientHealthDashboard";
import {
  Activity,
  User,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Weight,
  Heart,
  Droplet,
  X,
  LayoutGrid,
  Layers,
  Folder,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PatientHealthSummary {
  patient: Patient;
  bodyCompositionCount: number;
  vitalSignsCount: number;
  latestWeight?: number;
  latestBMI?: number;
  latestBodyFat?: number;
  latestBloodPressure?: string;
  hasData: boolean;
}

const HealthAnalytics = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSummaries, setPatientSummaries] = useState<PatientHealthSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [showOnlyWithData, setShowOnlyWithData] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "group">("grid");
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const patientsData = await getPatients();
    setPatients(patientsData);

    // 載入群組資料
    const groupsData = await getGroups();
    setGroups(groupsData);

    // 載入每個病患的健康數據摘要
    const summaries = await Promise.all(
      patientsData.map(async (patient) => {
        const bodyRecords = await getBodyCompositionRecords(patient.id);
        const vitalRecords = await getVitalSignsRecords(patient.id);

        const latestBody = bodyRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        const latestVital = vitalRecords.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];

        return {
          patient,
          bodyCompositionCount: bodyRecords.length,
          vitalSignsCount: vitalRecords.length,
          latestWeight: latestBody?.weight,
          latestBMI: latestBody?.bmi,
          latestBodyFat: latestBody?.bodyFat,
          latestBloodPressure:
            latestVital?.bloodPressureSystolic && latestVital?.bloodPressureDiastolic
              ? `${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic}`
              : undefined,
          hasData: bodyRecords.length > 0 || vitalRecords.length > 0,
        };
      })
    );

    setPatientSummaries(summaries);
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

  const getBMIStatus = (bmi?: number) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: "過輕", variant: "outline" as const, color: "text-blue-600" };
    if (bmi < 24) return { label: "正常", variant: "secondary" as const, color: "text-green-600" };
    if (bmi < 27) return { label: "過重", variant: "default" as const, color: "text-orange-600" };
    return { label: "肥胖", variant: "destructive" as const, color: "text-red-600" };
  };

  // 獲取所有標籤
  const allTags = Array.from(
    new Set(patients.flatMap((p) => p.tags || []))
  ).sort();

  // 篩選和排序
  const filteredAndSortedSummaries = patientSummaries
    .filter((summary) => {
      // 搜尋篩選
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = summary.patient.name.toLowerCase().includes(term);
        const matchPhone = summary.patient.phone?.toLowerCase().includes(term);
        if (!matchName && !matchPhone) return false;
      }

      // 標籤篩選
      if (filterTag !== "all") {
        if (!summary.patient.tags?.includes(filterTag)) return false;
      }

      // 只顯示有數據的
      if (showOnlyWithData && !summary.hasData) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.patient.name.localeCompare(b.patient.name, "zh-TW");
        case "age":
          return (
            calculateAge(b.patient.birthDate) - calculateAge(a.patient.birthDate)
          );
        case "dataCount":
          return (
            b.bodyCompositionCount +
            b.vitalSignsCount -
            (a.bodyCompositionCount + a.vitalSignsCount)
          );
        case "weight":
          return (b.latestWeight || 0) - (a.latestWeight || 0);
        default:
          return 0;
      }
    });

  // 按群組組織患者（用於群組視圖）
  const groupedSummaries = (() => {
    const grouped: { group: PatientGroup | null; summaries: PatientHealthSummary[] }[] = [];

    // 先處理有群組的患者
    groups.forEach((group) => {
      const groupSummaries = filteredAndSortedSummaries.filter((summary) =>
        summary.patient.groups?.includes(group.id)
      );
      if (groupSummaries.length > 0) {
        grouped.push({ group, summaries: groupSummaries });
      }
    });

    // 再處理未分組的患者
    const ungroupedSummaries = filteredAndSortedSummaries.filter(
      (summary) => !summary.patient.groups || summary.patient.groups.length === 0
    );
    if (ungroupedSummaries.length > 0) {
      grouped.push({ group: null, summaries: ungroupedSummaries });
    }

    return grouped;
  })();

  if (selectedPatient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-[90vw] py-8">
          {/* 返回按鈕和個案資訊 */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedPatient(null)}
              className="mb-4"
            >
              <X className="h-4 w-4 mr-2" />
              返回個案列表
            </Button>

            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{selectedPatient.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{calculateAge(selectedPatient.birthDate)} 歲</span>
                        <span>•</span>
                        <span>
                          {selectedPatient.gender === "male"
                            ? "男性"
                            : selectedPatient.gender === "female"
                            ? "女性"
                            : "其他"}
                        </span>
                        {selectedPatient.phone && (
                          <>
                            <span>•</span>
                            <span>{selectedPatient.phone}</span>
                          </>
                        )}
                      </div>
                      {selectedPatient.tags && selectedPatient.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {selectedPatient.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/patient/${selectedPatient.id}`)}
                  >
                    查看完整資料
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 健康數據儀表板 */}
          <PatientHealthDashboard patient={selectedPatient} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">健康數據分析</h1>
          <p className="text-muted-foreground">
            選擇個案查看完整的健康數據趨勢與分析
          </p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">總個案數</p>
                  <p className="text-2xl font-bold">{patients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">有健康數據</p>
                  <p className="text-2xl font-bold">
                    {patientSummaries.filter((s) => s.hasData).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                  <Weight className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">體組成記錄</p>
                  <p className="text-2xl font-bold">
                    {patientSummaries.reduce((sum, s) => sum + s.bodyCompositionCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">生命徵象記錄</p>
                  <p className="text-2xl font-bold">
                    {patientSummaries.reduce((sum, s) => sum + s.vitalSignsCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜尋和篩選列 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 搜尋框 */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋個案姓名或電話..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 標籤篩選 */}
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger>
                  <SelectValue placeholder="所有標籤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有標籤</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 排序 */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">按姓名</SelectItem>
                  <SelectItem value="age">按年齡</SelectItem>
                  <SelectItem value="dataCount">按記錄數</SelectItem>
                  <SelectItem value="weight">按體重</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {/* 視圖模式切換 */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  列表
                </Button>
                <Button
                  variant={viewMode === "group" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("group")}
                  className="h-8"
                >
                  <Layers className="h-4 w-4 mr-1" />
                  群組
                </Button>
              </div>

              <div className="h-4 w-px bg-border" />

              <Button
                variant={showOnlyWithData ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyWithData(!showOnlyWithData)}
              >
                {showOnlyWithData ? "顯示全部" : "只顯示有數據"}
              </Button>
              {(searchTerm || filterTag !== "all" || showOnlyWithData) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterTag("all");
                    setShowOnlyWithData(false);
                  }}
                >
                  清除篩選
                </Button>
              )}
              <span className="text-sm text-muted-foreground ml-auto">
                顯示 {filteredAndSortedSummaries.length} / {patients.length} 個案
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 個案卡片顯示區域 */}
        {filteredAndSortedSummaries.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                沒有符合條件的個案
              </h3>
              <p className="text-muted-foreground mb-6">
                請調整搜尋或篩選條件
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* 列表視圖（原有的網格佈局） */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedSummaries.map((summary) => {
              const bmiStatus = getBMIStatus(summary.latestBMI);
              const totalRecords = summary.bodyCompositionCount + summary.vitalSignsCount;

              return (
                <Card
                  key={summary.patient.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                    !summary.hasData && "opacity-60"
                  )}
                  onClick={() => setSelectedPatient(summary.patient)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {summary.patient.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {calculateAge(summary.patient.birthDate)} 歲 •{" "}
                            {summary.patient.gender === "male" ? "男" : "女"}
                          </p>
                        </div>
                      </div>
                      {totalRecords > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {totalRecords} 筆
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* 標籤 */}
                    {summary.patient.tags && summary.patient.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {summary.patient.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {summary.patient.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{summary.patient.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 健康數據摘要 */}
                    {summary.hasData ? (
                      <div className="space-y-2 text-sm">
                        {summary.latestWeight && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Weight className="h-3 w-3" />
                              <span>體重</span>
                            </div>
                            <span className="font-medium">
                              {summary.latestWeight} kg
                            </span>
                          </div>
                        )}

                        {summary.latestBMI && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Activity className="h-3 w-3" />
                              <span>BMI</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {summary.latestBMI.toFixed(1)}
                              </span>
                              {bmiStatus && (
                                <Badge variant={bmiStatus.variant} className="text-xs">
                                  {bmiStatus.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {summary.latestBodyFat && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Droplet className="h-3 w-3" />
                              <span>體脂</span>
                            </div>
                            <span className="font-medium">
                              {summary.latestBodyFat}%
                            </span>
                          </div>
                        )}

                        {summary.latestBloodPressure && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Heart className="h-3 w-3" />
                              <span>血壓</span>
                            </div>
                            <span className="font-medium">
                              {summary.latestBloodPressure} mmHg
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">尚無健康數據</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* 群組視圖（分區塊顯示） */
          <div className="space-y-6">
            {groupedSummaries.map((groupData, idx) => (
              <div key={groupData.group?.id || "ungrouped"} className="space-y-3">
                {/* 群組標題 */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-1 w-12 rounded-full"
                    style={{
                      backgroundColor: groupData.group?.color || "#94a3b8",
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Folder
                      className="h-5 w-5"
                      style={{ color: groupData.group?.color || "#94a3b8" }}
                    />
                    <h3 className="text-lg font-semibold">
                      {groupData.group?.name || "未分組患者"}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupData.summaries.length} 人
                    </Badge>
                  </div>
                  {groupData.group?.description && (
                    <span className="text-sm text-muted-foreground">
                      - {groupData.group.description}
                    </span>
                  )}
                </div>

                {/* 群組內的患者卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupData.summaries.map((summary) => {
                    const bmiStatus = getBMIStatus(summary.latestBMI);
                    const totalRecords = summary.bodyCompositionCount + summary.vitalSignsCount;

                    return (
                      <Card
                        key={summary.patient.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden",
                          !summary.hasData && "opacity-60"
                        )}
                        onClick={() => setSelectedPatient(summary.patient)}
                      >
                        {/* 群組色彩指示器 - 右上角圓點 */}
                        {groupData.group && (
                          <div
                            className="absolute top-3 right-3 h-3 w-3 rounded-full ring-2 ring-background"
                            style={{ backgroundColor: groupData.group.color }}
                            title={groupData.group.name}
                          />
                        )}

                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {summary.patient.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {calculateAge(summary.patient.birthDate)} 歲 •{" "}
                                  {summary.patient.gender === "male" ? "男" : "女"}
                                </p>
                              </div>
                            </div>
                            {totalRecords > 0 && (
                              <Badge variant="secondary" className="text-xs mr-5">
                                {totalRecords} 筆
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {/* 標籤 */}
                          {summary.patient.tags && summary.patient.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {summary.patient.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {summary.patient.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{summary.patient.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* 健康數據摘要 */}
                          {summary.hasData ? (
                            <div className="space-y-2 text-sm">
                              {summary.latestWeight && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Weight className="h-3 w-3" />
                                    <span>體重</span>
                                  </div>
                                  <span className="font-medium">
                                    {summary.latestWeight} kg
                                  </span>
                                </div>
                              )}

                              {summary.latestBMI && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Activity className="h-3 w-3" />
                                    <span>BMI</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {summary.latestBMI.toFixed(1)}
                                    </span>
                                    {bmiStatus && (
                                      <Badge variant={bmiStatus.variant} className="text-xs">
                                        {bmiStatus.label}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {summary.latestBodyFat && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Droplet className="h-3 w-3" />
                                    <span>體脂</span>
                                  </div>
                                  <span className="font-medium">
                                    {summary.latestBodyFat}%
                                  </span>
                                </div>
                              )}

                              {summary.latestBloodPressure && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Heart className="h-3 w-3" />
                                    <span>血壓</span>
                                  </div>
                                  <span className="font-medium">
                                    {summary.latestBloodPressure} mmHg
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">尚無健康數據</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthAnalytics;

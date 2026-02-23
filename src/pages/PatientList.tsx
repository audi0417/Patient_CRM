import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Filter, Users, X, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { getPatients, getGroups } from "@/lib/storage";
import { Patient, PatientGroup } from "@/types/patient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";

interface PatientWithOrg extends Patient {
  organizationName?: string;
  organizationId?: string;
}

const PatientList = () => {
  const [patients, setPatients] = useState<PatientWithOrg[]>([]);
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const [organizations, setOrganizations] = useState<Array<{id: string; name: string}>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const demo = useDemo();
  const isDemo = demo.isActive && demo.phase === 'simulation';

  const loadData = useCallback(async () => {
    try {
      // Demo 模式：使用模擬資料
      if (isDemo) {
        setPatients(demo.demoPatients);
        return;
      }

      if (isSuperAdmin) {
        // 超級管理員：獲取所有組織的患者
        const token = localStorage.getItem("hospital_crm_auth_token");

        // 獲取所有患者
        const patientsResponse = await fetch("/api/superadmin/patients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          setPatients(patientsData || []);
        }

        // 獲取組織列表
        const orgsResponse = await fetch("/api/superadmin/organizations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          setOrganizations(orgsData || []);
        }
      } else {
        // 一般管理員：只獲取自己組織的患者和群組
        const patientsData = await getPatients();
        const groupsData = await getGroups();
        setPatients(patientsData || []);
        setGroups(groupsData || []);
      }
    } catch (error) {
      console.error("載入數據失敗:", error);
      // 失敗時設置空陣列以避免崩潰
      setPatients([]);
      setGroups([]);
    }
  }, [isSuperAdmin, isDemo, demo.demoPatients]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 篩選患者
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      // 搜尋過濾（姓名、電話、標籤、組織名稱）
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        patient.name.toLowerCase().includes(searchLower) ||
        patient.phone.includes(searchTerm) ||
        (patient.tags && patient.tags.some((tag) => tag.toLowerCase().includes(searchLower))) ||
        (isSuperAdmin && patient.organizationName && patient.organizationName.toLowerCase().includes(searchLower));

      // 組織過濾（超級管理員專用）
      const matchesOrg =
        !isSuperAdmin ||
        selectedOrg === "all" ||
        patient.organizationId === selectedOrg;

      // 群組過濾（一般管理員專用）
      const matchesGroup =
        isSuperAdmin ||
        selectedGroup === "all" ||
        (patient.groups && patient.groups.includes(selectedGroup));

      // 性別過濾
      const matchesGender =
        genderFilter === "all" || patient.gender === genderFilter;

      return matchesSearch && matchesOrg && matchesGroup && matchesGender;
    });
  }, [patients, searchTerm, selectedOrg, selectedGroup, genderFilter, isSuperAdmin]);

  // 分頁邏輯
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  // 當篩選條件改變時，重置回第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGroup, selectedOrg, genderFilter]);

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

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: "男",
      female: "女",
      other: "其他",
    };
    return labels[gender] || gender;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[90vw] py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">患者管理</h1>
            <p className="text-muted-foreground">管理和追蹤所有患者資訊與健康數據</p>
          </div>
          <Button onClick={() => navigate("/patient/new")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            新增患者
          </Button>
        </div>

        {/* 篩選區域 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isSuperAdmin ? "搜尋患者姓名、電話、組織..." : "搜尋患者姓名、電話或標籤..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="性別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部性別</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 組織篩選（超級管理員專用） */}
              {isSuperAdmin && organizations.length > 0 && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="選擇組織" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部組織</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 群組篩選（一般管理員專用） */}
              {!isSuperAdmin && groups.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant={selectedGroup === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedGroup("all")}
                  >
                    全部
                  </Button>
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      variant={selectedGroup === group.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGroup(group.id)}
                      className="gap-2"
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* 活動的篩選條件 */}
              {(searchTerm || selectedOrg !== "all" || selectedGroup !== "all" || genderFilter !== "all") && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>已篩選：</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      搜尋: {searchTerm}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSearchTerm("")}
                      />
                    </Badge>
                  )}
                  {isSuperAdmin && selectedOrg !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      組織: {organizations.find((o) => o.id === selectedOrg)?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedOrg("all")}
                      />
                    </Badge>
                  )}
                  {!isSuperAdmin && selectedGroup !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      群組: {groups.find((g) => g.id === selectedGroup)?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedGroup("all")}
                      />
                    </Badge>
                  )}
                  {genderFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      性別: {getGenderLabel(genderFilter)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setGenderFilter("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 患者表格 */}
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm || selectedOrg !== "all" || selectedGroup !== "all" || genderFilter !== "all"
                  ? "找不到符合的患者"
                  : "尚無患者資料"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedOrg !== "all" || selectedGroup !== "all" || genderFilter !== "all"
                  ? "請嘗試其他搜尋條件"
                  : "點擊上方按鈕開始新增患者"}
              </p>
              {!searchTerm && selectedOrg === "all" && selectedGroup === "all" && genderFilter === "all" && (
                <Button onClick={() => navigate("/patient/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增第一位患者
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    {isSuperAdmin && <TableHead>所屬組織</TableHead>}
                    <TableHead>性別/年齡</TableHead>
                    <TableHead>聯絡方式</TableHead>
                    <TableHead>血型</TableHead>
                    <TableHead>標籤</TableHead>
                    <TableHead>建檔日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPatients.map((patient) => {
                    return (
                      <TableRow
                        key={patient.id}
                        data-patient-id={patient.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/patient/${patient.id}`)}
                      >
                        <TableCell className="font-medium">
                          {patient.name}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{patient.organizationName}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">
                              {getGenderLabel(patient.gender)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {calculateAge(patient.birthDate)} 歲
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{patient.phone}</span>
                            {patient.email && (
                              <span className="text-sm text-muted-foreground">
                                {patient.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {patient.bloodType ? (
                            <Badge variant="outline">{patient.bloodType}型</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {patient.tags && patient.tags.length > 0 ? (
                              patient.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(patient.createdAt).toLocaleDateString("zh-TW")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* 分頁控制 */}
        {filteredPatients.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              顯示第 {startIndex + 1} - {Math.min(endIndex, filteredPatients.length)} 位患者，共 {filteredPatients.length} 位
              {(searchTerm || selectedGroup !== "all" || genderFilter !== "all") &&
                ` (全部患者 ${patients.length} 位)`}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[36px]"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;

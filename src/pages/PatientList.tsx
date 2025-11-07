import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Users, X } from "lucide-react";
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

const PatientList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [groups, setGroups] = useState<PatientGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const patientsData = await getPatients();
    const groupsData = await getGroups();
    setPatients(patientsData);
    setGroups(groupsData);
  };

  // 篩選患者
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      // 搜尋過濾（姓名、電話、標籤）
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        patient.name.toLowerCase().includes(searchLower) ||
        patient.phone.includes(searchTerm) ||
        (patient.tags && patient.tags.some((tag) => tag.toLowerCase().includes(searchLower)));

      // 群組過濾
      const matchesGroup =
        selectedGroup === "all" ||
        (patient.groupIds && patient.groupIds.includes(selectedGroup));

      // 性別過濾
      const matchesGender =
        genderFilter === "all" || patient.gender === genderFilter;

      return matchesSearch && matchesGroup && matchesGender;
    });
  }, [patients, searchTerm, selectedGroup, genderFilter]);

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
      <div className="container py-8">
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
                    placeholder="搜尋患者姓名、電話或標籤..."
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

              {/* 群組篩選 */}
              {groups.length > 0 && (
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
              {(searchTerm || selectedGroup !== "all" || genderFilter !== "all") && (
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
                  {selectedGroup !== "all" && (
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
                {searchTerm || selectedGroup !== "all" || genderFilter !== "all"
                  ? "找不到符合的患者"
                  : "尚無患者資料"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedGroup !== "all" || genderFilter !== "all"
                  ? "請嘗試其他搜尋條件"
                  : "點擊上方按鈕開始新增患者"}
              </p>
              {!searchTerm && selectedGroup === "all" && genderFilter === "all" && (
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
                    <TableHead>性別/年齡</TableHead>
                    <TableHead>聯絡方式</TableHead>
                    <TableHead>血型</TableHead>
                    <TableHead>標籤</TableHead>
                    <TableHead>建檔日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => {
                    return (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/patient/${patient.id}`)}
                      >
                        <TableCell className="font-medium">
                          {patient.name}
                        </TableCell>
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

        {/* 統計資訊 */}
        {filteredPatients.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            顯示 {filteredPatients.length} 位患者
            {(searchTerm || selectedGroup !== "all" || genderFilter !== "all") &&
              ` (共 ${patients.length} 位)`}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;

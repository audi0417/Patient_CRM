import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Building2, User, Calendar, Phone, Mail } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  email?: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
}

const SuperAdminPatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("hospital_crm_auth_token");

      // Fetch organizations
      const orgsResponse = await fetch("/api/superadmin/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!orgsResponse.ok) throw new Error("無法載入組織列表");
      const orgsData = await orgsResponse.json();
      setOrganizations(orgsData);

      // Fetch all patients
      const patientsResponse = await fetch("/api/superadmin/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!patientsResponse.ok) throw new Error("無法載入患者列表");
      const patientsData = await patientsResponse.json();
      setPatients(patientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
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

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm) ||
      patient.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesOrg = selectedOrg === "all" || patient.organizationId === selectedOrg;

    return matchesSearch && matchesOrg;
  });

  // Group by organization
  const patientsByOrg = filteredPatients.reduce((acc, patient) => {
    if (!acc[patient.organizationId]) {
      acc[patient.organizationId] = {
        name: patient.organizationName,
        patients: [],
      };
    }
    acc[patient.organizationId].patients.push(patient);
    return acc;
  }, {} as Record<string, { name: string; patients: Patient[] }>);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">載入中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">患者總覽</h1>
          <p className="text-muted-foreground">查看所有組織的患者資料</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="text-base px-4 py-2">
            總患者數：{patients.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>篩選器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋患者姓名、電話、組織..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="選擇組織" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有組織</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            顯示 {filteredPatients.length} / {patients.length} 位患者
          </div>
        </CardContent>
      </Card>

      {/* Patients grouped by organization */}
      <div className="space-y-6">
        {Object.entries(patientsByOrg).length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>找不到符合條件的患者</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(patientsByOrg).map(([orgId, { name, patients: orgPatients }]) => (
            <Card key={orgId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <CardTitle>{name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{orgPatients.length} 位患者</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>性別/年齡</TableHead>
                      <TableHead>聯絡方式</TableHead>
                      <TableHead>建檔日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">
                              {patient.gender === "male" ? "男" : patient.gender === "female" ? "女" : "其他"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {calculateAge(patient.birthDate)} 歲
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                            {patient.email && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {patient.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(patient.createdAt).toLocaleDateString("zh-TW")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SuperAdminPatients;

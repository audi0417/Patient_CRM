import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DormantPatientsProps {
  data: Array<{
    id: string;
    name: string;
    lastVisitDate: string;
    daysSinceLastVisit: number;
  }>;
}

export default function DormantPatients({ data }: DormantPatientsProps) {
  const navigate = useNavigate();

  const handleViewPatient = (patientId: string) => {
    navigate(`/patient/${patientId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          <CardTitle>沉睡客戶</CardTitle>
        </div>
        <CardDescription>
          超過 90 天未回訪的病患（最多顯示 10 位）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>病患姓名</TableHead>
                <TableHead>最後就診</TableHead>
                <TableHead>未回訪天數</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{formatDate(patient.lastVisitDate)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={patient.daysSinceLastVisit > 180 ? "destructive" : "secondary"}
                    >
                      {patient.daysSinceLastVisit} 天
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPatient(patient.id)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      聯繫
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>太棒了！沒有沉睡客戶</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

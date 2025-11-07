import { Patient } from "@/types/patient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface PatientCardProps {
  patient: Patient;
}

const PatientCard = ({ patient }: PatientCardProps) => {
  const getGenderBadge = (gender: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      male: "default",
      female: "secondary",
      other: "outline",
    };
    const labels: Record<string, string> = {
      male: "男性",
      female: "女性",
      other: "其他",
    };
    return (
      <Badge variant={variants[gender] || "outline"}>
        {labels[gender] || gender}
      </Badge>
    );
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

  return (
    <Link to={`/patient/${patient.id}`}>
      <Card className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-primary/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {patient.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {calculateAge(patient.birthDate)} 歲
                </p>
              </div>
            </div>
            {getGenderBadge(patient.gender)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{patient.phone}</span>
            </div>
            {patient.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{patient.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                建檔日期: {new Date(patient.createdAt).toLocaleDateString("zh-TW")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PatientCard;

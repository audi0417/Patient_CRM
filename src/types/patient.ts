export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

export interface PatientGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  patientIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  gender: "male" | "female" | "other";
  birthDate: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  allergies?: string[];
  tags?: string[]; // 標籤名稱陣列
  groupIds?: string[]; // 所屬群組ID陣列
  createdAt: string;
  updatedAt: string;
}

// 體組成記錄
export interface BodyCompositionRecord {
  id: string;
  patientId: string;
  date: string;
  weight?: number; // 體重 (kg)
  height?: number; // 身高 (cm)
  bodyFat?: number; // 體脂率 (%)
  muscleMass?: number; // 肌肉量 (kg)
  bmi?: number; // BMI
  visceralFat?: number; // 內臟脂肪等級
  boneMass?: number; // 骨量 (kg)
  bodyWater?: number; // 體水分 (%)
  bmr?: number; // 基礎代謝率 (kcal)
  notes?: string;
}

// 生命徵象記錄
export interface VitalSignsRecord {
  id: string;
  patientId: string;
  date: string;
  bloodPressureSystolic?: number; // 收縮壓 (mmHg)
  bloodPressureDiastolic?: number; // 舒張壓 (mmHg)
  heartRate?: number; // 心率 (bpm)
  temperature?: number; // 體溫 (°C)
  respiratoryRate?: number; // 呼吸率 (次/分)
  oxygenSaturation?: number; // 血氧飽和度 (%)
  bloodGlucose?: number; // 血糖 (mg/dL)
  notes?: string;
}

// 保留舊的 HealthRecord 以向後兼容（暫時）
export interface HealthRecord {
  id: string;
  patientId: string;
  date: string;
  weight?: number;
  height?: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi?: number;
  visceralFat?: number;
  boneMass?: number;
  bodyWater?: number;
  bmr?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  notes?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  type: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  reminderSent?: boolean;
  // 回診頻率相關設定
  isRecurring?: boolean; // 是否為定期回診
  recurringPattern?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"; // 頻率
  recurringEndDate?: string; // 定期回診結束日期
  parentAppointmentId?: string; // 若是由定期回診產生的，記錄父預約ID
  reminderDays?: number; // 提前幾天提醒（預設為1天）
}

export interface PatientGoal {
  id: string;
  patientId: string;
  category: "weight" | "bodyFat" | "muscleMass" | "bmi" | "exercise" | "health" | "custom";
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string; // kg, %, bpm, etc.
  startDate: string;
  targetDate: string;
  status: "active" | "completed" | "cancelled" | "overdue";
  progress: number; // 0-100
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  value: number;
  date: string;
  achieved: boolean;
  achievedDate?: string;
  note?: string;
}

export interface InitialAssessment {
  id: string;
  patientId: string;
  assessmentDate: string;
  baselineWeight: number;
  baselineHeight: number;
  baselineBodyFat?: number;
  baselineMuscleMass?: number;
  baselineBMI: number;
  healthGoals?: string[];
  targetWeight?: number;
  targetBodyFat?: number;
  targetMuscleMass?: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  medicalConditions?: string[];
  assessedBy?: string;
  notes?: string;
}

// 看診紀錄
export interface ConsultationRecord {
  id: string;
  patientId: string;
  date: string;
  notes: string; // 營養師備註
  createdAt: string;
  updatedAt: string;
}

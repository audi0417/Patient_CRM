# Patient CRM - Data Structure & Mock Patient Guide

## Executive Summary

The Patient CRM is a **Electron-based desktop application** (with web fallback) that manages patient health records. Data is stored in **localStorage** (web) or **Electron file system** (desktop), using JSON format. The system currently has no dedicated database layer - all data persists through browser localStorage.

---

## 1. Patient Data Models & Schemas

### Core Patient Model
**Location:** `/src/types/patient.ts`

```typescript
interface Patient {
  id: string;                      // Unique identifier (e.g., "patient_1730000000000")
  name: string;                    // Patient full name
  gender: "male" | "female" | "other";
  birthDate: string;               // ISO date string (YYYY-MM-DD)
  phone: string;                   // Contact phone (required)
  email?: string;                  // Optional email
  address?: string;                // Optional address
  emergencyContact?: string;        // Emergency contact name
  emergencyPhone?: string;          // Emergency contact phone
  bloodType?: string;               // Blood type (e.g., "O+")
  allergies?: string[];             // Array of allergy descriptions
  tags?: string[];                  // Array of tag IDs
  groupIds?: string[];              // Array of patient group IDs
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}
```

### Related Health Data Models

#### 1. Body Composition Record
```typescript
interface BodyCompositionRecord {
  id: string;
  patientId: string;
  date: string;                    // ISO date (YYYY-MM-DD)
  weight?: number;                 // kg
  height?: number;                 // cm
  bodyFat?: number;                // percentage
  muscleMass?: number;             // kg
  bmi?: number;                    // calculated
  visceralFat?: number;            // level
  boneMass?: number;               // kg
  bodyWater?: number;              // percentage
  bmr?: number;                    // kcal (Basal Metabolic Rate)
  notes?: string;
}
```

#### 2. Vital Signs Record
```typescript
interface VitalSignsRecord {
  id: string;
  patientId: string;
  date: string;                    // ISO date (YYYY-MM-DD)
  bloodPressureSystolic?: number;  // mmHg
  bloodPressureDiastolic?: number; // mmHg
  heartRate?: number;              // bpm
  temperature?: number;            // °C
  respiratoryRate?: number;        // breaths/min
  oxygenSaturation?: number;       // percentage
  bloodGlucose?: number;           // mg/dL
  notes?: string;
}
```

#### 3. Appointment
```typescript
interface Appointment {
  id: string;
  patientId: string;
  date: string;                    // ISO date (YYYY-MM-DD)
  time: string;                    // HH:mm format
  type: string;                    // Appointment type (e.g., "follow-up", "consultation")
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  reminderSent?: boolean;
  isRecurring?: boolean;
  recurringPattern?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  recurringEndDate?: string;
  parentAppointmentId?: string;
  reminderDays?: number;           // Default: 1 day before
}
```

#### 4. Patient Goal
```typescript
interface PatientGoal {
  id: string;
  patientId: string;
  category: "weight" | "bodyFat" | "muscleMass" | "bmi" | "exercise" | "health" | "custom";
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;                    // e.g., "kg", "%", "bpm"
  startDate: string;               // ISO date
  targetDate: string;              // ISO date
  status: "active" | "completed" | "cancelled" | "overdue";
  progress: number;                // 0-100 percentage
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}
```

#### 5. Initial Assessment
```typescript
interface InitialAssessment {
  id: string;
  patientId: string;
  assessmentDate: string;          // ISO date
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
```

#### 6. Tag & Patient Group
```typescript
interface Tag {
  id: string;
  name: string;
  color: string;                   // CSS color
  description?: string;
  createdAt: string;
}

interface PatientGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  patientIds: string[];            // References to patients
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. Data Storage Architecture

### Storage Keys (localStorage)
All data stored in browser localStorage with these keys:

| Key | Data Type | Purpose |
|-----|-----------|---------|
| `hospital_crm_patients` | Patient[] | Core patient records |
| `hospital_crm_health_records` | HealthRecord[] | Legacy combined health data |
| `hospital_crm_body_composition` | BodyCompositionRecord[] | Body measurements |
| `hospital_crm_vital_signs` | VitalSignsRecord[] | Vital sign measurements |
| `hospital_crm_appointments` | Appointment[] | Appointment schedule |
| `hospital_crm_goals` | PatientGoal[] | Patient health goals |
| `hospital_crm_assessments` | InitialAssessment[] | Initial patient assessments |
| `hospital_crm_tags` | Tag[] | Tag definitions |
| `hospital_crm_groups` | PatientGroup[] | Patient group definitions |

### Storage Layer
**Location:** `/src/lib/storage.ts`

The storage module provides abstraction:
- **Dual-mode support**: Electron API or localStorage
- **Async API**: All operations return Promises
- **CRUD operations** for each entity type

Key functions:
```typescript
// Patient operations
getPatients(): Promise<Patient[]>
getPatientById(id: string): Promise<Patient | undefined>
savePatient(patient: Patient): Promise<void>
deletePatient(id: string): Promise<void>

// Health records
getBodyCompositionRecords(patientId?): Promise<BodyCompositionRecord[]>
saveBodyCompositionRecord(record): Promise<void>
getVitalSignsRecords(patientId?): Promise<VitalSignsRecord[]>
saveVitalSignsRecord(record): Promise<void>

// Appointments
getAppointments(patientId?): Promise<Appointment[]>
saveAppointment(appointment): Promise<void>
getUpcomingAppointments(): Promise<Appointment[]>

// Goals
getGoals(patientId?): Promise<PatientGoal[]>
saveGoal(goal): Promise<void>
updateGoalProgress(goalId, currentValue): Promise<void>

// Tags & Groups
getTags(): Promise<Tag[]>
getGroups(): Promise<PatientGroup[]>
```

---

## 3. Available Health Data Fields

### Body Composition Tracking
- Weight (kg)
- Height (cm)
- Body Fat (%)
- Muscle Mass (kg)
- BMI (calculated)
- Visceral Fat Level
- Bone Mass (kg)
- Body Water (%)
- Basal Metabolic Rate - BMR (kcal)

### Vital Signs Monitoring
- Blood Pressure (Systolic/Diastolic in mmHg)
- Heart Rate (bpm)
- Body Temperature (°C)
- Respiratory Rate (breaths/min)
- Oxygen Saturation (%)
- Blood Glucose (mg/dL)

### Patient Information
- Demographics (name, gender, birth date)
- Contact (phone, email, address)
- Emergency Contact Info
- Blood Type
- Allergies List

### Goals & Progress Tracking
- 6 predefined categories: weight, bodyFat, muscleMass, bmi, exercise, health
- Custom goal support
- Progress percentage (0-100)
- Milestone tracking
- Status tracking: active, completed, cancelled, overdue

---

## 4. Existing Scripts & Database Utilities

### Create Super Admin Script
**Location:** `/scripts/createSuperAdmin.js`

- Creates Super Admin user accounts (stored in `/data/users.json`)
- Interactive CLI prompts
- Password encryption with bcryptjs
- Usage: `npm run create-admin`

### Database Management Component
**Location:** `/src/components/DatabaseManagement.tsx`

- Backup database (electron-only)
- Restore database (electron-only)
- Export data as JSON (electron-only)

### No Existing Seed Scripts
Currently, **there are NO existing seed or mock data scripts** in the codebase. All test data must be manually created through the UI or new scripts.

---

## 5. API Endpoints & Services

### No Traditional API Layer
The application uses **direct storage access**, not REST APIs:

```typescript
// Services import and use storage functions directly
import { savePatient, getPatients } from "@/lib/storage";

// In components:
const patients = await getPatients();
await savePatient(newPatient);
```

### Component-Level Integration

**Patient Creation Form** (`/src/pages/PatientForm.tsx`):
- Accessible at `/patient/new` (create) or `/patient/{id}` (edit)
- Validates required fields: name, birthDate, phone
- Automatically generates ID: `patient_${Date.now()}`
- Saves via `savePatient()` function
- Supports tags and group assignment

**Patient List** (`/src/pages/PatientList.tsx`):
- Displays all patients from localStorage
- Filters by search, gender, tags
- Clickable cards navigate to patient detail

**Patient Detail** (`/src/pages/PatientDetail.tsx`):
- Shows comprehensive patient information
- Displays health records, goals, appointments
- Tabs for different data types

---

## 6. Best Approach for Adding Mock Patients

### Recommended Strategy: Create a Seed Script

**Why not manual UI entry?**
- Tedious for multiple patients
- Cannot easily batch-create related health records
- Difficult to create consistent test data

**Recommended approach:**

Create a new script: `/scripts/seedPatients.js`

This script should:
1. Generate 5-10 mock patients with realistic data
2. Create associated health records (body composition, vital signs)
3. Add appointments and goals
4. Store in `/data/patients.json` and sync to localStorage

**Key considerations:**
- Use realistic names (suggest: Chinese names for target market)
- Randomize health data within realistic ranges
- Create data spanning past 3-6 months
- Include various health statuses (healthy, overweight, etc.)
- Add tags and group assignments

---

## 7. Recommended Mock Data Structure

### Sample Mock Patient JSON
```json
{
  "id": "patient_1730000000001",
  "name": "王小明",
  "gender": "male",
  "birthDate": "1990-05-15",
  "phone": "0987654321",
  "email": "wang@example.com",
  "address": "台北市信義區",
  "emergencyContact": "王媽媽",
  "emergencyPhone": "0912345678",
  "bloodType": "O+",
  "allergies": ["penicillin"],
  "tags": ["tag_001", "tag_002"],
  "groupIds": ["group_001"],
  "createdAt": "2025-08-05T00:00:00.000Z",
  "updatedAt": "2025-11-05T00:00:00.000Z"
}
```

### Sample Health Records
```json
{
  "id": "body_001",
  "patientId": "patient_1730000000001",
  "date": "2025-11-05",
  "weight": 75.5,
  "height": 175,
  "bodyFat": 22.5,
  "muscleMass": 52.3,
  "bmi": 24.6,
  "visceralFat": 8,
  "boneMass": 3.2,
  "bodyWater": 58.5,
  "bmr": 1650,
  "notes": "Regular check-up"
}
```

---

## 8. Implementation Steps

### Step 1: Create Seed Script
Create `/scripts/seedPatients.js`:
- Generates array of 5-10 mock patients
- Creates realistic health records (3-6 months historical data)
- Adds appointments and goals
- Outputs JSON to `/data/patients.json`

### Step 2: Create Sync Mechanism
Add synchronization logic to:
- Load from `/data/patients.json`
- Inject into localStorage during app initialization
- Provide npm script: `npm run seed-data`

### Step 3: Update Documentation
- Add to `/scripts/README.md`
- Document mock data fields and ranges
- Provide examples for creating custom data

### Step 4: Optional: Add UI Reset Function
- Button in Settings to reset to seed data
- Useful for development/testing

---

## 9. Quick Reference: ID Generation

IDs are generated using timestamp and random string:

```typescript
`patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

For seed script, use simpler format:
```typescript
`patient_${1730000000000 + index}`  // Sequential IDs
```

---

## Technical Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: shadcn/ui (Radix UI based)
- **Charts**: Recharts
- **Storage**: localStorage (web) or Electron FS (desktop)
- **Data Format**: JSON
- **Build**: Vite
- **Desktop**: Electron

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Storage** | localStorage keys (web) or Electron file system |
| **Data Format** | JSON objects in memory, stringified in storage |
| **ID Format** | `patient_${timestamp}` or sequential |
| **Relationships** | Patient → HealthRecords, Appointments, Goals, Assessments |
| **UI Entry** | Forms in `/src/pages/PatientForm.tsx` |
| **Data Access** | Async storage functions in `/src/lib/storage.ts` |
| **Existing Scripts** | Only `createSuperAdmin.js` for user accounts |
| **Seed Data** | NONE - must create new script |
| **Best Practice** | Create `/scripts/seedPatients.js` for mock data |

---

## File Locations Summary

```
/src/types/patient.ts              - All TypeScript interfaces
/src/lib/storage.ts                - Storage abstraction layer
/src/pages/PatientForm.tsx          - Patient creation/edit UI
/src/pages/PatientList.tsx          - Patient list display
/src/pages/PatientDetail.tsx        - Patient detail view
/src/components/DatabaseManagement.tsx - Backup/restore functions
/scripts/createSuperAdmin.js        - Admin account creation
/data/users.json                    - User credentials storage
/scripts/README.md                  - Script documentation
```

---

**Document Generated:** 2025-11-05
**System:** Patient CRM v1.0.0

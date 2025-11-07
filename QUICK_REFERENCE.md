# Patient CRM - Quick Reference Guide

## Patient Data at a Glance

### Core Fields (Required)
- **id**: Auto-generated `patient_${timestamp}`
- **name**: Patient full name
- **birthDate**: ISO format `YYYY-MM-DD`
- **phone**: Contact number
- **gender**: `"male" | "female" | "other"`

### Optional Fields
- email, address, bloodType, allergies[]
- emergencyContact, emergencyPhone
- tags[], groupIds[]

### Related Data
- **BodyCompositionRecord**: weight, height, bodyFat, BMI, muscleMass, etc.
- **VitalSignsRecord**: bloodPressure, heartRate, temperature, oxygenSaturation, etc.
- **Appointment**: date, time, type, status, recurring options
- **PatientGoal**: target goals with progress tracking
- **InitialAssessment**: baseline measurements and activity level

---

## Storage Architecture

### Where Data Lives
```
Web/Browser:  localStorage keys
              - hospital_crm_patients
              - hospital_crm_body_composition
              - hospital_crm_vital_signs
              - hospital_crm_appointments
              - hospital_crm_goals
              - hospital_crm_assessments
              - hospital_crm_tags
              - hospital_crm_groups

Desktop:      Electron file system (when isElectron: true)
```

### How to Access Data
```typescript
import { getPatients, savePatient, getBodyCompositionRecords } from "@/lib/storage";

// Get all patients
const patients = await getPatients();

// Save a patient
await savePatient(patient);

// Get health records for patient
const records = await getBodyCompositionRecords(patientId);
```

---

## Key Storage Functions

### Patients
```typescript
getPatients(): Promise<Patient[]>
getPatientById(id): Promise<Patient | undefined>
savePatient(patient): Promise<void>
deletePatient(id): Promise<void>
```

### Health Records
```typescript
getBodyCompositionRecords(patientId?): Promise<BodyCompositionRecord[]>
saveBodyCompositionRecord(record): Promise<void>
getVitalSignsRecords(patientId?): Promise<VitalSignsRecord[]>
saveVitalSignsRecord(record): Promise<void>
```

### Appointments
```typescript
getAppointments(patientId?): Promise<Appointment[]>
saveAppointment(appointment): Promise<void>
getUpcomingAppointments(): Promise<Appointment[]>
deleteAppointment(id): Promise<void>
```

### Goals
```typescript
getGoals(patientId?): Promise<PatientGoal[]>
saveGoal(goal): Promise<void>
updateGoalProgress(goalId, currentValue): Promise<void>
deleteGoal(id): Promise<void>
```

### Tags & Groups
```typescript
getTags(): Promise<Tag[]>
saveTag(tag): Promise<void>
getGroups(): Promise<PatientGroup[]>
saveGroup(group): Promise<void>
```

---

## File Locations - Quick Map

| What | Where |
|------|-------|
| **Type Definitions** | `/src/types/patient.ts` |
| **Storage Functions** | `/src/lib/storage.ts` |
| **Patient Creation** | `/src/pages/PatientForm.tsx` |
| **Patient List** | `/src/pages/PatientList.tsx` |
| **Patient Detail** | `/src/pages/PatientDetail.tsx` |
| **Health Analytics** | `/src/pages/HealthAnalytics.tsx` |
| **Admin Script** | `/scripts/createSuperAdmin.js` |
| **User Database** | `/data/users.json` |
| **Health Forms** | `/src/components/BodyCompositionForm.tsx`, `VitalSignsForm.tsx`, etc. |

---

## Creating a Mock Patient (Manual)

### Via UI
1. Click "New Patient" button
2. Fill in: name, gender, birthDate, phone
3. Add optional: email, address, allergies, emergency contact
4. Save

### Via Code
```typescript
import { savePatient } from "@/lib/storage";

const mockPatient = {
  id: `patient_${Date.now()}`,
  name: "王小明",
  gender: "male",
  birthDate: "1990-05-15",
  phone: "0987654321",
  email: "wang@example.com",
  address: "台北市",
  bloodType: "O+",
  allergies: ["penicillin"],
  tags: [],
  groupIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await savePatient(mockPatient);
```

---

## Adding Health Records to Patient

### Body Composition Example
```typescript
import { saveBodyCompositionRecord } from "@/lib/storage";

const record = {
  id: `body_${Date.now()}`,
  patientId: "patient_1730000000001",
  date: "2025-11-05",
  weight: 75.5,
  height: 175,
  bodyFat: 22.5,
  muscleMass: 52.3,
  bmi: 24.6,
  bmr: 1650,
  notes: "Regular check-up"
};

await saveBodyCompositionRecord(record);
```

### Vital Signs Example
```typescript
import { saveVitalSignsRecord } from "@/lib/storage";

const record = {
  id: `vital_${Date.now()}`,
  patientId: "patient_1730000000001",
  date: "2025-11-05",
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  heartRate: 72,
  temperature: 36.5,
  oxygenSaturation: 98,
};

await saveVitalSignsRecord(record);
```

---

## Common NPM Scripts

```bash
npm run dev              # Start development server
npm run create-admin     # Create Super Admin account
npm run seed-data       # (TO BE CREATED) Load mock patients
npm run build           # Build for production
npm run electron:dev    # Run Electron development
```

---

## Debugging Data in Browser

### Check localStorage contents
```javascript
// In browser console (F12)
localStorage.getItem('hospital_crm_patients')
localStorage.getItem('hospital_crm_body_composition')
localStorage.getItem('hospital_crm_vital_signs')

// Pretty print
console.table(JSON.parse(localStorage.getItem('hospital_crm_patients')))
```

### Clear all patient data (testing)
```javascript
localStorage.removeItem('hospital_crm_patients');
localStorage.removeItem('hospital_crm_body_composition');
localStorage.removeItem('hospital_crm_vital_signs');
localStorage.removeItem('hospital_crm_appointments');
localStorage.removeItem('hospital_crm_goals');
location.reload();
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Patient list |
| `/patient/new` | Create new patient |
| `/patient/:id` | View/edit patient details |
| `/appointments` | Appointment calendar |
| `/health-analytics` | Cross-patient analytics |
| `/settings` | Settings & database management |

---

## Health Data Ranges (Reference)

### Body Composition (Adults)
- **Weight**: 40-150 kg
- **Height**: 140-210 cm
- **Body Fat**: 10-40%
- **BMI**: 18.5-40+
- **Heart Rate**: 40-100 bpm
- **Blood Pressure**: 90-140 / 60-90 mmHg
- **Temperature**: 36-37.5°C
- **Oxygen Saturation**: 95-100%
- **Blood Glucose**: 70-200 mg/dL (fasting: 70-100)

---

## ID Generation Convention

### Current Pattern
```typescript
`patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

### For Mock Data (Simpler)
```typescript
`patient_${1730000000000 + index}`  // Sequential: patient_1730000000000, patient_1730000000001, etc.
```

---

## Recommended Mock Data Set

Create 5-10 patients with:
- Varied genders and ages (18-80)
- Different health statuses (normal, overweight, fit)
- 3-6 months of historical data
- Multiple appointments and goals
- Realistic medical conditions

---

## Next Steps for Adding Mock Data

1. **Create seed script**: `/scripts/seedPatients.js`
2. **Generate mock patients** with realistic health data
3. **Add npm script**: `npm run seed-data`
4. **Test in browser** via developer console
5. **Add UI reset button** in Settings for easy data reload

---

## Related Documentation

- **Full Details**: See `DATA_STRUCTURE_REPORT.md`
- **File Locations**: See `FILE_LOCATIONS_OVERVIEW.txt`
- **Admin Setup**: See `/scripts/README.md`
- **General Docs**: See `README.md`, `DEPLOYMENT_GUIDE.md`

---

**Last Updated:** 2025-11-05
**Version:** Patient CRM v1.0.0

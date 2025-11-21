import { Patient, HealthRecord, Appointment, PatientGoal, InitialAssessment, BodyCompositionRecord, VitalSignsRecord, Tag, PatientGroup, ConsultationRecord } from "@/types/patient";
import { api } from "./api";

const HEALTH_RECORDS_KEY = "hospital_crm_health_records";
const ASSESSMENTS_KEY = "hospital_crm_assessments";
const TAGS_KEY = "hospital_crm_tags";
const GROUPS_KEY = "hospital_crm_groups";
const CONSULTATIONS_KEY = "hospital_crm_consultations";

// 檢測是否在 Electron 環境
const isElectron = () => {
  return window.electronAPI?.isElectron === true;
};

// Patients
export const getPatients = async (): Promise<Patient[]> => {
  if (isElectron()) {
    return await window.electronAPI!.patient.getAll();
  }
  return api.patients.getAll();
};

export const getPatientById = async (id: string): Promise<Patient | undefined> => {
  if (isElectron()) {
    return await window.electronAPI!.patient.getById(id);
  }
  try {
    return await api.patients.getById(id);
  } catch (error) {
    return undefined;
  }
};

export const savePatient = async (patient: Patient): Promise<void> => {
  if (isElectron()) {
    const patients = await getPatients();
    const existing = patients.find((p) => p.id === patient.id);
    if (existing) {
      await window.electronAPI!.patient.update(patient);
    } else {
      await window.electronAPI!.patient.create(patient);
    }
    return;
  }

  // 檢查是否為新患者（沒有 id 或 id 以 temp_ 開頭）
  const isNew = !patient.id || patient.id.startsWith('temp_');

  if (isNew) {
    // 創建新患者
    const { id, createdAt, updatedAt, ...patientData } = patient;
    await api.patients.create(patientData as any);
  } else {
    // 更新現有患者
    const { createdAt, updatedAt, ...patientData } = patient;
    await api.patients.update(patient.id, patientData);
  }
};

export const deletePatient = async (id: string): Promise<void> => {
  if (isElectron()) {
    await window.electronAPI!.patient.delete(id);
    return;
  }
  await api.patients.delete(id);
};

// Health Records
export const getHealthRecords = async (patientId?: string): Promise<HealthRecord[]> => {
  if (isElectron()) {
    if (patientId) {
      return await window.electronAPI!.healthRecord.getByPatientId(patientId);
    }
    return await window.electronAPI!.healthRecord.getAll();
  }

  const data = localStorage.getItem(HEALTH_RECORDS_KEY);
  const records: HealthRecord[] = data ? JSON.parse(data) : [];
  return patientId ? records.filter((r) => r.patientId === patientId) : records;
};

export const saveHealthRecord = async (record: HealthRecord): Promise<void> => {
  if (isElectron()) {
    await window.electronAPI!.healthRecord.create(record);
    return;
  }

  const records = await getHealthRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(records));
};

export const deleteHealthRecord = async (id: string): Promise<void> => {
  if (isElectron()) {
    await window.electronAPI!.healthRecord.delete(id);
    return;
  }
  const records = (await getHealthRecords()).filter((r) => r.id !== id);
  localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(records));
};

// Appointments
export const getAppointments = async (patientId?: string): Promise<Appointment[]> => {
  if (isElectron()) {
    if (patientId) {
      return await window.electronAPI!.appointment.getByPatientId(patientId);
    }
    return await window.electronAPI!.appointment.getAll();
  }

  if (patientId) {
    return api.appointments.getByPatientId(patientId);
  }
  return api.appointments.getAll();
};

export const saveAppointment = async (appointment: Appointment): Promise<void> => {
  if (isElectron()) {
    const appointments = await getAppointments();
    const existing = appointments.find((a) => a.id === appointment.id);
    if (existing) {
      await window.electronAPI!.appointment.update(appointment);
    } else {
      await window.electronAPI!.appointment.create(appointment);
    }
    return;
  }

  // 檢查是否為新預約
  const isNew = !appointment.id || appointment.id.startsWith('temp_');

  if (isNew) {
    const { id, ...appointmentData } = appointment;
    await api.appointments.create(appointmentData as any);
  } else {
    await api.appointments.update(appointment.id, appointment);
  }
};

export const deleteAppointment = async (id: string): Promise<void> => {
  if (isElectron()) {
    await window.electronAPI!.appointment.delete(id);
    return;
  }
  await api.appointments.delete(id);
};

export const getUpcomingAppointments = async (): Promise<Appointment[]> => {
  const appointments = await getAppointments();
  const now = new Date();
  return appointments
    .filter((a) => {
      const appointmentDate = new Date(`${a.date}T${a.time}`);
      return appointmentDate > now && a.status === "scheduled";
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
};

// Database management functions (Electron only)
export const backupDatabase = async (): Promise<{ success: boolean; path?: string }> => {
  if (isElectron()) {
    return await window.electronAPI!.database.backup();
  }
  return { success: false };
};

export const restoreDatabase = async (): Promise<{ success: boolean }> => {
  if (isElectron()) {
    return await window.electronAPI!.database.restore();
  }
  return { success: false };
};

export const exportDatabaseJSON = async (): Promise<{ success: boolean; path?: string }> => {
  if (isElectron()) {
    return await window.electronAPI!.database.exportJSON();
  }
  return { success: false };
};

// Patient Goals
export const getGoals = async (patientId?: string): Promise<PatientGoal[]> => {
  if (patientId) {
    return api.goals.getByPatientId(patientId);
  }
  // 如果沒有 patientId，獲取所有患者的目標
  const patients = await getPatients();
  const allGoals: PatientGoal[] = [];
  for (const patient of patients) {
    const goals = await api.goals.getByPatientId(patient.id);
    allGoals.push(...goals);
  }
  return allGoals;
};

export const getGoalById = async (id: string): Promise<PatientGoal | undefined> => {
  try {
    return await api.goals.getById(id);
  } catch (error) {
    return undefined;
  }
};

export const saveGoal = async (goal: PatientGoal): Promise<void> => {
  const isNew = !goal.id || goal.id.startsWith('temp_');

  if (isNew) {
    const { id, createdAt, updatedAt, ...goalData } = goal;
    await api.goals.create(goalData as any);
  } else {
    const { createdAt, updatedAt, ...goalData } = goal;
    await api.goals.update(goal.id, goalData);
  }
};

export const deleteGoal = async (id: string): Promise<void> => {
  await api.goals.delete(id);
};

export const updateGoalProgress = async (goalId: string, currentValue: number): Promise<void> => {
  await api.goals.updateProgress(goalId, currentValue);
};

// Initial Assessments
export const getAssessment = async (patientId: string): Promise<InitialAssessment | undefined> => {
  const data = localStorage.getItem(ASSESSMENTS_KEY);
  const assessments: InitialAssessment[] = data ? JSON.parse(data) : [];
  return assessments.find((a) => a.patientId === patientId);
};

export const saveAssessment = async (assessment: InitialAssessment): Promise<void> => {
  const data = localStorage.getItem(ASSESSMENTS_KEY);
  const assessments: InitialAssessment[] = data ? JSON.parse(data) : [];
  const index = assessments.findIndex((a) => a.patientId === assessment.patientId);
  if (index >= 0) {
    assessments[index] = assessment;
  } else {
    assessments.push(assessment);
  }
  localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
};

export const deleteAssessment = async (patientId: string): Promise<void> => {
  const data = localStorage.getItem(ASSESSMENTS_KEY);
  const assessments: InitialAssessment[] = data ? JSON.parse(data) : [];
  const filtered = assessments.filter((a) => a.patientId !== patientId);
  localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(filtered));
};

// Body Composition Records
export const getBodyCompositionRecords = async (patientId?: string): Promise<BodyCompositionRecord[]> => {
  if (patientId) {
    return api.health.bodyComposition.getByPatientId(patientId);
  }
  // 如果沒有 patientId，返回空陣列（避免獲取所有患者的記錄）
  return [];
};

export const saveBodyCompositionRecord = async (record: BodyCompositionRecord): Promise<void> => {
  const isNew = !record.id || record.id.startsWith('temp_');

  if (isNew) {
    const { id, ...recordData } = record;
    await api.health.bodyComposition.create(recordData as any);
  } else {
    await api.health.bodyComposition.update(record.id, record);
  }
};

export const deleteBodyCompositionRecord = async (id: string): Promise<void> => {
  await api.health.bodyComposition.delete(id);
};

// Vital Signs Records
export const getVitalSignsRecords = async (patientId?: string): Promise<VitalSignsRecord[]> => {
  if (patientId) {
    return api.health.vitalSigns.getByPatientId(patientId);
  }
  // 如果沒有 patientId，返回空陣列（避免獲取所有患者的記錄）
  return [];
};

export const saveVitalSignsRecord = async (record: VitalSignsRecord): Promise<void> => {
  const isNew = !record.id || record.id.startsWith('temp_');

  if (isNew) {
    const { id, ...recordData } = record;
    await api.health.vitalSigns.create(recordData as any);
  } else {
    await api.health.vitalSigns.update(record.id, record);
  }
};

export const deleteVitalSignsRecord = async (id: string): Promise<void> => {
  await api.health.vitalSigns.delete(id);
};

// Tags Management
export const getTags = async (): Promise<Tag[]> => {
  if (isElectron()) {
    const data = localStorage.getItem(TAGS_KEY);
    return data ? JSON.parse(data) : [];
  }
  return api.tags.getAll();
};

export const getTagById = async (id: string): Promise<Tag | undefined> => {
  if (isElectron()) {
    const tags = await getTags();
    return tags.find((t) => t.id === id);
  }
  try {
    return await api.tags.getById(id);
  } catch (error) {
    return undefined;
  }
};

export const saveTag = async (tag: Tag): Promise<void> => {
  if (isElectron()) {
    const tags = await getTags();
    const index = tags.findIndex((t) => t.id === tag.id);
    if (index >= 0) {
      tags[index] = tag;
    } else {
      tags.push(tag);
    }
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    return;
  }

  // 檢查是否為新標籤
  const isNew = !tag.id || tag.id.startsWith('temp_') || tag.id.startsWith('tag_');

  if (isNew && !tag.id.startsWith('tag_')) {
    await api.tags.create(tag);
  } else {
    await api.tags.update(tag.id, tag);
  }
};

export const deleteTag = async (id: string): Promise<void> => {
  if (isElectron()) {
    const tags = (await getTags()).filter((t) => t.id !== id);
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));

    // 同時從所有病患中移除此標籤
    const patients = await getPatients();
    for (const patient of patients) {
      if (patient.tags?.includes(id)) {
        patient.tags = patient.tags.filter((tagId) => tagId !== id);
        await savePatient(patient);
      }
    }
    return;
  }

  await api.tags.delete(id);

  // 同時從所有病患中移除此標籤
  const patients = await getPatients();
  for (const patient of patients) {
    if (patient.tags?.includes(id)) {
      patient.tags = patient.tags.filter((tagId) => tagId !== id);
      await savePatient(patient);
    }
  }
};

// Patient Groups Management
export const getGroups = async (): Promise<PatientGroup[]> => {
  if (isElectron()) {
    const data = localStorage.getItem(GROUPS_KEY);
    return data ? JSON.parse(data) : [];
  }
  return api.groups.getAll();
};

export const getGroupById = async (id: string): Promise<PatientGroup | undefined> => {
  if (isElectron()) {
    const groups = await getGroups();
    return groups.find((g) => g.id === id);
  }
  try {
    return await api.groups.getById(id);
  } catch (error) {
    return undefined;
  }
};

export const saveGroup = async (group: PatientGroup): Promise<void> => {
  if (isElectron()) {
    const groups = await getGroups();
    const index = groups.findIndex((g) => g.id === group.id);
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    return;
  }

  // 檢查是否為新群組
  const isNew = !group.id || group.id.startsWith('temp_') || group.id.startsWith('group_');

  if (isNew && !group.id.startsWith('group_')) {
    await api.groups.create(group);
  } else {
    await api.groups.update(group.id, group);
  }
};

export const deleteGroup = async (id: string): Promise<void> => {
  if (isElectron()) {
    const groups = (await getGroups()).filter((g) => g.id !== id);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));

    // 同時從所有病患中移除此群組ID
    const patients = await getPatients();
    for (const patient of patients) {
      if (patient.groups?.includes(id)) {
        patient.groups = patient.groups.filter((groupId) => groupId !== id);
        await savePatient(patient);
      }
    }
    return;
  }

  await api.groups.delete(id);

  // 同時從所有病患中移除此群組ID
  const patients = await getPatients();
  for (const patient of patients) {
    if (patient.groups?.includes(id)) {
      patient.groups = patient.groups.filter((groupId) => groupId !== id);
      await savePatient(patient);
    }
  }
};

export const addPatientToGroup = async (groupId: string, patientId: string): Promise<void> => {
  const group = await getGroupById(groupId);
  if (group && !group.patientIds.includes(patientId)) {
    group.patientIds.push(patientId);
    group.updatedAt = new Date().toISOString();
    await saveGroup(group);
  }

  // 更新病患的群組ID
  const patient = await getPatientById(patientId);
  if (patient) {
    if (!patient.groups) patient.groups = [];
    if (!patient.groups.includes(groupId)) {
      patient.groups.push(groupId);
      await savePatient(patient);
    }
  }
};

export const removePatientFromGroup = async (groupId: string, patientId: string): Promise<void> => {
  const group = await getGroupById(groupId);
  if (group) {
    group.patientIds = group.patientIds.filter((id) => id !== patientId);
    group.updatedAt = new Date().toISOString();
    await saveGroup(group);
  }

  // 更新病患的群組ID
  const patient = await getPatientById(patientId);
  if (patient && patient.groups) {
    patient.groups = patient.groups.filter((id) => id !== groupId);
    await savePatient(patient);
  }
};

// Consultation Records
export const getConsultationRecords = async (patientId?: string): Promise<ConsultationRecord[]> => {
  if (patientId) {
    return api.consultations.getByPatientId(patientId);
  }
  return api.consultations.getAll();
};

export const getConsultationById = async (id: string): Promise<ConsultationRecord | undefined> => {
  try {
    return await api.consultations.getById(id);
  } catch (error) {
    return undefined;
  }
};

export const saveConsultationRecord = async (record: ConsultationRecord): Promise<void> => {
  const isNew = !record.id || record.id.startsWith('temp_');

  if (isNew) {
    const { id, createdAt, updatedAt, ...recordData } = record;
    await api.consultations.create(recordData);
  } else {
    const { createdAt, updatedAt, ...recordData } = record;
    await api.consultations.update(record.id, recordData);
  }
};

export const deleteConsultationRecord = async (id: string): Promise<void> => {
  await api.consultations.delete(id);
};

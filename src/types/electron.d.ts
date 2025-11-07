export interface ElectronAPI {
  patient: {
    getAll: () => Promise<Patient[]>;
    getById: (id: string) => Promise<Patient | undefined>;
    create: (patient: Patient) => Promise<Patient>;
    update: (patient: Patient) => Promise<Patient>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  healthRecord: {
    getAll: () => Promise<HealthRecord[]>;
    getByPatientId: (patientId: string) => Promise<HealthRecord[]>;
    create: (record: HealthRecord) => Promise<HealthRecord>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  appointment: {
    getAll: () => Promise<Appointment[]>;
    getByPatientId: (patientId: string) => Promise<Appointment[]>;
    create: (appointment: Appointment) => Promise<Appointment>;
    update: (appointment: Appointment) => Promise<Appointment>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  database: {
    backup: () => Promise<{ success: boolean; path?: string }>;
    restore: () => Promise<{ success: boolean }>;
    exportJSON: () => Promise<{ success: boolean; path?: string }>;
  };
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

import type { Patient, HealthRecord, Appointment } from './patient';

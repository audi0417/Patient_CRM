// Demo 體驗相關的類型定義

export interface DemoConfig {
  clinicScale: 'single' | 'chain';
  clinicType: 'aesthetic' | 'tcm' | 'weight-loss';
  painPoint: 'booking-chaos' | 'record-tracking' | 'order-missing';
}

export interface DemoScenario {
  id: string;
  type: 'drag-appointment' | 'add-tag';
  title: string;
  description: string;
  trigger: string;
  completed: boolean;
}

export interface DemoState {
  phase: 'survey' | 'simulation' | 'conversion';
  config: DemoConfig | null;
  currentScenario: number;
  scenarios: DemoScenario[];
  completedScenarios: string[];
}

export interface MockPatient {
  id: string;
  name: string;
  phone: string;
  treatment: string;
  appointmentTime?: string;
  tags?: string[];
}

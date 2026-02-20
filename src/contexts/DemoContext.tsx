import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Patient, Appointment } from '@/types/patient';
import { User } from '@/types/user';
import { DemoScenario, DemoStep, getCustomizedScenarios, getProgressPercentage } from '@/config/demoScenarios';

// Demo 配置類型
interface DemoConfig {
  clinicScale?: 'single' | 'chain';
  clinicType?: 'aesthetic' | 'tcm' | 'weight-loss';
  painPoint?: 'booking-chaos' | 'record-tracking' | 'order-missing';
}

// Demo 狀態類型
interface DemoState {
  isActive: boolean;
  phase: 'survey' | 'simulation' | 'conversion';
  currentScenarioIndex: number;
  currentStepIndex: number;
  currentStep: number; // 問卷階段使用的步驟索引
  config: DemoConfig;
  scenarios: DemoScenario[];
  completedScenarios: string[];
}

// Demo Context 類型
interface DemoContextType extends DemoState {
  // 狀態管理
  startDemo: () => void;
  exitDemo: () => void;
  goToPhase: (phase: 'survey' | 'simulation' | 'conversion') => void;
  nextStep: () => void;
  prevStep: () => void;
  nextScenario: () => void;
  setConfig: (key: keyof DemoConfig, value: string) => void;
  completeCurrentStep: () => void;
  completeCurrentScenario: () => void;

  // 當前狀態
  getCurrentScenario: () => DemoScenario | null;
  getCurrentStep: () => DemoStep | null;
  getProgress: () => number;
  isLastScenario: () => boolean;
  isLastStep: () => boolean;

  // 模擬資料
  demoUser: User;
  demoPatients: Patient[];
  demoAppointments: Appointment[];
  updateDemoAppointment: (appointment: Appointment) => void;

  // 療程名稱映射
  getTreatmentName: () => string;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

// 根據診所類型生成模擬病患
const createMockPatients = (clinicType: string): Patient[] => {
  const basePatients: Patient[] = [
    {
      id: 'demo-patient-1',
      name: '陳小姐',
      phone: '0912-345-678',
      gender: 'female',
      address: '台北市信義區',
      email: 'chen@example.com',
      emergencyContact: '陳先生 0912-111-111',
      medicalHistory: [],
      allergies: [],
      tags: ['VIP客戶'],
      notes: '定期回診客戶',
    },
    {
      id: 'demo-patient-2',
      name: '王先生',
      phone: '0923-456-789',
      gender: 'male',
      address: '新北市板橋區',
      email: 'wang@example.com',
      emergencyContact: '王太太 0923-222-222',
      medicalHistory: [],
      allergies: [],
      tags: [],
      notes: '提及最近有睡眠困擾',
    },
    {
      id: 'demo-patient-3',
      name: '李太太',
      phone: '0934-567-890',
      gender: 'female',
      address: '台中市西屯區',
      email: 'lee@example.com',
      emergencyContact: '李先生 0934-333-333',
      medicalHistory: [],
      allergies: [],
      tags: ['初診'],
      notes: '',
    },
    {
      id: 'demo-patient-4',
      name: '張小姐',
      phone: '0945-678-901',
      gender: 'female',
      address: '台北市大安區',
      email: 'zhang@example.com',
      emergencyContact: '張媽媽 0945-444-444',
      medicalHistory: [],
      allergies: [],
      tags: ['會員'],
      notes: '對效果很滿意',
    },
    {
      id: 'demo-patient-5',
      name: '林先生',
      phone: '0956-789-012',
      gender: 'male',
      address: '高雄市前鎮區',
      email: 'lin@example.com',
      emergencyContact: '林太太 0956-555-555',
      medicalHistory: [],
      allergies: [],
      tags: [],
      notes: '工作忙碌，偏好晚間時段',
    },
  ];

  return basePatients;
};

// 根據診所類型生成模擬預約
const createMockAppointments = (clinicType: string, patients: Patient[]): Appointment[] => {
  const treatmentMap: Record<string, string> = {
    aesthetic: '皮秒雷射',
    tcm: '針灸調理',
    'weight-loss': '體重管理諮詢',
  };

  const treatment = treatmentMap[clinicType] || '一般回診';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return [
    {
      id: 'demo-apt-1',
      patientId: patients[0].id,
      date: tomorrowStr,
      time: '14:00',
      type: treatment,
      status: 'scheduled',
      notes: '陳小姐來電：想將預約改到今天',
    },
    {
      id: 'demo-apt-2',
      patientId: patients[1].id,
      date: todayStr,
      time: '15:00',
      type: treatment,
      status: 'scheduled',
      notes: '王先生提及最近有睡眠困擾',
    },
    {
      id: 'demo-apt-3',
      patientId: patients[2].id,
      date: todayStr,
      time: '10:00',
      type: '初診諮詢',
      status: 'scheduled',
      notes: '初次諮詢，需詳細說明療程',
    },
    {
      id: 'demo-apt-4',
      patientId: patients[3].id,
      date: tomorrowStr,
      time: '11:00',
      type: treatment,
      status: 'scheduled',
      notes: '',
    },
    {
      id: 'demo-apt-5',
      patientId: patients[4].id,
      date: nextWeekStr,
      time: '18:00',
      type: treatment,
      status: 'scheduled',
      notes: '偏好晚間時段',
    },
  ];
};

// Demo 用戶
const createDemoUser = (): User => ({
  id: 'demo-user',
  email: 'demo@clinic.com',
  name: 'Demo 管理員',
  role: 'admin',
  isActive: true,
  organizationId: 'demo-org',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DemoState>({
    isActive: false,
    phase: 'survey',
    currentScenarioIndex: 0,
    currentStepIndex: 0,
    currentStep: 0, // 問卷階段的步驟
    config: {},
    scenarios: [],
    completedScenarios: [],
  });

  const [demoPatients, setDemoPatients] = useState<Patient[]>([]);
  const [demoAppointments, setDemoAppointments] = useState<Appointment[]>([]);
  const demoUser = createDemoUser();

  const startDemo = useCallback(() => {
    window.__isDemoMode = true;
    setState(prev => ({
      ...prev,
      isActive: true,
      phase: 'survey',
      currentScenarioIndex: 0,
      currentStepIndex: 0,
    }));
  }, []);

  const exitDemo = useCallback(() => {
    window.__isDemoMode = false;
    setState({
      isActive: false,
      phase: 'survey',
      currentScenarioIndex: 0,
      currentStepIndex: 0,
      currentStep: 0,
      config: {},
      scenarios: [],
      completedScenarios: [],
    });
    setDemoPatients([]);
    setDemoAppointments([]);
  }, []);

  const goToPhase = useCallback((phase: 'survey' | 'simulation' | 'conversion') => {
    if (phase === 'simulation') {
      // 進入模擬階段時，根據配置生成資料和場景
      const clinicType = state.config.clinicType || 'aesthetic';
      const patients = createMockPatients(clinicType);
      const appointments = createMockAppointments(clinicType, patients);
      const scenarios = getCustomizedScenarios(clinicType);

      setDemoPatients(patients);
      setDemoAppointments(appointments);
      setState(prev => ({
        ...prev,
        phase,
        scenarios,
        currentScenarioIndex: 0,
        currentStepIndex: 0,
        currentStep: 0, // 重置問卷步驟
      }));
    } else {
      setState(prev => ({ ...prev, phase, currentStep: 0 }));
    }
  }, [state.config.clinicType]);

  const nextStep = useCallback(() => {
    setState(prev => {
      // 問卷階段：只增加 currentStep
      if (prev.phase === 'survey') {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }

      // 模擬階段：處理場景步驟
      const currentScenario = prev.scenarios[prev.currentScenarioIndex];
      if (!currentScenario) return prev;

      // 如果當前場景還有下一步
      if (prev.currentStepIndex < currentScenario.steps.length - 1) {
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      }

      // 如果是場景的最後一步，進入下一個場景
      if (prev.currentScenarioIndex < prev.scenarios.length - 1) {
        return {
          ...prev,
          currentScenarioIndex: prev.currentScenarioIndex + 1,
          currentStepIndex: 0,
          completedScenarios: [...prev.completedScenarios, currentScenario.id],
        };
      }

      // 所有場景完成，進入 conversion 階段
      return {
        ...prev,
        phase: 'conversion',
        completedScenarios: [...prev.completedScenarios, currentScenario.id],
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      // 問卷階段：減少 currentStep
      if (prev.phase === 'survey') {
        return { ...prev, currentStep: Math.max(0, prev.currentStep - 1) };
      }

      // 模擬階段：處理場景步驟
      // 如果不是第一步，返回上一步
      if (prev.currentStepIndex > 0) {
        return { ...prev, currentStepIndex: prev.currentStepIndex - 1 };
      }

      // 如果是當前場景的第一步，返回上一個場景的最後一步
      if (prev.currentScenarioIndex > 0) {
        const prevScenarioIndex = prev.currentScenarioIndex - 1;
        const prevScenario = prev.scenarios[prevScenarioIndex];
        return {
          ...prev,
          currentScenarioIndex: prevScenarioIndex,
          currentStepIndex: prevScenario.steps.length - 1,
        };
      }

      return prev;
    });
  }, []);

  const nextScenario = useCallback(() => {
    setState(prev => {
      const currentScenario = prev.scenarios[prev.currentScenarioIndex];

      if (prev.currentScenarioIndex < prev.scenarios.length - 1) {
        return {
          ...prev,
          currentScenarioIndex: prev.currentScenarioIndex + 1,
          currentStepIndex: 0,
          completedScenarios: currentScenario
            ? [...prev.completedScenarios, currentScenario.id]
            : prev.completedScenarios,
        };
      }

      // 所有場景完成
      return {
        ...prev,
        phase: 'conversion',
        completedScenarios: currentScenario
          ? [...prev.completedScenarios, currentScenario.id]
          : prev.completedScenarios,
      };
    });
  }, []);

  const setConfig = useCallback((key: keyof DemoConfig, value: string) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  }, []);

  const completeCurrentStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const completeCurrentScenario = useCallback(() => {
    nextScenario();
  }, [nextScenario]);

  const getCurrentScenario = useCallback(() => {
    return state.scenarios[state.currentScenarioIndex] || null;
  }, [state.scenarios, state.currentScenarioIndex]);

  const getCurrentStep = useCallback(() => {
    const scenario = getCurrentScenario();
    return scenario?.steps[state.currentStepIndex] || null;
  }, [getCurrentScenario, state.currentStepIndex]);

  const getProgress = useCallback(() => {
    return getProgressPercentage(
      state.scenarios,
      state.currentScenarioIndex,
      state.currentStepIndex
    );
  }, [state.scenarios, state.currentScenarioIndex, state.currentStepIndex]);

  const isLastScenario = useCallback(() => {
    return state.currentScenarioIndex >= state.scenarios.length - 1;
  }, [state.currentScenarioIndex, state.scenarios.length]);

  const isLastStep = useCallback(() => {
    const scenario = getCurrentScenario();
    return scenario ? state.currentStepIndex >= scenario.steps.length - 1 : false;
  }, [getCurrentScenario, state.currentStepIndex]);

  const updateDemoAppointment = useCallback((appointment: Appointment) => {
    setDemoAppointments(prev => {
      const index = prev.findIndex(a => a.id === appointment.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = appointment;
        return updated;
      }
      return [...prev, appointment];
    });
  }, []);

  const getTreatmentName = useCallback(() => {
    const treatmentMap: Record<string, string> = {
      aesthetic: '皮秒雷射',
      tcm: '針灸調理',
      'weight-loss': '體重管理',
    };
    return treatmentMap[state.config.clinicType || 'aesthetic'] || '一般療程';
  }, [state.config.clinicType]);

  const value: DemoContextType = {
    ...state,
    startDemo,
    exitDemo,
    goToPhase,
    nextStep,
    prevStep,
    nextScenario,
    setConfig,
    completeCurrentStep,
    completeCurrentScenario,
    getCurrentScenario,
    getCurrentStep,
    getProgress,
    isLastScenario,
    isLastStep,
    demoUser,
    demoPatients,
    demoAppointments,
    updateDemoAppointment,
    getTreatmentName,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

export default DemoContext;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { setDemoData } from '@/lib/api';
import DemoSurveyOverlay from '@/components/demo/DemoSurveyOverlay';
import DemoConversionPage from '@/components/demo/DemoConversionPage';

const DemoExperience = () => {
  const navigate = useNavigate();
  const {
    isActive,
    phase,
    startDemo,
    demoUser,
    demoPatients,
    demoAppointments,
  } = useDemo();

  // 自動啟動 Demo
  useEffect(() => {
    if (!isActive) {
      startDemo();
    }
  }, [isActive, startDemo]);

  // 當進入 simulation 階段時，設置 Demo 資料並導航到主頁面
  useEffect(() => {
    if (phase === 'simulation' && demoPatients.length > 0) {
      // 將模擬資料注入到 API 層
      setDemoData({
        patients: demoPatients,
        appointments: demoAppointments,
        user: demoUser,
      });

      // 導航到病患列表頁面（使用真實介面）
      navigate('/patients');
    }
  }, [phase, demoPatients, demoAppointments, demoUser, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Phase 1: 問卷調查 */}
      {phase === 'survey' && <DemoSurveyOverlay />}

      {/* Phase 2: 模擬階段 - 會自動導航到真實頁面 */}
      {phase === 'simulation' && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-lg text-muted-foreground">正在準備體驗環境...</p>
          </div>
        </div>
      )}

      {/* Phase 3: 價值轉換 */}
      {phase === 'conversion' && <DemoConversionPage />}
    </div>
  );
};

export default DemoExperience;

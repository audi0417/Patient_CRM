/**
 * Demo 場景管理器
 *
 * 這個元件負責：
 * - 監控當前場景和步驟
 * - 根據場景路由導航到對應的 CRM 頁面
 * - 渲染 DemoGuideOverlay 引導覆蓋層
 * - 處理場景完成和轉場
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import DemoGuideOverlay from './DemoGuideOverlay';
import SceneTransition from './SceneTransition';
import { getTotalSteps } from '@/config/demoScenarios';

const DemoScenarioManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const demo = useDemo();
  const previousScenarioIndexRef = useRef<number>(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const {
    isActive,
    phase,
    scenarios,
    currentScenarioIndex,
    currentStepIndex,
    getCurrentScenario,
    getCurrentStep,
    getProgress,
    nextStep,
    prevStep,
    exitDemo,
    isLastStep,
  } = demo;

  const currentScenario = getCurrentScenario();
  const currentStep = getCurrentStep();

  // 檢測場景切換並觸發過渡動畫
  useEffect(() => {
    if (!isActive || phase !== 'simulation') return;

    // 檢查是否進入了新場景（場景索引增加）
    if (currentScenarioIndex > 0 && previousScenarioIndexRef.current !== currentScenarioIndex) {
      // 觸發過渡動畫
      setIsTransitioning(true);
      setShowGuide(false);
    } else if (currentScenarioIndex === 0 && previousScenarioIndexRef.current === -1) {
      // 第一個場景，直接顯示引導
      setShowGuide(true);
    }

    previousScenarioIndexRef.current = currentScenarioIndex;
  }, [isActive, phase, currentScenarioIndex]);

  // 過渡動畫完成後的回調
  const handleTransitionComplete = () => {
    setIsTransitioning(false);
    setShowGuide(true);
  };

  // 當進入 simulation 階段或場景改變時，自動導航到正確的頁面
  useEffect(() => {
    if (!isActive || phase !== 'simulation' || !currentScenario) return;

    // 檢查是否已經在正確的路由
    if (location.pathname !== currentScenario.route) {
      navigate(currentScenario.route);
    }
  }, [isActive, phase, currentScenario, location.pathname, navigate]);

  // 監聽場景要求的特定事件（例如：appointment-updated）
  useEffect(() => {
    if (!currentStep || currentStep.action !== 'wait' || !currentStep.waitFor) return;

    const handleCustomEvent = (e: CustomEvent) => {
      // 當監聽的事件觸發時，自動進入下一步
      if (e.detail?.eventType === currentStep.waitFor) {
        nextStep();
      }
    };

    window.addEventListener('demo:event', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('demo:event', handleCustomEvent as EventListener);
    };
  }, [currentStep, nextStep]);

  // 如果不在 simulation 階段，不渲染引導覆蓋層
  if (!isActive || phase !== 'simulation' || !currentScenario || !currentStep) {
    return null;
  }

  // 計算總步驟數和當前步驟編號
  const totalSteps = getTotalSteps(scenarios);
  let stepNumber = 1;

  // 計算當前步驟是全局第幾步
  for (let i = 0; i < currentScenarioIndex; i++) {
    stepNumber += scenarios[i].steps.length;
  }
  stepNumber += currentStepIndex + 1;

  // 獲取下一個場景的預告資訊
  const nextSceneTitle = currentScenario?.previewTitle || currentScenario?.title || '';
  const nextSceneDescription = currentScenario?.previewDescription || currentScenario?.description || '';

  return (
    <>
      {/* 場景過渡動畫 */}
      <SceneTransition
        isActive={isTransitioning}
        nextSceneTitle={nextSceneTitle}
        nextSceneDescription={nextSceneDescription}
        onComplete={handleTransitionComplete}
      />

      {/* 引導覆蓋層（過渡完成後才顯示） */}
      {showGuide && (
        <DemoGuideOverlay
          step={currentStep}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          progress={getProgress()}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={exitDemo}
          isLastStep={isLastStep()}
          skipInitialDelay={currentScenarioIndex > 0 && currentStepIndex === 0}
        />
      )}
    </>
  );
};

export default DemoScenarioManager;

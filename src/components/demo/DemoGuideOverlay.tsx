/**
 * Demo 引導覆蓋層元件
 *
 * 這個元件在真實的 CRM 頁面上疊加引導層，提供：
 * - 半透明遮罩（聚焦目標元素）
 * - Spotlight 高亮效果
 * - 引導文字氣泡
 * - 步驟進度指示
 * - 完成動畫
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { DemoStep } from '@/config/demoScenarios';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface DemoGuideOverlayProps {
  step: DemoStep;
  stepNumber: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastStep: boolean;
  skipInitialDelay?: boolean; // 跳過初始延遲（場景切換後已有過渡動畫）
}

const DemoGuideOverlay: React.FC<DemoGuideOverlayProps> = ({
  step,
  stepNumber,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
  skipInitialDelay = false,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showingIntro, setShowingIntro] = useState(true); // 是否顯示介紹卡片
  const [isVisible, setIsVisible] = useState(false); // 控制整個覆蓋層的顯示
  const overlayRef = useRef<HTMLDivElement>(null);

  // 當步驟改變時，重新顯示介紹，並延遲顯示覆蓋層
  useEffect(() => {
    setShowingIntro(true);
    setIsVisible(false);

    // 如果跳過初始延遲（場景切換後），立即顯示
    // 否則延遲顯示，讓用戶先看到頁面
    const delay = skipInitialDelay ? 0 : 1500;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [step.id, skipInitialDelay]);

  // 介紹卡片自動消失（5秒後）
  useEffect(() => {
    if (!isVisible || !showingIntro) return;

    const timer = setTimeout(() => {
      handleStartAction();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isVisible, showingIntro, handleStartAction]);

  // 尋找並高亮目標元素
  useEffect(() => {
    if (!step.targetSelector) return;

    const findTarget = () => {
      const target = document.querySelector(step.targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);

        // 添加高亮樣式
        target.classList.add('demo-target-highlight');

        // 根據高亮樣式添加對應的 class
        if (step.highlightStyle === 'spotlight') {
          target.classList.add('demo-spotlight');
        } else if (step.highlightStyle === 'outline') {
          target.classList.add('demo-outline');
        } else if (step.highlightStyle === 'glow') {
          target.classList.add('demo-glow');
        }

        return target;
      }
      return null;
    };

    // 嘗試尋找目標元素（可能需要延遲）
    const target = findTarget();

    // 如果沒找到，延遲重試
    let retryTimeout: NodeJS.Timeout;
    if (!target) {
      retryTimeout = setTimeout(findTarget, 500);
    }

    // 監聽目標元素的點擊事件
    const handleClick = (e: Event) => {
      if (step.action === 'click') {
        // 不阻止默認行為，讓點擊正常執行
        handleStepComplete();
      }
    };

    if (target && step.action === 'click') {
      target.addEventListener('click', handleClick);
    }

    // 清理函數
    return () => {
      if (target) {
        target.classList.remove(
          'demo-target-highlight',
          'demo-spotlight',
          'demo-outline',
          'demo-glow'
        );
        target.removeEventListener('click', handleClick, true);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [step, handleStepComplete]);

  // 自動進入下一步
  useEffect(() => {
    if (step.autoNext && step.duration) {
      const timer = setTimeout(() => {
        handleStepComplete();
      }, step.duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // 處理"開始操作"按鈕點擊
  const handleStartAction = useCallback(() => {
    setShowingIntro(false);
  }, []);

  // 完成步驟
  const handleStepComplete = useCallback(() => {
    setIsCompleted(true);

    // 立即進入下一步（不放煙火，讓導航自然發生）
    setTimeout(() => {
      onNext();
      setIsCompleted(false);
      setShowingIntro(true);
    }, 300);
  }, [onNext]);

  // 計算引導氣泡的位置（確保不超出視窗且不擋住目標）
  const getTooltipPosition = () => {
    if (!targetRect) return {};

    const position = step.targetPosition || 'right';
    const spacing = 40; // 增加間距，避免擋住目標
    const tooltipMaxWidth = 448; // max-w-md = 28rem = 448px
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = 0;
    let top = 0;
    let transform = '';

    switch (position) {
      case 'top':
        left = Math.min(Math.max(targetRect.left + targetRect.width / 2, tooltipMaxWidth / 2), viewportWidth - tooltipMaxWidth / 2);
        top = targetRect.top - spacing;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        left = Math.min(Math.max(targetRect.left + targetRect.width / 2, tooltipMaxWidth / 2), viewportWidth - tooltipMaxWidth / 2);
        top = targetRect.bottom + spacing;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        left = Math.max(targetRect.left - spacing, tooltipMaxWidth + 20);
        top = Math.min(Math.max(targetRect.top + targetRect.height / 2, 100), viewportHeight - 100);
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
      default:
        left = Math.min(targetRect.right + spacing, viewportWidth - tooltipMaxWidth - 20);
        top = Math.min(Math.max(targetRect.top + targetRect.height / 2, 100), viewportHeight - 100);
        transform = 'translate(0, -50%)';
        break;
    }

    return { left, top, transform };
  };

  // 渲染 Spotlight 遮罩
  const renderSpotlightMask = () => {
    if (!targetRect) return null;

    const padding = 12;

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9998 }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>
    );
  };

  // 延遲顯示期間不渲染
  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: (!showingIntro && step.action === 'click') ? 'none' : 'auto' }}
      >
        {/* Spotlight 遮罩（介紹階段顯示） */}
        {showingIntro && step.targetSelector && renderSpotlightMask()}
        {showingIntro && !step.targetSelector && (
          <div className="absolute inset-0 bg-black/75 pointer-events-none" style={{ zIndex: 9998 }} />
        )}

        {/* 進度條和導航 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-3xl px-4"
        >
          <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
            {/* 頂部導航 */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={stepNumber === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-semibold">步驟 {stepNumber} / {totalSteps}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={isLastStep}
                className="flex items-center gap-1"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* 當前步驟標題 */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
            </div>

            {/* 進度條 */}
            <Progress value={progress} className="h-2" />
          </div>
        </motion.div>

        {/* 介紹階段：顯示完整卡片 */}
        {showingIntro && (
          <>
            {step.targetSelector && targetRect ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-[10000] pointer-events-auto"
                style={getTooltipPosition()}
              >
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg border-2 border-primary/20">
                  {/* 標題 */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    {isCompleted && <Check className="w-6 h-6 text-green-500" />}
                    {step.title}
                  </h3>

                  {/* 描述 */}
                  <p className="text-lg text-gray-700 whitespace-pre-line leading-relaxed">
                    {step.description}
                  </p>

                  {/* 自動消失提示 */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 italic">
                      5 秒後自動開始體驗...
                    </p>
                  </div>
                </div>

                {/* 箭頭指示 */}
                {step.targetPosition === 'right' && (
                  <div
                    className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white"
                  />
                )}
                {step.targetPosition === 'left' && (
                  <div
                    className="absolute right-0 top-1/2 translate-x-2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white"
                  />
                )}
                {step.targetPosition === 'bottom' && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white"
                  />
                )}
                {step.targetPosition === 'top' && (
                  <div
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"
                  />
                )}
              </motion.div>
            ) : (
              // 沒有目標元素時，居中顯示
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] pointer-events-auto"
              >
                <div className="bg-white rounded-lg shadow-2xl p-10 max-w-2xl border-2 border-primary/20">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-xl text-gray-700 whitespace-pre-line leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* 自動消失提示 */}
                  <div className="text-center">
                    <p className="text-sm text-gray-500 italic">
                      5 秒後自動開始體驗...
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* 操作階段：顯示頂部任務提示 */}
        {!showingIntro && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-2xl px-4 pointer-events-auto"
          >
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-primary/30">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {step.title}
                  </h4>

                  {step.action === 'click' && (
                    <div className="text-base text-primary font-semibold flex items-center gap-2">
                      <span className="animate-pulse text-xl">👆</span>
                      請點擊高亮的區域繼續
                    </div>
                  )}

                  {step.action === 'observe' && (
                    <div className="text-base text-gray-700">
                      請仔細觀察此頁面的內容
                    </div>
                  )}

                  {step.action === 'wait' && step.waitFor && (
                    <div className="text-base text-gray-600 font-medium italic">
                      ⏳ 正在等待您的操作...
                    </div>
                  )}
                </div>

                {step.action === 'observe' && !step.autoNext && (
                  <Button onClick={handleStepComplete} size="lg">
                    {isLastStep ? '完成體驗' : '下一步'}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 結束引導按鈕 */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onSkip}
          className="absolute top-4 right-4 z-[10000] pointer-events-auto text-white hover:text-white hover:bg-white/20 font-semibold"
        >
          <X className="w-5 h-5 mr-2" />
          結束引導
        </Button>
      </div>
    </AnimatePresence>
  );
};

export default DemoGuideOverlay;

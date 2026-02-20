/**
 * 場景過渡動畫組件
 *
 * 在場景切換時提供流暢的過渡效果：
 * 1. 黑屏淡出（0.5s）
 * 2. 顯示下一場景預告（1.5s）
 * 3. 新頁面淡入（0.5s）
 * 4. 煙火慶祝（0.5s）
 * 5. 顯示引導卡片
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';

interface SceneTransitionProps {
  isActive: boolean;
  nextSceneTitle: string;
  nextSceneDescription: string;
  onComplete: () => void;
}

type TransitionPhase = 'fadeOut' | 'preview' | 'fadeIn' | 'confetti' | 'complete';

const SceneTransition: React.FC<SceneTransitionProps> = ({
  isActive,
  nextSceneTitle,
  nextSceneDescription,
  onComplete,
}) => {
  const [phase, setPhase] = useState<TransitionPhase>('fadeOut');

  useEffect(() => {
    if (!isActive) return;

    // 重置到初始階段
    setPhase('fadeOut');

    // 階段 1: 黑屏淡出（0.5s）
    const timer1 = setTimeout(() => {
      setPhase('preview');
    }, 500);

    // 階段 2: 預告顯示（0.5s + 1.5s = 2s）
    const timer2 = setTimeout(() => {
      setPhase('fadeIn');
    }, 2000);

    // 階段 3: 淡入完成，準備放煙火（2.5s）
    const timer3 = setTimeout(() => {
      setPhase('confetti');
      // 放煙火
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 2500);

    // 階段 4: 煙火後完成（4s）
    const timer4 = setTimeout(() => {
      setPhase('complete');
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isActive, onComplete]);

  if (!isActive || phase === 'complete') {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {/* 黑色遮罩層 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === 'fadeOut' || phase === 'preview' ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-black"
        />

        {/* 預告內容 */}
        {phase === 'preview' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center text-white px-8 max-w-2xl">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <h2 className="text-4xl font-bold">接下來</h2>
              </div>

              <h3 className="text-3xl font-bold mb-4">{nextSceneTitle}</h3>

              <p className="text-xl text-gray-300 leading-relaxed">
                {nextSceneDescription}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default SceneTransition;

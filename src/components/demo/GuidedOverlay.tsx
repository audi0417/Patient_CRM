import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface GuidedOverlayProps {
  targetSelector: string;
  title: string;
  description: string;
  onClose?: () => void;
  showPointer?: boolean;
  pointerPosition?: 'top' | 'bottom' | 'left' | 'right';
}

const GuidedOverlay = ({
  targetSelector,
  title,
  description,
  onClose,
  showPointer = true,
  pointerPosition = 'bottom',
}: GuidedOverlayProps) => {
  const getPointerAnimation = () => {
    const positions = {
      top: { x: 0, y: -20 },
      bottom: { x: 0, y: 20 },
      left: { x: -20, y: 0 },
      right: { x: 20, y: 0 },
    };
    return positions[pointerPosition];
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* 黑色遮罩，但目標區域透明 */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* 提示框 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 max-w-md pointer-events-auto"
      >
        <div className="bg-background border-2 border-primary rounded-lg shadow-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* 手指動畫提示 */}
          {showPointer && (
            <motion.div
              animate={getPointerAnimation()}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="text-4xl text-center mt-4"
            >
              👆
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GuidedOverlay;

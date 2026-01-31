import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';

interface SurveyQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: {
    value: string;
    label: string;
    description: string;
  }[];
}

const questions: SurveyQuestion[] = [
  {
    id: 'clinicScale',
    title: '您的診所規模是？',
    subtitle: '幫助我們為您準備最適合的體驗',
    options: [
      { value: 'single', label: '單一診所', description: '專注於單點經營' },
      { value: 'chain', label: '連鎖體系', description: '管理多個據點' },
    ],
  },
  {
    id: 'clinicType',
    title: '您的診所類型是？',
    subtitle: '我們將為您準備相應的案例',
    options: [
      { value: 'aesthetic', label: '醫美診所', description: '美容、雷射、微整形' },
      { value: 'tcm', label: '中醫診所', description: '針灸、推拿、中藥調理' },
      { value: 'weight-loss', label: '減重診所', description: '體重管理、營養諮詢' },
    ],
  },
  {
    id: 'painPoint',
    title: '您目前最大的困擾是？',
    subtitle: '讓我們展示如何解決這個問題',
    options: [
      { value: 'booking-chaos', label: '預約混亂', description: '電話、LINE 訊息難以整合' },
      { value: 'record-tracking', label: '病歷追蹤困難', description: '病患資料散落各處' },
      { value: 'order-missing', label: '容易漏單', description: '療程項目容易遺漏' },
    ],
  },
];

const DemoSurveyOverlay = () => {
  const { currentStep, setConfig, nextStep, prevStep, goToPhase, exitDemo } = useDemo();
  
  const currentQuestion = questions[currentStep];

  const handleSelect = (value: string) => {
    setConfig(currentQuestion.id as 'clinicScale' | 'clinicType' | 'painPoint', value);
    
    if (currentStep < questions.length - 1) {
      nextStep();
    } else {
      // 完成問卷，進入模擬階段
      goToPhase('simulation');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl"
        >
          <Card className="border-2">
            <CardContent className="p-8">
              {/* 關閉按鈕 */}
              <button
                onClick={exitDemo}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 進度指示器 */}
              <div className="flex justify-center gap-2 mb-8">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? 'w-8 bg-primary'
                        : idx < currentStep
                        ? 'w-8 bg-primary/50'
                        : 'w-1.5 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* 標題 */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">{currentQuestion.title}</h2>
                <p className="text-muted-foreground text-lg">{currentQuestion.subtitle}</p>
              </div>

              {/* 選項 */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                {currentQuestion.options.map((option, idx) => (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card
                      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:border-primary"
                      onClick={() => handleSelect(option.value)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">{option.label}</h3>
                            <p className="text-muted-foreground text-sm">{option.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground ml-4 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* 返回按鈕 */}
              {currentStep > 0 && (
                <div className="text-center">
                  <Button variant="ghost" onClick={prevStep}>
                    返回上一步
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DemoSurveyOverlay;

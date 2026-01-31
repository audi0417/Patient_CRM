import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import {
  Sparkles,
  Clock,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

const DemoConversionPage = () => {
  const { config, exitDemo } = useDemo();
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowStats(true), 500);
  }, []);

  const stats = [
    {
      icon: Clock,
      label: '溝通效率提升',
      value: 40,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Users,
      label: '回訪率預估提升',
      value: 20,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Target,
      label: '漏單率減少',
      value: 60,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: TrendingUp,
      label: '整體效能提升',
      value: 35,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const clinicTypeLabels = {
    aesthetic: '醫美診所',
    tcm: '中醫診所',
    'weight-loss': '減重診所',
  };

  const features = [
    {
      title: '智慧預約管理',
      description: '拖拉式行事曆，自動發送 LINE 通知',
    },
    {
      title: 'AI 標籤系統',
      description: '自動推薦療程，精準追蹤病患狀況',
    },
    {
      title: '多據點管理',
      description:
        config.clinicScale === 'chain' ? '跨店資料同步，統一管理' : '單點深度管理',
    },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full py-8"
      >
        {/* 標題區 */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">體驗完成！</h1>
          <p className="text-xl text-muted-foreground mb-2">這就是您的診所未來的樣子</p>
          <p className="text-muted-foreground">
            為 {clinicTypeLabels[config.clinicType as keyof typeof clinicTypeLabels] || '您的診所'}{' '}
            量身打造的智慧管理系統
          </p>
        </div>

        {/* 效能數據儀表板 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showStats ? 1 : 0, y: showStats ? 0 : 20 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">預估效能分析</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="text-center"
                    >
                      <div
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${stat.bgColor} mb-3`}
                      >
                        <Icon className={`w-8 h-8 ${stat.color}`} />
                      </div>
                      <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                        <CountUpAnimation value={stat.value} />%
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 已體驗功能 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">您已體驗的功能</h2>
              <div className="space-y-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                  >
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA 按鈕 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center space-y-4"
        >
          <Button
            size="lg"
            className="text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl transition-all"
            onClick={() => {
              alert(
                '感謝您的體驗！\n\n請聯繫我們了解更多：\n📞 電話：02-1234-5678\n📧 Email: contact@clinic-crm.com'
              );
              exitDemo();
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            免費啟用您的診所系統
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-sm text-muted-foreground">
            14 天免費試用 • 不需信用卡 • 隨時可取消
          </p>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> 自動資料遷移
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> 專人教學訓練
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> 24/7 技術支援
            </span>
          </div>

          <div className="mt-6">
            <Button variant="ghost" onClick={exitDemo}>
              結束體驗
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// 數字動畫組件
const CountUpAnimation = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
};

export default DemoConversionPage;

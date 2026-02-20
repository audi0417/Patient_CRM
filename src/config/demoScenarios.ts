/**
 * Demo 場景腳本配置
 *
 * 這個檔案定義了所有 Demo 體驗的場景、步驟、引導文字和完成條件
 * 使用真實的 CRM 頁面，透過引導覆蓋層進行互動式教學
 */

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;  // CSS 選擇器，用於高亮目標元素
  targetPosition?: 'top' | 'bottom' | 'left' | 'right';  // 引導氣泡位置
  action?: 'click' | 'navigate' | 'wait' | 'observe';  // 需要的用戶操作
  waitFor?: string;  // 等待的事件或條件
  highlightStyle?: 'spotlight' | 'outline' | 'glow';  // 高亮樣式
  autoNext?: boolean;  // 是否自動進入下一步
  duration?: number;  // 自動進入下一步的延遲時間（毫秒）
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  route: string;  // 需要導航到的路由
  steps: DemoStep[];
  completionMessage: string;
  celebrationIntensity: 'low' | 'medium' | 'high';  // 完成時的慶祝程度
  previewTitle?: string;  // 過渡動畫中顯示的標題
  previewDescription?: string;  // 過渡動畫中顯示的說明
}

/**
 * 所有 Demo 場景配置
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  // ============================================================
  // 場景 1: 病患列表瀏覽
  // ============================================================
  {
    id: 'patient-list',
    title: '病患管理體驗',
    description: '了解如何查看和管理病患資料',
    route: '/patients',
    completionMessage: '太棒了！您已經掌握病患列表的基本功能',
    celebrationIntensity: 'medium',
    previewTitle: '病患管理',
    previewDescription: '了解如何查看和管理病患資料',
    steps: [
      {
        id: 'welcome-patients',
        title: '歡迎來到病患管理',
        description: '這裡是您的病患資料庫。目前系統中有 5 位模擬病患資料，讓我們一起探索功能吧！',
        action: 'wait',
        autoNext: true,
        duration: 3000,
      },
      {
        id: 'view-patient-card',
        title: '病患卡片資訊',
        description: '每張卡片都顯示病患的基本資訊：姓名、電話、標籤等。讓我們點擊『陳小姐』查看詳細資料。',
        targetSelector: '[data-patient-id="demo-patient-1"]',
        targetPosition: 'left',
        action: 'click',
        highlightStyle: 'spotlight',
      },
    ],
  },

  // ============================================================
  // 場景 2: 病患詳情查看
  // ============================================================
  {
    id: 'patient-detail',
    title: '病患詳細資料',
    description: '深入了解病患的完整資訊',
    route: '/patient/demo-patient-1',
    completionMessage: '完美！您已經學會如何查看病患的完整資料',
    celebrationIntensity: 'medium',
    previewTitle: '查看病患詳細資料',
    previewDescription: '了解病患的完整資訊、聯絡方式、就診記錄',
    steps: [
      {
        id: 'view-basic-info',
        title: '病患完整資料',
        description: '這裡可以看到陳小姐的完整資料，包括：\n• 基本資訊（姓名、性別、年齡）\n• 聯絡方式（電話、Email、地址）\n• 緊急聯絡人\n\n系統會自動整理所有資訊，讓您一目了然！',
        action: 'observe',
        autoNext: true,
        duration: 5000,
      },
    ],
  },

  // ============================================================
  // 場景 3: 預約管理體驗
  // ============================================================
  {
    id: 'appointment-management',
    title: '預約管理',
    description: '學習如何管理預約',
    route: '/appointments',
    completionMessage: '太棒了！您已經掌握預約管理的核心功能',
    celebrationIntensity: 'high',
    previewTitle: '預約管理體驗',
    previewDescription: '學習拖曳調整預約時間、快速新增預約',
    steps: [
      {
        id: 'welcome-calendar',
        title: '歡迎來到預約管理',
        description: '這是您的預約管理中心。\n\n✅ 可以看到所有病患的預約\n✅ 今天、明天和未來的行程一目了然\n✅ 可以快速新增、修改預約\n\n讓我們開始體驗！',
        action: 'observe',
      },
      {
        id: 'drag-appointment',
        title: '拖曳預約改期',
        description: '陳小姐來電希望將預約改到今天！\n\n請用滑鼠按住「陳小姐」的預約卡片（明天 14:00），然後拖曳到今天的日期格子中。\n\n這樣就能輕鬆完成改期！',
        targetSelector: '[data-appointment-id="demo-apt-1"]',
        targetPosition: 'bottom',
        action: 'wait',
        waitFor: 'appointment-dragged',
        highlightStyle: 'glow',
      },
      {
        id: 'add-new-appointment',
        title: '新增預約功能',
        description: '完成！您已經學會調整預約時間。\n\n接下來，您可以嘗試新增預約：\n\n1️⃣ 點擊任意日期格子\n2️⃣ 在彈出的側邊欄點擊「新增預約」按鈕\n3️⃣ 填寫病患資訊並儲存\n\n這樣就能快速建立新預約！',
        action: 'observe',
      },
    ],
  },

];

/**
 * 根據診所類型自訂場景內容
 */
export const getCustomizedScenarios = (
  clinicType: 'aesthetic' | 'tcm' | 'weight-loss'
): DemoScenario[] => {
  const scenarios = [...DEMO_SCENARIOS];

  // 根據診所類型調整療程名稱和說明
  const treatmentMap: Record<string, { name: string; description: string }> = {
    aesthetic: {
      name: '皮秒雷射',
      description: '醫美療程如皮秒雷射、音波拉提等',
    },
    tcm: {
      name: '針灸調理',
      description: '中醫療程如針灸、推拿、中藥調理等',
    },
    'weight-loss': {
      name: '體重管理',
      description: '減重療程如飲食規劃、運動指導等',
    },
  };

  const treatment = treatmentMap[clinicType];

  // 可以在這裡根據診所類型進一步客製化場景
  // 例如：調整標籤選項、推薦療程等

  return scenarios;
};

/**
 * 獲取場景的總步驟數
 */
export const getTotalSteps = (scenarios: DemoScenario[]): number => {
  return scenarios.reduce((total, scenario) => total + scenario.steps.length, 0);
};

/**
 * 獲取當前進度百分比
 */
export const getProgressPercentage = (
  scenarios: DemoScenario[],
  currentScenarioIndex: number,
  currentStepIndex: number
): number => {
  let completedSteps = 0;

  // 計算已完成場景的步驟數
  for (let i = 0; i < currentScenarioIndex; i++) {
    completedSteps += scenarios[i].steps.length;
  }

  // 加上當前場景已完成的步驟
  completedSteps += currentStepIndex;

  const totalSteps = getTotalSteps(scenarios);
  return Math.round((completedSteps / totalSteps) * 100);
};

export default DEMO_SCENARIOS;

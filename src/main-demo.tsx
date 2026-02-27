import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import "./index.css";
import "./styles/demo-guide.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DemoProvider } from "@/contexts/DemoContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import DemoScenarioManager from "@/components/demo/DemoScenarioManager";
import DemoExperience from "@/pages/DemoExperience";
import DemoTest from "@/pages/DemoTest";
import SimpleTest from "@/pages/SimpleTest";
import PatientList from "@/pages/PatientList";
import PatientDetail from "@/pages/PatientDetail";
import Appointments from "@/pages/Appointments";
import Header from "@/components/Header";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Polyfills for browser compatibility (required by some libs)
window.Buffer = Buffer;
window.process = process;
globalThis.Buffer = Buffer;
globalThis.process = process;

if (!window.process.browser) {
  window.process.browser = true;
}
if (!globalThis.process.browser) {
  globalThis.process.browser = true;
}

// 設置 Demo 模式標記，確保在組件掛載前就生效
window.__isDemoMode = true;

// Demo 專用佈局（不需要認證）
const DemoLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    {children}
  </>
);

const DemoApp = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <NotificationProvider>
          <DemoProvider>
            {/* Demo 場景管理器 - 監控並引導 Demo 流程 */}
            <DemoScenarioManager />

        <Routes>
          {/* 簡易測試頁面 - 最小依賴 */}
          <Route path="/simple" element={<SimpleTest />} />

          {/* Demo 測試頁面 - 用於驗證系統狀態 */}
          <Route path="/test" element={<DemoTest />} />

          {/* Demo 入口和問卷 */}
          <Route path="/" element={<DemoExperience />} />
          <Route path="/demo" element={<DemoExperience />} />

          {/* Demo 模式下可訪問的真實 CRM 頁面 */}
          <Route
            path="/patients"
            element={
              <DemoLayout>
                <PatientList />
              </DemoLayout>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <DemoLayout>
                <PatientDetail />
              </DemoLayout>
            }
          />
          <Route
            path="/appointments"
            element={
              <DemoLayout>
                <Appointments />
              </DemoLayout>
            }
          />

          {/* 其他路由重定向到 Demo 首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </DemoProvider>
        </NotificationProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
);

createRoot(document.getElementById("root")!).render(<DemoApp />);

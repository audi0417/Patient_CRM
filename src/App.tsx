import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { DataModeProvider } from "@/contexts/DataModeContext";
import DemoScenarioManager from "@/components/demo/DemoScenarioManager";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Header from "./components/Header";
import NotificationToasts from "./components/NotificationToasts";
import PatientList from "./pages/PatientList";
import PatientForm from "./pages/PatientForm";
import PatientDetail from "./pages/PatientDetail";
import HealthAnalytics from "./pages/HealthAnalytics";
import Appointments from "./pages/Appointments";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OrganizationManagement from "./pages/OrganizationManagement";
import OrganizationSettings from "./pages/OrganizationSettings";
import Analytics from "./pages/Analytics";
import LineSettings from "./pages/LineSettings";
import LineMessages from "./pages/LineMessages";
import ServiceItems from "./pages/ServiceItems";
import TreatmentPackages from "./pages/TreatmentPackages";
import TreatmentPackageDetail from "./pages/TreatmentPackageDetail";
import DemoExperience from "./pages/DemoExperience";
import NotFound from "./pages/NotFound";
import ClinicDashboard from "./pages/ClinicDashboard";

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    {children}
    <NotificationToasts />
  </>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/demo" element={<DemoExperience />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <PatientList />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/new"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <PatientForm />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/:id/edit"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <PatientForm />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/:id"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <PatientDetail />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-analytics"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <HealthAnalytics />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <Appointments />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRoles={["super_admin", "admin"]}>
            <ProtectedLayout>
              <UserManagement />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute requiredRoles={["super_admin"]}>
            <ProtectedLayout>
              <SuperAdminDashboard />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/organizations"
        element={
          <ProtectedRoute requiredRoles={["super_admin"]}>
            <ProtectedLayout>
              <OrganizationManagement />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRoles={["super_admin"]}>
            <ProtectedLayout>
              <Analytics />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <ErrorBoundary>
                <ClinicDashboard />
              </ErrorBoundary>
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/line/settings"
        element={
          <ProtectedRoute requiredRoles={["super_admin", "admin"]}>
            <ProtectedLayout>
              <LineSettings />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/settings"
        element={
          <ProtectedRoute requiredRoles={["super_admin", "admin"]}>
            <ProtectedLayout>
              <OrganizationSettings />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/line/messages"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <LineMessages />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-items"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <ServiceItems />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/treatment-packages"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <TreatmentPackages />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/treatment-packages/:id"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <TreatmentPackageDetail />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Demo 模式下的路由 - 使用原版介面但跳過部分權限檢查
const DemoRoutes = () => {
  return (
    <Routes>
      {/* Demo 入口和問卷 */}
      <Route path="/demo" element={<DemoExperience />} />

      {/* Demo 模式下可訪問的頁面 - 使用真實介面 */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <PatientList />
          </ProtectedLayout>
        }
      />
      <Route
        path="/patient/:id"
        element={
          <ProtectedLayout>
            <PatientDetail />
          </ProtectedLayout>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedLayout>
            <Appointments />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        }
      />
      <Route
        path="/service-items"
        element={
          <ProtectedLayout>
            <ServiceItems />
          </ProtectedLayout>
        }
      />
      <Route
        path="/treatment-packages"
        element={
          <ProtectedLayout>
            <TreatmentPackages />
          </ProtectedLayout>
        }
      />

      {/* Demo 模式下限制訪問的頁面 - 重定向到首頁 */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/users" element={<Navigate to="/" replace />} />
      <Route path="/superadmin/*" element={<Navigate to="/" replace />} />
      <Route path="/analytics" element={<Navigate to="/" replace />} />
      <Route path="/line/*" element={<Navigate to="/" replace />} />

      {/* 其他路由 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DemoProvider>
          <AuthProvider>
            <DataModeProvider>
              <NotificationProvider>
                {/* Demo 場景管理器 - 監控並引導 Demo 流程 */}
                <DemoScenarioManager />
                {/* 根據 Demo 模式選擇路由 */}
                {window.__isDemoMode ? <DemoRoutes /> : <AppRoutes />}
              </NotificationProvider>
            </DataModeProvider>
          </AuthProvider>
        </DemoProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;

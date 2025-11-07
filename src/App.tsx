import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

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
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

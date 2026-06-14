import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, routePermissions } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "./pages/Login";
import AccountRecovery from "./pages/AccountRecovery";
import AccessRequest from "./pages/AccessRequest";
import AccessDenied from "./pages/AccessDenied";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Predictions from "./pages/Predictions";
import RiskAnalysis from "./pages/RiskAnalysis";
import Audit from "./pages/Audit";
import DataProcessing from "./pages/DataProcessing";
import Decisions from "./pages/Decisions";
import Reports from "./pages/Reports";
import Engagement from "./pages/Engagement";
import Alerts from "./pages/Alerts";
import Benchmarks from "./pages/Benchmarks";
import ModelPerformance from "./pages/ModelPerformance";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RBACRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { hasPermission } = useAuth();
  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/account-recovery" element={<AccountRecovery />} />
      <Route path="/access-request" element={<AccessRequest />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RBACRoute permission="dashboard.view"><Dashboard /></RBACRoute>} />
        <Route path="/employees" element={<RBACRoute permission="employees.view"><Employees /></RBACRoute>} />
        <Route path="/predictions" element={<RBACRoute permission="predictions.view"><Predictions /></RBACRoute>} />
        <Route path="/risk-analysis" element={<RBACRoute permission="risk.view"><RiskAnalysis /></RBACRoute>} />
        <Route path="/audit" element={<RBACRoute permission="audit.view"><Audit /></RBACRoute>} />
        <Route path="/data-processing" element={<RBACRoute permission="data.preprocess"><DataProcessing /></RBACRoute>} />
        <Route path="/decisions" element={<RBACRoute permission="decisions.view"><Decisions /></RBACRoute>} />
        <Route path="/reports" element={<RBACRoute permission="reports.view"><Reports /></RBACRoute>} />
        <Route path="/engagement" element={<RBACRoute permission="engagement.view"><Engagement /></RBACRoute>} />
        <Route path="/alerts" element={<RBACRoute permission="alerts.view"><Alerts /></RBACRoute>} />
        <Route path="/benchmarks" element={<RBACRoute permission="benchmarks.view"><Benchmarks /></RBACRoute>} />
        <Route path="/model-performance" element={<RBACRoute permission="models.view"><ModelPerformance /></RBACRoute>} />
        <Route path="/user-management" element={<RBACRoute permission="users.manage"><UserManagement /></RBACRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

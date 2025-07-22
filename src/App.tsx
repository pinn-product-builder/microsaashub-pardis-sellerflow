
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CPQDashboard from "./pages/cpq/Dashboard";
import NovaQuotacao from "./pages/cpq/NovaQuotacao";
import VisualizarCotacao from "./pages/cpq/VisualizarCotacao";
import Historico from "./pages/cpq/Historico";
import NotFound from "./pages/NotFound";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/register" 
              element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/forgot-password" 
              element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} 
            />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="cpq" element={<CPQDashboard />} />
              <Route path="cpq/nova-cotacao" element={<NovaQuotacao />} />
              <Route path="cpq/cotacao/:id" element={<VisualizarCotacao />} />
              <Route path="cpq/editar/:id" element={<NovaQuotacao />} />
              <Route path="cpq/historico" element={<Historico />} />
              <Route path="settings" element={<div className="p-8">Configurações - Em desenvolvimento</div>} />
              <Route path="profile" element={<div className="p-8">Perfil - Em desenvolvimento</div>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

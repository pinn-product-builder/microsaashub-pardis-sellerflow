import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';

// CPQ Pages
import CPQDashboard from '@/pages/cpq/Dashboard';
import NovaQuotacao from '@/pages/cpq/NovaQuotacao';
import Historico from '@/pages/cpq/Historico';
import VisualizarCotacao from '@/pages/cpq/VisualizarCotacao';
import Integracoes from '@/pages/cpq/Integracoes';
import Testes from '@/pages/cpq/Testes';

// Pricing Pages
import PricingDashboard from '@/pages/pricing/Dashboard';
import PricingTables from '@/pages/pricing/Tables';
import PricingApprovals from '@/pages/pricing/Approvals';
import PricingRules from '@/pages/pricing/Rules';
import PricingAnalytics from '@/pages/pricing/Analytics';
import MarketResearch from '@/pages/pricing/MarketResearch';
import Taxes from '@/pages/pricing/Taxes';

// Layout and Auth
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function QueryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <QueryWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* CPQ Routes */}
              <Route path="/cpq" element={<CPQDashboard />} />
              <Route path="/cpq/nova-cotacao" element={<NovaQuotacao />} />
              <Route path="/cpq/historico" element={<Historico />} />
              <Route path="/cpq/cotacao/:id" element={<VisualizarCotacao />} />
              <Route path="/cpq/integracoes" element={<Integracoes />} />
              <Route path="/cpq/testes" element={<Testes />} />
              
              {/* Pricing Routes */}
              <Route path="/pricing/dashboard" element={<PricingDashboard />} />
              <Route path="/pricing/tables" element={<PricingTables />} />
              <Route path="/pricing/approvals" element={<PricingApprovals />} />
              <Route path="/pricing/rules" element={<PricingRules />} />
              <Route path="/pricing/analytics" element={<PricingAnalytics />} />
              <Route path="/pricing/market-research" element={<MarketResearch />} />
              <Route path="/pricing/taxes" element={<Taxes />} />
              
              <Route path="/settings" element={<div>Settings</div>} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryWrapper>
  );
}

export default App;

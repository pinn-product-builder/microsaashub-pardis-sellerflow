
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Layout Components
import AppLayout from '@/components/layout/AppLayout';

// Page Components
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
import ConversionDashboardPage from '@/pages/cpq/ConversionDashboard';
import Testes from '@/pages/cpq/Testes';

// Pricing Pages
import PricingDashboard from '@/pages/pricing/Dashboard';
import PricingTables from '@/pages/pricing/Tables';
import PricingRules from '@/pages/pricing/Rules';
import PricingApprovals from '@/pages/pricing/Approvals';
import PricingAnalytics from '@/pages/pricing/Analytics';
import MarketResearch from '@/pages/pricing/MarketResearch';
import Taxes from '@/pages/pricing/Taxes';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Redirect root to CPQ dashboard */}
            <Route path="/" element={<Navigate to="/cpq/dashboard" replace />} />

            {/* Main Dashboard */}
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />

            {/* CPQ Routes - using AppLayout instead of CPQLayout */}
            <Route path="/cpq/dashboard" element={<AppLayout><CPQDashboard /></AppLayout>} />
            <Route path="/cpq/nova" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/nova-cotacao" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/historico" element={<AppLayout><Historico /></AppLayout>} />
            <Route path="/cpq/cotacao/:id" element={<AppLayout><VisualizarCotacao /></AppLayout>} />
            <Route path="/cpq/editar/:id" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/integracoes" element={<AppLayout><Integracoes /></AppLayout>} />
            <Route path="/cpq/integracoes/conversao" element={<AppLayout><ConversionDashboardPage /></AppLayout>} />
            <Route path="/cpq/testes" element={<AppLayout><Testes /></AppLayout>} />

            {/* Pricing Routes */}
            <Route path="/pricing/dashboard" element={<AppLayout><PricingDashboard /></AppLayout>} />
            <Route path="/pricing/tables" element={<AppLayout><PricingTables /></AppLayout>} />
            <Route path="/pricing/rules" element={<AppLayout><PricingRules /></AppLayout>} />
            <Route path="/pricing/approvals" element={<AppLayout><PricingApprovals /></AppLayout>} />
            <Route path="/pricing/analytics" element={<AppLayout><PricingAnalytics /></AppLayout>} />
            <Route path="/pricing/market-research" element={<AppLayout><MarketResearch /></AppLayout>} />
            <Route path="/pricing/taxes" element={<AppLayout><Taxes /></AppLayout>} />

            {/* Legacy redirects */}
            <Route path="/cpq" element={<Navigate to="/cpq/dashboard" replace />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        
        <Toaster />
      </div>
    </Router>
  );
}

export default App;

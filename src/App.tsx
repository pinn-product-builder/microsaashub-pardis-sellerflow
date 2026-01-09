
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Layout Components
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Page Components
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import NotFound from '@/pages/NotFound';

// === DASHBOARD PRINCIPAL (FORA DO ESCOPO ATUAL) ===
// import Dashboard from '@/pages/Dashboard';
// === FIM DASHBOARD PRINCIPAL ===

// CPQ Pages (MÓDULO ATIVO)
import CPQDashboard from '@/pages/cpq/Dashboard';
import NovaQuotacao from '@/pages/cpq/NovaQuotacao';
import Historico from '@/pages/cpq/Historico';
import VisualizarCotacao from '@/pages/cpq/VisualizarCotacao';
import Aprovacoes from '@/pages/cpq/Aprovacoes';
import Configuracoes from '@/pages/cpq/Configuracoes';
import Importacao from '@/pages/cpq/Importacao';

// Cadastros Pages (MÓDULO ATIVO)
import Clientes from '@/pages/cadastros/Clientes';
import Produtos from '@/pages/cadastros/Produtos';

// === CPQ PAGES FORA DO ESCOPO ===
// import Integracoes from '@/pages/cpq/Integracoes';
// import ConversionDashboardPage from '@/pages/cpq/ConversionDashboard';
// import Testes from '@/pages/cpq/Testes';
// === FIM CPQ PAGES FORA DO ESCOPO ===

// === PRICING PAGES (FORA DO ESCOPO ATUAL) ===
// import PricingDashboard from '@/pages/pricing/Dashboard';
// import PricingTables from '@/pages/pricing/Tables';
// import PricingRules from '@/pages/pricing/Rules';
// import PricingApprovals from '@/pages/pricing/Approvals';
// import PricingAnalytics from '@/pages/pricing/Analytics';
// import MarketResearch from '@/pages/pricing/MarketResearch';
// import Taxes from '@/pages/pricing/Taxes';
// === FIM PRICING PAGES ===

// === ESTOQUE PAGES (FORA DO ESCOPO ATUAL) ===
// import EstoqueDashboard from '@/pages/estoque/Dashboard';
// import EstoqueProdutos from '@/pages/estoque/Produtos';
// import EstoqueMovimentacoes from '@/pages/estoque/Movimentacoes';
// import EstoqueEntrada from '@/pages/estoque/Entrada';
// import EstoqueSaida from '@/pages/estoque/Saida';
// === FIM ESTOQUE PAGES ===

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

            {/* === DASHBOARD PRINCIPAL (FORA DO ESCOPO ATUAL) ===
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            === FIM DASHBOARD PRINCIPAL === */}

            {/* CPQ Routes - Módulo de Cotações (ATIVO) */}
            <Route path="/cpq/dashboard" element={<AppLayout><CPQDashboard /></AppLayout>} />
            <Route path="/cpq/nova" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/nova-cotacao" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/historico" element={<AppLayout><Historico /></AppLayout>} />
            <Route path="/cpq/cotacao/:id" element={<AppLayout><VisualizarCotacao /></AppLayout>} />
            <Route path="/cpq/editar/:id" element={<AppLayout><NovaQuotacao /></AppLayout>} />
            <Route path="/cpq/aprovacoes" element={<AppLayout><Aprovacoes /></AppLayout>} />
            <Route path="/cpq/configuracoes" element={<AppLayout><ProtectedRoute><Configuracoes /></ProtectedRoute></AppLayout>} />
            <Route path="/cpq/importacao" element={<AppLayout><ProtectedRoute><Importacao /></ProtectedRoute></AppLayout>} />

            {/* Cadastros Routes - Módulo de Cadastros (ATIVO) */}
            <Route path="/cadastros/clientes" element={<AppLayout><Clientes /></AppLayout>} />
            <Route path="/cadastros/produtos" element={<AppLayout><Produtos /></AppLayout>} />

            {/* === CPQ ROUTES FORA DO ESCOPO ===
            <Route path="/cpq/integracoes" element={<AppLayout><Integracoes /></AppLayout>} />
            <Route path="/cpq/integracoes/conversao" element={<AppLayout><ConversionDashboardPage /></AppLayout>} />
            <Route path="/cpq/testes" element={<AppLayout><Testes /></AppLayout>} />
            === FIM CPQ ROUTES FORA DO ESCOPO === */}

            {/* === PRICING ROUTES (FORA DO ESCOPO ATUAL) ===
            <Route path="/pricing/dashboard" element={<AppLayout><PricingDashboard /></AppLayout>} />
            <Route path="/pricing/tables" element={<AppLayout><PricingTables /></AppLayout>} />
            <Route path="/pricing/rules" element={<AppLayout><PricingRules /></AppLayout>} />
            <Route path="/pricing/approvals" element={<AppLayout><PricingApprovals /></AppLayout>} />
            <Route path="/pricing/analytics" element={<AppLayout><PricingAnalytics /></AppLayout>} />
            <Route path="/pricing/market-research" element={<AppLayout><MarketResearch /></AppLayout>} />
            <Route path="/pricing/taxes" element={<AppLayout><Taxes /></AppLayout>} />
            === FIM PRICING ROUTES === */}

            {/* === ESTOQUE ROUTES (FORA DO ESCOPO ATUAL) ===
            <Route path="/estoque" element={<Navigate to="/estoque/dashboard" replace />} />
            <Route path="/estoque/dashboard" element={<AppLayout><EstoqueDashboard /></AppLayout>} />
            <Route path="/estoque/produtos" element={<AppLayout><EstoqueProdutos /></AppLayout>} />
            <Route path="/estoque/movimentacoes" element={<AppLayout><EstoqueMovimentacoes /></AppLayout>} />
            <Route path="/estoque/entrada" element={<AppLayout><EstoqueEntrada /></AppLayout>} />
            <Route path="/estoque/saida" element={<AppLayout><EstoqueSaida /></AppLayout>} />
            === FIM ESTOQUE ROUTES === */}

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

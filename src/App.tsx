
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';

// Layout Components
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Page Components
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';

// === DASHBOARD PRINCIPAL (FORA DO ESCOPO ATUAL) ===
// import Dashboard from '@/pages/Dashboard';
// === FIM DASHBOARD PRINCIPAL ===

// Seller Flow Pages (MÓDULO ATIVO)
import SellerFlowDashboard from '@/pages/seller-flow/Dashboard';
import NovaQuotacao from '@/pages/seller-flow/NovaQuotacao';
import Historico from '@/pages/seller-flow/Historico';
import VisualizarCotacao from '@/pages/seller-flow/VisualizarCotacao';
import Aprovacoes from '@/pages/seller-flow/Aprovacoes';
import Configuracoes from '@/pages/seller-flow/Configuracoes';
import Importacao from '@/pages/seller-flow/Importacao';
import Documentacao from '@/pages/seller-flow/Documentacao';

// Cadastros Pages (MÓDULO ATIVO)
import Clientes from '@/pages/cadastros/Clientes';
import Produtos from '@/pages/cadastros/Produtos';

// Admin Pages (MÓDULO ATIVO)
import Usuarios from '@/pages/admin/Usuarios';
import Grupos from '@/pages/admin/Grupos';
import RegrasFiscais from '@/pages/admin/RegrasFiscais';

// === SELLER FLOW PAGES FORA DO ESCOPO ===
// import Integracoes from '@/pages/seller-flow/Integracoes';
// import ConversionDashboardPage from '@/pages/seller-flow/ConversionDashboard';
// import Testes from '@/pages/seller-flow/Testes';
// === FIM SELLER FLOW PAGES FORA DO ESCOPO ===

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
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Redirect root to Seller Flow dashboard */}
            <Route path="/" element={<Navigate to="/seller-flow/dashboard" replace />} />

            {/* === DASHBOARD PRINCIPAL (FORA DO ESCOPO ATUAL) ===
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            === FIM DASHBOARD PRINCIPAL === */}

            {/* Seller Flow Routes - Módulo de Cotações (ATIVO) */}
            <Route path="/seller-flow/dashboard" element={<ProtectedRoute><AppLayout><SellerFlowDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/nova" element={<ProtectedRoute><AppLayout><NovaQuotacao /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/nova-cotacao" element={<ProtectedRoute><AppLayout><NovaQuotacao /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/historico" element={<ProtectedRoute><AppLayout><Historico /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/cotacao/:id" element={<ProtectedRoute><AppLayout><VisualizarCotacao /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/editar/:id" element={<ProtectedRoute><AppLayout><NovaQuotacao /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/aprovacoes" element={<ProtectedRoute><AppLayout><Aprovacoes /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/importacao" element={<ProtectedRoute><AppLayout><Importacao /></AppLayout></ProtectedRoute>} />
            <Route path="/seller-flow/documentacao" element={<ProtectedRoute><AppLayout><Documentacao /></AppLayout></ProtectedRoute>} />

            {/* Cadastros Routes - Módulo de Cadastros (ATIVO) */}
            <Route path="/cadastros/clientes" element={<ProtectedRoute><AppLayout><Clientes /></AppLayout></ProtectedRoute>} />
            <Route path="/cadastros/produtos" element={<ProtectedRoute><AppLayout><Produtos /></AppLayout></ProtectedRoute>} />

            {/* Admin Routes - Módulo de Administração (ATIVO) */}
            <Route path="/admin/usuarios" element={<ProtectedRoute><AppLayout><Usuarios /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grupos" element={<ProtectedRoute><AppLayout><Grupos /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/regras-fiscais" element={<ProtectedRoute><AppLayout><RegrasFiscais /></AppLayout></ProtectedRoute>} />

            {/* === SELLER FLOW ROUTES FORA DO ESCOPO ===
            <Route path="/seller-flow/integracoes" element={<AppLayout><Integracoes /></AppLayout>} />
            <Route path="/seller-flow/integracoes/conversao" element={<AppLayout><ConversionDashboardPage /></AppLayout>} />
            <Route path="/seller-flow/testes" element={<AppLayout><Testes /></AppLayout>} />
            === FIM SELLER FLOW ROUTES FORA DO ESCOPO === */}

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
            <Route path="/seller-flow" element={<Navigate to="/seller-flow/dashboard" replace />} />
            <Route path="/cpq" element={<Navigate to="/seller-flow/dashboard" replace />} />
            <Route path="/cpq/*" element={<Navigate to="/seller-flow/dashboard" replace />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

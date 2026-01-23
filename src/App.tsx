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
import NotFound from '@/pages/NotFound';

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
import ProdutosVtex from '@/pages/cadastros/Produtos';
import ClientesVtex from '@/pages/cadastros/Clientes';

// Admin Pages (MÓDULO ATIVO)
import Usuarios from '@/pages/admin/Usuarios';
import Grupos from '@/pages/admin/Grupos';

function App() {
  // Loga ENV apenas em dev, e apenas no browser
  if (import.meta.env.DEV) {
    console.log('SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
    console.log(
      'SUPABASE_KEY',
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 25)
    );
  }

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Redirect root to Seller Flow dashboard */}
              <Route path="/" element={<Navigate to="/seller-flow/dashboard" replace />} />

              {/* Seller Flow Routes - Módulo de Cotações (ATIVO) */}
              <Route
                path="/seller-flow/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SellerFlowDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/nova"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NovaQuotacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/nova-cotacao"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NovaQuotacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/historico"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Historico />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/cotacao/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <VisualizarCotacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/editar/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NovaQuotacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/aprovacoes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Aprovacoes />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/configuracoes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Configuracoes />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/importacao"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Importacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller-flow/documentacao"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Documentacao />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Cadastros Routes - Módulo de Cadastros (ATIVO) */}
              <Route
                path="/cadastros/clientes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Clientes />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cadastros/clientes-vtex"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ClientesVtex />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cadastros/produtos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Produtos />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cadastros/produtos-vtex"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProdutosVtex />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes - Módulo de Administração (ATIVO) */}
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Usuarios />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/grupos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Grupos />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

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

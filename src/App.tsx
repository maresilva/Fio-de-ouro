import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { RefreshCw } from 'lucide-react';

// Public & Main Pages
import { Login } from './pages/Login';
import { FootballOverview } from './pages/FootballOverview';
import { FootballBets } from './pages/FootballBets';
import { FootballClosings } from './pages/FootballClosings';
import { UserManagement } from './pages/UserManagement';
import { LegacyLottery } from './pages/LegacyLottery';

// Legacy Lottery Pages (Preserved for Consultation and Audit)
import { Dashboard } from './pages/Dashboard';
import { CashList } from './pages/CashList';
import { CashOpen } from './pages/CashOpen';
import { CashOperation } from './pages/CashOperation';
import { CashClose } from './pages/CashClose';
import { CashReview } from './pages/CashReview';
import { Treasury } from './pages/Treasury';
import { Prizes } from './pages/Prizes';
import { Finance } from './pages/Finance';
import { Payroll } from './pages/Payroll';
import { Reports } from './pages/Reports';
import { Audit } from './pages/Audit';

// Protected Route Guard with Session Validation Loading State
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoadingSession } = useAuth();

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3 text-slate-300">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Validando sessão de segurança...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Gestor-Only Guard (Proteção no Navegador + Backend RLS)
const GestorOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGestor, isLoadingSession } = useAuth();

  if (isLoadingSession) {
    return null;
  }

  if (!isGestor) {
    return <Navigate to="/visao-geral" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/" element={<Login />} />

            {/* Protected Routes within Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Painel Principal de Futebol (3 Módulos) */}
              <Route path="/visao-geral" element={<FootballOverview />} />
              <Route path="/dashboard" element={<Navigate to="/visao-geral" replace />} />
              <Route path="/apostas" element={<FootballBets />} />
              <Route path="/fechamentos" element={<FootballClosings />} />

              {/* Gestão de Usuários e Acessos (Exclusivo Gestor) */}
              <Route
                path="/usuarios"
                element={
                  <GestorOnlyRoute>
                    <UserManagement />
                  </GestorOnlyRoute>
                }
              />

              {/* Consulta Histórica da Lotérica (Preservado e Isolado) */}
              <Route path="/legado-loterica" element={<LegacyLottery />} />
              <Route path="/legacy/dashboard" element={<Dashboard />} />
              <Route path="/cash" element={<CashList />} />
              <Route path="/cash/open" element={<CashOpen />} />
              <Route path="/cash/:id" element={<CashOperation />} />
              <Route path="/cash/:id/close" element={<CashClose />} />
              <Route path="/cash/review" element={<CashReview />} />
              <Route path="/treasury" element={<Treasury />} />
              <Route path="/prizes" element={<Prizes />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/team/payroll" element={<Payroll />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit" element={<Audit />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/visao-geral" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;

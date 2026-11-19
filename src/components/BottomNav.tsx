import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Layers,
  CalendarCheck,
  Users,
  Menu,
  X,
  KeyRound,
  Archive,
  RotateCcw,
  LogOut,
  Shield,
  ChevronRight,
} from 'lucide-react';

interface BottomNavProps {
  onOpenPasswordModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenPasswordModal }) => {
  const { currentUser, logout } = useAuth();
  const { footballBets, resetAllData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const pendingBetsCount = footballBets.filter(b => !b.isCancelled && b.status === 'nao_pago').length;

  const isGestor = currentUser?.role === 'gestor';

  const handleLogout = async () => {
    setShowMoreMenu(false);
    await logout();
    navigate('/');
  };

  const handleReset = () => {
    if (window.confirm('Deseja restaurar os dados de demonstração iniciais?')) {
      resetAllData();
      setShowMoreMenu(false);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* Visão Geral */}
          <NavLink
            to="/visao-geral"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-emerald-100/80 text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">Visão geral</span>
              </>
            )}
          </NavLink>

          {/* Apostas */}
          <NavLink
            to="/apostas"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 relative ${
                isActive
                  ? 'text-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-colors relative ${
                    isActive ? 'bg-emerald-100/80 text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  {pendingBetsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                      {pendingBetsCount > 9 ? '9+' : pendingBetsCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">Apostas</span>
              </>
            )}
          </NavLink>

          {/* Fechamentos */}
          <NavLink
            to="/fechamentos"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-emerald-100/80 text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">Fechamentos</span>
              </>
            )}
          </NavLink>

          {/* Usuários (para Gestor) */}
          {isGestor && (
            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'text-purple-700 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-lg transition-colors ${
                      isActive ? 'bg-purple-100/80 text-purple-700' : 'text-slate-500'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">Usuários</span>
                </>
              )}
            </NavLink>
          )}

          {/* Botão Mais / Menu */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            aria-label="Abrir menu de opções rápidas"
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 ${
              showMoreMenu
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                showMoreMenu ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Mais</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer / Bottom Sheet "Mais" */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Grab indicator */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                  {currentUser?.name.substring(0, 2) || 'VI'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{currentUser?.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{currentUser?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1">
                Ações da Conta
              </span>

              {/* Alterar Senha */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onOpenPasswordModal) {
                    onOpenPasswordModal();
                  }
                }}
                className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Alterar Minha Senha</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Histórico Lotérica */}
              <NavLink
                to="/legado-loterica"
                onClick={() => setShowMoreMenu(false)}
                className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <Archive className="w-4 h-4 text-slate-600" />
                  <span>Consultar Histórico Lotérica</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </NavLink>

              {/* Restaurar Banco Demonstrativo */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Restaurar Dados Demonstrativos</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Sair do Sistema */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors mt-2"
              >
                <div className="flex items-center space-x-2.5">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Encerrar Sessão</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>
            </div>

            <div className="pt-2 text-center text-[10px] text-slate-400">
              Painel de Futebol • Sistema Operacional Interno
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { DataMigrationModal } from './DataMigrationModal';
import {
  LogOut,
  Trophy,
  Layers,
  CalendarCheck,
  LayoutDashboard,
  Users,
  KeyRound,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { currentUser, isGestor, logout, changePassword } = useAuth();
  const { addToast } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast('error', 'Senhas Não Conferem', 'A nova senha e a confirmação devem ser idênticas.');
      return;
    }

    if (newPassword.length < 6) {
      addToast('error', 'Senha Curta', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        addToast('success', 'Senha Atualizada', 'Sua senha oficial foi alterada com sucesso.');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        addToast('error', 'Erro ao Alterar Senha', res.error || 'Não foi possível atualizar a senha.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'gestor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'operador':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'financeiro':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'auditor':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center min-w-0">
          <Link to="/visao-geral" className="flex items-center space-x-2 sm:space-x-2.5 group min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 whitespace-nowrap">
                  Painel de Futebol
                </span>
                <span className="hidden sm:inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide flex-shrink-0">
                  OPERACIONAL
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 font-medium truncate">
                Controle de Apostas & Fechamentos
              </p>
            </div>
          </Link>
        </div>

        {/* Central Navigation */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl">
          <Link
            to="/visao-geral"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              location.pathname === '/visao-geral'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </Link>

          <Link
            to="/apostas"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              location.pathname === '/apostas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Apostas</span>
          </Link>

          <Link
            to="/fechamentos"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              location.pathname === '/fechamentos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Fechamentos</span>
          </Link>

          {isGestor && (
            <Link
              to="/usuarios"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                location.pathname === '/usuarios'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuários</span>
            </Link>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Data Backup & Migration Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowMigrationModal(true)}
            title="Backup & Migração de Lançamentos"
            className="flex items-center space-x-1.5 p-2 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Backup / Migração</span>
          </button>

          {/* User profile info & Password / Logout */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0">
              {currentUser?.name ? currentUser.name.substring(0, 2) : 'US'}
            </div>

            <div className="hidden lg:block text-left text-xs">
              <div className="font-bold text-slate-900 truncate max-w-[120px]">
                {currentUser?.name || 'Usuário'}
              </div>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border capitalize ${getRoleBadgeColor(
                  currentUser?.role
                )}`}
              >
                {currentUser?.role || 'operador'}
              </span>
            </div>

            {/* Manage Users Button (Gestor only, visible on tablet/desktop as mobile has it in BottomNav) */}
            {isGestor && (
              <Link
                to="/usuarios"
                title="Gerenciar Usuários e Operadores"
                className={`hidden sm:flex p-2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] items-center justify-center rounded-xl transition-colors ${
                  location.pathname === '/usuarios'
                    ? 'text-purple-700 bg-purple-100'
                    : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                }`}
              >
                <Users className="w-4 h-4" />
              </Link>
            )}

            {/* Change Password Button */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              title="Alterar Minha Senha"
              className="p-2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Encerrar Sessão"
              className="p-2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Alterar Minha Senha */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Alterar Minha Senha"
        subtitle={`Atualização de credencial de acesso para ${currentUser?.name}`}
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div>
              <strong>Usuário:</strong> {currentUser?.name} ({currentUser?.email})
            </div>
            <div className="text-[11px] text-slate-500">
              A nova senha será salva de forma criptografada no banco de dados. Mínimo de 6 caracteres.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nova Senha *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha (mínimo 6 caracteres)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Confirmar Nova Senha *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha exatamente igual"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center space-x-1"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Nova Senha</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Backup & Migração de Dados Operacionais */}
      <DataMigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
      />
    </header>
  );
};

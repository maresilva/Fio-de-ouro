import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import {
  RotateCcw,
  LogOut,
  Trophy,
  Layers,
  CalendarCheck,
  LayoutDashboard,
  User,
  Users,
  Shield,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, users, switchUser, logout, changePassword } = useAuth();
  const { resetAllData, addToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal Alterar Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchUser(e.target.value);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast('error', 'Senhas Não Conferem', 'A nova senha e a confirmação devem ser idênticas.');
      return;
    }

    if (newPassword.length < 4) {
      addToast('error', 'Senha Curta', 'A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    const res = changePassword(currentPassword, newPassword);
    if (res.success) {
      addToast('success', 'Senha Atualizada', 'Sua senha de acesso foi alterada com sucesso.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      addToast('error', 'Erro ao Alterar Senha', res.error || 'Verifique a senha atual informada.');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link to="/visao-geral" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Painel de Futebol
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                  OPERACIONAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Controle de Apostas & Fechamentos</p>
            </div>
          </Link>
        </div>

        {/* Center shortcuts */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <Link
            to="/visao-geral"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              location.pathname === '/visao-geral' || location.pathname === '/dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Visão geral</span>
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

          {(currentUser?.role === 'gestor' ||
            currentUser?.email.toLowerCase() === 'jvitorscr1995@gmail.com') && (
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
        <div className="flex items-center space-x-3">
          {/* Role switcher */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Perfil:</span>
            <select
              value={currentUser?.id}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Demo Data button */}
          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar os dados de demonstração iniciais?')) {
                resetAllData();
              }
            }}
            title="Restaurar Banco Demonstrativo"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User profile info & Password / Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {currentUser?.name.substring(0, 2)}
            </div>

            <div className="hidden lg:block text-left text-xs">
              <div className="font-bold text-slate-900 truncate max-w-[120px]">
                {currentUser?.name}
              </div>
              <span
                className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border capitalize ${getRoleBadgeColor(
                  currentUser?.role
                )}`}
              >
                {currentUser?.role}
              </span>
            </div>

            {/* Manage Users Button (Gestor only) */}
            {(currentUser?.role === 'gestor' ||
              currentUser?.email.toLowerCase() === 'jvitorscr1995@gmail.com') && (
              <Link
                to="/usuarios"
                title="Gerenciar Usuários e Operadores"
                className={`p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors ${
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
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Encerrar Sessão"
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
              Mantenha sua senha segura e confidencial (mínimo de 6 caracteres).
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Senha Atual *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Digite sua senha atual"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Nova Senha</span>
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};

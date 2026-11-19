import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { Modal } from '../components/Modal';
import { DataMigrationModal } from '../components/DataMigrationModal';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Search,
  Check,
  Ban,
  ArrowLeft,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const UserManagement: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    updateUser,
    resetUserPassword,
    toggleUserStatus,
  } = useAuth();
  const { addToast } = useApp();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operador');
  const [newBadge, setNewBadge] = useState('');

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('operador');
  const [editBadge, setEditBadge] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Reset Password Modal
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [userForResetPass, setUserForResetPass] = useState<User | null>(null);

  // Check if current user is Gestor / Administrador
  const isGestor = currentUser?.role === 'gestor';

  if (!isGestor) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-slate-500 mt-2">
          Apenas usuários com perfil de Gestor Geral possuem autorização para gerenciar operadores e acessos do sistema.
        </p>
        <Link
          to="/visao-geral"
          className="mt-6 inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Painel</span>
        </Link>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.badge && u.badge.toLowerCase().includes(q))
    );
  });

  // KPI counts
  const totalUsers = users.length;
  const countGestores = users.filter(u => u.role === 'gestor').length;
  const countOperadores = users.filter(u => u.role === 'operador').length;
  const countAtivos = users.filter(u => u.isActive !== false).length;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await addUser({
      name: newName,
      email: newEmail,
      role: newRole,
      badge: newBadge,
    });

    if (res.success) {
      addToast(
        'success',
        'Convite Registrado',
        `Usuário ${newName} cadastrado. Convite de acesso seguro gerado via provedor de autenticação.`
      );
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewRole('operador');
      setNewBadge('');
    } else {
      addToast('error', 'Erro ao Criar', res.error || 'Verifique os dados informados.');
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditBadge(user.badge || '');
    setEditIsActive(user.isActive !== false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const res = await updateUser(editingUser.id, {
      name: editName,
      role: editRole,
      badge: editBadge,
      isActive: editIsActive,
    });

    if (res.success) {
      addToast('success', 'Usuário Atualizado', `Dados de ${editName} atualizados no servidor.`);
      setShowEditModal(false);
      setEditingUser(null);
    } else {
      addToast('error', 'Erro na Atualização', res.error || 'Não foi possível salvar.');
    }
  };

  const handleOpenResetPass = (user: User) => {
    setUserForResetPass(user);
    setShowResetPassModal(true);
  };

  const handleSaveResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForResetPass) return;

    const res = await resetUserPassword(userForResetPass.id);
    if (res.success) {
      addToast(
        'success',
        'Link de Redefinição Enviado',
        `Enviamos um link seguro de recuperação para ${userForResetPass.email}.`
      );
      setShowResetPassModal(false);
      setUserForResetPass(null);
    } else {
      addToast('error', 'Erro na Redefinição', res.error || 'Não foi possível enviar o link.');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const actionLabel = user.isActive === false ? 'ativar' : 'desativar';
    if (
      window.confirm(
        `Tem certeza que deseja ${actionLabel} o acesso de ${user.name}?`
      )
    ) {
      const res = await toggleUserStatus(user.id);
      if (res.success) {
        addToast(
          'info',
          'Status Alterado',
          `O acesso de ${user.name} foi ${user.isActive === false ? 'ativado' : 'desativado'}.`
        );
      } else {
        addToast('error', 'Ação Bloqueada', res.error || 'Não foi possível alterar o status.');
      }
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
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

  const getRolePermissionsDescription = (role: UserRole) => {
    switch (role) {
      case 'gestor':
        return 'Acesso total: Apostas, Baixas, Prêmios, Fechamentos, Correções e Gestão de Usuários';
      case 'operador':
        return 'Operação: Registrar apostas, dar baixa (receber), registrar prêmios e criar fechamentos';
      case 'financeiro':
        return 'Controladoria: Registrar apostas, acompanhar prêmios e criar fechamentos';
      case 'auditor':
        return 'Consulta e Auditoria: Visualização de relatórios, conferências e histórico';
      default:
        return 'Acesso padrão';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Controle de Acessos & Permissões</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center space-x-2">
            <Users className="w-6 h-6 text-purple-600" />
            <span>Gestão de Usuários do Sistema</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre quem pode mexer no sistema, defina permissões por perfil e controle senhas de acesso.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMigrationModal(true)}
            className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>Backup / Migração de Lançamentos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-700/20 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Total Cadastrados
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {totalUsers}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Contas no sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-purple-700 block">
            Gestores Gerais
          </span>
          <div className="text-2xl font-black font-mono text-purple-800 mt-1">
            {countGestores}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Acesso total administrativo</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            Operadores
          </span>
          <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
            {countOperadores}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Lançamento de apostas e caixa</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">
            Usuários Ativos
          </span>
          <div className="text-2xl font-black font-mono text-blue-800 mt-1">
            {countAtivos}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Com login liberado</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-500">
          Mostrando <strong>{filteredUsers.length}</strong> de {users.length} usuários
        </div>
      </div>

      {/* Users Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Perfil de Acesso</th>
                <th className="px-5 py-3">Permissões</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isActive = u.isActive !== false;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                          {u.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          {u.badge && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {u.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${getRoleBadgeClass(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 max-w-xs text-[11px]">
                      {getRolePermissionsDescription(u.role)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center space-x-1 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800 font-extrabold'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3" />
                            <span>Inativo</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenResetPass(u)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                          title="Redefinir Senha do Usuário"
                        >
                          <KeyRound className="w-3 h-3 text-amber-700" />
                          <span>Senha</span>
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                              isActive
                                ? 'text-red-700 hover:bg-red-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Desativar acesso' : 'Reativar acesso'}
                          >
                            {isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden p-3 space-y-3">
          {filteredUsers.map(u => {
            const isSelf = u.id === currentUser?.id;
            const isActive = u.isActive !== false;

            return (
              <div
                key={u.id}
                className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 shadow-sm">
                      {u.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      {u.badge && (
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                          {u.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase inline-flex items-center space-x-1 ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3 h-3" />
                        <span>Inativo</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Perfil:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${getRoleBadgeClass(
                      u.role
                    )}`}
                  >
                    {u.role}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  {getRolePermissionsDescription(u.role)}
                </p>

                {/* Mobile Touch Action Buttons (min 44px touch targets) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(u)}
                    className="min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenResetPass(u)}
                    className="min-h-[44px] px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 shadow-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Senha</span>
                  </button>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`col-span-2 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 border ${
                        isActive
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Desativar Acesso deste Operador</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reativar Acesso deste Operador</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Cadastrar Novo Usuário */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Cadastrar Novo Usuário / Operador"
        subtitle="Defina o nome, e-mail de acesso, nível de permissão e senha inicial"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Operador"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              E-mail de Acesso (Login) *
            </label>
            <input
              type="email"
              required
              placeholder="operador@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Perfil de Acesso / Nível de Permissão *
            </label>
            <select
              required
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value="operador">Operador (Lança apostas, baixas, prêmios e fechamentos)</option>
              <option value="gestor">Gestor Geral (Acesso total, correções de fechamento e usuários)</option>
              <option value="financeiro">Financeiro (Operações e relatórios financeiros)</option>
              <option value="auditor">Auditor (Somente visualização e conferências)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cargo / Descrição (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Operador Balcão Manhã"
              value={newBadge}
              onChange={e => setNewBadge(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950">
            <strong className="block text-purple-900 font-semibold mb-0.5">Convite Oficial Seguro</strong>
            O usuário receberá um convite oficial por e-mail pelo provedor seguro para ativar seu acesso e registrar sua senha de forma criptografada.
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-sm"
            >
              Enviar Convite de Acesso
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Usuário */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        title="Editar Dados do Usuário"
        subtitle={editingUser ? `Atualizando ${editingUser.name} (${editingUser.email})` : ''}
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Perfil de Acesso *
              </label>
              <select
                required
                value={editRole}
                onChange={e => setEditRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="operador">Operador (Apostas, baixas, prêmios e fechamentos)</option>
                <option value="gestor">Gestor Geral (Acesso total)</option>
                <option value="financeiro">Financeiro</option>
                <option value="auditor">Auditor (Somente visualização)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cargo / Descrição
              </label>
              <input
                type="text"
                value={editBadge}
                onChange={e => setEditBadge(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {editingUser.id !== currentUser?.id && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Status de Acesso
                </label>
                <select
                  value={editIsActive ? 'ativo' : 'inativo'}
                  onChange={e => setEditIsActive(e.target.value === 'ativo')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="ativo">Ativo (Login permitido)</option>
                  <option value="inativo">Inativo (Acesso bloqueado)</option>
                </select>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Redefinir Senha do Usuário */}
      <Modal
        isOpen={showResetPassModal}
        onClose={() => {
          setShowResetPassModal(false);
          setUserForResetPass(null);
        }}
        title="Redefinir Senha do Usuário"
        subtitle={userForResetPass ? `Disparar redefinição para ${userForResetPass.name}` : ''}
      >
        {userForResetPass && (
          <form onSubmit={handleSaveResetPass} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
              <strong className="block text-amber-900 font-semibold mb-0.5">
                Redefinição Segura por Provedor de Autenticação
              </strong>
              <p>
                Para garantir conformidade de segurança e evitar senhas em texto puro, um link seguro de recuperação
                será enviado para o e-mail: <strong>{userForResetPass.email}</strong>.
              </p>
              <p className="text-[11px] text-amber-800 pt-1">
                O colaborador poderá clicar no link oficial e cadastrar sua nova senha com criptografia em repouso.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassModal(false);
                  setUserForResetPass(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center space-x-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>Enviar Link de Redefinição</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Backup / Migração de Lançamentos */}
      <DataMigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
      />
    </div>
  );
};

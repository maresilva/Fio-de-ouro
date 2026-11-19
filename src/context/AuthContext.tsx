import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../mock/initialData';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, role?: UserRole) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canReviewShifts: boolean;
  canAccessPayroll: boolean;
  canAccessFinance: boolean;
  canAccessAudit: boolean;
  canOperateCash: boolean;
  // Painel de Futebol
  canCreateBet: boolean;
  canReceiveBet: boolean;
  canRegisterPrize: boolean;
  canCreateClosing: boolean;
  canCorrectClosing: boolean;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; error?: string };
  // Gestão de Usuários e Acessos
  addUser: (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
    initialPassword?: string;
  }) => { success: boolean; user?: User; error?: string };
  updateUser: (
    userId: string,
    params: {
      name: string;
      role: UserRole;
      badge?: string;
      isActive?: boolean;
    }
  ) => { success: boolean; error?: string };
  resetUserPassword: (userId: string, newPass: string) => { success: boolean; error?: string };
  toggleUserStatus: (userId: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'erp_loterica_current_user';
const USERS_STORAGE_KEY = 'erp_app_users';
const PASSWORDS_STORAGE_KEY = 'erp_user_passwords';

function getRoleBadgeDefault(role: UserRole): string {
  switch (role) {
    case 'gestor':
      return 'Gestor / Administrador';
    case 'operador':
      return 'Operador de Apostas';
    case 'financeiro':
      return 'Analista Financeiro';
    case 'auditor':
      return 'Auditor de Conformidade';
    default:
      return 'Usuário do Sistema';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        // Remove contas legadas de demonstração e preserva somente Vitor (ou novos cadastrados por ele)
        const vitor = parsed.find(u => u.email.toLowerCase() === 'jvitorscr1995@gmail.com');
        if (vitor) {
          return [
            {
              ...vitor,
              name: 'Vitor',
              email: 'jvitorscr1995@gmail.com',
              role: 'gestor',
              badge: 'Operação',
              isActive: true,
            },
          ];
        }
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [passwords, setPasswords] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(PASSWORDS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      if (!parsed['user-vitor']) {
        parsed['user-vitor'] = '123456';
      }
      return parsed;
    } catch {
      return { 'user-vitor': '123456' };
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email?.toLowerCase() === 'jvitorscr1995@gmail.com') {
          return {
            ...parsed,
            name: 'Vitor',
            email: 'jvitorscr1995@gmail.com',
            role: 'gestor',
            badge: 'Operação',
            isActive: true,
          };
        }
      } catch {
        // ignora erro de parse
      }
    }
    return INITIAL_USERS[0];
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
  }, [passwords]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const changePassword = (oldPassword: string, newPassword: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado.' };

    const currentPass = passwords[currentUser.id] || '123456';
    if (oldPassword !== currentPass) {
      return { success: false, error: 'A senha atual informada está incorreta.' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 4 caracteres.' };
    }

    setPasswords(prev => ({
      ...prev,
      [currentUser.id]: newPassword,
    }));

    return { success: true };
  };

  const isGestorUser = (user: User | null): boolean => {
    if (!user) return false;
    return user.role === 'gestor' || user.email.toLowerCase() === 'jvitorscr1995@gmail.com';
  };

  const addUser = (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
    initialPassword?: string;
  }): { success: boolean; user?: User; error?: string } => {
    if (!currentUser || !isGestorUser(currentUser)) {
      return { success: false, error: 'Apenas gestores podem cadastrar novos operadores e usuários.' };
    }

    const emailClean = params.email.trim().toLowerCase();
    const nameClean = params.name.trim();

    if (!nameClean || !emailClean) {
      return { success: false, error: 'Nome e e-mail são obrigatórios.' };
    }

    if (users.some(u => u.email.toLowerCase() === emailClean)) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail corporativo.' };
    }

    const newUser: User = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: nameClean,
      email: emailClean,
      role: params.role,
      badge: params.badge?.trim() || getRoleBadgeDefault(params.role),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);

    const initialPass = params.initialPassword?.trim() || '123456';
    setPasswords(prev => ({
      ...prev,
      [newUser.id]: initialPass,
    }));

    return { success: true, user: newUser };
  };

  const updateUser = (
    userId: string,
    params: {
      name: string;
      role: UserRole;
      badge?: string;
      isActive?: boolean;
    }
  ): { success: boolean; error?: string } => {
    if (!currentUser || !isGestorUser(currentUser)) {
      return { success: false, error: 'Apenas gestores podem editar dados de usuários.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    if (userId === currentUser.id && params.isActive === false) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso enquanto logado.' };
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
              ...u,
              name: params.name.trim(),
              role: params.role,
              badge: params.badge?.trim() || u.badge,
              isActive: params.isActive !== undefined ? params.isActive : u.isActive,
            }
          : u
      )
    );

    if (userId === currentUser.id) {
      setCurrentUser(prev =>
        prev
          ? {
              ...prev,
              name: params.name.trim(),
              role: params.role,
              badge: params.badge?.trim() || prev.badge,
            }
          : prev
      );
    }

    return { success: true };
  };

  const resetUserPassword = (userId: string, newPass: string): { success: boolean; error?: string } => {
    if (!currentUser || !isGestorUser(currentUser)) {
      return { success: false, error: 'Apenas gestores podem redefinir senhas de operadores.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: 'A nova senha deve possuir pelo menos 4 caracteres.' };
    }

    setPasswords(prev => ({
      ...prev,
      [userId]: newPass.trim(),
    }));

    return { success: true };
  };

  const toggleUserStatus = (userId: string): { success: boolean; error?: string } => {
    if (!currentUser || !isGestorUser(currentUser)) {
      return { success: false, error: 'Apenas gestores podem ativar ou desativar acessos.' };
    }

    if (userId === currentUser.id) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    const newStatus = target.isActive === false ? true : false;
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: newStatus } : u)));

    return { success: true };
  };

  const login = (email: string, role?: UserRole): boolean => {
    let found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found && role) {
      found = users.find(u => u.role === role);
    }
    if (!found) {
      found = users[0];
    }

    if (found.isActive === false) {
      alert('Este usuário está desativado pelo administrador do sistema.');
      return false;
    }

    setCurrentUser(found);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  const isGestor = isGestorUser(currentUser);
  const canReviewShifts = isGestor;
  const canAccessPayroll = isGestor || currentUser?.role === 'financeiro';
  const canAccessFinance = isGestor || currentUser?.role === 'financeiro' || currentUser?.role === 'auditor';
  const canAccessAudit = isGestor || currentUser?.role === 'auditor' || currentUser?.role === 'financeiro';
  const canOperateCash = isGestor || currentUser?.role === 'operador';

  // Permissões do Painel de Futebol
  const canCreateBet = true;
  const canReceiveBet = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canRegisterPrize = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCreateClosing = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCorrectClosing = isGestor; // Exclusivo do gestor

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        switchUser,
        hasRole,
        canReviewShifts,
        canAccessPayroll,
        canAccessFinance,
        canAccessAudit,
        canOperateCash,
        canCreateBet,
        canReceiveBet,
        canRegisterPrize,
        canCreateClosing,
        canCorrectClosing,
        changePassword,
        addUser,
        updateUser,
        resetUserPassword,
        toggleUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

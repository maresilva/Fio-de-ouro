import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoadingSession: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  sendPasswordReset: (email: string) => { success: boolean; error?: string };
  changePassword: (newPassword: string, oldPassword?: string) => { success: boolean; error?: string };
  isGestor: boolean;
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
  // Gestão de Usuários
  addUser: (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
    initialPassword: string;
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

const SESSION_STORAGE_KEY = 'fio_de_ouro_active_session';
const USERS_STORAGE_KEY = 'fio_de_ouro_team_users';
const PASSWORDS_STORAGE_KEY = 'fio_de_ouro_auth_credentials';

const ROOT_GESTOR: User = {
  id: 'gestor-vitor',
  name: 'Vitor',
  email: 'jvitorscr1995@gmail.com',
  role: 'gestor',
  badge: 'Operação',
  isActive: true,
  createdAt: new Date().toISOString(),
};

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
  // Lista de usuários gerenciados
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        if (parsed.length > 0) {
          // Garante que o gestor Vitor esteja sempre presente
          const hasVitor = parsed.some(u => u.email.toLowerCase() === 'jvitorscr1995@gmail.com');
          return hasVitor ? parsed : [ROOT_GESTOR, ...parsed];
        }
      }
      return [ROOT_GESTOR];
    } catch {
      return [ROOT_GESTOR];
    }
  });

  // Credenciais oficiais armazenadas
  const [passwords, setPasswords] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(PASSWORDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sessão atual ativa
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignora erro
    }
    return null;
  });

  const [isLoadingSession, setIsLoadingSession] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
  }, [passwords]);

  // Login Oficial do ERP Fio de Ouro
  const login = (
    emailInput: string,
    passwordInput: string
  ): { success: boolean; error?: string } => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe seu e-mail corporativo.' };
    }

    if (!cleanPassword) {
      return { success: false, error: 'Por favor, digite sua senha de acesso.' };
    }

    const found = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: 'Usuário não encontrado. Verifique o e-mail informado.' };
    }

    if (found.isActive === false) {
      return { success: false, error: 'Este acesso foi desativado pela administração do sistema.' };
    }

    const expectedPassword = passwords[found.id];

    // Se o gestor Vitor estiver acessando e ainda não tiver senha gravada no storage,
    // define a senha informada como a senha oficial dele
    if (!expectedPassword && cleanEmail === 'jvitorscr1995@gmail.com') {
      setPasswords(prev => ({ ...prev, [found.id]: cleanPassword }));
      setCurrentUser(found);
      return { success: true };
    }

    if (expectedPassword && cleanPassword !== expectedPassword) {
      return { success: false, error: 'Senha incorreta. Verifique suas credenciais de acesso.' };
    }

    if (!expectedPassword) {
      return { success: false, error: 'Usuário sem senha oficial cadastrada. Contate o gestor.' };
    }

    setCurrentUser(found);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const sendPasswordReset = (emailInput: string): { success: boolean; error?: string } => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Informe seu e-mail corporativo para recuperação.' };
    }

    const found = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: 'E-mail não localizado na base corporativa.' };
    }

    return { success: true };
  };

  const changePassword = (
    newPassword: string,
    oldPassword?: string
  ): { success: boolean; error?: string } => {
    if (!currentUser) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 6 caracteres.' };
    }

    const currentPass = passwords[currentUser.id];
    // Se foi informada senha antiga e havia senha registrada, valida
    if (oldPassword && currentPass && oldPassword !== currentPass) {
      return { success: false, error: 'A senha atual informada está incorreta.' };
    }

    setPasswords(prev => ({
      ...prev,
      [currentUser.id]: newPassword.trim(),
    }));

    return { success: true };
  };

  // Gestão de Usuários
  const isGestor = currentUser?.role === 'gestor';

  const addUser = (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
    initialPassword: string;
  }): { success: boolean; user?: User; error?: string } => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores possuem permissão para cadastrar operadores.' };
    }

    const emailClean = params.email.trim().toLowerCase();
    const nameClean = params.name.trim();
    const passClean = params.initialPassword?.trim();

    if (!nameClean || !emailClean) {
      return { success: false, error: 'Nome e e-mail corporativo são obrigatórios.' };
    }

    if (!passClean || passClean.length < 6) {
      return { success: false, error: 'A senha oficial de acesso deve ter pelo menos 6 caracteres.' };
    }

    if (users.some(u => u.email.toLowerCase() === emailClean)) {
      return { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' };
    }

    const newUser: User = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: nameClean,
      email: emailClean,
      role: params.role,
      badge: params.badge?.trim() || getRoleBadgeDefault(params.role),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    setPasswords(prev => ({ ...prev, [newUser.id]: passClean }));

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
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores podem editar perfis de usuários.' };
    }

    if (userId === currentUser?.id && params.isActive === false) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso enquanto logado.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    const updatedUser: User = {
      ...target,
      name: params.name.trim(),
      role: params.role,
      badge: params.badge?.trim() || target.badge,
      isActive: params.isActive !== undefined ? params.isActive : target.isActive,
    };

    setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));

    if (userId === currentUser?.id) {
      setCurrentUser(updatedUser);
    }

    return { success: true };
  };

  const resetUserPassword = (userId: string, newPass: string): { success: boolean; error?: string } => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores podem redefinir senhas.' };
    }

    const passClean = (newPass || '').trim();
    if (!passClean || passClean.length < 6) {
      return { success: false, error: 'A nova senha deve possuir pelo menos 6 caracteres.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    setPasswords(prev => ({
      ...prev,
      [userId]: passClean,
    }));

    return { success: true };
  };

  const toggleUserStatus = (userId: string): { success: boolean; error?: string } => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores podem ativar ou desativar acessos.' };
    }

    if (userId === currentUser?.id) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    const newStatus = target.isActive === false;
    return updateUser(userId, {
      name: target.name,
      role: target.role,
      badge: target.badge,
      isActive: newStatus,
    });
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  // Matriz de Permissões
  const canReviewShifts = isGestor;
  const canAccessPayroll = isGestor || currentUser?.role === 'financeiro';
  const canAccessFinance = isGestor || currentUser?.role === 'financeiro' || currentUser?.role === 'auditor';
  const canAccessAudit = isGestor || currentUser?.role === 'auditor' || currentUser?.role === 'financeiro';
  const canOperateCash = isGestor || currentUser?.role === 'operador';

  // Permissões do Futebol
  const canCreateBet = isGestor || currentUser?.role === 'operador';
  const canReceiveBet = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canRegisterPrize = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCreateClosing = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCorrectClosing = isGestor;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoadingSession,
        login,
        logout,
        sendPasswordReset,
        changePassword,
        isGestor,
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};

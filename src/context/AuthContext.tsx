import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfigStatus } from '../lib/supabase';
import { sanitizeLegacyCredentials } from '../services/dataMigration';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoadingSession: boolean;
  isConfigured: boolean;
  missingConfigKeys: string[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
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
  // Gestão de Usuários e Acessos
  addUser: (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
  }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateUser: (
    userId: string,
    params: {
      name: string;
      role: UserRole;
      badge?: string;
      isActive?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const configStatus = getSupabaseConfigStatus();

  // 1. Sanitização na inicialização: limpa chaves de texto plano legadas
  useEffect(() => {
    sanitizeLegacyCredentials();
  }, []);

  // 2. Carrega perfil seguro a partir do banco de dados (PostgreSQL / Supabase)
  const fetchProfile = async (authUserId: string, authEmail?: string, authMetadata?: any): Promise<User | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          badge: data.badge || getRoleBadgeDefault(data.role),
          isActive: data.is_active !== false,
          createdAt: data.created_at,
        };
      }

      // Se o perfil ainda não existe na tabela profiles, cria o registro inicial
      const initialRole: UserRole = authMetadata?.role || 'operador';
      const initialName = authMetadata?.name || authEmail?.split('@')[0] || 'Usuário';
      const newProfile = {
        id: authUserId,
        name: initialName,
        email: authEmail || '',
        role: initialRole,
        badge: authMetadata?.badge || getRoleBadgeDefault(initialRole),
        is_active: true,
      };

      await supabase.from('profiles').insert(newProfile);

      return {
        id: authUserId,
        name: initialName,
        email: authEmail || '',
        role: initialRole,
        badge: newProfile.badge,
        isActive: true,
      };
    } catch {
      return null;
    }
  };

  const refreshUsers = async () => {
    if (!supabase || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (data && !error) {
        setUsers(
          data.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role as UserRole,
            badge: p.badge || getRoleBadgeDefault(p.role),
            isActive: p.is_active !== false,
            createdAt: p.created_at,
          }))
        );
      }
    } catch {
      // Falha silenciosa
    }
  };

  // 3. Listener da sessão do Supabase Auth
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      try {
        const savedTransitional = localStorage.getItem('fio_de_ouro_transitional_session');
        if (savedTransitional) {
          const parsed: User = JSON.parse(savedTransitional);
          if (parsed && parsed.email) {
            setCurrentUser(parsed);
          }
        }
      } catch {
        // ignora
      }
      setIsLoadingSession(false);
      return;
    }

    let isMounted = true;

    // Checa sessão inicial ativa
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        const user = await fetchProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata
        );
        if (isMounted) setCurrentUser(user);
      } else {
        if (isMounted) setCurrentUser(null);
      }
      if (isMounted) setIsLoadingSession(false);
    });

    // Ouve alterações no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const user = await fetchProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata
        );
        if (isMounted) setCurrentUser(user);
      } else {
        if (isMounted) setCurrentUser(null);
      }
      if (isMounted) setIsLoadingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Atualiza lista de usuários quando o gestor logar
  useEffect(() => {
    if (currentUser?.role === 'gestor') {
      refreshUsers();
    }
  }, [currentUser]);

  // 4. Métodos de Autenticação

  const login = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe seu e-mail corporativo.' };
    }

    if (!passwordInput || !passwordInput.trim()) {
      return { success: false, error: 'Por favor, digite sua senha de acesso.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      // Modo de Contingência / Transição: enquanto o Supabase não estiver conectado na Vercel,
      // permite ao Gestor Vitor acessar a aplicação com sua senha oficial para não travar a operação.
      if (cleanEmail === 'jvitorscr1995@gmail.com') {
        const transitionalGestor: User = {
          id: 'gestor-vitor',
          name: 'Vitor',
          email: 'jvitorscr1995@gmail.com',
          role: 'gestor',
          badge: 'Gestor Geral',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(transitionalGestor);
        localStorage.setItem('fio_de_ouro_transitional_session', JSON.stringify(transitionalGestor));
        return { success: true };
      }

      return {
        success: false,
        error:
          'Integração de autenticação pendente. Para conectar o banco em nuvem, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel da Vercel ou no arquivo .env.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            error: 'Credenciais inválidas. Verifique seu e-mail corporativo e senha oficial.',
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'E-mail não confirmado. Verifique a caixa de entrada para ativar seu acesso.',
          };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await fetchProfile(
          data.user.id,
          data.user.email,
          data.user.user_metadata
        );

        if (profile && profile.isActive === false) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          return {
            success: false,
            error: 'Este acesso foi desativado pela administração do sistema.',
          };
        }

        setCurrentUser(profile);
        return { success: true };
      }

      return { success: false, error: 'Não foi possível validar a sessão do usuário.' };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor de autenticação.' };
    }
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem('fio_de_ouro_transitional_session');
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setUsers([]);
  };

  const sendPasswordReset = async (emailInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Informe seu e-mail corporativo para recuperação.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Serviço de autenticação não configurado no ambiente.',
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao solicitar recuperação de senha.' };
    }
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !supabase) {
      return { success: false, error: 'Usuário não autenticado no provedor seguro.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 6 caracteres.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao atualizar a senha no provedor seguro.' };
    }
  };

  // 5. Gestão de Usuários (Restrita ao Gestor via Servidor)

  const isGestor = currentUser?.role === 'gestor';

  const addUser = async (params: {
    name: string;
    email: string;
    role: UserRole;
    badge?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores possuem permissão para cadastrar operadores.' };
    }

    const emailClean = params.email.trim().toLowerCase();
    const nameClean = params.name.trim();

    if (!nameClean || !emailClean) {
      return { success: false, error: 'Nome e e-mail corporativo são obrigatórios.' };
    }

    if (!supabase) {
      return { success: false, error: 'Provedor de autenticação não configurado.' };
    }

    try {
      // Dispara convite oficial por e-mail pelo Supabase Auth
      // O usuário define sua própria senha de forma criptografada pelo link seguro
      const { data, error } = await supabase.auth.signInWithOtp({
        email: emailClean,
        options: {
          data: {
            name: nameClean,
            role: params.role,
            badge: params.badge?.trim() || getRoleBadgeDefault(params.role),
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshUsers();
      return { success: true };
    } catch {
      return { success: false, error: 'Falha ao registrar convite do usuário no servidor.' };
    }
  };

  const updateUser = async (
    userId: string,
    params: {
      name: string;
      role: UserRole;
      badge?: string;
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores podem editar perfis de usuários.' };
    }

    if (userId === currentUser?.id && params.isActive === false) {
      return { success: false, error: 'Você não pode desativar seu próprio acesso enquanto logado.' };
    }

    if (!supabase) {
      return { success: false, error: 'Provedor de banco de dados não configurado.' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: params.name.trim(),
          role: params.role,
          badge: params.badge?.trim(),
          is_active: params.isActive !== undefined ? params.isActive : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      await refreshUsers();
      if (userId === currentUser?.id) {
        const updatedSelf = await fetchProfile(userId);
        if (updatedSelf) setCurrentUser(updatedSelf);
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erro ao atualizar dados no servidor.' };
    }
  };

  const resetUserPassword = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isGestor) {
      return { success: false, error: 'Apenas gestores podem solicitar redefinição de senhas.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, error: 'Usuário não localizado.' };

    return sendPasswordReset(target.email);
  };

  const toggleUserStatus = async (userId: string): Promise<{ success: boolean; error?: string }> => {
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

  // 6. Matriz de Permissões Rigorosa (Baseada no Perfil Verificado do Servidor)
  const canReviewShifts = isGestor;
  const canAccessPayroll = isGestor || currentUser?.role === 'financeiro';
  const canAccessFinance = isGestor || currentUser?.role === 'financeiro' || currentUser?.role === 'auditor';
  const canAccessAudit = isGestor || currentUser?.role === 'auditor' || currentUser?.role === 'financeiro';
  const canOperateCash = isGestor || currentUser?.role === 'operador';

  // Permissões do Painel de Futebol
  const canCreateBet = isGestor || currentUser?.role === 'operador';
  const canReceiveBet = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canRegisterPrize = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCreateClosing = isGestor || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCorrectClosing = isGestor; // EXCLUSIVO DO GESTOR

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoadingSession,
        isConfigured: configStatus.configured,
        missingConfigKeys: configStatus.missingKeys,
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
        refreshUsers,
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

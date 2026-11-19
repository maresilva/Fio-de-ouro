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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'erp_loterica_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_USERS[0]; // Gestor default
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

  const login = (email: string, role?: UserRole): boolean => {
    let found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found && role) {
      found = users.find(u => u.role === role);
    }
    if (!found) {
      // Create guest or find fallback
      found = users[0];
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

  const canReviewShifts = currentUser?.role === 'gestor';
  const canAccessPayroll = currentUser?.role === 'gestor' || currentUser?.role === 'financeiro';
  const canAccessFinance = currentUser?.role === 'gestor' || currentUser?.role === 'financeiro' || currentUser?.role === 'auditor';
  const canAccessAudit = currentUser?.role === 'gestor' || currentUser?.role === 'auditor' || currentUser?.role === 'financeiro';
  const canOperateCash = currentUser?.role === 'operador' || currentUser?.role === 'gestor';

  // Permissões do Painel de Futebol
  const canCreateBet = currentUser?.role === 'gestor' || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canReceiveBet = currentUser?.role === 'gestor' || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canRegisterPrize = currentUser?.role === 'gestor' || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCreateClosing = currentUser?.role === 'gestor' || currentUser?.role === 'operador' || currentUser?.role === 'financeiro';
  const canCorrectClosing = currentUser?.role === 'gestor'; // Exclusivo do gestor

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

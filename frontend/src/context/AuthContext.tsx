import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../services/api';

interface AuthContextValue {
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(api.isAuthed());

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    setIsAuthed(true);
  };

  const register = async (email: string, password: string) => {
    await api.register(email, password);
    setIsAuthed(true);
  };

  const logout = () => {
    api.logout();
    setIsAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthed, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { clearAllData } from '@/lib/db';
import type { Driver } from '@/types';

interface AuthContextValue {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setDriver: (driver: Driver) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initAuth() {
      if (!apiClient.isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiClient.getMe();
        setDriver(me);
      } catch {
        // Token invalid or expired — clear and let guard redirect to login
        await apiClient.logout();
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  async function logout() {
    await apiClient.logout();
    await clearAllData();
    setDriver(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ driver, isAuthenticated: !!driver, isLoading, setDriver, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

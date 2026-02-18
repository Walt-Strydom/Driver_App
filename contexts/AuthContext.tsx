'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { clearAllData, clearDriverProfile, getDriverProfile, saveDriverProfile } from '@/lib/db';
import type { Driver } from '@/types';

interface AuthContextValue {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Save driver profile together with the unique access code used to log in */
  setDriverWithCode: (driver: Driver, driverCode: string) => Promise<void>;
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
        // Re-hydrate driverCode from local profile store
        const profile = await getDriverProfile();
        setDriver({ ...me, driverCode: profile?.driverCode });
      } catch {
        // Token invalid or expired — clear and let guard redirect to login
        await apiClient.logout();
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  async function setDriverWithCode(d: Driver, code: string) {
    await saveDriverProfile(d, code);
    setDriver({ ...d, driverCode: code });
  }

  async function logout() {
    await apiClient.logout();
    await clearAllData();
    await clearDriverProfile();
    setDriver(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ driver, isAuthenticated: !!driver, isLoading, setDriverWithCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

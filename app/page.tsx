'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? '/jobs' : '/login');
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-surface-sunken overflow-hidden">
      {/* Decorative background element for modern feel */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-primary-hover/5 rounded-full blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 animate-scale-in">
        {/* Branded Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-primary-light border-t-primary animate-spin" />
          <div className="absolute h-8 w-8 bg-primary/10 rounded-full animate-pulse-soft" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="font-sans font-bold text-2xl tracking-tight text-txt">
            Driver<span className="text-primary">Hub</span>
          </h1>
          <p className="text-txt-secondary text-sm font-medium animate-pulse-soft">
            Syncing dispatch data...
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="absolute bottom-8 text-txt-tertiary text-xs font-mono uppercase tracking-widest">
        Coal Logistics v2.0
      </footer>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { syncService, SyncStatus } from '@/lib/api/sync';
import { getSettings } from '@/lib/db';

export function Header() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false, progress: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange(setSyncStatus);
    loadSyncInfo();
    const interval = setInterval(loadSyncInfo, 10000);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
    }

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      }
    };
  }, []);

  async function loadSyncInfo() {
    const count = await syncService.getPendingCount();
    setPendingCount(count.total);
  }

  async function handleSync() {
    await syncService.sync();
    await loadSyncInfo();
  }

  return (
    <header className="sticky top-0 z-40 safe-top bg-[var(--color-header-bg)] text-[var(--color-header-text)]">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">DriverHub</h1>
            <p className="text-[10px] font-medium text-blue-200 tracking-wider uppercase">Coal Logistics</p>
          </div>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {/* Offline chip */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-[10px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-soft" />
              Offline
            </div>
          )}

          {/* Pending count */}
          {pendingCount > 0 && (
            <div className="px-2 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-200 text-[10px] font-bold tabular-nums">
              {pendingCount} pending
            </div>
          )}

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncStatus.syncing}
            className="touch-target p-2 -mr-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            aria-label="Sync now"
          >
            <svg
              className={`w-5 h-5 ${syncStatus.syncing ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sync progress bar */}
      {syncStatus.syncing && (
        <div className="h-0.5 bg-blue-800">
          <div
            className="h-full bg-gradient-to-r from-blue-300 to-cyan-300 transition-all duration-500 ease-out"
            style={{ width: `${syncStatus.progress}%` }}
          />
        </div>
      )}
    </header>
  );
}

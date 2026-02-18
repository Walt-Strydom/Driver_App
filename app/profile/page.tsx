'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { getSettings } from '@/lib/db';

export default function ProfilePage() {
  const { driver, logout } = useAuth();
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    getSettings().then((s) => setDeviceId(s.deviceId)).catch(console.error);
  }, []);

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-surface pb-20">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

          {/* Driver info */}
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary-light border-2 border-primary/20 flex items-center justify-center text-2xl">
                {driver ? driver.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-txt">{driver?.name || 'Loading...'}</h2>
                <p className="text-sm text-txt-secondary">Driver</p>
              </div>
            </div>

            {driver && (
              <div className="space-y-3">
                <Divider />
                {driver.driverCode && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-txt-secondary">Driver Code</span>
                    <span className="text-sm font-mono font-semibold text-primary tracking-wide">{driver.driverCode}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-txt-secondary">Phone</span>
                  <span className="text-sm font-medium text-txt">{driver.phone}</span>
                </div>
                {driver.email && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-txt-secondary">Email</span>
                    <span className="text-sm font-medium text-txt">{driver.email}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Device info */}
          <Card>
            <h3 className="text-sm font-semibold text-txt mb-2 uppercase tracking-wide">Device</h3>
            <p className="text-xs text-txt-tertiary font-mono break-all">{deviceId}</p>
          </Card>

          {/* App info */}
          <Card>
            <h3 className="text-sm font-semibold text-txt mb-2 uppercase tracking-wide">About</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-txt-secondary">DriverHub</span>
              <span className="text-xs text-txt-tertiary font-mono">v1.0.0</span>
            </div>
            <p className="text-[11px] text-txt-tertiary mt-2">Powered by n8n automation &bull; Coal Logistics</p>
          </Card>

          <Button variant="danger" fullWidth size="lg" onClick={logout}>
            Sign out
          </Button>
        </div>
        <BottomNav />
      </div>
    </ProtectedPage>
  );
}

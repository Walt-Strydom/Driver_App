'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, setDriver } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect already-authenticated drivers
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/jobs');
    }
  }, [isLoading, isAuthenticated, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Please enter your phone number.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.requestOTP({ phone: trimmed });
      setStep('otp');
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError('Please enter the OTP code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.verifyOTP({ phone: phone.trim(), otp: trimmedOtp });
      setDriver(res.driver);
      router.replace('/jobs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setSubmitting(true);
    try {
      await apiClient.requestOTP({ phone: phone.trim() });
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-sunken">
        <div className="h-10 w-10 rounded-full border-4 border-primary-light border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-surface-sunken px-4 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-primary-hover/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg mb-2">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h1 className="font-sans font-bold text-2xl tracking-tight text-txt">
            Driver<span className="text-primary">Hub</span>
          </h1>
          <p className="text-txt-secondary text-sm">Coal Logistics — Driver Portal</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-md border border-border p-6 space-y-5">
          {step === 'phone' ? (
            <>
              <div>
                <h2 className="text-lg font-semibold text-txt">Sign in</h2>
                <p className="text-sm text-txt-secondary mt-0.5">Enter your mobile number to receive a one-time PIN.</p>
              </div>

              <form onSubmit={handleRequestOTP} className="space-y-4">
                <Input
                  label="Mobile number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+27 82 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />

                {error && (
                  <p className="text-sm text-danger font-medium">{error}</p>
                )}

                <Button type="submit" fullWidth size="lg" loading={submitting} disabled={submitting}>
                  Send OTP
                </Button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-txt">Enter your OTP</h2>
                <p className="text-sm text-txt-secondary mt-0.5">
                  We sent a code to <span className="font-medium text-txt">{phone}</span>.
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <Input
                  label="One-time PIN"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={submitting}
                  autoFocus
                />

                {error && (
                  <p className="text-sm text-danger font-medium">{error}</p>
                )}

                <Button type="submit" fullWidth size="lg" loading={submitting} disabled={submitting}>
                  Verify &amp; Sign in
                </Button>
              </form>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  className="text-sm text-txt-secondary hover:text-txt underline-offset-2 hover:underline"
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-sm text-primary disabled:text-txt-tertiary font-medium"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-txt-tertiary font-mono uppercase tracking-widest">
          Coal Logistics v2.0
        </p>
      </div>
    </div>
  );
}

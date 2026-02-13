'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { isValidPhoneNumber } from '@/lib/utils';

export function OTPLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isValidPhoneNumber(phone)) {
      setError('Please enter a valid South African phone number');
      return;
    }
    setLoading(true);
    try {
      await apiClient.requestOTP({ phone });
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await apiClient.verifyOTP({ phone, otp });
      router.push('/jobs');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // OTP digit input handler
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = otp.split('');
    newOtp[index] = digit;
    setOtp(newOtp.join(''));
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top brand area */}
      <div className="flex-shrink-0 bg-[var(--color-header-bg)] text-white px-6 pt-16 pb-12 safe-top">
        <div className="max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {step === 'phone' ? 'Welcome, Driver' : 'Verify Code'}
          </h1>
          <p className="text-blue-200 mt-2 text-sm leading-relaxed">
            {step === 'phone'
              ? 'Sign in with your registered phone number to access your assigned jobs.'
              : <>We sent a 6-digit code to <span className="text-white font-medium">{phone}</span></>
            }
          </p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 px-6 -mt-4">
        <div className="max-w-sm mx-auto bg-surface-raised border border-border rounded-xl shadow-card p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <Input
                type="tel"
                inputMode="tel"
                placeholder="0XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={error}
                label="Phone number"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                }
                autoFocus
              />
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Send verification code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              {/* OTP digit boxes */}
              <div>
                <label className="block text-sm font-medium text-txt-secondary mb-2">Enter code</label>
                <div className="flex gap-2 justify-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ''}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-full aspect-square max-w-[52px] text-center text-xl font-bold font-mono
                        border border-border rounded-md bg-surface-sunken text-txt
                        focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none
                        transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Verify &amp; sign in
              </Button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-sm text-primary hover:text-primary-hover font-medium py-2"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 text-center py-6 px-6">
        <p className="text-[11px] text-txt-tertiary">
          By signing in you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

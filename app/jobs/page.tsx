'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { JobCard } from '@/components/jobs/JobCard';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';
import { getCachedJobs, cacheJobs, initDB } from '@/lib/db';
import { syncService } from '@/lib/api/sync';
import type { JobSummary, JobFilter } from '@/types';

const filters: { value: JobFilter; label: string; icon: string }[] = [
  { value: 'assigned', label: 'Assigned', icon: '📋' },
  { value: 'active', label: 'Active', icon: '🚛' },
  { value: 'completed', label: 'Done', icon: '✅' },
  { value: 'all', label: 'All', icon: '📦' },
];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<JobFilter>('active');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiClient.isAuthenticated()) { router.push('/auth/login'); return; }
    initDB().then(() => loadJobs());
  }, [router, filter]);

  async function loadJobs() {
    try {
      const cached = await getCachedJobs(filter);
      if (cached.length > 0) { setJobs(cached); setLoading(false); }
      if (navigator.onLine) {
        const res = await apiClient.getJobs(filter);
        setJobs(res.items);
        await cacheJobs(res.items);
      }
    } catch (err) {
      setError((err as Error).message);
      const cached = await getCachedJobs(filter);
      setJobs(cached);
    } finally { setLoading(false); }
  }

  async function handleRefresh() {
    setRefreshing(true); setError('');
    try { await syncService.sync(); await loadJobs(); }
    catch (err) { setError((err as Error).message); }
    finally { setRefreshing(false); }
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'assigned') return job.status === 'ASSIGNED';
    if (filter === 'active') return ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(job.status);
    if (filter === 'completed') return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Filter chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border
                ${filter === f.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-raised text-txt-secondary border-border hover:border-border-strong hover:text-txt'}`}
            >
              <span className="text-xs">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-danger-light border border-red-200 text-sm text-red-700 animate-slide-down">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <LoadingSpinner size="lg" label="Loading jobs..." />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            }
            title="No jobs found"
            description="No jobs match this filter. Pull down to refresh or check your connection."
            action={
              <Button variant="outline" size="sm" onClick={handleRefresh} loading={refreshing}>
                Refresh
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        )}

        {/* Refresh */}
        {!loading && filteredJobs.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-primary hover:text-primary-hover text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

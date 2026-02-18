'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { JobCard } from '@/components/jobs/JobCard';
import { EmptyState, LoadingSpinner } from '@/components/ui';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { apiClient } from '@/lib/api/client';
import { cacheJobs, getCachedJobs } from '@/lib/db';
import type { JobFilter, JobSummary } from '@/types';

const FILTERS: Array<{ label: string; value: JobFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobFilter>('all');

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const compliantAssignments = useMemo(
    () => jobs.filter((j) => j.status === 'ASSIGNED').length,
    [jobs]
  );

  async function loadJobs() {
    setLoading(true);
    try {
      const cached = await getCachedJobs(filter);
      if (cached.length > 0) {
        setJobs(cached);
      }

      if (navigator.onLine) {
        const fresh = await apiClient.getJobs(filter);
        setJobs(fresh.items);
        await cacheJobs(fresh.items);
      }
    } catch (error) {
      console.error('Failed to load jobs', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-surface pb-20">
        <Header />

        <main className="max-w-2xl mx-auto p-4 space-y-4">
          {compliantAssignments > 0 && (
            <section className="rounded-lg border border-success/30 bg-success-light p-3">
              <p className="text-sm font-semibold text-success">
                {compliantAssignments} compliant assignment{compliantAssignments > 1 ? 's' : ''} ready.
              </p>
              <p className="text-xs text-txt-secondary mt-1">
                Open each job to capture status updates, POD, and delivery notes so n8n can sync CRM and dashboard workflows.
              </p>
            </section>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  filter === f.value ? 'bg-primary text-white' : 'bg-surface-sunken text-txt-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSpinner size="lg" label="Loading assignments..." />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<span className="text-xl">🚚</span>}
              title="No jobs found"
              description="New compliant assignments from workflow notifications will appear here."
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </ProtectedPage>
  );
}

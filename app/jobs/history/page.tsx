'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { JobCard } from '@/components/jobs/JobCard';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { getCachedJobs } from '@/lib/db';
import type { JobSummary } from '@/types';

export default function JobHistoryPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      const all = await getCachedJobs('all');
      setJobs(all.filter(j => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h2 className="text-lg font-bold text-txt mb-4">Job History</h2>
        {loading ? (
          <LoadingSpinner size="lg" label="Loading history..." />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="No history yet"
            description="Completed jobs will appear here"
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

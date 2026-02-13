'use client';

import { JobCard } from '@/components/jobs/JobCard';

const MOCK_JOBS = [
  { id: 'CX-902', location: 'Newcastle Terminal', time: '08:00 AM', tonnage: '42', status: 'active' },
  { id: 'CX-905', location: 'Port Hunter', time: '11:30 AM', tonnage: '38', status: 'pending' },
];

export default function JobsPage() {
  return (
    <div className="pb-24"> {/* Space for navigation */}
      {/* Modern Sticky Header */}
      <header className="sticky top-0 z-10 glass bg-surface/80 border-b border-border safe-top">
        <div className="px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-txt">Available Jobs</h1>
            <p className="text-xs text-txt-secondary font-medium">Monday, 12 Feb 2026</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold border border-primary/20">
            JD
          </div>
        </div>
      </header>

      {/* Main Feed */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Active', 'Pending', 'History'].map((tab, i) => (
            <button key={tab} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${i === 0 ? 'bg-primary text-white' : 'bg-surface-sunken text-txt-secondary'}`}>
              {tab}
            </button>
          ))}
        </div>

        {MOCK_JOBS.map((job) => (
          <JobCard key={job.id} job={job as any} />
        ))}
      </div>
    </div>
  );
}
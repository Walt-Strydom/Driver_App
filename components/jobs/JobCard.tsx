// components/jobs/JobCard.tsx
import type { JobSummary } from '@/types';

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <div className="bg-surface-raised p-4 rounded-lg shadow-card border border-border hover:shadow-card-hover transition-all active:scale-[0.98] animate-slide-up">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-txt-tertiary">
            Manifest #{job.id}
          </span>
          <h3 className="font-bold text-lg text-txt flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {job.location}
          </h3>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 text-txt-secondary">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{job.time}</span>
        </div>
        <div className="flex items-center gap-2 text-txt-secondary">
          <Weight className="w-4 h-4" />
          <span className="text-sm font-medium">{job.tonnage} Tons</span>
        </div>
      </div>

      <button className="w-full touch-target bg-primary hover:bg-primary-hover text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors">
        View Logistics Details
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: JobSummary['status'] }) {
  const styles = {
    pending: 'bg-warning-light text-warning',
    active: 'bg-info-light text-info',
    completed: 'bg-success-light text-success',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
'use client';

import Link from 'next/link';
import { ArrowRight, Clock3, MapPin, Truck } from 'lucide-react';
import type { JobSummary, JobStatus } from '@/types';

export function JobCard({ job }: { job: JobSummary }) {
  const locationLabel = job.pickupLocation?.address || job.serviceLocation?.address || 'Location pending';

  return (
    <div className="bg-surface-raised p-4 rounded-lg shadow-card border border-border hover:shadow-card-hover transition-all active:scale-[0.98] animate-slide-up">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-txt-tertiary">
            Job #{job.jobNumber}
          </span>
          <h3 className="font-bold text-base text-txt flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {locationLabel}
          </h3>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-2 text-txt-secondary">
          <Clock3 className="w-4 h-4" />
          <span className="text-sm font-medium">{new Date(job.scheduledTime).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-txt-secondary">
          <Truck className="w-4 h-4" />
          <span className="text-sm font-medium">{job.customerName}</span>
        </div>
      </div>

      <Link
        href={`/jobs/${job.id}`}
        className="w-full touch-target bg-primary hover:bg-primary-hover text-white rounded-md font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        Open Job
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    ASSIGNED: 'bg-info-light text-info',
    ACCEPTED: 'bg-primary-light text-primary',
    EN_ROUTE: 'bg-warning-light text-warning',
    ARRIVED: 'bg-warning-light text-warning',
    IN_PROGRESS: 'bg-warning-light text-warning',
    COMPLETED: 'bg-success-light text-success',
    FAILED: 'bg-danger-light text-danger',
    CANCELLED: 'bg-surface-sunken text-txt-secondary',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

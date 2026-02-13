'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Badge } from '@/components/ui';
import type { JobSummary } from '@/types';
import { getStatusColor, getStatusLabel, formatTime, getRelativeTime } from '@/lib/utils';

interface JobCardProps {
  job: JobSummary;
  index?: number;
}

export function JobCard({ job, index = 0 }: JobCardProps) {
  const router = useRouter();
  const location = job.serviceLocation || job.dropoffLocation || job.pickupLocation;

  const statusStyle = getStatusColor(job.status);

  return (
    <Card
      onClick={() => router.push(`/jobs/${job.id}`)}
      className={`animate-slide-up stagger-${Math.min(index + 1, 5)}`}
    >
      {/* Top row: job number + status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-txt truncate">
              {job.jobNumber}
            </h3>
            {job.pendingSync && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-500 animate-pulse-soft" title="Pending sync" />
            )}
          </div>
          <p className="text-sm text-txt-secondary truncate">{job.customerName}</p>
        </div>
        <Badge variant={statusStyle.variant as any} size="md" dot>
          {getStatusLabel(job.status)}
        </Badge>
      </div>

      {/* Location row */}
      {location && (
        <div className="flex items-start gap-2.5 mb-3 p-2.5 rounded-md bg-surface-sunken border border-border/50">
          <svg className="w-4 h-4 text-txt-tertiary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-txt truncate">{location.address}</p>
            {location.city && <p className="text-xs text-txt-tertiary">{location.city}</p>}
          </div>
        </div>
      )}

      {/* Bottom row: time */}
      <div className="flex items-center justify-between text-xs text-txt-tertiary">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTime(job.scheduledTime)}</span>
        </div>
        {job.pendingSync && (
          <span className="text-yellow-600 font-medium">Pending sync</span>
        )}
      </div>
    </Card>
  );
}

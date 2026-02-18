'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedJobs } from '@/lib/db';
import type { JobStatus, JobSummary } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'all';

function startOf(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function jobDate(job: JobSummary): Date {
  return new Date(job.scheduledTime);
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

const ACTIVE_STATUSES: JobStatus[] = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

const STATUS_META: Record<JobStatus, { label: string; color: string; bg: string }> = {
  ASSIGNED:    { label: 'Assigned',    color: 'text-blue-600',    bg: 'bg-blue-500' },
  ACCEPTED:    { label: 'Accepted',    color: 'text-indigo-600',  bg: 'bg-indigo-500' },
  EN_ROUTE:    { label: 'En Route',    color: 'text-violet-600',  bg: 'bg-violet-500' },
  ARRIVED:     { label: 'Arrived',     color: 'text-cyan-600',    bg: 'bg-cyan-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600',   bg: 'bg-amber-500' },
  COMPLETED:   { label: 'Completed',   color: 'text-emerald-600', bg: 'bg-emerald-500' },
  FAILED:      { label: 'Failed',      color: 'text-red-600',     bg: 'bg-red-500' },
  CANCELLED:   { label: 'Cancelled',   color: 'text-gray-500',    bg: 'bg-gray-400' },
};

// ── component ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { driver } = useAuth();
  const [allJobs, setAllJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  // ── data load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getCachedJobs('all')
      .then((jobs: JobSummary[]) => setAllJobs(jobs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── derived metrics ───────────────────────────────────────────────────────

  const rangeJobs = useMemo((): JobSummary[] => {
    const start = startOf(dateRange);
    if (!start) return allJobs;
    return allJobs.filter((j: JobSummary) => jobDate(j) >= (start as Date));
  }, [allJobs, dateRange]);

  const kpi = useMemo(() => {
    const total = rangeJobs.length;
    const completed = rangeJobs.filter((j: JobSummary) => j.status === 'COMPLETED').length;
    const failed    = rangeJobs.filter((j: JobSummary) => j.status === 'FAILED').length;
    const cancelled = rangeJobs.filter((j: JobSummary) => j.status === 'CANCELLED').length;
    const active    = rangeJobs.filter((j: JobSummary) => ACTIVE_STATUSES.includes(j.status)).length;
    const denominator = completed + failed + cancelled;
    const completionRate = denominator > 0 ? Math.round((completed / denominator) * 100) : 0;
    return { total, completed, failed, cancelled, active, completionRate };
  }, [rangeJobs]);

  const byStatus = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const j of allJobs) {
      const s: string = j.status;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [allJobs]);

  const maxCount = useMemo(() => {
    const vals = Object.values(byStatus);
    return vals.length > 0 ? Math.max(1, ...vals) : 1;
  }, [byStatus]);

  const dailyTrend = useMemo(() => {
    const days: Array<{ label: string; completed: number; failed: number; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayJobs = allJobs.filter((j: JobSummary) => {
        const jd = jobDate(j);
        return jd >= d && jd < next;
      });
      days.push({
        label: d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' }),
        total: dayJobs.length,
        completed: dayJobs.filter((j: JobSummary) => j.status === 'COMPLETED').length,
        failed:    dayJobs.filter((j: JobSummary) => j.status === 'FAILED').length,
      });
    }
    return days;
  }, [allJobs]);

  const maxDayTotal = useMemo(() => {
    const vals = dailyTrend.map(d => d.total);
    return vals.length > 0 ? Math.max(1, ...vals) : 1;
  }, [dailyTrend]);

  // ── filtered history list ─────────────────────────────────────────────────

  const historyJobs = useMemo((): JobSummary[] => {
    let list: JobSummary[] = rangeJobs;
    if (statusFilter !== 'all') {
      list = list.filter((j: JobSummary) => j.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((j: JobSummary) =>
        j.jobNumber.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        (j.pickupLocation?.address ?? '').toLowerCase().includes(q) ||
        (j.dropoffLocation?.address ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a: JobSummary, b: JobSummary) => {
      const diff = new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
      return sortDesc ? -diff : diff;
    });
  }, [rangeJobs, statusFilter, search, sortDesc]);

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading analytics..." />
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-surface pb-24">
        <Header />

        <main className="max-w-2xl mx-auto px-4 py-4 space-y-5">

          {/* ── Page title ── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-txt">Reports &amp; Analytics</h2>
              {driver?.driverCode && (
                <p className="text-xs text-txt-tertiary mt-0.5 font-mono">
                  Driver Code: <span className="text-primary font-semibold">{driver.driverCode}</span>
                </p>
              )}
            </div>
            <span className="text-xs text-txt-tertiary">{allJobs.length} total jobs</span>
          </div>

          {/* ── Date range tabs ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['today', 'week', 'month', 'all'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  dateRange === r ? 'bg-primary text-white' : 'bg-surface-sunken text-txt-secondary'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 Days' : r === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Total Jobs"  value={kpi.total}     sub="in selected period"   color="text-txt" />
            <KpiCard label="Completed"   value={kpi.completed} sub={`${kpi.completionRate}% rate`} color="text-emerald-600" />
            <KpiCard label="Failed"      value={kpi.failed}    sub="delivery failures"    color="text-red-500" />
            <KpiCard label="Active"      value={kpi.active}    sub="in progress now"      color="text-amber-500" />
          </div>

          {/* ── Completion rate bar ── */}
          {(kpi.completed + kpi.failed + kpi.cancelled) > 0 && (
            <div className="bg-surface-raised rounded-xl border border-border p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-txt">Completion Rate</span>
                <span className="text-lg font-bold text-emerald-600">{kpi.completionRate}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${kpi.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-txt-tertiary">
                <span>{kpi.completed} completed</span>
                <span>{kpi.failed} failed &bull; {kpi.cancelled} cancelled</span>
              </div>
            </div>
          )}

          {/* ── Status breakdown ── */}
          <section className="bg-surface-raised rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-txt mb-3">Jobs by Status (All Time)</h3>
            {allJobs.length === 0 ? (
              <p className="text-xs text-txt-tertiary">No data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {(Object.entries(STATUS_META) as [JobStatus, { label: string; color: string; bg: string }][]).map(([status, meta]) => {
                  const count = byStatus[status as string] ?? 0;
                  const pct = allJobs.length > 0 ? Math.round((count / allJobs.length) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-txt-tertiary tabular-nums">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                        <div
                          className={`h-full rounded-full ${meta.bg} transition-all duration-500`}
                          style={{ width: `${maxCount > 0 ? Math.round((count / maxCount) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 7-day trend ── */}
          <section className="bg-surface-raised rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-txt mb-3">7-Day Trend</h3>
            <div className="flex items-end gap-1.5" style={{ height: '88px' }}>
              {dailyTrend.map((d, idx) => {
                const other = Math.max(0, d.total - d.completed - d.failed);
                const barH = (n: number) => maxDayTotal > 0 ? Math.round((n / maxDayTotal) * 64) : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                      {other > 0 && (
                        <div className="w-full bg-amber-400 rounded-t" style={{ height: `${barH(other)}px`, minHeight: '3px' }} />
                      )}
                      {d.failed > 0 && (
                        <div className="w-full bg-red-400" style={{ height: `${barH(d.failed)}px`, minHeight: '3px' }} />
                      )}
                      {d.completed > 0 && (
                        <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${barH(d.completed)}px`, minHeight: '3px' }} />
                      )}
                      {d.total === 0 && (
                        <div className="w-full bg-surface-sunken rounded" style={{ height: '4px' }} />
                      )}
                    </div>
                    <span className="text-[9px] text-txt-tertiary text-center leading-tight">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              <LegendDot color="bg-emerald-500" label="Completed" />
              <LegendDot color="bg-red-400"     label="Failed" />
              <LegendDot color="bg-amber-400"   label="Active/Other" />
            </div>
          </section>

          {/* ── Historical jobs list ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-txt">All Jobs</h3>
              <button
                onClick={() => setSortDesc(prev => !prev)}
                className="text-xs text-primary font-medium flex items-center gap-1"
              >
                {sortDesc ? 'Newest first' : 'Oldest first'}
                <svg
                  className={`w-3 h-3 transition-transform ${sortDesc ? '' : 'rotate-180'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Search + status filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-tertiary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search job # or customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-surface-sunken rounded-lg border border-border text-txt placeholder:text-txt-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as JobStatus | 'all')}
                className="text-sm bg-surface-sunken rounded-lg border border-border text-txt px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All statuses</option>
                {(Object.entries(STATUS_META) as [JobStatus, { label: string }][]).map(([s, m]) => (
                  <option key={s} value={s}>{m.label}</option>
                ))}
              </select>
            </div>

            {historyJobs.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="No jobs found"
                description="Try adjusting the date range or filters."
              />
            ) : (
              <div className="space-y-2">
                {historyJobs.map((job: JobSummary) => (
                  <JobHistoryRow key={job.id} job={job} />
                ))}
              </div>
            )}

            {historyJobs.length > 0 && (
              <p className="text-center text-xs text-txt-tertiary mt-3">
                Showing {historyJobs.length} job{historyJobs.length !== 1 ? 's' : ''}
              </p>
            )}
          </section>

        </main>

        <BottomNav />
      </div>
    </ProtectedPage>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-surface-raised rounded-xl border border-border p-4">
      <p className="text-xs text-txt-secondary font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      <p className="text-[11px] text-txt-tertiary mt-0.5">{sub}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-[10px] text-txt-tertiary">{label}</span>
    </div>
  );
}

function JobHistoryRow({ job }: { job: JobSummary }) {
  const meta = STATUS_META[job.status];
  const d = new Date(job.scheduledTime);
  const location =
    job.pickupLocation?.address ??
    job.serviceLocation?.address ??
    job.dropoffLocation?.address ??
    '—';

  return (
    <div className="bg-surface-raised rounded-lg border border-border px-4 py-3 flex items-start gap-3">
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${meta?.bg ?? 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-txt truncate">#{job.jobNumber}</span>
          <span className={`text-[11px] font-medium flex-shrink-0 ${meta?.color ?? 'text-txt-tertiary'}`}>
            {meta?.label ?? job.status}
          </span>
        </div>
        <p className="text-xs text-txt-secondary truncate mt-0.5">{job.customerName}</p>
        <p className="text-xs text-txt-tertiary truncate">{location}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-[11px] text-txt-secondary font-medium">{fmt(d)}</p>
        <p className="text-[11px] text-txt-tertiary">{fmtTime(d)}</p>
      </div>
    </div>
  );
}

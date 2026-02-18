'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SignaturePad from 'signature_pad';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/Button';
import { Card, Badge, TextArea, Modal, LoadingSpinner, Divider, EmptyState } from '@/components/ui';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { apiClient } from '@/lib/api/client';
import { getCachedJobDetail, cacheJobDetail, addEventToOutbox, addProofToOutbox, storeProofFile, updateCachedJobStatus } from '@/lib/db';
import { getCurrentLocation, compressImage, getNextAllowedStatuses, getStatusColor, getStatusLabel, formatDateTime, generateUUID, getGoogleMapsLink, getPhoneCallLink } from '@/lib/utils';
import type { JobDetail, JobStatus } from '@/types';

const DOC_TYPES = [
  { value: 'mine_weighbridge', label: 'Mine Weighbridge', icon: '\u2696\ufe0f' },
  { value: 'destination_weighbridge', label: 'Dest Weighbridge', icon: '\u2696\ufe0f' },
  { value: 'pod', label: 'Proof of Delivery', icon: '\ud83d\udcdd' },
  { value: 'general', label: 'General Photo', icon: '\ud83d\udcf8' },
];

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | null>(null);
  const [failureNote, setFailureNote] = useState('');
  const [proofType, setProofType] = useState<'photo' | 'signature' | 'note'>('photo');
  const [documentType, setDocumentType] = useState('general');
  const [proofNote, setProofNote] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadJob(); }, [jobId]);
  useEffect(() => {
    if (showProofModal && proofType === 'signature' && canvasRef.current && !sigPadRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, { backgroundColor: '#fff', penColor: '#000' });
    }
  }, [showProofModal, proofType]);

  async function loadJob() {
    try {
      const cached = await getCachedJobDetail(jobId);
      if (cached) { setJob(cached); setLoading(false); }
      if (navigator.onLine) { const fresh = await apiClient.getJob(jobId); setJob(fresh); await cacheJobDetail(fresh); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleStatusUpdate(s: JobStatus) {
    if (!job) return;
    if (s === 'FAILED') { setShowFailureModal(true); return; }
    setUpdating(true);
    try {
      const gps = await getCurrentLocation();
      const evt: any = { jobId: job.id, from_status: job.status, to_status: s, timestamp_client: new Date().toISOString(), gps: gps || undefined, client_event_id: generateUUID(), retryCount: 0, createdAt: new Date().toISOString() };
      if (navigator.onLine) { await apiClient.updateJobStatus(jobId, evt); await loadJob(); }
      else { await addEventToOutbox(evt); await updateCachedJobStatus(jobId, s); const u = await getCachedJobDetail(jobId); if (u) setJob(u); }
      setShowStatusModal(false);
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setUpdating(false); }
  }

  async function handleFailure() {
    if (!job || !failureNote.trim()) { alert('Please provide a reason'); return; }
    setUpdating(true);
    try {
      const gps = await getCurrentLocation();
      const evt: any = { jobId: job.id, from_status: job.status, to_status: 'FAILED' as JobStatus, timestamp_client: new Date().toISOString(), gps: gps || undefined, note: failureNote, reason_code: 'DRIVER_REPORTED', client_event_id: generateUUID(), retryCount: 0, createdAt: new Date().toISOString() };
      if (navigator.onLine) { await apiClient.updateJobStatus(jobId, evt); await loadJob(); }
      else { await addEventToOutbox(evt); await updateCachedJobStatus(jobId, 'FAILED'); const u = await getCachedJobDetail(jobId); if (u) setJob(u); }
      setShowFailureModal(false); setFailureNote('');
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setUpdating(false); }
  }

  function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setCapturedPhoto(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleProofCapture() {
    if (!job) return;
    setUpdating(true);
    try {
      const gps = await getCurrentLocation();
      let blob: Blob | null = null, fileName = '';
      if (proofType === 'photo' && capturedPhoto) { blob = await compressImage(capturedPhoto); fileName = documentType + '-' + Date.now() + '.jpg'; }
      else if (proofType === 'signature' && sigPadRef.current) {
        if (sigPadRef.current.isEmpty()) { alert('Please provide a signature'); setUpdating(false); return; }
        const res = await fetch(sigPadRef.current.toDataURL()); blob = await res.blob(); fileName = 'signature-' + Date.now() + '.png';
      }
      const proofId = generateUUID();
      const proof: any = { jobId: job.id, proof_id: proofId, proof_type: proofType, file_name: fileName, note: proofNote, timestamp_client: new Date().toISOString(), gps: gps || undefined, retryCount: 0, createdAt: new Date().toISOString() };
      if (navigator.onLine && blob) { const file = new File([blob], fileName); await apiClient.uploadProof(jobId, file, proofType, documentType); await loadJob(); }
      else { if (blob) await storeProofFile(proofId, blob, proofId); await addProofToOutbox(proof); }
      setShowProofModal(false); resetProof();
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setUpdating(false); }
  }

  function resetProof() { setProofType('photo'); setDocumentType('general'); setProofNote(''); setCapturedPhoto(null); setPhotoPreview(null); sigPadRef.current?.clear(); }

  if (loading) return <div className="min-h-screen bg-surface"><Header /><LoadingSpinner size="lg" label="Loading job..." /><BottomNav /></div>;
  if (!job) return <div className="min-h-screen bg-surface"><Header /><EmptyState icon={<span>!</span>} title="Job not found" action={<Button variant="outline" onClick={() => router.push('/jobs')}>Back</Button>} /><BottomNav /></div>;

  const nextStatuses = getNextAllowedStatuses(job.status);
  const loc = job.serviceLocation || job.dropoffLocation || job.pickupLocation;
  const ss = getStatusColor(job.status);

  return (
    <ProtectedPage>
    <div className="min-h-screen bg-surface pb-24">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <Card>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div><h1 className="text-xl font-bold text-txt tracking-tight">Job {job.jobNumber}</h1><p className="text-sm text-txt-secondary">{job.customerName}</p></div>
            <Badge variant={ss.variant as any} size="md" dot>{getStatusLabel(job.status)}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-txt-secondary">
            <svg className="w-4 h-4 text-txt-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {formatDateTime(job.scheduledTime)}
          </div>
        </Card>

        {loc && (<Card>
          <h3 className="text-sm font-semibold text-txt mb-3 uppercase tracking-wide">Location</h3>
          <p className="text-sm text-txt">{loc.address}</p>
          {loc.city && <p className="text-xs text-txt-tertiary mt-0.5">{loc.city}</p>}
          {loc.contactName && (<><Divider className="my-3" /><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-txt">{loc.contactName}</p>{loc.contactPhone && <p className="text-xs text-txt-tertiary">{loc.contactPhone}</p>}</div>{loc.contactPhone && <a href={getPhoneCallLink(loc.contactPhone)} className="p-2 rounded-md bg-success-light text-success">Call</a>}</div></>)}
          <a href={getGoogleMapsLink(loc.address, loc.coordinates)} target="_blank" rel="noopener noreferrer" className="mt-3 block"><Button variant="outline" fullWidth>Navigate</Button></a>
        </Card>)}

        {(job.instructions || job.specialNotes) && (<Card>
          <h3 className="text-sm font-semibold text-txt mb-2 uppercase tracking-wide">Instructions</h3>
          {job.instructions && <p className="text-sm text-txt-secondary leading-relaxed">{job.instructions}</p>}
          {job.specialNotes && <div className="mt-2 p-3 rounded-md bg-warning-light border border-orange-200 text-sm text-orange-800"><strong>Note:</strong> {job.specialNotes}</div>}
        </Card>)}

        <Card>
          <h3 className="text-sm font-semibold text-txt mb-3 uppercase tracking-wide">Timeline</h3>
          {job.events.map((evt, i) => { const es = getStatusColor(evt.toStatus); return (
            <div key={evt.id} className="flex gap-3"><div className="flex flex-col items-center"><div className={'w-2.5 h-2.5 rounded-full mt-1.5 ' + (i === 0 ? 'bg-primary ring-4 ring-primary-light' : 'bg-border-strong')} />{i < job.events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}</div>
            <div className="flex-1 pb-4"><div className="flex items-center gap-2 flex-wrap"><Badge variant={es.variant as any} size="sm">{getStatusLabel(evt.toStatus)}</Badge><span className="text-[11px] text-txt-tertiary">{formatDateTime(evt.timestamp)}</span></div>{evt.note && <p className="text-xs text-txt-secondary mt-1">{evt.note}</p>}</div></div>); })}
        </Card>

        {job.proof.length > 0 && (<Card>
          <h3 className="text-sm font-semibold text-txt mb-3 uppercase tracking-wide">Proof</h3>
          {job.proof.map((p) => (<div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-surface-sunken border border-border/50 mb-2">
            <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-md bg-primary-light flex items-center justify-center text-base">{p.proofType === 'photo' ? '\ud83d\udcf7' : '\u270d\ufe0f'}</div><div><p className="text-sm font-medium text-txt capitalize">{p.proofType}</p><p className="text-[11px] text-txt-tertiary">{formatDateTime(p.timestamp)}</p></div></div>
            <Badge variant={p.uploadStatus === 'completed' ? 'success' : 'warning'} size="sm">{p.uploadStatus}</Badge></div>))}
        </Card>)}

        {nextStatuses.length > 0 && (<div className="space-y-2 pt-1">
          {nextStatuses.map((s) => (<Button key={s} fullWidth variant={s === 'FAILED' ? 'danger' : 'primary'} size="lg" onClick={() => { setSelectedStatus(s); setShowStatusModal(true); }}>{s === 'FAILED' ? 'Report Issue' : 'Mark as ' + getStatusLabel(s)}</Button>))}
          {['ARRIVED', 'IN_PROGRESS'].includes(job.status) && (<Button fullWidth variant="secondary" size="lg" onClick={() => setShowProofModal(true)}>Upload Document / Capture Proof</Button>)}
        </div>)}
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={'Update to ' + (selectedStatus ? getStatusLabel(selectedStatus) : '')}>
        <p className="text-sm text-txt-secondary mb-5">Confirm status update?</p>
        <div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => setShowStatusModal(false)}>Cancel</Button><Button fullWidth loading={updating} onClick={() => selectedStatus && handleStatusUpdate(selectedStatus)}>Confirm</Button></div>
      </Modal>

      <Modal isOpen={showFailureModal} onClose={() => setShowFailureModal(false)} title="Report Issue">
        <TextArea label="What went wrong?" placeholder="Describe the issue..." value={failureNote} onChange={(e: any) => setFailureNote(e.target.value)} rows={4} className="mb-4" />
        <div className="flex gap-3"><Button variant="secondary" fullWidth onClick={() => { setShowFailureModal(false); setFailureNote(''); }}>Cancel</Button><Button variant="danger" fullWidth loading={updating} onClick={handleFailure}>Submit</Button></div>
      </Modal>

      <Modal isOpen={showProofModal} onClose={() => { setShowProofModal(false); resetProof(); }} title="Upload Document">
        <div className="space-y-4">
          <div className="flex gap-2">{(['photo', 'signature', 'note'] as const).map((t) => (<button key={t} onClick={() => setProofType(t)} className={'flex-1 py-2.5 rounded-md text-sm font-medium capitalize transition-all border ' + (proofType === t ? 'bg-primary text-white border-primary' : 'bg-surface-sunken text-txt-secondary border-border')}>{t}</button>))}</div>
          {proofType === 'photo' && (<div><label className="block text-sm font-medium text-txt-secondary mb-2">Document type</label><div className="grid grid-cols-2 gap-2">{DOC_TYPES.map((dt) => (<button key={dt.value} onClick={() => setDocumentType(dt.value)} className={'p-2.5 rounded-md text-xs font-medium text-left border transition-all ' + (documentType === dt.value ? 'bg-primary-light border-primary text-primary-700' : 'bg-surface-sunken border-border text-txt-secondary')}>{dt.icon} {dt.label}</button>))}</div></div>)}
          {proofType === 'photo' && (<div><input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhotoSelected} className="hidden" />{photoPreview ? (<div className="relative rounded-md overflow-hidden border border-border"><img src={photoPreview} alt="Captured" className="w-full h-48 object-cover" /><button onClick={() => { setCapturedPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">X</button></div>) : (<Button fullWidth variant="outline" onClick={() => fileRef.current?.click()}>Take Photo</Button>)}</div>)}
          {proofType === 'signature' && (<div><div className="border-2 border-border rounded-md overflow-hidden bg-white"><canvas ref={canvasRef} width={400} height={200} className="w-full touch-none" /></div><Button variant="ghost" size="sm" onClick={() => sigPadRef.current?.clear()} className="mt-2">Clear</Button></div>)}
          <TextArea label="Notes (optional)" placeholder="Add notes..." value={proofNote} onChange={(e: any) => setProofNote(e.target.value)} rows={2} />
          <div className="flex gap-3 pt-1"><Button variant="secondary" fullWidth onClick={() => { setShowProofModal(false); resetProof(); }}>Cancel</Button><Button fullWidth loading={updating} onClick={handleProofCapture} disabled={proofType === 'photo' && !capturedPhoto}>Save</Button></div>
        </div>
      </Modal>

      <BottomNav />
    </div>
    </ProtectedPage>
  );
}

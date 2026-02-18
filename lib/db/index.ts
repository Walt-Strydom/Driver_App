import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  JobSummary,
  JobDetail,
  QueuedStatusUpdate,
  QueuedProofUpload,
  AppSettings,
  Driver,
} from '@/types';

/** Persisted driver profile stored locally, includes driverCode column */
export interface DriverProfile {
  id: string;
  /** Unique access code issued by dispatch (the "driver code" column) */
  driverCode: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  time: string;
  tonnage: string;
  status: 'pending' | 'active' | 'completed';
  savedAt: string;
}

interface DriverAppDB extends DBSchema {
  jobs_cache: {
    key: string;
    value: JobSummary;
    indexes: { 'by-status': string };
  };
  job_detail_cache: {
    key: string;
    value: JobDetail;
  };
  outbox_events: {
    key: string;
    value: QueuedStatusUpdate;
    indexes: { 'by-job': string; 'by-created': string };
  };
  outbox_proof: {
    key: string;
    value: QueuedProofUpload;
    indexes: { 'by-job': string; 'by-created': string };
  };
  outbox_files: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      proofId: string;
      createdAt: string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  /** v2: stores the authenticated driver profile, including their unique driverCode */
  driver_profile: {
    key: string;
    value: DriverProfile;
  };
}

const DB_NAME = 'driver-app-db';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<DriverAppDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<DriverAppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DriverAppDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1 stores — created on fresh install or when upgrading from scratch
      if (oldVersion < 1) {
        const jobsStore = db.createObjectStore('jobs_cache', { keyPath: 'id' });
        jobsStore.createIndex('by-status', 'status');

        db.createObjectStore('job_detail_cache', { keyPath: 'id' });

        const eventsStore = db.createObjectStore('outbox_events', { keyPath: 'client_event_id' });
        eventsStore.createIndex('by-job', 'jobId');
        eventsStore.createIndex('by-created', 'createdAt');

        const proofStore = db.createObjectStore('outbox_proof', { keyPath: 'proof_id' });
        proofStore.createIndex('by-job', 'jobId');
        proofStore.createIndex('by-created', 'createdAt');

        db.createObjectStore('outbox_files', { keyPath: 'id' });
        db.createObjectStore('settings');
      }

      // v2 — adds driver_profile store with driverCode column
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('driver_profile')) {
          db.createObjectStore('driver_profile', { keyPath: 'id' });
        }
      }
    },
  });

  return dbInstance;
}

// Jobs Cache Operations
export async function cacheJobs(jobs: JobSummary[]): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('jobs_cache', 'readwrite');
  await Promise.all(jobs.map(job => tx.store.put(job)));
  await tx.done;
}

export async function getCachedJobs(filter?: string): Promise<JobSummary[]> {
  const db = await initDB();
  
  if (filter && filter !== 'all') {
    return db.getAllFromIndex('jobs_cache', 'by-status', filter.toUpperCase());
  }
  
  return db.getAll('jobs_cache');
}

export async function getCachedJob(jobId: string): Promise<JobSummary | undefined> {
  const db = await initDB();
  return db.get('jobs_cache', jobId);
}

export async function updateCachedJobStatus(jobId: string, status: string): Promise<void> {
  const db = await initDB();
  const job = await db.get('jobs_cache', jobId);
  if (job) {
    job.status = status as any;
    job.pendingSync = true;
    await db.put('jobs_cache', job);
  }
}

// Job Detail Cache Operations
export async function cacheJobDetail(job: JobDetail): Promise<void> {
  const db = await initDB();
  await db.put('job_detail_cache', job);
}

export async function getCachedJobDetail(jobId: string): Promise<JobDetail | undefined> {
  const db = await initDB();
  return db.get('job_detail_cache', jobId);
}

// Outbox Events Operations
export async function addEventToOutbox(event: QueuedStatusUpdate): Promise<void> {
  const db = await initDB();
  await db.add('outbox_events', event);
}

export async function getOutboxEvents(): Promise<QueuedStatusUpdate[]> {
  const db = await initDB();
  return db.getAll('outbox_events');
}

export async function removeEventFromOutbox(eventId: string): Promise<void> {
  const db = await initDB();
  await db.delete('outbox_events', eventId);
}

export async function getOutboxEventsForJob(jobId: string): Promise<QueuedStatusUpdate[]> {
  const db = await initDB();
  return db.getAllFromIndex('outbox_events', 'by-job', jobId);
}

// Outbox Proof Operations
export async function addProofToOutbox(proof: QueuedProofUpload): Promise<void> {
  const db = await initDB();
  await db.add('outbox_proof', proof);
}

export async function getOutboxProof(): Promise<QueuedProofUpload[]> {
  const db = await initDB();
  return db.getAll('outbox_proof');
}

export async function removeProofFromOutbox(proofId: string): Promise<void> {
  const db = await initDB();
  await db.delete('outbox_proof', proofId);
}

// Outbox Files Operations
export async function storeProofFile(id: string, blob: Blob, proofId: string): Promise<void> {
  const db = await initDB();
  await db.put('outbox_files', {
    id,
    blob,
    proofId,
    createdAt: new Date().toISOString(),
  });
}

export async function getProofFile(id: string): Promise<Blob | undefined> {
  const db = await initDB();
  const file = await db.get('outbox_files', id);
  return file?.blob;
}

export async function removeProofFile(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('outbox_files', id);
}

// Settings Operations
export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await initDB();
  await db.put('settings', value, key);
}

export async function getSetting(key: string): Promise<any> {
  const db = await initDB();
  return db.get('settings', key);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await initDB();
  const deviceId = await db.get('settings', 'deviceId') || generateDeviceId();
  const notificationsEnabled = await db.get('settings', 'notificationsEnabled') ?? true;
  const gpsEnabled = await db.get('settings', 'gpsEnabled') ?? true;
  const wifiOnlyUploads = await db.get('settings', 'wifiOnlyUploads') ?? false;
  const theme = await db.get('settings', 'theme') || 'auto';
  const lastSyncTime = await db.get('settings', 'lastSyncTime');

  // Save device ID if it was just generated
  if (!await db.get('settings', 'deviceId')) {
    await db.put('settings', deviceId, 'deviceId');
  }

  return {
    deviceId,
    notificationsEnabled,
    gpsEnabled,
    wifiOnlyUploads,
    theme,
    lastSyncTime,
  };
}

export async function updateLastSyncTime(): Promise<void> {
  const db = await initDB();
  await db.put('settings', new Date().toISOString(), 'lastSyncTime');
}

// Utility Functions
function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(
    ['jobs_cache', 'job_detail_cache', 'outbox_events', 'outbox_proof', 'outbox_files'],
    'readwrite'
  );
  
  await Promise.all([
    tx.objectStore('jobs_cache').clear(),
    tx.objectStore('job_detail_cache').clear(),
    tx.objectStore('outbox_events').clear(),
    tx.objectStore('outbox_proof').clear(),
    tx.objectStore('outbox_files').clear(),
  ]);
  
  await tx.done;
}

export async function getOutboxCount(): Promise<{ events: number; proof: number }> {
  const db = await initDB();
  const [events, proof] = await Promise.all([
    db.count('outbox_events'),
    db.count('outbox_proof'),
  ]);

  return { events, proof };
}

// Driver Profile Operations (v2 — includes driverCode column)
export async function saveDriverProfile(driver: Driver, driverCode: string): Promise<void> {
  const db = await initDB();
  const profile: DriverProfile = {
    id: driver.id,
    driverCode,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    location: driver.location,
    time: driver.time,
    tonnage: driver.tonnage,
    status: driver.status,
    savedAt: new Date().toISOString(),
  };
  await db.put('driver_profile', profile);
}

export async function getDriverProfile(): Promise<DriverProfile | undefined> {
  const db = await initDB();
  const all = await db.getAll('driver_profile');
  return all[0];
}

export async function clearDriverProfile(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('driver_profile', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

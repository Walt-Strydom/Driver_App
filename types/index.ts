// Job Status Types
export type JobStatus = 
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type JobFilter = 'assigned' | 'active' | 'completed' | 'all';

// Driver Types
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  time: string;
  tonnage: string;
  status: 'pending' | 'active' | 'completed';
}

// Location Types
export interface GPSCoordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface JobLocation {
  address: string;
  city?: string;
  postalCode?: string;
  coordinates?: GPSCoordinates;
  contactName?: string;
  contactPhone?: string;
}

// Job Types
export interface JobSummary {
  id: string;
  jobNumber: string;
  status: JobStatus;
  scheduledTime: string;
  pickupLocation?: JobLocation;
  dropoffLocation?: JobLocation;
  serviceLocation?: JobLocation;
  customerName: string;
  pendingSync?: boolean;
}

export interface JobEvent {
  id: string;
  jobId: string;
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  timestamp: string;
  driverId: string;
  driverName: string;
  gps?: GPSCoordinates;
  note?: string;
  reasonCode?: string;
  deviceId: string;
}

export interface ProofItem {
  id: string;
  jobId: string;
  proofType: 'photo' | 'signature' | 'pin' | 'document' | 'note';
  fileUrl?: string;
  fileName?: string;
  contentType?: string;
  note?: string;
  timestamp: string;
  gps?: GPSCoordinates;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
}

export interface JobDetail extends JobSummary {
  description?: string;
  instructions?: string;
  specialNotes?: string;
  events: JobEvent[];
  proof: ProofItem[];
  proofRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types
export interface AuthOTPRequest {
  phone: string;
}

export interface AuthVerifyRequest {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  driver: Driver;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface JobsListResponse {
  items: JobSummary[];
  next_page: number | null;
  server_time: string;
}

export interface StatusUpdateRequest {
  from_status: JobStatus;
  to_status: JobStatus;
  timestamp_client: string;
  gps?: GPSCoordinates;
  note?: string;
  reason_code?: string;
  client_event_id: string;
}

export interface StatusUpdateResponse {
  ok: boolean;
  server_event_id: string;
  job_status: JobStatus;
  server_time: string;
}

export interface ProofInitRequest {
  proof_type: 'photo' | 'signature' | 'pin' | 'document' | 'note';
  file_name?: string;
  content_type?: string;
  size_bytes?: number;
}

export interface ProofInitResponse {
  upload_url?: string;
  upload_id?: string;
  proof_id: string;
}

export interface ProofCompleteRequest {
  proof_id: string;
  upload_id?: string;
  file_url?: string;
  note?: string;
  timestamp_client: string;
  gps?: GPSCoordinates;
}

export interface ProofCompleteResponse {
  ok: boolean;
  proof_item: ProofItem;
}

export interface SyncHealthResponse {
  ok: boolean;
  n8n_version: string;
  server_time: string;
}

// Offline Queue Types
export interface QueuedStatusUpdate extends StatusUpdateRequest {
  jobId: string;
  retryCount: number;
  createdAt: string;
}

export interface QueuedProofUpload extends ProofCompleteRequest {
  jobId: string;
  proof_type: 'photo' | 'signature' | 'pin' | 'document' | 'note';
  blob?: Blob;
  retryCount: number;
  createdAt: string;
}

export interface SyncBatchRequest {
  queued_events: QueuedStatusUpdate[];
  queued_proof: QueuedProofUpload[];
}

export interface SyncBatchResponse {
  accepted: {
    events: number;
    proof: number;
  };
  failed: Array<{
    id: string;
    type: 'event' | 'proof';
    reason: string;
  }>;
}

// Settings Types
export interface AppSettings {
  lastSyncTime?: string;
  deviceId: string;
  notificationsEnabled: boolean;
  gpsEnabled: boolean;
  wifiOnlyUploads: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Transition Rules
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  ASSIGNED: ['ACCEPTED', 'FAILED'],
  ACCEPTED: ['EN_ROUTE', 'FAILED'],
  EN_ROUTE: ['ARRIVED', 'FAILED'],
  ARRIVED: ['COMPLETED', 'IN_PROGRESS', 'FAILED'],
  IN_PROGRESS: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

// Utility Types
export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

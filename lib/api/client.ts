import type {
  DriverCodeLoginRequest, AuthResponse,
  Driver, JobsListResponse, JobDetail, StatusUpdateRequest,
  StatusUpdateResponse, ProofCompleteResponse,
  SyncHealthResponse, SyncBatchRequest, SyncBatchResponse,
} from '@/types';
import { getSettings } from '@/lib/db';

/**
 * API_BASE_URL should point to your n8n instance webhook base.
 *
 * The driver app endpoints map to n8n webhooks as follows:
 *   POST /driver/auth/login        → n8n DRV-01 webhook (driver code login)
 *   GET  /driver/jobs              → n8n DRV-03 webhook
 *   GET  /driver/jobs/:id          → n8n DRV-04 webhook
 *   POST /driver/jobs/:id/status   → n8n DRV-05 webhook
 *   POST /driver/jobs/:id/proof    → n8n DRV-06 webhook → triggers WF04 (upload-document)
 *   POST /driver/sync/batch        → n8n DRV-07 webhook
 * 
 * When a proof/document is uploaded via DRV-06, the n8n workflow should:
 *   1. Store the file in MinIO
 *   2. Create the proof_item record
 *   3. If document_type matches weighbridge/pod, call WF04 (Document Upload with OCR)
 *   4. WF04 processes OCR → calls WF05 (POD Validation) → WF06 (Invoice Trigger)
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://poc-logistics.brandflow.co.za';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private deviceId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private saveTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async getDeviceId(): Promise<string> {
    if (!this.deviceId) {
      const settings = await getSettings();
      this.deviceId = settings.deviceId;
    }
    return this.deviceId;
  }

  private async getHeaders(includeAuth = true): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': await this.getDeviceId(),
    };
    if (includeAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private idempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async request<T>(
    endpoint: string, options: RequestInit = {}, includeAuth = true, idempotent = false
  ): Promise<T> {
    const headers = await this.getHeaders(includeAuth) as Record<string, string>;
    if (idempotent) headers['Idempotency-Key'] = this.idempotencyKey();

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers as Record<string, string> },
    });

    if (res.status === 401 && this.refreshToken) {
      const ok = await this.refreshAccessToken();
      if (ok) return this.request<T>(endpoint, options, includeAuth, idempotent);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.message || err.error || `Request failed (${res.status})`);
    }

    return res.json();
  }

  // ── Auth ──
  /**
   * Authenticates a driver using their pre-assigned unique access code.
   * Maps to n8n DRV-01 webhook: POST /auth/login
   * The backend validates the code and returns tokens + driver profile.
   */
  async loginWithCode(data: DriverCodeLoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }, false);
    this.saveTokens(res.access_token, res.refresh_token);
    return res;
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await this.request<{ access_token: string }>('/auth/refresh', {
        method: 'POST', body: JSON.stringify({ refresh_token: this.refreshToken }),
      }, false);
      this.accessToken = res.access_token;
      if (typeof window !== 'undefined') localStorage.setItem('access_token', res.access_token);
      return true;
    } catch { this.clearTokens(); return false; }
  }

  async getMe(): Promise<Driver> { return this.request('/auth/me'); }
  async logout() { this.clearTokens(); }

  // ── Jobs ──
  async getJobs(filter = 'all', since?: string, page = 1): Promise<JobsListResponse> {
    const p = new URLSearchParams({ filter, page: String(page) });
    if (since) p.append('since', since);
    return this.request(`/jobs?${p}`);
  }

  async getJob(jobId: string): Promise<JobDetail> {
    return this.request(`/jobs/${jobId}`);
  }

  // ── Status Updates ──
  async updateJobStatus(jobId: string, data: StatusUpdateRequest): Promise<StatusUpdateResponse> {
    return this.request(`/jobs/${jobId}/status`, { method: 'POST', body: JSON.stringify(data) }, true, true);
  }

  // ── Proof Upload ──
  /**
   * Uploads proof file (photo, signature, document) to the n8n proof endpoint.
   * 
   * The n8n DRV-06 workflow receives this multipart upload and should:
   *   - Extract the file and metadata
   *   - Determine document_type from proof_type mapping:
   *       photo  → may be weighbridge ticket, POD, or general photo
   *       signature → pod (proof of delivery signature)
   *       document → maps to document_category field
   *   - Forward to WF04 (upload-document) webhook with:
   *       { job_id, document_type, fileName, fileSize, mimeType, uploaded_by: 'driver_app' }
   *   - WF04 handles MinIO upload, OCR, and triggers POD validation chain
   */
  async uploadProof(jobId: string, file: File, proofType: string, documentType?: string): Promise<ProofCompleteResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('proof_type', proofType);
    formData.append('timestamp_client', new Date().toISOString());
    formData.append('job_id', jobId);
    
    // Document type mapping for the n8n WF04 OCR pipeline
    // This tells n8n what kind of document this is for OCR routing
    if (documentType) {
      formData.append('document_type', documentType);
    } else {
      // Default mapping: signatures are POD, photos need manual classification
      const typeMap: Record<string, string> = {
        signature: 'pod',
        document: 'general',
      };
      formData.append('document_type', typeMap[proofType] || 'general');
    }

    const headers = await this.getHeaders(true) as Record<string, string>;
    delete headers['Content-Type']; // Let browser set multipart boundary

    const res = await fetch(`${this.baseUrl}/jobs/${jobId}/proof`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': this.idempotencyKey() },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.message || err.error || 'Upload failed');
    }

    return res.json();
  }

  // ── Sync ──
  async checkHealth(): Promise<SyncHealthResponse> {
    return this.request('/sync/health', {}, false);
  }

  async syncBatch(data: SyncBatchRequest): Promise<SyncBatchResponse> {
    return this.request('/sync/batch', { method: 'POST', body: JSON.stringify(data) });
  }

  // ── Utility ──
  isAuthenticated(): boolean { return !!this.accessToken; }
  getAccessToken(): string | null { return this.accessToken; }
}

export const apiClient = new ApiClient(API_BASE_URL);

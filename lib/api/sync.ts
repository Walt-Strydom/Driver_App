import { apiClient } from './client';
import {
  getOutboxEvents,
  getOutboxProof,
  removeEventFromOutbox,
  removeProofFromOutbox,
  removeProofFile,
  getProofFile,
  updateLastSyncTime,
  getOutboxCount,
  getCachedJobs,
  cacheJobs,
} from '@/lib/db';
import type { SyncBatchRequest } from '@/types';

export class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  // Subscribe to sync status updates
  onSyncStatusChange(callback: (status: SyncStatus) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(callback => callback(status));
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'No internet connection' };
    }

    this.isSyncing = true;
    this.notifyListeners({ syncing: true, progress: 0 });

    try {
      // Get pending items
      const [events, proof] = await Promise.all([
        getOutboxEvents(),
        getOutboxProof(),
      ]);

      if (events.length === 0 && proof.length === 0) {
        this.notifyListeners({ syncing: false, progress: 100 });
        return { success: true, message: 'Nothing to sync' };
      }

      this.notifyListeners({ syncing: true, progress: 20 });

      // Prepare batch request
      const batchRequest: SyncBatchRequest = {
        queued_events: events,
        queued_proof: proof.map(p => ({
          ...p,
          blob: undefined, // Remove blob from request, will upload separately
        })),
      };

      // Send batch
      const response = await apiClient.syncBatch(batchRequest);
      
      this.notifyListeners({ syncing: true, progress: 60 });

      // Remove successfully synced events
      const successfulEventIds = events
        .filter(e => !response.failed.find(f => f.id === e.client_event_id))
        .map(e => e.client_event_id);

      await Promise.all(
        successfulEventIds.map(id => removeEventFromOutbox(id))
      );

      // Handle proof uploads
      const successfulProofIds = proof
        .filter(p => !response.failed.find(f => f.id === p.proof_id))
        .map(p => p.proof_id);

      for (const proofId of successfulProofIds) {
        const proofItem = proof.find(p => p.proof_id === proofId);
        if (proofItem?.blob) {
          // Upload file if it exists
          await this.uploadProofFile(proofItem.jobId, proofItem);
        }
        await removeProofFromOutbox(proofId);
      }

      this.notifyListeners({ syncing: true, progress: 90 });

      // Update last sync time
      await updateLastSyncTime();

      // Refresh jobs list
      await this.refreshJobs();

      this.notifyListeners({ syncing: false, progress: 100 });

      const message = response.failed.length > 0
        ? `Synced ${response.accepted.events + response.accepted.proof} items, ${response.failed.length} failed`
        : `Successfully synced ${response.accepted.events + response.accepted.proof} items`;

      return {
        success: true,
        message,
        synced: response.accepted.events + response.accepted.proof,
        failed: response.failed.length,
      };
    } catch (error) {
      this.notifyListeners({ syncing: false, progress: 0, error: (error as Error).message });
      return {
        success: false,
        message: (error as Error).message || 'Sync failed',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async uploadProofFile(jobId: string, proofItem: any): Promise<void> {
    try {
      const blob = await getProofFile(proofItem.proof_id);
      if (!blob) return;

      const file = new File([blob], proofItem.file_name || 'proof.jpg', {
        type: proofItem.content_type || 'image/jpeg',
      });

      await apiClient.uploadProof(jobId, file, proofItem.proof_type);
      await removeProofFile(proofItem.proof_id);
    } catch (error) {
      console.error('Failed to upload proof file:', error);
      throw error;
    }
  }

  async refreshJobs(): Promise<void> {
    try {
      const response = await apiClient.getJobs('all');
      await cacheJobs(response.items);
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    }
  }

  async getPendingCount(): Promise<{ events: number; proof: number; total: number }> {
    const count = await getOutboxCount();
    return {
      ...count,
      total: count.events + count.proof,
    };
  }

  async hasPendingItems(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count.total > 0;
  }
}

export interface SyncStatus {
  syncing: boolean;
  progress: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  synced?: number;
  failed?: number;
}

export const syncService = new SyncService();

// Auto-sync on connectivity change
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncService.sync();
  });
}

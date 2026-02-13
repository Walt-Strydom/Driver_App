import { ALLOWED_TRANSITIONS } from '@/types';
import type { JobStatus, GPSCoordinates } from '@/types';

// GPS
export async function getCurrentLocation(): Promise<GPSCoordinates | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

// Image Compression
export async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Compress failed')), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

// Status Transitions
export function canTransitionTo(current: JobStatus, target: JobStatus): boolean {
  return (ALLOWED_TRANSITIONS[current] || []).includes(target);
}

export function getNextAllowedStatuses(current: JobStatus): JobStatus[] {
  return ALLOWED_TRANSITIONS[current] || [];
}

export function getStatusColor(status: JobStatus): { variant: string; className: string } {
  const map: Record<JobStatus, { variant: string; className: string }> = {
    ASSIGNED:    { variant: 'info',    className: 'bg-blue-100 text-blue-800' },
    ACCEPTED:    { variant: 'success', className: 'bg-green-100 text-green-800' },
    EN_ROUTE:    { variant: 'primary', className: 'bg-purple-100 text-purple-800' },
    ARRIVED:     { variant: 'warning', className: 'bg-yellow-100 text-yellow-800' },
    IN_PROGRESS: { variant: 'warning', className: 'bg-orange-100 text-orange-800' },
    COMPLETED:   { variant: 'success', className: 'bg-emerald-100 text-emerald-800' },
    FAILED:      { variant: 'danger',  className: 'bg-red-100 text-red-800' },
    CANCELLED:   { variant: 'default', className: 'bg-gray-100 text-gray-800' },
  };
  return map[status] || { variant: 'default', className: 'bg-gray-100 text-gray-800' };
}

export function getStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    ASSIGNED: 'Assigned', ACCEPTED: 'Accepted', EN_ROUTE: 'En Route',
    ARRIVED: 'Arrived', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
    FAILED: 'Failed', CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

// Date / Time (South African locale)
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
}

export function getRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

// UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Network
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Phone
export function formatPhoneNumber(phone: string): string {
  const c = phone.replace(/\D/g, '');
  if (c.startsWith('27')) return `+${c.slice(0,2)} ${c.slice(2,4)} ${c.slice(4,7)} ${c.slice(7)}`;
  if (c.startsWith('0')) return `${c.slice(0,3)} ${c.slice(3,6)} ${c.slice(6)}`;
  return phone;
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^(0\d{9}|27\d{9})$/.test(phone.replace(/\D/g, ''));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + s[i];
}

// Deep Links
export function getGoogleMapsLink(address: string, coords?: GPSCoordinates): string {
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getPhoneCallLink(phone: string): string {
  return `tel:${phone.replace(/\D/g, '')}`;
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const c = phone.replace(/\D/g, '');
  return `https://wa.me/${c}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

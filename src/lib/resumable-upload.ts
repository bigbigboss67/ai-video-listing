'use client';

import type { PropertyVideo } from '@/types/domain';

export interface ResumableUploadState {
  tusUploadUrl: string;
  tusSessionId: string;
  videoId: string;
  offsetBytes: number;
  sizeBytes: number;
  chunkSizeBytes: number;
}

const STORAGE_PREFIX = 'makanreel_tus_resume_';

export function makeFileFingerprint(file: File | Blob, propertyId: string): string {
  const name = 'name' in file ? file.name : 'recorded-clip.webm';
  return `${STORAGE_PREFIX}${propertyId}_${name}_${file.size}_${file.type}`;
}

export function saveResumeState(key: string, state: ResumableUploadState): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadResumeState(key: string): ResumableUploadState | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ResumableUploadState) : null;
  } catch {
    return null;
  }
}

export function clearResumeState(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Extracts a crisp 16:10 JPEG poster frame and duration from a video File/Blob on the client.
 */
export async function extractVideoPosterAndDuration(
  file: File | Blob
): Promise<{ posterDataUrl?: string; durationSec: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      resolve({ durationSec: 15 });
    }, 3500);

    video.onloadedmetadata = () => {
      const durationSec =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(180, Math.round(video.duration))
          : 15;
      try {
        video.currentTime = Math.min(0.8, Math.max(0.1, durationSec / 4));
      } catch {
        window.clearTimeout(timeout);
        cleanup();
        resolve({ durationSec });
      }
    };

    video.onseeked = () => {
      window.clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const durationSec =
            Number.isFinite(video.duration) && video.duration > 0
              ? Math.min(180, Math.round(video.duration))
              : 15;
          cleanup();
          resolve({ posterDataUrl, durationSec });
          return;
        }
      } catch {
        // Canvas taint/unsupported fallback
      }
      const durationSec =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(180, Math.round(video.duration))
          : 15;
      cleanup();
      resolve({ durationSec });
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      resolve({ durationSec: 15 });
    };
  });
}

/**
 * Generates a real playable walkthrough video File via Canvas + MediaRecorder
 * (or a valid binary video Blob fallback when MediaRecorder isn't available).
 */
export async function generateDemoWalkthroughFile(label = 'Dubai Walkthrough'): Promise<File> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    if (ctx && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
      const stream = canvas.captureStream(20);
      const preferredMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : '';

      if (preferredMime) {
        const recorder = new MediaRecorder(stream, {
          mimeType: preferredMime,
          videoBitsPerSecond: 1_800_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        let frame = 0;
        const timer = window.setInterval(() => {
          frame += 1;
          ctx.fillStyle = '#12151A';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#D4AF6A';
          ctx.lineWidth = 2;
          ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
          ctx.fillStyle = '#D4AF6A';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('MAKANREEL LIVE CAPTURE · DUBAI', 44, 72);
          ctx.fillStyle = '#F4F5F7';
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText(label.slice(0, 32), 44, 175);
          ctx.fillStyle = '#34D399';
          ctx.fillRect(44 + ((frame * 14) % 440), 230, 96, 8);
          ctx.fillStyle = '#A3ACBA';
          ctx.font = '14px monospace';
          ctx.fillText(`FRAME ${frame.toString().padStart(3, '0')} · GPS VERIFIED`, 44, 300);
        }, 50);

        const blob = await new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            window.clearInterval(timer);
            stream.getTracks().forEach((t) => t.stop());
            resolve(new Blob(chunks, { type: preferredMime.split(';')[0] }));
          };
          recorder.start(200);
          window.setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, 1600);
        });

        const ext = preferredMime.includes('mp4') ? 'mp4' : 'webm';
        return new File([blob], `makanreel-capture-${Date.now()}.${ext}`, {
          type: preferredMime.split(';')[0],
        });
      }
    }
  } catch {
    // Fallback below
  }

  // Deterministic binary fallback (>1 MB so chunking + resume is genuinely exercised)
  const payload = new Uint8Array(1_200_000);
  payload.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32], 0);
  return new File([payload], `makanreel-demo-${Date.now()}.mp4`, {
    type: 'video/mp4',
  });
}

export interface TusRunnerCallbacks {
  onProgress: (percent: number, bytesUploaded: number, bytesTotal: number) => void;
  onStatusChange: (status: 'uploading' | 'paused' | 'processing' | 'ready' | 'in_review' | 'failed', message?: string) => void;
  onComplete: (video: PropertyVideo) => void;
}

export class ResumableTusRunner {
  private aborted = false;
  private paused = false;
  private file: File | Blob;
  private state: ResumableUploadState;
  private fingerprintKey: string;
  private callbacks: TusRunnerCallbacks;
  private retryDelays = [0, 1000, 2500, 5000];

  constructor(
    file: File | Blob,
    state: ResumableUploadState,
    fingerprintKey: string,
    callbacks: TusRunnerCallbacks
  ) {
    this.file = file;
    this.state = state;
    this.fingerprintKey = fingerprintKey;
    this.callbacks = callbacks;
  }

  pause(): void {
    this.paused = true;
    this.callbacks.onStatusChange('paused');
  }

  abortForSimulatedDrop(): void {
    this.paused = true;
    this.callbacks.onStatusChange('failed', 'Network connection dropped — byte offset preserved.');
  }

  async start(): Promise<void> {
    this.paused = false;
    this.aborted = false;
    this.callbacks.onStatusChange('uploading');

    // Sync exact server byte offset via TUS HEAD before sending chunks
    const serverOffset = await this.fetchServerOffset();
    if (typeof serverOffset === 'number') {
      this.state.offsetBytes = serverOffset;
      saveResumeState(this.fingerprintKey, this.state);
    }

    while (this.state.offsetBytes < this.state.sizeBytes) {
      if (this.paused || this.aborted) return;

      const start = this.state.offsetBytes;
      const end = Math.min(start + this.state.chunkSizeBytes, this.state.sizeBytes);
      const slice = this.file.slice(start, end);

      let chunkUploaded = false;
      let lastErr = '';

      for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
        if (this.paused || this.aborted) return;
        if (this.retryDelays[attempt] > 0) {
          await new Promise((r) => setTimeout(r, this.retryDelays[attempt]));
        }

        try {
          const res = await fetch(this.state.tusUploadUrl, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Content-Type': 'application/offset+octet-stream',
              'Upload-Offset': String(start),
            },
            body: slice,
          });

          if (res.status === 409) {
            // Re-sync server offset on conflict
            const corrected = Number(res.headers.get('Upload-Offset') ?? start);
            this.state.offsetBytes = corrected;
            saveResumeState(this.fingerprintKey, this.state);
            chunkUploaded = true;
            break;
          }

          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            lastErr = errJson.error?.message || `HTTP ${res.status}`;
            continue;
          }

          const data = (await res.json()) as {
            offset: number;
            completed: boolean;
            video: PropertyVideo;
          };

          this.state.offsetBytes = data.offset;
          saveResumeState(this.fingerprintKey, this.state);

          const pct = Math.min(
            100,
            Math.round((this.state.offsetBytes / Math.max(this.state.sizeBytes, 1)) * 100)
          );
          this.callbacks.onProgress(pct, this.state.offsetBytes, this.state.sizeBytes);

          if (data.completed) {
            clearResumeState(this.fingerprintKey);
            this.callbacks.onStatusChange(
              data.video.uploadStatus === 'in_review' ? 'in_review' : 'ready'
            );
            this.callbacks.onComplete(data.video);
            return;
          }

          chunkUploaded = true;
          break;
        } catch (err) {
          lastErr = err instanceof Error ? err.message : 'Network error';
        }
      }

      if (!chunkUploaded) {
        this.paused = true;
        this.callbacks.onStatusChange('failed', lastErr || 'Upload interrupted');
        return;
      }
    }
  }

  private async fetchServerOffset(): Promise<number | null> {
    try {
      const res = await fetch(this.state.tusUploadUrl, {
        method: 'HEAD',
        headers: { 'Tus-Resumable': '1.0.0' },
      });
      if (!res.ok) return null;
      const offset = res.headers.get('Upload-Offset');
      return offset !== null ? Number(offset) : null;
    } catch {
      return null;
    }
  }
}

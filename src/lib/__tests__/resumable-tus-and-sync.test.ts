import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendTusChunk,
  createEnquiry,
  createVideoUploadSession,
  eraseUserData,
  exportUserData,
  finalizeVideoProcessing,
  getTusSession,
  moderateVideo,
  resetLocalStoreForTests,
} from '@/lib/store';
import { getDemoUser } from '@/lib/auth';
import { realtimeBroker } from '@/lib/realtime-broker';
import type { RealtimeEvent } from '@/types/domain';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';

describe('Resumable TUS Upload, Live Sync & PDPL Regression Suite', () => {
  beforeEach(() => {
    resetLocalStoreForTests();
  });

  it('resumes chunked uploads from exact byte offset after drop and broadcasts video.ready', () => {
    const events: RealtimeEvent[] = [];
    const unsub = realtimeBroker.subscribe((ev) => events.push(ev));

    const verifiedAgent = getDemoUser('verified_agent');
    const chunk1 = Buffer.alloc(1024, 0x11);
    const chunk2 = Buffer.alloc(1024, 0x22);
    const totalSize = chunk1.length + chunk2.length;

    const created = createVideoUploadSession({
      propertyId: 'prop-001',
      actor: verifiedAgent,
      filename: 'palm-villa-walkthrough.mp4',
      mimeType: 'video/mp4',
      sizeBytes: totalSize,
      durationSec: 45,
      captureLat: 25.1186,
      captureLng: 55.1347,
    });
    expect(created).not.toBeNull();
    const tusId = created!.tusSession.id;

    // Upload first chunk (0 -> 1024)
    const firstRes = appendTusChunk(tusId, 0, chunk1);
    expect(firstRes.ok).toBe(true);
    if (firstRes.ok) {
      expect(firstRes.session.offsetBytes).toBe(1024);
      expect(firstRes.session.completed).toBe(false);
    }

    // Simulate network drop and stale retry from offset 0 -> server must reject with 409 & current offset
    const conflictRes = appendTusChunk(tusId, 0, chunk1);
    expect(conflictRes.ok).toBe(false);
    if (!conflictRes.ok) {
      expect(conflictRes.status).toBe(409);
      expect(conflictRes.currentOffset).toBe(1024);
    }

    // Resume from server's authoritative offset (1024 -> 2048)
    const serverState = getTusSession(tusId);
    expect(serverState?.offsetBytes).toBe(1024);
    const secondRes = appendTusChunk(tusId, serverState!.offsetBytes, chunk2);
    expect(secondRes.ok).toBe(true);
    if (secondRes.ok) {
      expect(secondRes.session.completed).toBe(true);
    }

    // Finalize for verified agent -> direct live publish
    const finalized = finalizeVideoProcessing(
      created!.video.id,
      verifiedAgent,
      true
    );
    expect(finalized?.uploadStatus).toBe('ready');
    expect(finalized?.moderationStatus).toBe('approved');
    expect(events.some((e) => e.type === 'video.ready' && e.videoId === created!.video.id)).toBe(
      true
    );

    unsub();
  });

  it('routes standard agent uploads to moderation queue and publishes live upon admin approval', () => {
    const standardAgent = getDemoUser('agent');
    const admin = getDemoUser('admin');

    const created = createVideoUploadSession({
      propertyId: 'prop-002',
      actor: standardAgent,
      filename: 'opera-penthouse.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 512,
      durationSec: 32,
    });
    expect(created).not.toBeNull();

    appendTusChunk(created!.tusSession.id, 0, Buffer.alloc(512, 0x33));
    const queued = finalizeVideoProcessing(created!.video.id, standardAgent, false);
    expect(queued?.uploadStatus).toBe('in_review');
    expect(queued?.moderationStatus).toBe('pending');

    const approved = moderateVideo(created!.video.id, 'approve', admin);
    expect(approved?.uploadStatus).toBe('ready');
    expect(approved?.moderationStatus).toBe('approved');
  });

  it('exports and permanently erases user personal data per UAE PDPL & GDPR', () => {
    const viewer = getDemoUser('viewer');
    const enq = createEnquiry(
      {
        propertyId: 'prop-001',
        name: viewer.fullName,
        email: viewer.email,
        phone: '+971509998877',
        channel: 'form',
        watchTimeSec: 42,
        message: 'Private viewing request',
        privacyConsent: true,
        marketingOptIn: false,
      },
      viewer
    );
    expect(enq).not.toBeNull();
    // Consent evidence is stamped server-side with the notice version shown.
    expect(enq?.privacyConsentAt).toBeTruthy();
    expect(enq?.privacyNoticeVersion).toBe(PRIVACY_NOTICE_VERSION);
    expect(enq?.marketingOptIn).toBe(false);

    const exported = exportUserData(viewer);
    expect(exported.enquiries.length).toBeGreaterThanOrEqual(1);

    const receipt = eraseUserData(viewer);
    expect(receipt.erasedEnquiries).toBeGreaterThanOrEqual(1);
    expect(receipt.erasedReceiptId).toMatch(/^aud-/);

    const afterErase = exportUserData(viewer);
    expect(afterErase.enquiries.length).toBe(0);
  });
});

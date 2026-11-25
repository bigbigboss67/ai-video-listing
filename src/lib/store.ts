import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  SEED_AUDIT_LOGS,
  SEED_ENQUIRIES,
  SEED_PROPERTIES,
  SEED_VIDEOS,
  makeArchitecturalPoster,
} from './seed-data';
import { slugify, toAed } from './format';
import { parseDldPermitLink } from './dld-permit';
import { realtimeBroker } from './realtime-broker';
import { DEFAULT_DEMO_PASSWORD, DEMO_PROFILES } from './demo-accounts';
import { hashPassword } from './password';
import type {
  AuditLog,
  Enquiry,
  ModerationStatus,
  PermitStatus,
  PaginatedResponse,
  Property,
  PropertyStatus,
  PropertyType,
  PropertyVideo,
  PropertyWithVideos,
  SessionUser,
  UserRole,
  VideoUploadStatus,
} from '@/types/domain';
import type { CreateEnquiryInput, CreatePropertyInput } from './validation';

export interface TusSessionRecord {
  id: string;
  videoId: string;
  propertyId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  offsetBytes: number;
  filePath: string;
  completed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface UserRecord extends SessionUser {
  passwordHash: string;
  /** Bumped to revoke every outstanding session cookie for this user. */
  sessionVersion: number;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface LocalDatabase {
  users: UserRecord[];
  properties: Property[];
  videos: PropertyVideo[];
  enquiries: Enquiry[];
  auditLogs: AuditLog[];
  tusSessions: Record<string, TusSessionRecord>;
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.join(os.tmpdir(), 'makanreel-data')
    : path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let demoHashCache: { password: string; hash: string } | null = null;

/**
 * Seed login accounts:
 *  - Demo accounts (one per role) only outside production.
 *  - A bootstrap admin from BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (any env).
 * Returns true when users were added.
 */
function seedUsers(db: LocalDatabase): boolean {
  let changed = false;
  const now = new Date().toISOString();

  if (process.env.NODE_ENV !== 'production') {
    const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || DEFAULT_DEMO_PASSWORD;
    if (!demoHashCache || demoHashCache.password !== demoPassword) {
      demoHashCache = { password: demoPassword, hash: hashPassword(demoPassword) };
    }
    for (const profile of Object.values(DEMO_PROFILES)) {
      if (db.users.some((u) => u.id === profile.id || u.email === profile.email)) continue;
      db.users.push({
        ...structuredClone(profile),
        passwordHash: demoHashCache.hash,
        sessionVersion: 1,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
    }
  }

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword && bootstrapPassword.length >= 10) {
    if (!db.users.some((u) => u.email === bootstrapEmail)) {
      db.users.push({
        id: `usr-${crypto.randomUUID()}`,
        role: 'admin',
        fullName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Platform Administrator',
        email: bootstrapEmail,
        locale: 'en',
        passwordHash: hashPassword(bootstrapPassword),
        sessionVersion: 1,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
    }
  }
  return changed;
}

/**
 * Stores created before permit review existed carry a portal-generated QR link (which 404s)
 * and a "verified" flag set from the permit number alone. Drop the fake link and the badge;
 * a real DLD link already on file is kept but goes back to review.
 */
function upgradeLegacyPermitFields(db: LocalDatabase): boolean {
  let changed = false;
  for (const prop of db.properties) {
    if (prop.permitStatus) continue;
    const link = parseDldPermitLink(prop.madmounQrUrl);
    prop.madmounQrUrl = link.ok ? link.url : '';
    prop.permitStatus = link.ok ? 'pending' : 'not_submitted';
    prop.isVerified = false;
    changed = true;
  }
  return changed;
}

function createInitialDb(): LocalDatabase {
  const db: LocalDatabase = {
    users: [],
    properties: structuredClone(SEED_PROPERTIES),
    videos: structuredClone(SEED_VIDEOS),
    enquiries: structuredClone(SEED_ENQUIRIES),
    auditLogs: structuredClone(SEED_AUDIT_LOGS),
    tusSessions: {},
  };
  seedUsers(db);
  return db;
}

const globalForDb = globalThis as unknown as {
  __makanreelDb?: LocalDatabase;
};

function loadDb(): LocalDatabase {
  if (globalForDb.__makanreelDb) return globalForDb.__makanreelDb;
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (Array.isArray(parsed.properties) && Array.isArray(parsed.videos)) {
        // Backward-compatible upgrade of stores created before user accounts existed
        if (!Array.isArray(parsed.users)) parsed.users = [];
        const usersAdded = seedUsers(parsed);
        const permitsUpgraded = upgradeLegacyPermitFields(parsed);
        if (usersAdded || permitsUpgraded) persistDb(parsed);
        globalForDb.__makanreelDb = parsed;
        return parsed;
      }
    } catch {
      // Fall back to fresh seed if corrupted
    }
  }
  const initial = createInitialDb();
  persistDb(initial);
  globalForDb.__makanreelDb = initial;
  return initial;
}

function persistDb(db: LocalDatabase): void {
  ensureDirs();
  const tmpFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function resetLocalStoreForTests(): void {
  const initial = createInitialDb();
  globalForDb.__makanreelDb = initial;
  persistDb(initial);
}

export function getUploadsDir(): string {
  ensureDirs();
  return UPLOADS_DIR;
}

function hydrateProperty(db: LocalDatabase, prop: Property): PropertyWithVideos {
  const videos = db.videos
    .filter((v) => v.propertyId === prop.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const enquiryCount = db.enquiries.filter((e) => e.propertyId === prop.id).length;
  return { ...prop, videos, enquiryCount };
}

export interface PropertyFilterParams {
  q?: string;
  propertyType?: PropertyType | 'all';
  status?: PropertyStatus | 'all';
  minPriceAed?: number;
  maxPriceAed?: number;
  minBeds?: number;
  verifiedOnly?: boolean;
  includeUnpublished?: boolean;
  bounds?: { north: number; south: number; east: number; west: number };
  cursor?: string;
  limit?: number;
}

export function listProperties(
  params: PropertyFilterParams = {}
): PaginatedResponse<PropertyWithVideos> {
  const db = loadDb();
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 50);

  let hydrated = db.properties.map((p) => hydrateProperty(db, p));

  if (!params.includeUnpublished) {
    // Public discovery shows properties with at least one ready video OR verified seeded properties
    hydrated = hydrated.map((p) => ({
      ...p,
      videos: p.videos.filter(
        (v) => v.uploadStatus === 'ready' && v.moderationStatus === 'approved'
      ),
    }));
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim().toLowerCase();
    hydrated = hydrated.filter(
      (p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleAr.toLowerCase().includes(q) ||
        p.community.toLowerCase().includes(q) ||
        p.addressEn.toLowerCase().includes(q) ||
        p.permitNumber.toLowerCase().includes(q)
    );
  }

  if (params.propertyType && params.propertyType !== 'all') {
    hydrated = hydrated.filter((p) => p.propertyType === params.propertyType);
  }

  if (params.status && params.status !== 'all') {
    hydrated = hydrated.filter((p) => p.status === params.status);
  }

  if (typeof params.minPriceAed === 'number' && !Number.isNaN(params.minPriceAed)) {
    hydrated = hydrated.filter((p) => p.priceAed >= params.minPriceAed!);
  }

  if (typeof params.maxPriceAed === 'number' && !Number.isNaN(params.maxPriceAed)) {
    hydrated = hydrated.filter((p) => p.priceAed <= params.maxPriceAed!);
  }

  if (typeof params.minBeds === 'number' && params.minBeds > 0) {
    hydrated = hydrated.filter((p) => p.bedrooms >= params.minBeds!);
  }

  if (params.verifiedOnly) {
    hydrated = hydrated.filter((p) => p.isVerified && Boolean(p.permitNumber));
  }

  if (params.bounds) {
    const { north, south, east, west } = params.bounds;
    hydrated = hydrated.filter(
      (p) => p.lat <= north && p.lat >= south && p.lng <= east && p.lng >= west
    );
  }

  // Sort by most recently updated video or property timestamp
  hydrated.sort((a, b) => {
    const aTime = a.videos[0]?.updatedAt ?? a.updatedAt;
    const bTime = b.videos[0]?.updatedAt ?? b.updatedAt;
    return bTime.localeCompare(aTime);
  });

  const total = hydrated.length;
  let startIdx = 0;
  if (params.cursor) {
    const found = hydrated.findIndex((p) => p.id === params.cursor);
    if (found >= 0) startIdx = found + 1;
  }

  const pageItems = hydrated.slice(startIdx, startIdx + limit);
  const nextCursor =
    startIdx + limit < total ? pageItems[pageItems.length - 1]?.id ?? null : null;

  return { items: pageItems, total, nextCursor };
}

export function getPropertyBySlug(slug: string): PropertyWithVideos | null {
  const db = loadDb();
  const prop = db.properties.find((p) => p.slug === slug || p.id === slug);
  if (!prop) return null;
  return hydrateProperty(db, prop);
}

export function getPropertyById(id: string): PropertyWithVideos | null {
  const db = loadDb();
  const prop = db.properties.find((p) => p.id === id);
  if (!prop) return null;
  return hydrateProperty(db, prop);
}

export function appendAuditLog(entry: {
  actor: SessionUser;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): AuditLog {
  const db = loadDb();
  const log: AuditLog = {
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    actorId: entry.actor.id,
    actorName: entry.actor.fullName,
    actorRole: entry.actor.role,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  db.auditLogs = db.auditLogs.slice(0, 500);
  persistDb(db);
  return log;
}

export function createProperty(
  input: CreatePropertyInput,
  actor: SessionUser
): PropertyWithVideos {
  const db = loadDb();
  const id = `prop-${crypto.randomUUID().slice(0, 8)}`;
  const baseSlug = slugify(input.titleEn) || id;
  const slug = db.properties.some((p) => p.slug === baseSlug)
    ? `${baseSlug}-${id.slice(-4)}`
    : baseSlug;
  const now = new Date().toISOString();
  const priceAed = toAed(input.price, input.currency);
  const parsedPermitLink = parseDldPermitLink(input.madmounQrUrl);
  const initialPermitLink = parsedPermitLink.ok ? parsedPermitLink.url : '';

  const prop: Property = {
    id,
    slug,
    ownerId: actor.id,
    agentName: actor.fullName,
    agentOrg: actor.orgName ?? 'MakanReel Advisory Dubai',
    agentOrn: actor.orn ?? 'ORN-29410',
    agentBrn: actor.brn ?? 'BRN-58914',
    agentWhatsapp: actor.whatsappNumber ?? '+971504445566',
    titleEn: input.titleEn,
    titleAr: input.titleAr?.trim() || input.titleEn,
    descriptionEn: input.descriptionEn,
    descriptionAr: input.descriptionAr?.trim() || input.descriptionEn,
    propertyType: input.propertyType,
    priceAed,
    originalPrice: input.price,
    currency: input.currency,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    areaSqft: input.areaSqft,
    status: input.status,
    ownership: input.ownership,
    availability: input.availability,
    permitNumber: input.permitNumber,
    // Only the link from the agent's own DLD QR; the portal never builds one from the permit number.
    madmounQrUrl: initialPermitLink,
    developerName: input.developerName,
    projectNumber: input.projectNumber,
    escrowAccount: input.escrowAccount,
    estNetYieldPct: input.estNetYieldPct ?? 7.2,
    serviceChargeAedSqft: input.serviceChargeAedSqft ?? 18,
    paymentPlan: input.paymentPlan ?? (input.status === 'off_plan' ? '60/40 Construction Plan' : 'Standard Transfer'),
    addressEn: input.addressEn,
    addressAr: input.addressAr?.trim() || input.addressEn,
    community: input.community,
    lat: input.lat,
    lng: input.lng,
    // Verified only after an admin approves the DLD permit link.
    isVerified: false,
    permitStatus: initialPermitLink ? 'pending' : 'not_submitted',
    ...(initialPermitLink ? { permitReview: { submittedAt: now, submittedById: actor.id } } : {}),
    galleryUrls: [makeArchitecturalPoster(input.titleEn, input.community)],
    units: [
      {
        id: `u-${crypto.randomUUID().slice(0, 6)}`,
        unitCode: `UNIT-${id.slice(-4).toUpperCase()}`,
        floor: input.propertyType === 'villa' ? 'G+1' : 'Primary',
        bedrooms: input.bedrooms,
        areaSqft: input.areaSqft,
        priceAed,
        status: input.availability === 'sold' ? 'sold' : 'available',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  db.properties.unshift(prop);
  persistDb(db);

  appendAuditLog({
    actor,
    action: 'property.created',
    entityType: 'property',
    entityId: prop.id,
    metadata: {
      permitNumber: prop.permitNumber,
      community: prop.community,
      priceAed: prop.priceAed,
    },
  });

  const hydrated = hydrateProperty(db, prop);
  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: 'property.created',
    timestamp: now,
    propertyId: prop.id,
    property: hydrated,
  });

  return hydrated;
}

// ---------------------------------------------------------------------------
// DLD permit link review
// ---------------------------------------------------------------------------

export type PermitReviewAction = 'approve' | 'reject';

export class PermitReviewError extends Error {
  constructor(
    public readonly code: 'NO_PERMIT_LINK' | 'INVALID_PERMIT_LINK',
    message: string
  ) {
    super(message);
    this.name = 'PermitReviewError';
  }
}

function publishPropertyUpdated(db: LocalDatabase, prop: Property, now: string): PropertyWithVideos {
  // No property payload: the SSE stream is public and the hydrated record includes unpublished videos.
  // Listeners (e.g. the dashboard) refetch through their own authorised endpoints.
  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: 'property.updated',
    timestamp: now,
    propertyId: prop.id,
  });
  return hydrateProperty(db, prop);
}

/**
 * Store the link from the agent's DLD Madmoun QR and send it to admin review.
 * Any change of link removes the verified badge until an admin approves the new one.
 * Authorization (owner or admin) is enforced by the API route.
 */
export function submitPermitLink(
  propertyId: string,
  rawLink: string,
  actor: SessionUser
): PropertyWithVideos | null {
  const parsed = parseDldPermitLink(rawLink);
  if (!parsed.ok) throw new PermitReviewError('INVALID_PERMIT_LINK', `Invalid DLD link (${parsed.code}).`);
  const db = loadDb();
  const prop = db.properties.find((p) => p.id === propertyId);
  if (!prop) return null;

  const now = new Date().toISOString();
  const previousStatus = prop.permitStatus;
  prop.madmounQrUrl = parsed.url;
  prop.permitStatus = 'pending';
  prop.isVerified = false;
  prop.permitReview = { submittedAt: now, submittedById: actor.id };
  prop.updatedAt = now;
  persistDb(db);

  appendAuditLog({
    actor,
    action: 'permit.submitted',
    entityType: 'property',
    entityId: prop.id,
    metadata: {
      permitNumber: prop.permitNumber,
      previousStatus,
      looksLikeMadmoun: parsed.looksLikeMadmoun,
    },
  });
  return publishPropertyUpdated(db, prop, now);
}

/** Admin decision on a submitted DLD permit link. Approval is what turns the verified badge on. */
export function reviewPermit(
  propertyId: string,
  action: PermitReviewAction,
  actor: SessionUser,
  reason?: string
): PropertyWithVideos | null {
  const db = loadDb();
  const prop = db.properties.find((p) => p.id === propertyId);
  if (!prop) return null;
  if (!prop.madmounQrUrl) {
    throw new PermitReviewError('NO_PERMIT_LINK', 'The agent has not submitted a DLD permit link yet.');
  }
  if (action === 'approve' && !parseDldPermitLink(prop.madmounQrUrl).ok) {
    throw new PermitReviewError('INVALID_PERMIT_LINK', 'The stored link is not a DLD Trakheesi link.');
  }

  const now = new Date().toISOString();
  const previousStatus = prop.permitStatus;
  const nextStatus: PermitStatus = action === 'approve' ? 'approved' : 'rejected';
  prop.permitStatus = nextStatus;
  prop.isVerified = nextStatus === 'approved';
  prop.permitReview = {
    ...prop.permitReview,
    reviewedAt: now,
    reviewedById: actor.id,
    reviewedByName: actor.fullName,
    reason: action === 'reject' ? reason?.trim() || undefined : undefined,
  };
  prop.updatedAt = now;
  persistDb(db);

  appendAuditLog({
    actor,
    action: action === 'approve' ? 'permit.approved' : 'permit.rejected',
    entityType: 'property',
    entityId: prop.id,
    metadata: {
      permitNumber: prop.permitNumber,
      previousStatus,
      ...(prop.permitReview.reason ? { reason: prop.permitReview.reason } : {}),
    },
  });
  return publishPropertyUpdated(db, prop, now);
}

export interface PermitQueueRow {
  propertyId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  community: string;
  agentName: string;
  agentBrn: string;
  ownerId: string;
  permitNumber: string;
  madmounQrUrl: string;
  looksLikeMadmoun: boolean;
  permitStatus: PermitStatus;
  permitReview?: Property['permitReview'];
  updatedAt: string;
}

/**
 * Listings with their permit review state. Admins see every listing; other roles see only
 * their own. Pending items come first.
 */
export function listPermitRows(viewer: SessionUser, seeAll: boolean): PermitQueueRow[] {
  const db = loadDb();
  const order: Record<PermitStatus, number> = { pending: 0, rejected: 1, not_submitted: 2, approved: 3 };
  return db.properties
    .filter((p) => seeAll || p.ownerId === viewer.id)
    .map((p) => {
      const link = parseDldPermitLink(p.madmounQrUrl);
      return {
        propertyId: p.id,
        slug: p.slug,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        community: p.community,
        agentName: p.agentName,
        agentBrn: p.agentBrn,
        ownerId: p.ownerId,
        permitNumber: p.permitNumber,
        madmounQrUrl: p.madmounQrUrl,
        looksLikeMadmoun: link.ok && link.looksLikeMadmoun,
        permitStatus: p.permitStatus ?? 'not_submitted',
        permitReview: p.permitReview,
        updatedAt: p.updatedAt,
      };
    })
    .sort(
      (a, b) =>
        order[a.permitStatus] - order[b.permitStatus] || b.updatedAt.localeCompare(a.updatedAt)
    );
}

export function createVideoUploadSession(params: {
  propertyId: string;
  actor: SessionUser;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  posterDataUrl?: string;
  captureLat?: number;
  captureLng?: number;
}): { video: PropertyVideo; tusSession: TusSessionRecord } | null {
  const db = loadDb();
  const property = db.properties.find((p) => p.id === params.propertyId);
  if (!property) return null;

  const now = new Date().toISOString();
  const videoId = `vid-${crypto.randomUUID().slice(0, 8)}`;
  const tusId = `tus-${crypto.randomUUID().slice(0, 12)}`;
  const ext = params.mimeType.includes('webm')
    ? 'webm'
    : params.mimeType.includes('quicktime')
      ? 'mov'
      : 'mp4';
  const filePath = path.join(getUploadsDir(), `${tusId}.${ext}`);

  // Touch empty file for byte-offset appends
  fs.writeFileSync(filePath, Buffer.alloc(0));

  const video: PropertyVideo = {
    id: videoId,
    propertyId: property.id,
    uploaderId: params.actor.id,
    uploaderName: params.actor.fullName,
    provider: 'local_tus',
    providerAssetId: tusId,
    uploadStatus: 'uploading',
    uploadProgressPct: 0,
    moderationStatus: 'pending',
    playbackUrl: `/api/media/${tusId}`,
    posterUrl:
      params.posterDataUrl ||
      makeArchitecturalPoster(property.titleEn, property.community),
    durationSec: params.durationSec,
    sizeBytes: params.sizeBytes,
    mimeType: params.mimeType,
    captureLat: params.captureLat ?? property.lat,
    captureLng: params.captureLng ?? property.lng,
    consentAttestedAt: now,
    captionsEnUrl: `/api/captions/en?propertyId=${property.id}`,
    captionsArUrl: `/api/captions/ar?propertyId=${property.id}`,
    viewCount: 0,
    totalWatchSec: 0,
    createdAt: now,
    updatedAt: now,
  };

  const tusSession: TusSessionRecord = {
    id: tusId,
    videoId,
    propertyId: property.id,
    uploaderId: params.actor.id,
    filename: params.filename,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    offsetBytes: 0,
    filePath,
    completed: false,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    createdAt: now,
  };

  db.videos.unshift(video);
  db.tusSessions[tusId] = tusSession;
  persistDb(db);

  appendAuditLog({
    actor: params.actor,
    action: 'video.upload.initiated',
    entityType: 'property_video',
    entityId: video.id,
    metadata: {
      propertyId: property.id,
      sizeBytes: params.sizeBytes,
      mimeType: params.mimeType,
      consentAttestedAt: now,
    },
  });

  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: 'video.uploading',
    timestamp: now,
    propertyId: property.id,
    videoId: video.id,
    progressPct: 0,
    property: hydrateProperty(db, property),
    video,
  });

  return { video, tusSession };
}

export function getTusSession(tusId: string): TusSessionRecord | null {
  const db = loadDb();
  return db.tusSessions[tusId] ?? null;
}

export function getVideoById(videoId: string): PropertyVideo | null {
  const db = loadDb();
  return db.videos.find((v) => v.id === videoId) ?? null;
}

export function getVideoByAssetId(assetId: string): PropertyVideo | null {
  const db = loadDb();
  return db.videos.find((v) => v.providerAssetId === assetId) ?? null;
}

export function appendTusChunk(
  tusId: string,
  expectedOffset: number,
  chunk: Buffer
): { ok: true; session: TusSessionRecord; video: PropertyVideo } | { ok: false; status: number; message: string; currentOffset?: number } {
  const db = loadDb();
  const session = db.tusSessions[tusId];
  if (!session) {
    return { ok: false, status: 404, message: 'Upload session not found' };
  }
  if (session.offsetBytes !== expectedOffset) {
    return {
      ok: false,
      status: 409,
      message: `Upload-Offset mismatch. Expected ${session.offsetBytes}, got ${expectedOffset}`,
      currentOffset: session.offsetBytes,
    };
  }
  if (session.offsetBytes + chunk.length > session.sizeBytes) {
    return {
      ok: false,
      status: 413,
      message: 'Chunk exceeds declared upload size',
    };
  }

  // Write chunk at exact byte offset for idempotent resumability
  const fd = fs.openSync(session.filePath, 'r+');
  try {
    fs.writeSync(fd, chunk, 0, chunk.length, expectedOffset);
  } finally {
    fs.closeSync(fd);
  }

  session.offsetBytes += chunk.length;
  const pct = Math.min(
    100,
    Math.round((session.offsetBytes / Math.max(session.sizeBytes, 1)) * 100)
  );
  const video = db.videos.find((v) => v.id === session.videoId);
  const property = db.properties.find((p) => p.id === session.propertyId);

  if (video) {
    video.uploadProgressPct = pct;
    video.updatedAt = new Date().toISOString();
    if (session.offsetBytes >= session.sizeBytes) {
      session.completed = true;
      video.uploadStatus = 'processing';
    }
  }
  persistDb(db);

  if (video && property) {
    realtimeBroker.publish({
      id: crypto.randomUUID(),
      type: session.completed ? 'video.processing' : 'video.uploading',
      timestamp: video.updatedAt,
      propertyId: property.id,
      videoId: video.id,
      progressPct: pct,
      property: hydrateProperty(db, property),
      video,
    });
  }

  return { ok: true, session, video: video! };
}

export function finalizeVideoProcessing(
  videoId: string,
  actor: SessionUser,
  directPublish: boolean
): PropertyVideo | null {
  const db = loadDb();
  const video = db.videos.find((v) => v.id === videoId);
  if (!video) return null;
  const property = db.properties.find((p) => p.id === video.propertyId);
  if (!property) return null;

  const now = new Date().toISOString();
  video.uploadProgressPct = 100;
  video.updatedAt = now;
  property.updatedAt = now;

  if (directPublish) {
    video.uploadStatus = 'ready';
    video.moderationStatus = 'approved';
  } else {
    video.uploadStatus = 'in_review';
    video.moderationStatus = 'pending';
  }

  persistDb(db);

  appendAuditLog({
    actor,
    action: directPublish
      ? 'video.published.direct'
      : 'video.upload.queued_for_moderation',
    entityType: 'property_video',
    entityId: video.id,
    metadata: { propertyId: property.id, status: video.uploadStatus },
  });

  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: directPublish ? 'video.ready' : 'video.in_review',
    timestamp: now,
    propertyId: property.id,
    videoId: video.id,
    progressPct: 100,
    property: hydrateProperty(db, property),
    video,
  });

  return video;
}

export function moderateVideo(
  videoId: string,
  action: 'approve' | 'reject' | 'retry',
  actor: SessionUser,
  reason?: string
): PropertyVideo | null {
  const db = loadDb();
  const video = db.videos.find((v) => v.id === videoId);
  if (!video) return null;
  const property = db.properties.find((p) => p.id === video.propertyId);
  if (!property) return null;

  const now = new Date().toISOString();
  let nextUploadStatus: VideoUploadStatus = video.uploadStatus;
  let nextModStatus: ModerationStatus = video.moderationStatus;

  if (action === 'approve') {
    nextUploadStatus = 'ready';
    nextModStatus = 'approved';
    video.rejectionReason = undefined;
  } else if (action === 'reject') {
    nextUploadStatus = 'failed';
    nextModStatus = 'rejected';
    video.rejectionReason = reason || 'Compliance or quality check failed';
  } else if (action === 'retry') {
    nextUploadStatus = 'ready';
    nextModStatus = 'approved';
    video.rejectionReason = undefined;
  }

  video.uploadStatus = nextUploadStatus;
  video.moderationStatus = nextModStatus;
  video.updatedAt = now;
  property.updatedAt = now;
  persistDb(db);

  appendAuditLog({
    actor,
    action: `video.moderation.${action}`,
    entityType: 'property_video',
    entityId: video.id,
    metadata: { propertyId: property.id, reason },
  });

  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: nextUploadStatus === 'ready' ? 'video.ready' : 'video.failed',
    timestamp: now,
    propertyId: property.id,
    videoId: video.id,
    property: hydrateProperty(db, property),
    video,
  });

  return video;
}

export function recordVideoWatchTelemetry(
  videoId: string,
  deltaWatchSec: number,
  incrementView = false
): PropertyVideo | null {
  const db = loadDb();
  const video = db.videos.find((v) => v.id === videoId);
  if (!video) return null;
  if (incrementView) video.viewCount += 1;
  video.totalWatchSec += Math.max(0, Math.min(deltaWatchSec, 300));
  persistDb(db);
  return video;
}

export function createEnquiry(
  input: CreateEnquiryInput,
  actor?: SessionUser
): Enquiry | null {
  const db = loadDb();
  const property = db.properties.find((p) => p.id === input.propertyId);
  if (!property) return null;

  const now = new Date().toISOString();
  const enquiry: Enquiry = {
    id: `enq-${crypto.randomUUID().slice(0, 8)}`,
    propertyId: input.propertyId,
    videoId: input.videoId,
    userId: actor?.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    channel: input.channel,
    watchTimeSec: input.watchTimeSec,
    message: input.message,
    createdAt: now,
  };

  db.enquiries.unshift(enquiry);
  persistDb(db);

  realtimeBroker.publish({
    id: crypto.randomUUID(),
    type: 'enquiry.created',
    timestamp: now,
    propertyId: property.id,
    videoId: input.videoId,
  });

  return enquiry;
}

export function listAllVideos(): (PropertyVideo & { propertyTitleEn: string; propertyTitleAr: string; propertySlug: string; permitNumber: string; community: string })[] {
  const db = loadDb();
  return db.videos
    .map((v) => {
      const prop = db.properties.find((p) => p.id === v.propertyId);
      return {
        ...v,
        propertyTitleEn: prop?.titleEn ?? 'Unknown Property',
        propertyTitleAr: prop?.titleAr ?? 'عقار غير معروف',
        propertySlug: prop?.slug ?? '',
        permitNumber: prop?.permitNumber ?? '',
        community: prop?.community ?? '',
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAuditLogs(limit = 50): AuditLog[] {
  const db = loadDb();
  return db.auditLogs.slice(0, Math.min(limit, 200));
}

export function getAnalyticsSummary() {
  const db = loadDb();
  const liveVideos = db.videos.filter((v) => v.uploadStatus === 'ready').length;
  const pendingModeration = db.videos.filter(
    (v) => v.uploadStatus === 'in_review' || v.moderationStatus === 'pending'
  ).length;
  const totalViews = db.videos.reduce((sum, v) => sum + v.viewCount, 0);
  const totalWatchMin = Math.round(
    db.videos.reduce((sum, v) => sum + v.totalWatchSec, 0) / 60
  );
  const totalEnquiries = db.enquiries.length;

  const perListing = db.properties.map((p) => {
    const vids = db.videos.filter((v) => v.propertyId === p.id);
    const views = vids.reduce((s, v) => s + v.viewCount, 0);
    const watchMin = Math.round(
      vids.reduce((s, v) => s + v.totalWatchSec, 0) / 60
    );
    const enquiries = db.enquiries.filter((e) => e.propertyId === p.id).length;
    return {
      propertyId: p.id,
      slug: p.slug,
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      community: p.community,
      views,
      watchMin,
      enquiries,
      videoCount: vids.length,
    };
  });

  return {
    liveVideos,
    pendingModeration,
    totalViews,
    totalWatchMin,
    totalEnquiries,
    perListing,
  };
}

export function exportUserData(actor: SessionUser) {
  const db = loadDb();
  return {
    exportedAt: new Date().toISOString(),
    complianceFramework: 'UAE Federal Decree-Law No. 45 of 2021 (PDPL) & GDPR Art. 20',
    profile: actor,
    enquiries: db.enquiries.filter(
      (e) => e.userId === actor.id || e.email === actor.email
    ),
    uploadedVideos: db.videos.filter((v) => v.uploaderId === actor.id),
    auditTrailCount: db.auditLogs.filter((a) => a.actorId === actor.id).length,
  };
}

export function eraseUserData(actor: SessionUser): {
  erasedEnquiries: number;
  erasedReceiptId: string;
} {
  const db = loadDb();
  const before = db.enquiries.length;
  db.enquiries = db.enquiries.filter(
    (e) => e.userId !== actor.id && e.email !== actor.email
  );
  const erasedEnquiries = before - db.enquiries.length;
  persistDb(db);

  const log = appendAuditLog({
    actor,
    action: 'privacy.pdpl_erasure.completed',
    entityType: 'user_account',
    entityId: actor.id,
    metadata: {
      erasedEnquiries,
      legalBasis: 'UAE PDPL Art. 15 / GDPR Art. 17',
    },
  });

  return { erasedEnquiries, erasedReceiptId: log.id };
}

// ---------------------------------------------------------------------------
// User accounts (local-mode credential store)
// ---------------------------------------------------------------------------

export function toSessionUser(record: UserRecord): SessionUser {
  return {
    id: record.id,
    role: record.role,
    fullName: record.fullName,
    email: record.email,
    orgName: record.orgName,
    orn: record.orn,
    brn: record.brn,
    whatsappNumber: record.whatsappNumber,
    locale: record.locale,
  };
}

export type PublicUserRecord = SessionUser & {
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

function toPublicUser(record: UserRecord): PublicUserRecord {
  return {
    ...toSessionUser(record),
    disabled: record.disabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastLoginAt: record.lastLoginAt,
  };
}

export function findUserByEmail(email: string): UserRecord | null {
  const db = loadDb();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function getUserById(id: string): UserRecord | null {
  const db = loadDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export function listUsers(): PublicUserRecord[] {
  const db = loadDb();
  return db.users
    .map(toPublicUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function recordUserLogin(id: string): void {
  const db = loadDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return;
  user.lastLoginAt = new Date().toISOString();
  persistDb(db);
}

export function createUserAccount(
  input: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    orgName?: string;
    orn?: string;
    brn?: string;
    whatsappNumber?: string;
    locale?: 'en' | 'ar';
  },
  actor: SessionUser
): { ok: true; user: PublicUserRecord } | { ok: false; code: 'EMAIL_TAKEN' } {
  const db = loadDb();
  const email = input.email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, code: 'EMAIL_TAKEN' };
  }
  const now = new Date().toISOString();
  const record: UserRecord = {
    id: `usr-${crypto.randomUUID()}`,
    role: input.role,
    fullName: input.fullName.trim(),
    email,
    orgName: input.orgName,
    orn: input.orn,
    brn: input.brn,
    whatsappNumber: input.whatsappNumber,
    locale: input.locale ?? 'en',
    passwordHash: hashPassword(input.password),
    sessionVersion: 1,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
  db.users.push(record);
  persistDb(db);

  appendAuditLog({
    actor,
    action: 'user.created',
    entityType: 'user_account',
    entityId: record.id,
    metadata: { role: record.role },
  });
  return { ok: true, user: toPublicUser(record) };
}

export function updateUserAccess(
  id: string,
  changes: { role?: UserRole; disabled?: boolean },
  actor: SessionUser
): PublicUserRecord | null {
  const db = loadDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  const before = { role: user.role, disabled: user.disabled };

  if (changes.role !== undefined) user.role = changes.role;
  if (changes.disabled !== undefined) user.disabled = changes.disabled;
  // Any access change revokes the user's existing sessions
  if (before.role !== user.role || before.disabled !== user.disabled) {
    user.sessionVersion += 1;
  }
  user.updatedAt = new Date().toISOString();
  persistDb(db);

  appendAuditLog({
    actor,
    action: 'user.access.updated',
    entityType: 'user_account',
    entityId: user.id,
    metadata: { before, after: { role: user.role, disabled: user.disabled } },
  });
  return toPublicUser(user);
}

export function countActiveAdmins(): number {
  const db = loadDb();
  return db.users.filter((u) => u.role === 'admin' && !u.disabled).length;
}

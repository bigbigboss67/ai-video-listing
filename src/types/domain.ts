export type UserRole =
  | 'admin'
  | 'manager'
  | 'verified_agent'
  | 'agent'
  | 'viewer';

export type CurrencyCode = 'AED' | 'USD' | 'EUR' | 'GBP';

export type PropertyType =
  | 'apartment'
  | 'villa'
  | 'townhouse'
  | 'penthouse'
  | 'plot'
  | 'commercial'
  | 'off_plan_project';

export type PropertyStatus =
  | 'ready'
  | 'off_plan'
  | 'rent'
  | 'reserved'
  | 'sold';

export type OwnershipType = 'freehold' | 'leasehold' | 'gcc_national';

export type AvailabilityStatus =
  | 'available'
  | 'under_offer'
  | 'coming_soon'
  | 'sold';

export type VideoUploadStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'in_review'
  | 'ready'
  | 'failed';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface SessionUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  orgName?: string;
  orn?: string;
  brn?: string;
  whatsappNumber?: string;
  locale: 'en' | 'ar';
}

export interface PropertyUnit {
  id: string;
  unitCode: string;
  floor: string;
  bedrooms: number;
  areaSqft: number;
  priceAed: number;
  status: 'available' | 'reserved' | 'sold';
}

export interface PropertyVideo {
  id: string;
  propertyId: string;
  uploaderId: string;
  uploaderName: string;
  provider: 'cloudflare_stream' | 'local_tus';
  providerAssetId: string;
  uploadStatus: VideoUploadStatus;
  uploadProgressPct: number;
  moderationStatus: ModerationStatus;
  rejectionReason?: string;
  playbackUrl: string;
  posterUrl: string;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
  captureLat?: number;
  captureLng?: number;
  consentAttestedAt: string;
  captionsEnUrl?: string;
  captionsArUrl?: string;
  viewCount: number;
  totalWatchSec: number;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  slug: string;
  ownerId: string;
  agentName: string;
  agentOrg: string;
  agentOrn: string;
  agentBrn: string;
  agentWhatsapp: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  propertyType: PropertyType;
  priceAed: number;
  originalPrice: number;
  currency: CurrencyCode;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  status: PropertyStatus;
  ownership: OwnershipType;
  availability: AvailabilityStatus;
  permitNumber: string;
  madmounQrUrl: string;
  developerName?: string;
  projectNumber?: string;
  escrowAccount?: string;
  estNetYieldPct?: number;
  serviceChargeAedSqft?: number;
  paymentPlan?: string;
  addressEn: string;
  addressAr: string;
  community: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  galleryUrls: string[];
  units: PropertyUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyWithVideos extends Property {
  videos: PropertyVideo[];
  enquiryCount: number;
}

export interface Enquiry {
  id: string;
  propertyId: string;
  videoId?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  channel: 'form' | 'whatsapp';
  watchTimeSec: number;
  message?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type RealtimeEventType =
  | 'video.uploading'
  | 'video.processing'
  | 'video.in_review'
  | 'video.ready'
  | 'video.failed'
  | 'property.created'
  | 'enquiry.created';

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  propertyId: string;
  videoId?: string;
  progressPct?: number;
  property?: PropertyWithVideos;
  video?: PropertyVideo;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

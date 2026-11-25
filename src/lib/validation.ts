import { z } from 'zod';

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
export const MAX_VIDEO_DURATION_SEC = 180; // 3 minutes

export const TRAKHEESI_REGEX = /^[A-Z0-9-]{6,24}$/i;

export const createPropertySchema = z
  .object({
    titleEn: z.string().trim().min(5, 'Title must be at least 5 characters').max(140),
    titleAr: z.string().trim().max(140).optional().default(''),
    descriptionEn: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000),
    descriptionAr: z.string().trim().max(3000).optional().default(''),
    propertyType: z.enum([
      'apartment',
      'villa',
      'townhouse',
      'penthouse',
      'plot',
      'commercial',
      'off_plan_project',
    ]),
    price: z.coerce.number().positive('Price must be greater than zero').max(2_000_000_000),
    currency: z.enum(['AED', 'USD', 'EUR', 'GBP']).default('AED'),
    bedrooms: z.coerce.number().int().min(0).max(30),
    bathrooms: z.coerce.number().int().min(0).max(30),
    areaSqft: z.coerce.number().positive('Area must be positive').max(10_000_000),
    status: z.enum(['ready', 'off_plan', 'rent', 'reserved', 'sold']),
    ownership: z.enum(['freehold', 'leasehold', 'gcc_national']),
    availability: z.enum(['available', 'under_offer', 'coming_soon', 'sold']),
    permitNumber: z
      .string()
      .trim()
      .regex(TRAKHEESI_REGEX, 'Valid Trakheesi permit number (6–24 alphanumeric chars) is required'),
    developerName: z.string().trim().max(120).optional(),
    projectNumber: z.string().trim().max(60).optional(),
    escrowAccount: z.string().trim().max(60).optional(),
    estNetYieldPct: z.coerce.number().min(0).max(40).optional(),
    serviceChargeAedSqft: z.coerce.number().min(0).max(500).optional(),
    paymentPlan: z.string().trim().max(120).optional(),
    addressEn: z.string().trim().min(3).max(240),
    addressAr: z.string().trim().max(240).optional().default(''),
    community: z.string().trim().min(2).max(120),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'off_plan') {
      if (!data.developerName || data.developerName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['developerName'],
          message: 'Developer name is mandatory for UAE off-plan listings (DLD rule)',
        });
      }
      if (!data.escrowAccount || data.escrowAccount.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['escrowAccount'],
          message: 'Approved DLD escrow account number is mandatory for off-plan listings',
        });
      }
    }
  });

export const initiateUploadSchema = z.object({
  propertyId: z.string().trim().min(1, 'Select or create a property first'),
  filename: z.string().trim().min(1).max(240),
  mimeType: z
    .string()
    .trim()
    .refine(
      (val) =>
        ALLOWED_VIDEO_MIMES.some((allowed) => val.toLowerCase().startsWith(allowed)),
      'Only MP4, MOV (QuickTime), or WebM video files are permitted'
    ),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_VIDEO_SIZE_BYTES, 'Maximum file size is 250 MB'),
  durationSec: z
    .number()
    .positive()
    .max(MAX_VIDEO_DURATION_SEC, 'Maximum video duration is 180 seconds'),
  posterDataUrl: z.string().max(1_500_000).optional(),
  captureLat: z.number().min(-90).max(90).optional(),
  captureLng: z.number().min(-180).max(180).optional(),
  consentAttested: z
    .boolean()
    .refine((v) => v === true, 'UAE PDPL & filming consent attestation is mandatory'),
});

export const moderationActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'retry']),
  reason: z.string().trim().max(400).optional(),
});

export const createEnquirySchema = z.object({
  propertyId: z.string().trim().min(1),
  videoId: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(7, 'Valid phone / WhatsApp number is required').max(30),
  channel: z.enum(['form', 'whatsapp']).default('form'),
  watchTimeSec: z.coerce.number().int().min(0).max(36000).default(0),
  message: z.string().trim().max(1500).optional(),
  // UAE PDPL: the enquirer must actively acknowledge the privacy notice before
  // we store and share their contact details. Must be literally `true`.
  privacyConsent: z.literal(true, {
    errorMap: () => ({
      message: 'Please confirm you have read the Privacy Notice and agree to us sharing your details to answer this enquiry.',
    }),
  }),
  // Optional and unbundled from the enquiry: marketing contact needs its own opt-in.
  marketingOptIn: z.boolean().default(false),
});

export const switchRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'verified_agent', 'agent', 'viewer']),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

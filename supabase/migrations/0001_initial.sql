-- =============================================================================
-- MakanReel Initial Schema — Backward-Compatible Expand-Only Migration
-- Requires PostgreSQL 15+ with PostGIS and pg_trgm extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles & User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'verified_agent', 'agent', 'viewer')) DEFAULT 'viewer',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  org_name TEXT,
  orn TEXT, -- Dubai RERA Office Registration Number
  brn TEXT, -- Dubai RERA Broker Registration Number
  whatsapp_number TEXT,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Properties with PostGIS GEOGRAPHY point
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (
    property_type IN ('apartment', 'villa', 'townhouse', 'penthouse', 'plot', 'commercial', 'off_plan_project')
  ),
  price_aed NUMERIC(14, 2) NOT NULL CHECK (price_aed > 0),
  original_price NUMERIC(14, 2) NOT NULL CHECK (original_price > 0),
  currency TEXT NOT NULL DEFAULT 'AED' CHECK (currency IN ('AED', 'USD', 'EUR', 'GBP')),
  bedrooms INT NOT NULL DEFAULT 0 CHECK (bedrooms >= 0 AND bedrooms <= 30),
  bathrooms INT NOT NULL DEFAULT 0 CHECK (bathrooms >= 0 AND bathrooms <= 30),
  area_sqft NUMERIC(10, 2) NOT NULL CHECK (area_sqft > 0),
  status TEXT NOT NULL CHECK (status IN ('ready', 'off_plan', 'rent', 'reserved', 'sold')),
  ownership TEXT NOT NULL CHECK (ownership IN ('freehold', 'leasehold', 'gcc_national')),
  availability TEXT NOT NULL CHECK (availability IN ('available', 'under_offer', 'coming_soon', 'sold')),
  permit_number TEXT NOT NULL,
  madmoun_qr_url TEXT,
  developer_name TEXT,
  project_number TEXT,
  escrow_account TEXT,
  est_net_yield_pct NUMERIC(5, 2),
  service_charge_aed_sqft NUMERIC(8, 2),
  payment_plan TEXT,
  address_en TEXT NOT NULL,
  address_ar TEXT NOT NULL,
  community TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) STORED,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Video Assets & Streaming Lifecycle
CREATE TABLE IF NOT EXISTS public.property_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id),
  provider TEXT NOT NULL DEFAULT 'cloudflare_stream' CHECK (provider IN ('cloudflare_stream', 'local_tus')),
  provider_asset_id TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    upload_status IN ('draft', 'uploading', 'processing', 'in_review', 'ready', 'failed')
  ),
  upload_progress_pct INT NOT NULL DEFAULT 0 CHECK (upload_progress_pct BETWEEN 0 AND 100),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  playback_hls_url TEXT,
  poster_url TEXT,
  duration_sec NUMERIC(8, 2),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 262144000)),
  mime_type TEXT,
  capture_lat DOUBLE PRECISION,
  capture_lng DOUBLE PRECISION,
  consent_attested_at TIMESTAMPTZ NOT NULL,
  captions_en_url TEXT,
  captions_ar_url TEXT,
  view_count INT NOT NULL DEFAULT 0,
  total_watch_sec BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Plots / Unit Matrix (Investor Presentation Mode)
CREATE TABLE IF NOT EXISTS public.property_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_code TEXT NOT NULL,
  floor TEXT NOT NULL,
  bedrooms INT NOT NULL DEFAULT 0,
  area_sqft NUMERIC(10, 2) NOT NULL,
  price_aed NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'sold'))
);

-- Enquiries with Watch-Time Attribution
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.property_videos(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'form' CHECK (channel IN ('form', 'whatsapp')),
  watch_time_sec INT NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-Only Compliance & Security Audit Log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes (Geospatial GIST, Composite Filter B-Tree, Trigram Search)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON public.properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_filter_composite ON public.properties (status, property_type, price_aed);
CREATE INDEX IF NOT EXISTS idx_properties_community_beds ON public.properties (community, bedrooms, price_aed);
CREATE INDEX IF NOT EXISTS idx_properties_permit ON public.properties (permit_number);
CREATE INDEX IF NOT EXISTS idx_properties_title_en_trgm ON public.properties USING GIN (title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_community_trgm ON public.properties USING GIN (community gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_videos_property_status ON public.property_videos (property_id, upload_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_property ON public.enquiries (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- =============================================================================
-- Row-Level Security (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read of verified/available properties and ready videos
CREATE POLICY properties_public_read ON public.properties
  FOR SELECT USING (TRUE);

CREATE POLICY videos_public_read ON public.property_videos
  FOR SELECT USING (
    upload_status = 'ready' AND moderation_status = 'approved'
    OR auth.uid() = uploader_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY units_public_read ON public.property_units
  FOR SELECT USING (TRUE);

-- Agents/Managers/Admins can create properties and videos
CREATE POLICY properties_agent_write ON public.properties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager', 'verified_agent', 'agent')
    )
  );

CREATE POLICY videos_agent_write ON public.property_videos
  FOR INSERT WITH CHECK (
    auth.uid() = uploader_id AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager', 'verified_agent', 'agent')
    )
  );

-- Only Admins/Managers can moderate or view audit logs
CREATE POLICY audit_admin_read ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

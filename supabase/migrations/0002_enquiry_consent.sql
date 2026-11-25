-- Record UAE PDPL consent evidence on enquiries.
-- Backward compatible: all columns are nullable / defaulted, so existing rows
-- (captured before consent existed) stay valid and are not rewritten.
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_notice_version TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Speeds up "who opted in to marketing" exports and consent audits.
CREATE INDEX IF NOT EXISTS idx_enquiries_marketing_opt_in
  ON public.enquiries (marketing_opt_in, created_at DESC)
  WHERE marketing_opt_in = TRUE;

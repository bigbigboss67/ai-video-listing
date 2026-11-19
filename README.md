# MakanReel — Investor-Grade Video Property Listing Portal

Mobile-first PWA and live-synced web portal built for agents, developers, sales teams, and UAE/international real estate investors.

## Key Capabilities
- **Mobile Capture & Resumable TUS Upload Studio (`/en/capture`, `/ar/capture`):**
  - In-app `MediaRecorder` video capture (Safari MP4 / Chrome WebM codec detection + graceful permission-denied fallback to gallery upload and demo walkthrough generator).
  - Client-side `<canvas>` poster extraction, 180s / 250 MB enforcement, and resumable chunked TUS (`HEAD` offset recovery + `PATCH` chunking) that survives network drops with Pause / Resume / Retry.
  - Auto-GPS capture with explicit consent handling, reverse geocoding, draggable MapLibre map pin, and manual Dubai community search fallback.
  - Searchable property combobox + inline Quick-Create property sheet with **UAE DLD Trakheesi permit**, **scannable Madmoun QR**, conditional **Off-Plan Developer & Escrow disclosures**, and mandatory **UAE PDPL / Cybercrime Law Art. 44 filming consent attestation**.
- **Live Mobile-to-Web Sync:**
  - Server-Sent Events (`/api/events`) + cross-tab `BroadcastChannel` (and Supabase Realtime in production mode) deliver `uploading → processing → in_review | ready | failed` transitions live — animating new cards into the grid, dropping map pins, and triggering live sync toasts.
- **Web Discovery Portal, Detail Dossier & Investor Presentation Mode:**
  - Left filter rail, Grid / Split / Clustered MapLibre GL JS Map toggle (with Arabic RTL map text plugin), sticky quick-detail drawer, adaptive HLS/MP4 video player with EN/AR WebVTT captions, WhatsApp deep-link CTA, watch-time-attributed enquiry form, vertical Reels feed (`/reels`), and distraction-free fullscreen **Investor Presentation Mode** (`/present/[slug]`) with live unit/plot availability matrix.
- **Agent & Admin Operations Dashboard (`/dashboard`):**
  - Server-side HMAC-signed session cookies + strict RBAC (`admin`, `manager`, `verified_agent`, `agent`, `viewer`), Moderation Queue, per-listing video analytics, immutable Audit Log, and **UAE PDPL / GDPR data export & erasure**.
- **Full Bilingual English & Arabic (RTL):**
  - `next-intl` route localization (`/en`, `/ar`), `<html dir="rtl">`, `Plus Jakarta Sans` + `IBM Plex Sans Arabic` + `JetBrains Mono`, CSS logical properties, locale-aware currency/date formatting, and bidi isolation for permit numbers and coordinates.

## Quick Start (Zero-Key Local Mode)

```bash
npm install
npm run dev
```

Open `http://localhost:3000/en` (English LTR) or `http://localhost:3000/ar` (Arabic RTL).

In default `local` mode, uploaded videos persist under `.data/uploads/`, metadata persists in `.data/db.json`, and live sync runs via `/api/events` (SSE) + `BroadcastChannel` with zero external credentials required.

## Verification Scripts

```bash
npm run typecheck   # TypeScript strict check (tsc --noEmit)
npm run lint        # ESLint (Next.js core-web-vitals + TypeScript)
npm run test        # Vitest unit, RBAC, TUS resumable upload & PDPL regression suite
npm run build       # Production Next.js build
```

## Environment Variables (Production Cutover)

Copy `.env.example` to `.env.local` and configure:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `local` (default zero-key mode) or `supabase` |
| `SESSION_SECRET` | 32+ byte random secret for signing HTTP-only session cookies |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | PostgreSQL + PostGIS + Auth + Realtime |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_WEBHOOK_SECRET` | Cloudflare Stream Direct Creator TUS Upload, ABR HLS transcoding & webhook verification |
| `NEXT_PUBLIC_MAP_STYLE_LIGHT`, `NEXT_PUBLIC_MAP_STYLE_DARK` | MapLibre GL vector styles (defaults to OpenFreeMap Positron & Dark) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting & caching |
| `NEXT_PUBLIC_SENTRY_DSN` | Production error tracking |

### Database Migrations (Production PostgreSQL + PostGIS)
Apply `supabase/migrations/0001_initial.sql` via Supabase CLI (`supabase db push`) or `psql`. It creates PostGIS `GEOGRAPHY(POINT, 4326)` with a `GIST` spatial index, composite filter indexes, `pg_trgm` search indexes, RLS policies, and audit tables.

## Deployment (Vercel)
1. Push repository to GitHub and import into Vercel.
2. Set production environment variables from `.env.example` (`NEXT_PUBLIC_APP_MODE=supabase`, Supabase, Cloudflare Stream, `SESSION_SECRET`).
3. Configure Cloudflare Stream webhook URL to `https://<your-domain>/api/webhooks/cloudflare-stream`.
4. Deploy (`npm run build`).

## Known Limits
- **Local Mode Storage:** Local JSON store and `.data/uploads` are single-instance dev/demo adapters — switch to Supabase + Cloudflare Stream (`NEXT_PUBLIC_APP_MODE=supabase`) before multi-instance production deployment.
- **Client-Side Video Compression:** Browsers cap bitrate during `MediaRecorder` capture (4.5 Mbps) rather than running heavy WASM FFmpeg on mobile Safari (which risks OOM crashes); full multi-bitrate HLS ladders are handled server-side by Cloudflare Stream in production.
- **Seeded Demo Videos:** Pre-seeded properties use architectural showcase posters until real walkthrough clips are uploaded via `/capture` (uploaded clips stream real bytes via HTTP `206 Partial Content`).
- **DLD Permit Validation:** Format & mandatory escrow rules are enforced locally; live DLD Trakheesi API lookups require an institutional DLD partner API credential.

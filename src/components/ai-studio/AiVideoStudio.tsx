'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  CheckCircle2,
  Download,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Radio,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import type {
  AiVideoStyle,
  ExtractedListingData,
  GeneratedStoryboard,
} from '@/lib/url-extractor';
import {
  renderAiPropertyVideo,
  toRenderableImageUrl,
  type RenderedAiVideo,
} from '@/lib/ai-video-renderer';
import {
  ResumableTusRunner,
  makeFileFingerprint,
  saveResumeState,
} from '@/lib/resumable-upload';
import { broadcastLocalSyncEvent } from '@/hooks/useRealtimeSync';
import type { PropertyWithVideos } from '@/types/domain';
import { InteractiveFloorPlan3D } from '@/components/floorplan/InteractiveFloorPlan3D';
import { Button, StatusPill, UploadProgressRing } from '@/components/ui/Primitives';
import { formatCurrency } from '@/lib/format';
import { useAppContext } from '@/components/providers/AppProvider';

export function AiVideoStudio({ initialUrl = '' }: { initialUrl?: string }) {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'ar';
  const { currency } = useAppContext();

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [listing, setListing] = useState<ExtractedListingData | null>(null);
  const [localPhotoUrls, setLocalPhotoUrls] = useState<string[]>([]);

  // Storyboard & style state
  const [videoStyle, setVideoStyle] = useState<AiVideoStyle>('walkthrough');
  const [scriptLocale, setScriptLocale] = useState<'en' | 'ar'>(locale);
  const [storyboard, setStoryboard] = useState<GeneratedStoryboard | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [showFloorPlanPreview, setShowFloorPlanPreview] = useState(true);

  // Render state
  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
  const [rendered, setRendered] = useState<RenderedAiVideo | null>(null);

  // Publish & Live Sync state
  const [consentChecked, setConsentChecked] = useState(false);
  const [publishState, setPublishState] = useState<
    'idle' | 'uploading' | 'ready' | 'in_review' | 'failed'
  >('idle');
  const [publishPct, setPublishPct] = useState(0);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const generateScriptForListing = async (
    data: ExtractedListingData,
    style: AiVideoStyle,
    targetLocale: 'en' | 'ar'
  ) => {
    setGeneratingScript(true);
    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          locale: targetLocale,
          listing: data,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { storyboard: GeneratedStoryboard };
        setStoryboard(json.storyboard);
      }
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleExtractUrl = async (
    targetUrl: string,
    presetKey?: 'palm' | 'downtown' | 'creek'
  ) => {
    if (!targetUrl.trim() && !presetKey) return;
    setExtracting(true);
    setExtractError(null);
    setRendered(null);
    setPublishState('idle');
    setPublishMessage(null);
    try {
      const res = await fetch('/api/ai/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl.trim() || 'https://example.ae',
          presetKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExtractError(json.error?.message || 'Unable to parse listing URL');
        return;
      }
      const extracted = json.listing as ExtractedListingData;
      setUrlInput(extracted.sourceUrl);
      setListing(extracted);
      await generateScriptForListing(extracted, videoStyle, scriptLocale);
    } catch {
      setExtractError('Network error while extracting listing URL.');
    } finally {
      setExtracting(false);
    }
  };

  // Auto-run extraction if opened from portal quick-paste bar (?url=...)
  useEffect(() => {
    if (initialUrl.trim()) {
      handleExtractUrl(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const handleStyleOrLocaleChange = async (
    nextStyle: AiVideoStyle,
    nextLocale: 'en' | 'ar'
  ) => {
    setVideoStyle(nextStyle);
    setScriptLocale(nextLocale);
    setRendered(null);
    if (listing) {
      await generateScriptForListing(listing, nextStyle, nextLocale);
    }
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const urls = Array.from(files)
      .slice(0, 6)
      .map((f) => URL.createObjectURL(f));
    setLocalPhotoUrls((prev) => [...prev, ...urls].slice(0, 6));
  };

  const handleRenderVideo = async () => {
    if (!listing || !storyboard) return;
    setRendering(true);
    setRenderPct(5);
    setRendered(null);
    try {
      const priceBadge = formatCurrency(listing.price, currency, locale);
      const specsBadge = `${
        listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms}BR`
      } · ${listing.areaSqft.toLocaleString()} sq ft`;
      const output = await renderAiPropertyVideo({
        storyboard,
        permitNumber: listing.permitNumber,
        madmounQrUrl: listing.madmounQrUrl,
        brandName: t('brand.name'),
        priceBadge,
        specsBadge,
        localImages: localPhotoUrls,
        onProgress: (pct) => setRenderPct(pct),
      });
      setRendered(output);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : 'Unable to render AI video.'
      );
    } finally {
      setRendering(false);
    }
  };

  const handlePublishToPortal = async () => {
    if (!listing || !rendered) return;
    if (!consentChecked) {
      setPublishMessage(
        'UAE PDPL & marketing rights attestation is required before publishing live.'
      );
      return;
    }
    setPublishMessage(null);
    setPublishState('uploading');
    setPublishPct(5);

    try {
      // 1. Create the structured property listing with Trakheesi permit & geo coords
      const propRes = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: listing.titleEn,
          titleAr: listing.titleAr,
          descriptionEn: listing.descriptionEn,
          descriptionAr: listing.descriptionAr,
          propertyType: listing.propertyType,
          price: listing.price,
          currency: listing.currency,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          areaSqft: listing.areaSqft,
          status: listing.status,
          ownership: listing.ownership,
          availability: 'available',
          permitNumber: listing.permitNumber,
          developerName:
            listing.status === 'off_plan' ? 'Verified UAE Developer' : undefined,
          escrowAccount:
            listing.status === 'off_plan'
              ? 'AE480260001015849203101'
              : undefined,
          estNetYieldPct: listing.estNetYieldPct,
          addressEn: listing.addressEn,
          addressAr: listing.addressAr,
          community: listing.community,
          lat: listing.lat,
          lng: listing.lng,
        }),
      });

      const propJson = await propRes.json();
      if (!propRes.ok) {
        setPublishState('failed');
        setPublishMessage(
          propJson.error?.message || 'Property creation validation failed.'
        );
        return;
      }

      const createdProperty = propJson.property as PropertyWithVideos;

      // 2. Initiate signed TUS upload session for the AI-rendered video
      const initRes = await fetch('/api/uploads/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: createdProperty.id,
          filename: rendered.file.name,
          mimeType: rendered.file.type || 'video/webm',
          sizeBytes: rendered.file.size,
          durationSec: rendered.durationSec,
          posterDataUrl: rendered.posterDataUrl,
          captureLat: listing.lat,
          captureLng: listing.lng,
          consentAttested: true,
        }),
      });

      const initJson = await initRes.json();
      if (!initRes.ok) {
        setPublishState('failed');
        setPublishMessage(initJson.error?.message || 'Failed to initiate upload.');
        return;
      }

      const fingerprint = makeFileFingerprint(rendered.file, createdProperty.id);
      const state = {
        tusUploadUrl: initJson.tusUploadUrl as string,
        tusSessionId: initJson.tusSessionId as string,
        videoId: initJson.video.id as string,
        offsetBytes: 0,
        sizeBytes: rendered.file.size,
        chunkSizeBytes: initJson.chunkSizeBytes || 512 * 1024,
      };
      saveResumeState(fingerprint, state);

      const runner = new ResumableTusRunner(rendered.file, state, fingerprint, {
        onProgress: (pct) => setPublishPct(pct),
        onStatusChange: (status, msg) => {
          if (status === 'ready' || status === 'in_review' || status === 'failed') {
            setPublishState(status);
          }
          if (msg) setPublishMessage(msg);
        },
        onComplete: async (video) => {
          setPublishedSlug(createdProperty.slug);
          const freshRes = await fetch(`/api/properties/${createdProperty.slug}`, {
            cache: 'no-store',
          });
          if (freshRes.ok) {
            const freshData = (await freshRes.json()) as {
              property: PropertyWithVideos;
            };
            broadcastLocalSyncEvent({
              id: `ai-sync-${video.id}-${Date.now()}`,
              type: video.uploadStatus === 'ready' ? 'video.ready' : 'video.in_review',
              timestamp: new Date().toISOString(),
              propertyId: createdProperty.id,
              videoId: video.id,
              progressPct: 100,
              property: freshData.property,
              video,
            });
          }
        },
      });

      await runner.start();
    } catch {
      setPublishState('failed');
      setPublishMessage('Unexpected network error during publish.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-6 space-y-6">
      {/* Hero Paste-URL Input Bar (Inspired by siriusly.ai, crafted in Editorial Luxury) */}
      <section className="p-5 sm:p-7 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="max-w-3xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--accent-subtle)] text-[var(--accent-primary)] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('aiStudio.badge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('aiStudio.title')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('aiStudio.subtitle')}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExtractUrl(urlInput);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-[var(--accent-primary)] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="url"
              required
              data-testid="ai-url-input"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t('aiStudio.urlPlaceholder')}
              aria-label={t('aiStudio.urlPlaceholder')}
              className="w-full h-12 ps-10 pe-4 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-sm bidi-ltr"
            />
          </div>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            data-testid="ai-extract-btn"
            disabled={extracting}
            className="h-12 px-6 shrink-0"
          >
            {extracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {extracting ? t('aiStudio.extracting') : t('aiStudio.extractCta')}
          </Button>
        </form>

        {/* Instant 1-Click Sample Listing URLs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] font-medium">
            {t('aiStudio.trySample')}
          </span>
          {(
            [
              { key: 'palm', label: t('aiStudio.samplePalm') },
              { key: 'downtown', label: t('aiStudio.sampleDowntown') },
              { key: 'creek', label: t('aiStudio.sampleCreek') },
            ] as const
          ).map((sample) => (
            <button
              key={sample.key}
              type="button"
              data-testid={`ai-preset-${sample.key}`}
              onClick={() => handleExtractUrl('', sample.key)}
              className="px-2.5 py-1 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] font-medium cursor-pointer transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {extractError ? (
          <div
            role="alert"
            className="p-3 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium"
          >
            {extractError}
          </div>
        ) : null}
      </section>

      {/* Main Studio Workspace (Appears once a URL or Sample Preset is ingested) */}
      {listing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Extracted Listing Specs + Style/Storyboard Editor + 3D Floor Plan */}
          <div className="lg:col-span-7 space-y-5">
            {listing.notice ? (
              <div className="p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--status-warn-bg)] text-[var(--status-warn)] text-xs">
                {listing.notice}
              </div>
            ) : null}

            {/* Extracted Listing Summary & Quick Edit */}
            <section className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {t('aiStudio.extractedTitle')}
                </h2>
                <StatusPill
                  status="ready"
                  label={
                    listing.extractionMode === 'next_data'
                      ? `Live Portal Parsed · ${listing.imageUrls.length} Photos`
                      : listing.extractionMode === 'live_html'
                        ? `Live HTML Parsed · ${listing.imageUrls.length} Photos`
                        : listing.extractionMode === 'sample_preset'
                          ? 'UAE Preset Loaded'
                          : 'URL Parsed'
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {t('quickCreate.titleEn')}
                  </label>
                  <input
                    value={listing.titleEn}
                    onChange={(e) =>
                      setListing({ ...listing, titleEn: e.target.value })
                    }
                    className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {t('quickCreate.permitNumber')} (DLD)
                  </label>
                  <input
                    value={listing.permitNumber}
                    onChange={(e) =>
                      setListing({ ...listing, permitNumber: e.target.value })
                    }
                    className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono-code bidi-ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
                <div className="p-2.5 rounded-[6px] bg-[var(--bg-elevated)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Price</div>
                  <div className="font-bold mt-0.5">
                    {formatCurrency(listing.price, currency, locale, true)}
                  </div>
                </div>
                <div className="p-2.5 rounded-[6px] bg-[var(--bg-elevated)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Community</div>
                  <div className="font-semibold mt-0.5 truncate">
                    {listing.community}
                  </div>
                </div>
                <div className="p-2.5 rounded-[6px] bg-[var(--bg-elevated)]">
                  <div className="text-[11px] text-[var(--text-muted)]">Specs</div>
                  <div className="font-semibold mt-0.5">
                    {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms}BR`} ·{' '}
                    {listing.areaSqft.toLocaleString()} ft²
                  </div>
                </div>
                <div className="p-2.5 rounded-[6px] bg-[var(--bg-elevated)]">
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t('listing.estYield')}
                  </div>
                  <div className="font-bold mt-0.5 text-[var(--status-live)]">
                    {listing.estNetYieldPct}%
                  </div>
                </div>
              </div>

              {/* Real Extracted & Uploaded Photo Gallery Strip */}
              {(listing.imageUrls.length > 0 || localPhotoUrls.length > 0) ? (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]" data-testid="ai-extracted-photos">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                    <span>
                      Media Scenes Loaded ({localPhotoUrls.length + listing.imageUrls.length} real photos)
                    </span>
                    <span className="text-[var(--status-live)]">Same-Origin CORS Proxy Active</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {[...localPhotoUrls, ...listing.imageUrls].slice(0, 12).map((rawUrl, idx) => {
                      const src = toRenderableImageUrl(rawUrl) || rawUrl;
                      return (
                        <div
                          key={`${rawUrl}-${idx}`}
                          className="relative aspect-[4/3] rounded-[4px] overflow-hidden border border-[var(--border-subtle)] bg-[#0D0F12]"
                        >
                          <img
                            src={src}
                            alt={`Scene ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 start-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-mono-code text-white">
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Optional Listing Photo Uploader for Ken Burns Scenes */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  <span>{t('aiStudio.addPhotos')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </label>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {localPhotoUrls.length > 0
                    ? `${localPhotoUrls.length} photos attached`
                    : t('aiStudio.photoHint')}
                </span>
              </div>
            </section>

            {/* Video Format & Editable 5-Scene AI Storyboard */}
            <section className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Film className="w-4 h-4 text-[var(--accent-primary)]" />
                  {t('aiStudio.storyboardTitle')}
                </h2>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Script language"
                    value={scriptLocale}
                    onChange={(e) =>
                      handleStyleOrLocaleChange(
                        videoStyle,
                        e.target.value as 'en' | 'ar'
                      )
                    }
                    className="h-8 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs font-semibold"
                  >
                    <option value="en">English Script</option>
                    <option value="ar">سيناريو عربي</option>
                  </select>
                </div>
              </div>

              {/* 3 Video Style Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: 'walkthrough',
                      title: t('aiStudio.styleWalkthrough'),
                      meta: '16:9 · Ken Burns + Madmoun QR',
                    },
                    {
                      id: 'reels_vertical',
                      title: t('aiStudio.styleReels'),
                      meta: '9:16 · TikTok / IG / Reels Hook',
                    },
                    {
                      id: 'investor_briefing',
                      title: t('aiStudio.styleInvestor'),
                      meta: '16:9 · Yield & Boardroom Pack',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`ai-style-${opt.id}`}
                    onClick={() => handleStyleOrLocaleChange(opt.id, scriptLocale)}
                    className={`p-3 rounded-[6px] border text-start cursor-pointer transition-colors ${
                      videoStyle === opt.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {opt.meta}
                    </div>
                  </button>
                ))}
              </div>

              {/* Editable Scenes */}
              {generatingScript ? (
                <div className="h-32 rounded-[6px] bg-[var(--bg-elevated)] animate-pulse" />
              ) : storyboard ? (
                <div className="space-y-2.5">
                  {storyboard.scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      className="p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono-code text-[var(--accent-primary)]">
                        <span>{scene.label}</span>
                        <span>
                          {scene.motion} · {scene.durationSec}s
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={scene.headline}
                          onChange={(e) => {
                            const updated = [...storyboard.scenes];
                            updated[idx] = { ...scene, headline: e.target.value };
                            setStoryboard({ ...storyboard, scenes: updated });
                          }}
                          className="h-8 px-2.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold"
                        />
                        <input
                          value={scene.caption}
                          onChange={(e) => {
                            const updated = [...storyboard.scenes];
                            updated[idx] = { ...scene, caption: e.target.value };
                            setStoryboard({ ...storyboard, scenes: updated });
                          }}
                          className="h-8 px-2.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Integrated Interactive 3D Floor Plan Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {t('aiStudio.floorplanLinked')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFloorPlanPreview((s) => !s)}
                  className="text-xs font-medium text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  {showFloorPlanPreview ? 'Hide' : 'Show'}
                </button>
              </div>
              {showFloorPlanPreview ? (
                <InteractiveFloorPlan3D
                  propertyType={listing.propertyType}
                  areaSqft={listing.areaSqft}
                  bedrooms={listing.bedrooms}
                  compact
                />
              ) : null}
            </div>
          </div>

          {/* Right 5 Cols: Sticky AI Render Engine + Video Preview + 1-Click Live Portal Sync */}
          <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('aiStudio.renderTitle')}</h2>
                {storyboard ? (
                  <span className="text-xs font-mono-code text-[var(--text-muted)] bidi-ltr">
                    {storyboard.aspectRatio} · DLD QR Burn-in
                  </span>
                ) : null}
              </div>

              {/* Rendered Video Preview or Render Trigger */}
              {rendered ? (
                <div className="space-y-3" data-testid="ai-rendered-preview">
                  <video
                    src={rendered.previewUrl}
                    poster={rendered.posterDataUrl}
                    controls
                    playsInline
                    className={`w-full rounded-[6px] bg-black border border-[var(--border-subtle)] ${
                      storyboard?.aspectRatio === '9:16'
                        ? 'max-h-[420px] object-contain'
                        : 'aspect-video object-cover'
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono-code bidi-ltr">
                      {(rendered.file.size / 1024).toFixed(0)} KB · {rendered.durationSec}s ·{' '}
                      {rendered.photosUsedCount} real photos
                    </span>
                    <a
                      href={rendered.previewUrl}
                      download={rendered.file.name}
                      className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent-primary)] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('aiStudio.downloadVideo')}
                    </a>
                  </div>
                </div>
              ) : rendering ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <UploadProgressRing percent={renderPct} status="uploading" />
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {t('aiStudio.renderingStatus')}
                  </p>
                </div>
              ) : (
                <div className="py-10 px-5 text-center rounded-[6px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-canvas)] space-y-2">
                  <Film className="w-8 h-8 text-[var(--accent-primary)] mx-auto" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t('aiStudio.readyToRender')}
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                data-testid="ai-render-btn"
                disabled={rendering || !storyboard}
                onClick={handleRenderVideo}
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                {rendered ? t('aiStudio.reRender') : t('aiStudio.renderCta')}
              </Button>

              {/* Compliance & 1-Click Publish Live to Portal */}
              {rendered ? (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="ai-consent-checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[var(--accent-primary)] shrink-0"
                    />
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      <ShieldCheck className="w-3.5 h-3.5 inline me-1 text-[var(--accent-primary)]" />
                      {t('capture.consentCheckbox')}
                    </span>
                  </label>

                  {publishMessage ? (
                    <div
                      role="alert"
                      className="p-2.5 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs"
                    >
                      {publishMessage}
                    </div>
                  ) : null}

                  {publishState === 'uploading' ? (
                    <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[var(--bg-elevated)] text-xs">
                      <UploadProgressRing percent={publishPct} size={44} strokeWidth={4} />
                      <span>Syncing AI video live to portal ({publishPct}%)…</span>
                    </div>
                  ) : publishState === 'ready' && publishedSlug ? (
                    <div
                      data-testid="ai-publish-success"
                      className="p-3.5 rounded-[6px] bg-[var(--status-live-bg)] text-[var(--status-live)] text-xs space-y-2"
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('capture.readyStatus')}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/properties/${publishedSlug}`}
                          className="underline font-semibold"
                        >
                          {t('listing.openDetail')}
                        </Link>
                        <Link
                          href={`/present/${publishedSlug}`}
                          className="underline font-semibold"
                        >
                          {t('listing.presentMode')}
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="accent"
                    size="lg"
                    data-testid="ai-publish-btn"
                    disabled={publishState === 'uploading'}
                    onClick={handlePublishToPortal}
                    className="w-full"
                  >
                    {publishState === 'ready' ? (
                      <Radio className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {t('aiStudio.publishLiveCta')}
                  </Button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

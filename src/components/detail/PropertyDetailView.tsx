'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Check,
  MapPin,
  Maximize,
  MessageCircle,
  Presentation,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import type { PropertyWithVideos } from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import {
  buildWhatsAppUrl,
  formatArea,
  formatCurrency,
  formatDate,
  formatDuration,
} from '@/lib/format';
import { AdaptiveVideoPlayer } from '@/components/video/AdaptiveVideoPlayer';
import { ClusteredPropertyMap } from '@/components/map/ClusteredPropertyMap';
import { YieldCalculator } from '@/components/detail/YieldCalculator';
import { verifyOnSiteCapture } from '@/lib/geo-verify';
import { Button, MadmounQrCard, StatusPill } from '@/components/ui/Primitives';

export function PropertyDetailView({
  property,
}: {
  property: PropertyWithVideos;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { currency, theme } = useAppContext();

  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [watchSec, setWatchSec] = useState(0);
  const [copied, setCopied] = useState(false);

  // Enquiry form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  const activeVideo = property.videos[activeVideoIdx] ?? property.videos[0];
  const proximity = verifyOnSiteCapture({
    captureLat: activeVideo?.captureLat,
    captureLng: activeVideo?.captureLng,
    propertyLat: property.lat,
    propertyLng: property.lng,
  });
  const title = locale === 'ar' ? property.titleAr : property.titleEn;
  const description =
    locale === 'ar' ? property.descriptionAr : property.descriptionEn;
  const address = locale === 'ar' ? property.addressAr : property.addressEn;
  const pricePerSqftAed = Math.round(
    property.priceAed / Math.max(property.areaSqft, 1)
  );

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
    }
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEnquiryError(null);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          videoId: activeVideo?.id,
          name,
          email,
          phone,
          channel: 'form',
          watchTimeSec: watchSec,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnquiryError(data.error?.message || 'Unable to submit enquiry');
        return;
      }
      setEnquirySuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://makanreel.ae/${locale}/properties/${property.slug}`;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-5 space-y-6">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('nav.explore')}
        </Link>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleCopyShare}>
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-live)]" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? t('listing.linkCopied') : t('listing.shareLink')}
          </Button>
          <Link
            href={`/present/${property.slug}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold"
          >
            <Presentation className="w-3.5 h-3.5" />
            {t('listing.presentMode')}
          </Link>
        </div>
      </div>

      {/* Main 12-Col Editorial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Adaptive Video Player, Playlist, Description, Financials & Map */}
        <div className="lg:col-span-7 space-y-6">
          <AdaptiveVideoPlayer
            videoId={activeVideo?.id}
            src={activeVideo?.playbackUrl || '/api/media/sample'}
            poster={activeVideo?.posterUrl || property.galleryUrls[0]}
            title={title}
            durationSec={activeVideo?.durationSec ?? 60}
            captionsEnUrl={activeVideo?.captionsEnUrl}
            captionsArUrl={activeVideo?.captionsArUrl}
            locale={locale}
            onWatchTimeUpdate={setWatchSec}
          />

          {/* Multi-clip Video Strip */}
          {property.videos.length > 1 ? (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {property.videos.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVideoIdx(idx)}
                  className={`shrink-0 w-36 rounded-[6px] overflow-hidden border text-start cursor-pointer ${
                    idx === activeVideoIdx
                      ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  <img
                    src={v.posterUrl}
                    alt={`Clip ${idx + 1}`}
                    className="w-full h-20 object-cover"
                  />
                  <div className="px-2 py-1 bg-[var(--bg-surface)] flex items-center justify-between text-[11px]">
                    <span className="font-mono-code tabular-nums bidi-ltr">
                      {formatDuration(v.durationSec)}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {t(`videoStatus.${v.uploadStatus}`)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {/* Title & Description */}
          <section className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                status={property.status}
                label={t(`statuses.${property.status}`)}
              />
              <span className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-secondary)]">
                {t(`propertyTypes.${property.propertyType}`)}
              </span>
              <span className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-secondary)]">
                {t(`ownerships.${property.ownership}`)}
              </span>
              {proximity.verifiedOnSite ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--status-live-bg)] text-[var(--status-live)] text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('proximity.onSite')}
                  {proximity.distanceMeters !== null
                    ? ` (${proximity.distanceMeters}m)`
                    : ''}
                </span>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {title}
            </h1>

            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              <span>{address}</span>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {description}
            </p>

            {/* Institutional Financial Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {t('listing.estYield')}
                </div>
                <div className="text-base font-bold tabular-nums mt-0.5 text-[var(--status-live)]">
                  {property.estNetYieldPct ? `${property.estNetYieldPct}%` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
                <div className="text-[11px] text-[var(--text-muted)]">
                  Price {t('listing.perSqft')}
                </div>
                <div className="text-base font-bold tabular-nums mt-0.5">
                  {formatCurrency(pricePerSqftAed, currency, locale)}
                </div>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {t('listing.serviceCharge')}
                </div>
                <div className="text-base font-bold tabular-nums mt-0.5">
                  {property.serviceChargeAedSqft
                    ? `${property.serviceChargeAedSqft} AED`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {t('quickCreate.availability')}
                </div>
                <div className="text-sm font-semibold mt-1">
                  {t(`availabilities.${property.availability}`)}
                </div>
              </div>
            </div>

            {property.paymentPlan ? (
              <div className="text-xs text-[var(--text-secondary)] pt-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {t('listing.paymentPlan')}:
                </span>{' '}
                {property.paymentPlan}
              </div>
            ) : null}

            {/* Off-Plan Mandatory DLD Escrow Disclosures */}
            {property.status === 'off_plan' && property.developerName ? (
              <div className="p-3.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[var(--text-muted)]">{t('listing.developer')}</div>
                  <div className="font-semibold mt-0.5">{property.developerName}</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">{t('listing.projectNumber')}</div>
                  <div className="font-mono-code font-semibold mt-0.5 bidi-ltr">
                    {property.projectNumber || 'DLD-REG'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">{t('listing.escrow')}</div>
                  <div className="font-mono-code font-semibold mt-0.5 bidi-ltr truncate">
                    {property.escrowAccount}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Interactive UAE Mortgage, 4% DLD Fee & Net Rental Yield Calculator */}
          <YieldCalculator
            priceAed={property.priceAed}
            areaSqft={property.areaSqft}
            defaultGrossYieldPct={property.estNetYieldPct ? property.estNetYieldPct + 1.2 : 7.8}
            serviceChargeAedSqft={property.serviceChargeAedSqft ?? 20}
            currency={currency}
          />

          {/* Property Location Map */}
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">
              {property.community} ·{' '}
              <span className="font-mono-code text-xs text-[var(--text-muted)] bidi-ltr">
                {property.lat.toFixed(4)}, {property.lng.toFixed(4)}
              </span>
            </h2>
            <ClusteredPropertyMap
              properties={[property]}
              selectedId={property.id}
              currency={currency}
              locale={locale}
              theme={theme}
              onSelectProperty={() => {}}
              className="h-72"
            />
          </section>
        </div>

        {/* Right 5 Cols: Sticky Deal Sheet, DLD Madmoun Compliance & Priority Enquiry */}
        <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div>
              <div className="text-3xl font-bold tabular-nums tracking-tight">
                {formatCurrency(property.priceAed, currency, locale)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                {property.bedrooms > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-[var(--accent-primary)]" />
                    {property.bedrooms} {t('listing.beds')}
                  </span>
                ) : null}
                {property.bathrooms > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Bath className="w-4 h-4 text-[var(--accent-primary)]" />
                    {property.bathrooms} {t('listing.baths')}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Maximize className="w-4 h-4 text-[var(--accent-primary)]" />
                  {formatArea(property.areaSqft, locale)} {t('listing.sqft')}
                </span>
              </div>
            </div>

            {/* Scannable UAE DLD Madmoun QR Code */}
            <MadmounQrCard
              permitNumber={property.permitNumber}
              verifyUrl={property.madmounQrUrl}
              label={t('listing.madmounQr')}
              helperText={t('listing.verifyDld')}
            />

            {/* Verified Brokerage & Agent Card */}
            <div className="p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {property.agentName}
                </div>
                <div className="text-[var(--text-secondary)] mt-0.5">
                  {property.agentOrg}
                </div>
                <div className="font-mono-code text-[11px] text-[var(--text-muted)] mt-0.5 bidi-ltr">
                  {property.agentOrn} · {property.agentBrn} · Listed {formatDate(property.createdAt, locale)}
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-[var(--status-live)] shrink-0" />
            </div>

            {/* 1-Tap WhatsApp CTA */}
            <a
              href={buildWhatsAppUrl({
                phone: property.agentWhatsapp,
                propertyTitle: title,
                permitNumber: property.permitNumber,
                priceFormatted: formatCurrency(property.priceAed, currency, locale),
                url: shareUrl,
                locale,
              })}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] bg-[#0F6E4A] hover:opacity-95 text-white text-sm font-semibold transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              {t('listing.whatsapp')}
            </a>

            {/* Priority Enquiry Form with Watch-Time Attribution */}
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <h2 className="text-sm font-semibold mb-3">{t('enquiry.title')}</h2>

              {enquirySuccess ? (
                <div
                  role="status"
                  data-testid="enquiry-success"
                  className="p-3.5 rounded-[6px] bg-[var(--status-live-bg)] text-[var(--status-live)] text-xs font-medium"
                >
                  {t('enquiry.success')}
                </div>
              ) : (
                <form onSubmit={handleSubmitEnquiry} className="space-y-2.5">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('enquiry.name')}
                    aria-label={t('enquiry.name')}
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('enquiry.email')}
                      aria-label={t('enquiry.email')}
                      className="w-full h-10 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm"
                    />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('enquiry.phone')}
                      aria-label={t('enquiry.phone')}
                      className="w-full h-10 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm bidi-ltr"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('enquiry.message')}
                    aria-label={t('enquiry.message')}
                    className="w-full p-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm"
                  />
                  {enquiryError ? (
                    <div role="alert" className="text-xs text-[var(--status-danger)]">
                      {enquiryError}
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? 'Sending…' : t('enquiry.submit')}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

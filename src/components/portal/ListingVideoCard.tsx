'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Bath,
  BedDouble,
  MapPin,
  Maximize,
  Navigation,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { CurrencyCode, PropertyWithVideos } from '@/types/domain';
import { formatArea, formatCurrency, formatDuration } from '@/lib/format';
import { verifyOnSiteCapture } from '@/lib/geo-verify';
import { StatusPill } from '@/components/ui/Primitives';

interface ListingVideoCardProps {
  property: PropertyWithVideos;
  currency: CurrencyCode;
  isSelected?: boolean;
  isNewlySynced?: boolean;
  onSelect: (property: PropertyWithVideos) => void;
}

export function ListingVideoCard({
  property,
  currency,
  isSelected = false,
  isNewlySynced = false,
  onSelect,
}: ListingVideoCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const primaryVideo = property.videos[0];
  const title = locale === 'ar' ? property.titleAr : property.titleEn;
  const pricePerSqftAed = Math.round(
    property.priceAed / Math.max(property.areaSqft, 1)
  );
  const proximity = verifyOnSiteCapture({
    captureLat: primaryVideo?.captureLat,
    captureLng: primaryVideo?.captureLng,
    propertyLat: property.lat,
    propertyLng: property.lng,
  });

  return (
    <article
      className={`group rounded-[8px] border bg-[var(--bg-surface)] overflow-hidden transition-colors ${
        isSelected
          ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
      } ${isNewlySynced ? 'animate-sync-enter' : ''}`}
    >
      {/* Clickable Poster + Video Metadata */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(property)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(property);
          }
        }}
        className="relative aspect-[16/10] bg-[#12151A] overflow-hidden cursor-pointer"
      >
        <img
          src={primaryVideo?.posterUrl || property.galleryUrls[0]}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

        {/* Top badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2">
          <StatusPill
            status={property.status}
            label={t(`statuses.${property.status}`)}
          />
          {primaryVideo && primaryVideo.uploadStatus !== 'ready' ? (
            <StatusPill
              status={primaryVideo.uploadStatus}
              label={`${t(`videoStatus.${primaryVideo.uploadStatus}`)} ${
                primaryVideo.uploadStatus === 'uploading'
                  ? `${primaryVideo.uploadProgressPct}%`
                  : ''
              }`}
            />
          ) : property.isVerified ? (
            <div className="flex items-center gap-1">
              {proximity.verifiedOnSite ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-black/70 text-[#D4AF6A] text-[11px] font-medium">
                  <Navigation className="w-3 h-3" />
                  <span>{t('proximity.onSite')}</span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-black/70 text-[#34D399] text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>DLD</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Bottom play cue + duration */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-black/65 px-2 py-1 rounded-[4px]">
            <Play className="w-3.5 h-3.5 fill-current text-[#D4AF6A]" />
            <span className="tabular-nums font-mono-code bidi-ltr">
              {formatDuration(primaryVideo?.durationSec ?? 60)}
            </span>
          </span>
          {property.estNetYieldPct ? (
            <span className="text-[11px] font-semibold bg-black/65 px-2 py-1 rounded-[4px] text-[#D4AF6A] tabular-nums">
              {property.estNetYieldPct}% {t('listing.estYield')}
            </span>
          ) : null}
        </div>
      </div>

      {/* Dense Architectural Data Block */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-lg font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
            {formatCurrency(property.priceAed, currency, locale)}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {formatCurrency(pricePerSqftAed, currency, locale)} {t('listing.perSqft')}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)] line-clamp-2 min-h-[2.5rem]">
          <Link
            href={`/properties/${property.slug}`}
            className="hover:text-[var(--accent-primary)] transition-colors"
          >
            {title}
          </Link>
        </h3>

        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
          <span className="truncate">{property.community}</span>
        </div>

        {/* Specs Row */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)] tabular-nums">
          <div className="flex items-center gap-3">
            {property.bedrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {property.bedrooms}
              </span>
            ) : null}
            {property.bathrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {property.bathrooms}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              {formatArea(property.areaSqft, locale)} {t('listing.sqft')}
            </span>
          </div>

          <span className="font-mono-code text-[11px] text-[var(--text-muted)] bidi-ltr">
            #{property.permitNumber.slice(-6)}
          </span>
        </div>
      </div>
    </article>
  );
}

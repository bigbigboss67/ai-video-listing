'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ArrowUpRight,
  Columns2,
  ExternalLink,
  Filter,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  Presentation,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  PropertyStatus,
  PropertyType,
  PropertyWithVideos,
  RealtimeEvent,
} from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { buildWhatsAppUrl, formatArea, formatCurrency } from '@/lib/format';
import { ListingVideoCard } from './ListingVideoCard';
import { AdaptiveVideoPlayer } from '@/components/video/AdaptiveVideoPlayer';
import { ClusteredPropertyMap } from '@/components/map/ClusteredPropertyMap';
import {
  Button,
  EmptyState,
  MadmounQrCard,
  SkeletonCard,
  StatusPill,
} from '@/components/ui/Primitives';

interface DiscoveryPortalProps {
  initialProperties: PropertyWithVideos[];
  initialView?: 'grid' | 'map' | 'split';
}

interface LiveToastItem {
  id: string;
  propertyId: string;
  propertySlug: string;
  title: string;
  community: string;
  priceFormatted: string;
  statusLabel: string;
  isLiveReady: boolean;
}

export function DiscoveryPortal({
  initialProperties,
  initialView = 'split',
}: DiscoveryPortalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { currency, theme } = useAppContext();

  const [properties, setProperties] =
    useState<PropertyWithVideos[]>(initialProperties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split'>(initialView);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | 'all'>('all');
  const [status, setStatus] = useState<PropertyStatus | 'all'>('all');
  const [minBeds, setMinBeds] = useState<number>(0);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Selection & live sync animation state
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyWithVideos | null>(initialProperties[0] ?? null);
  const [newlySyncedId, setNewlySyncedId] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<LiveToastItem | null>(null);

  const fetchFiltered = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      if (propertyType !== 'all') qs.set('propertyType', propertyType);
      if (status !== 'all') qs.set('status', status);
      if (minBeds > 0) qs.set('minBeds', String(minBeds));
      if (minPrice) qs.set('minPriceAed', minPrice);
      if (maxPrice) qs.set('maxPriceAed', maxPrice);
      if (verifiedOnly) qs.set('verifiedOnly', 'true');

      const res = await fetch(`/api/properties?${qs.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load listings');
      const data = (await res.json()) as { items: PropertyWithVideos[] };
      setProperties(data.items);
      setSelectedProperty((prev) =>
        data.items.find((p) => p.id === prev?.id) ?? data.items[0] ?? null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load properties');
    } finally {
      setLoading(false);
    }
  }, [search, propertyType, status, minBeds, minPrice, maxPrice, verifiedOnly]);

  // Trigger filtered fetch when filters change (debounced for search)
  const isDefaultFilters =
    !search.trim() &&
    propertyType === 'all' &&
    status === 'all' &&
    minBeds === 0 &&
    !minPrice &&
    !maxPrice &&
    !verifiedOnly;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isDefaultFilters) {
        fetchFiltered();
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [fetchFiltered, isDefaultFilters]);

  // Realtime sync listener: live card animation + map pin drop + toast
  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (!event.property) return;
      const incoming = event.property;

      setProperties((prev) => {
        const without = prev.filter((p) => p.id !== incoming.id);
        return [incoming, ...without];
      });

      if (event.type === 'video.ready') {
        setNewlySyncedId(incoming.id);
        setSelectedProperty(incoming);
        setLiveToast({
          id: event.id,
          propertyId: incoming.id,
          propertySlug: incoming.slug,
          title: locale === 'ar' ? incoming.titleAr : incoming.titleEn,
          community: incoming.community,
          priceFormatted: formatCurrency(incoming.priceAed, currency, locale, true),
          statusLabel: t('listing.liveToastTitle'),
          isLiveReady: true,
        });
        window.setTimeout(() => setNewlySyncedId(null), 5000);
      } else if (
        event.type === 'video.uploading' ||
        event.type === 'video.processing'
      ) {
        setLiveToast({
          id: event.id,
          propertyId: incoming.id,
          propertySlug: incoming.slug,
          title: locale === 'ar' ? incoming.titleAr : incoming.titleEn,
          community: incoming.community,
          priceFormatted: `${event.progressPct ?? 0}%`,
          statusLabel:
            event.type === 'video.processing'
              ? t('videoStatus.processing')
              : t('listing.liveToastUploading'),
          isLiveReady: false,
        });
      }
    },
    [currency, locale, t]
  );

  useRealtimeSync(handleRealtimeEvent);

  const resetFilters = () => {
    setSearch('');
    setPropertyType('all');
    setStatus('all');
    setMinBeds(0);
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
    fetch('/api/properties', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { items: PropertyWithVideos[] }) => {
        setProperties(d.items);
        setSelectedProperty(d.items[0] ?? null);
      })
      .catch(() => {});
  };

  const activeProperty = useMemo(
    () =>
      selectedProperty
        ? properties.find((p) => p.id === selectedProperty.id) ?? selectedProperty
        : properties[0] ?? null,
    [properties, selectedProperty]
  );

  const filterControls = (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="portal-search"
          className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {t('filters.title')}
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            id="portal-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full h-10 ps-9 pe-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="filter-type"
          className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {t('filters.propertyType')}
        </label>
        <select
          id="filter-type"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value as PropertyType | 'all')}
          className="w-full h-10 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)]"
        >
          <option value="all">{t('filters.all')}</option>
          <option value="apartment">{t('propertyTypes.apartment')}</option>
          <option value="villa">{t('propertyTypes.villa')}</option>
          <option value="townhouse">{t('propertyTypes.townhouse')}</option>
          <option value="penthouse">{t('propertyTypes.penthouse')}</option>
          <option value="plot">{t('propertyTypes.plot')}</option>
          <option value="commercial">{t('propertyTypes.commercial')}</option>
          <option value="off_plan_project">{t('propertyTypes.off_plan_project')}</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="filter-status"
          className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {t('filters.status')}
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PropertyStatus | 'all')}
          className="w-full h-10 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)]"
        >
          <option value="all">{t('filters.all')}</option>
          <option value="ready">{t('statuses.ready')}</option>
          <option value="off_plan">{t('statuses.off_plan')}</option>
          <option value="rent">{t('statuses.rent')}</option>
        </select>
      </div>

      <div>
        <span className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
          {t('filters.bedrooms')}
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((beds) => (
            <button
              key={beds}
              type="button"
              onClick={() => setMinBeds(beds)}
              className={`h-9 rounded-[6px] text-xs font-semibold border cursor-pointer transition-colors ${
                minBeds === beds
                  ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)] border-[var(--accent-action)]'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              {beds === 0 ? t('filters.anyBeds') : `${beds}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="filter-min-price"
            className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1"
          >
            {t('filters.minPrice')} (AED)
          </label>
          <input
            id="filter-min-price"
            type="number"
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
          />
        </div>
        <div>
          <label
            htmlFor="filter-max-price"
            className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1"
          >
            {t('filters.maxPrice')} (AED)
          </label>
          <input
            id="filter-max-price"
            type="number"
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="100M"
            className="w-full h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs tabular-nums"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
          className="w-4 h-4 accent-[var(--accent-primary)] rounded"
        />
        <span className="text-xs font-medium text-[var(--text-primary)]">
          {t('filters.verifiedOnly')}
        </span>
      </label>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={resetFilters}
        className="w-full"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t('filters.reset')}
      </Button>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-4">
      {/* Live Sync Floating Toast Notification */}
      {liveToast ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="live-sync-toast"
          className="fixed top-20 end-4 z-50 max-w-sm w-[calc(100%-2rem)] rounded-[8px] border border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] p-3.5 flex items-start gap-3 animate-sync-enter"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--status-live-bg)] text-[var(--status-live)] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[var(--status-live)]">
              {liveToast.statusLabel}
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">
              {liveToast.title}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
              <span>{liveToast.community}</span>
              <span>·</span>
              <span className="tabular-nums font-semibold">
                {liveToast.priceFormatted}
              </span>
            </div>
            {liveToast.isLiveReady ? (
              <Link
                href={`/properties/${liveToast.propertySlug}`}
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                {t('listing.liveToastAction')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            aria-label="Dismiss notification"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* Top Toolbar: Result Count + View Mode Toggle + Mobile Filter Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('filters.resultsCount', { count: properties.length })}
          </h1>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-semibold cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t('filters.title')}
          </button>
        </div>

        <div
          role="group"
          aria-label="Layout view switcher"
          className="inline-flex items-center p-1 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {t('filters.viewGrid')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
              viewMode === 'split'
                ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            {t('filters.viewSplit')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
              viewMode === 'map'
                ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            {t('filters.viewMap')}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Filter Sheet */}
      {mobileFiltersOpen ? (
        <div className="lg:hidden mb-4 p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[var(--accent-primary)]" />
              {t('filters.title')}
            </span>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
              className="p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {filterControls}
        </div>
      ) : null}

      {/* 3-Zone Institutional Desktop Grid: Left Filters | Center Grid/Map | Right Sticky Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Filter Rail */}
        <aside
          aria-label={t('filters.title')}
          className="hidden lg:block lg:col-span-3 xl:col-span-2 sticky top-20 p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
        >
          {filterControls}
        </aside>

        {/* Central Viewport: Video Grid and/or Clustered Map */}
        <section className="lg:col-span-6 xl:col-span-7 space-y-5 min-w-0">
          {error ? (
            <div
              role="alert"
              className="p-4 rounded-[8px] border border-[var(--status-danger)] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-sm flex items-center justify-between"
            >
              <span>{error}</span>
              <Button size="sm" variant="secondary" onClick={fetchFiltered}>
                Retry
              </Button>
            </div>
          ) : null}

          {viewMode === 'map' || viewMode === 'split' ? (
            <ClusteredPropertyMap
              properties={properties}
              selectedId={activeProperty?.id}
              highlightedId={newlySyncedId}
              currency={currency}
              locale={locale}
              theme={theme}
              onSelectProperty={setSelectedProperty}
              className={viewMode === 'map' ? 'h-[620px]' : 'h-[320px]'}
            />
          ) : null}

          {viewMode !== 'map' ? (
            loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <EmptyState
                title={t('listing.noResultsTitle')}
                description={t('listing.noResultsBody')}
                action={
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="secondary" onClick={resetFilters}>
                      {t('filters.reset')}
                    </Button>
                    <Link
                      href="/capture"
                      className="inline-flex items-center justify-center h-10 px-4 rounded-[6px] bg-[var(--accent-primary)] text-white text-sm font-medium"
                    >
                      {t('nav.record')}
                    </Link>
                  </div>
                }
              />
            ) : (
              <div
                data-testid="property-video-grid"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {properties.map((prop) => (
                  <ListingVideoCard
                    key={prop.id}
                    property={prop}
                    currency={currency}
                    isSelected={activeProperty?.id === prop.id}
                    isNewlySynced={newlySyncedId === prop.id}
                    onSelect={setSelectedProperty}
                  />
                ))}
              </div>
            )
          ) : null}
        </section>

        {/* Right Sticky Quick-Detail Panel */}
        <aside
          aria-label="Selected property preview"
          className="hidden lg:block lg:col-span-3 sticky top-20 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
        >
          {activeProperty ? (
            <div className="p-4 space-y-4">
              <AdaptiveVideoPlayer
                videoId={activeProperty.videos[0]?.id}
                src={activeProperty.videos[0]?.playbackUrl || '/api/media/sample'}
                poster={
                  activeProperty.videos[0]?.posterUrl ||
                  activeProperty.galleryUrls[0]
                }
                title={
                  locale === 'ar'
                    ? activeProperty.titleAr
                    : activeProperty.titleEn
                }
                durationSec={activeProperty.videos[0]?.durationSec ?? 60}
                captionsEnUrl={activeProperty.videos[0]?.captionsEnUrl}
                captionsArUrl={activeProperty.videos[0]?.captionsArUrl}
                locale={locale}
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <StatusPill
                    status={activeProperty.status}
                    label={t(`statuses.${activeProperty.status}`)}
                  />
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {t(`ownerships.${activeProperty.ownership}`)}
                  </span>
                </div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                  {formatCurrency(activeProperty.priceAed, currency, locale)}
                </div>
                <h2 className="mt-1 text-sm font-semibold text-[var(--text-primary)] leading-snug">
                  {locale === 'ar'
                    ? activeProperty.titleAr
                    : activeProperty.titleEn}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {locale === 'ar'
                    ? activeProperty.addressAr
                    : activeProperty.addressEn}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[var(--border-subtle)] text-center tabular-nums">
                <div>
                  <div className="text-sm font-bold">{activeProperty.bedrooms}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t('listing.beds')}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold">{activeProperty.bathrooms}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t('listing.baths')}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold">
                    {formatArea(activeProperty.areaSqft, locale)}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t('listing.sqft')}
                  </div>
                </div>
              </div>

              <MadmounQrCard
                permitNumber={activeProperty.permitNumber}
                verifyUrl={activeProperty.madmounQrUrl}
                label={t('listing.madmounQr')}
                helperText={t('listing.verifyDld')}
                compact
              />

              <div className="flex flex-col gap-2">
                <Link
                  href={`/properties/${activeProperty.slug}`}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[6px] bg-[var(--accent-action)] text-[var(--accent-action-text)] text-xs font-semibold hover:opacity-90"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('listing.openDetail')}
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/present/${activeProperty.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-semibold"
                  >
                    <Presentation className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    {t('nav.present')}
                  </Link>
                  <a
                    href={buildWhatsAppUrl({
                      phone: activeProperty.agentWhatsapp,
                      propertyTitle:
                        locale === 'ar'
                          ? activeProperty.titleAr
                          : activeProperty.titleEn,
                      permitNumber: activeProperty.permitNumber,
                      priceFormatted: formatCurrency(
                        activeProperty.priceAed,
                        currency,
                        locale
                      ),
                      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/properties/${activeProperty.slug}`,
                      locale,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[6px] bg-[#0F6E4A] text-white text-xs font-semibold hover:opacity-90"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              {t('listing.selectCardHint')}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

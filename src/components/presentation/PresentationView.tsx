'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Box,
  Film,
  Map as MapIcon,
  Maximize2,
  ShieldCheck,
} from 'lucide-react';
import type { CurrencyCode, PropertyWithVideos } from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import { formatArea, formatCurrency } from '@/lib/format';
import { AdaptiveVideoPlayer } from '@/components/video/AdaptiveVideoPlayer';
import { InteractiveFloorPlan3D } from '@/components/floorplan/InteractiveFloorPlan3D';
import { ClusteredPropertyMap } from '@/components/map/ClusteredPropertyMap';
import { StatusPill } from '@/components/ui/Primitives';

export function PresentationView({
  property,
}: {
  property: PropertyWithVideos;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { currency, setCurrency } = useAppContext();

  const [stageMode, setStageMode] = useState<'video' | 'floorplan' | 'map'>('video');
  const title = locale === 'ar' ? property.titleAr : property.titleEn;
  const primaryVideo = property.videos[0];

  const requestFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') requestFullscreen();
      if (e.key === 'v' || e.key === 'V') setStageMode('video');
      if (e.key === 'b' || e.key === 'B') setStageMode('floorplan');
      if (e.key === 'm' || e.key === 'M') setStageMode('map');
      if (e.key === 'Escape' && !document.fullscreenElement) {
        router.push(`/properties/${property.slug}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [property.slug, router]);

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[#0D0F12] text-[#F4F5F7] flex flex-col"
    >
      {/* Minimal Executive Top Bar */}
      <header className="h-14 px-4 sm:px-6 border-b border-[#262E3B] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/properties/${property.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A3ACBA] hover:text-white shrink-0"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('presentation.exit')}
          </Link>
          <span className="text-[#394355]">|</span>
          <h1 className="text-sm sm:text-base font-semibold truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[6px] border border-[#262E3B] p-0.5 bg-[#151920]">
            <button
              type="button"
              onClick={() => setStageMode('video')}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
                stageMode === 'video'
                  ? 'bg-[#D4AF6A] text-[#0D0F12]'
                  : 'text-[#A3ACBA] hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              {t('presentation.videoView')}
            </button>
            <button
              type="button"
              onClick={() => setStageMode('floorplan')}
              data-testid="present-stage-floorplan"
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
                stageMode === 'floorplan'
                  ? 'bg-[#D4AF6A] text-[#0D0F12]'
                  : 'text-[#A3ACBA] hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              {t('presentation.floorplanView')}
            </button>
            <button
              type="button"
              onClick={() => setStageMode('map')}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold cursor-pointer ${
                stageMode === 'map'
                  ? 'bg-[#D4AF6A] text-[#0D0F12]'
                  : 'text-[#A3ACBA] hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              {t('presentation.mapView')}
            </button>
          </div>

          <select
            aria-label={t('filters.currency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="h-9 px-2.5 rounded-[6px] border border-[#262E3B] bg-[#151920] text-xs font-semibold text-white cursor-pointer"
          >
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>

          <button
            type="button"
            onClick={requestFullscreen}
            aria-label={t('presentation.fullscreen')}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] border border-[#262E3B] bg-[#151920] hover:bg-[#1D232D] text-xs font-semibold cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#D4AF6A]" />
            <span className="hidden sm:inline">{t('presentation.fullscreen')}</span>
          </button>
        </div>
      </header>

      {/* Main Split Presentation Canvas */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 items-start">
        {/* 7-Col Hero Media / Map Stage */}
        <div className="lg:col-span-7 space-y-4">
          {stageMode === 'video' ? (
            <AdaptiveVideoPlayer
              videoId={primaryVideo?.id}
              src={primaryVideo?.playbackUrl || '/api/media/sample'}
              poster={primaryVideo?.posterUrl || property.galleryUrls[0]}
              title={title}
              durationSec={primaryVideo?.durationSec ?? 60}
              captionsEnUrl={primaryVideo?.captionsEnUrl}
              captionsArUrl={primaryVideo?.captionsArUrl}
              locale={locale}
              autoPlay
            />
          ) : stageMode === 'floorplan' ? (
            <InteractiveFloorPlan3D
              propertyType={property.propertyType}
              areaSqft={property.areaSqft}
              bedrooms={property.bedrooms}
              darkSurface
            />
          ) : (
            <ClusteredPropertyMap
              properties={[property]}
              selectedId={property.id}
              currency={currency}
              locale={locale}
              theme="dark"
              onSelectProperty={() => {}}
              className="h-[460px]"
            />
          )}

          {/* Executive KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-[8px] border border-[#262E3B] bg-[#151920]">
              <div className="text-[11px] text-[#7E8899]">Headline Value</div>
              <div className="text-lg font-bold tabular-nums text-[#D4AF6A] mt-0.5">
                {formatCurrency(property.priceAed, currency, locale, true)}
              </div>
            </div>
            <div className="p-3.5 rounded-[8px] border border-[#262E3B] bg-[#151920]">
              <div className="text-[11px] text-[#7E8899]">
                {t('listing.estYield')}
              </div>
              <div className="text-lg font-bold tabular-nums text-[#34D399] mt-0.5">
                {property.estNetYieldPct ? `${property.estNetYieldPct}%` : '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-[8px] border border-[#262E3B] bg-[#151920]">
              <div className="text-[11px] text-[#7E8899]">
                {t('listing.permit')}
              </div>
              <div className="text-sm font-mono-code font-semibold mt-1 bidi-ltr flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />#
                {property.permitNumber}
              </div>
            </div>
            <div className="p-3.5 rounded-[8px] border border-[#262E3B] bg-[#151920]">
              <div className="text-[11px] text-[#7E8899]">
                {t('quickCreate.ownership')}
              </div>
              <div className="text-sm font-semibold mt-1">
                {t(`ownerships.${property.ownership}`)}
              </div>
            </div>
          </div>
        </div>

        {/* 5-Col Live Plot / Unit Availability & Pricing Matrix */}
        <div className="lg:col-span-5 rounded-[8px] border border-[#262E3B] bg-[#151920] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#262E3B] flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t('presentation.unitMatrix')}
            </h2>
            <span className="text-xs text-[#A3ACBA]">{property.community}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#1D232D] text-[#A3ACBA] uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-start">{t('presentation.unitCode')}</th>
                  <th className="py-2.5 px-3 text-start">{t('presentation.floor')}</th>
                  <th className="py-2.5 px-3 text-end">{t('presentation.area')}</th>
                  <th className="py-2.5 px-3 text-end">{t('presentation.price')}</th>
                  <th className="py-2.5 px-3 text-end">{t('presentation.unitStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262E3B] tabular-nums">
                {property.units.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1D232D]/60">
                    <td className="py-3 px-3 font-mono-code font-semibold bidi-ltr">
                      {u.unitCode}
                    </td>
                    <td className="py-3 px-3 text-[#A3ACBA]">{u.floor}</td>
                    <td className="py-3 px-3 text-end">
                      {formatArea(u.areaSqft, locale)}
                    </td>
                    <td className="py-3 px-3 text-end font-semibold">
                      {formatCurrency(u.priceAed, currency, locale, true)}
                    </td>
                    <td className="py-3 px-3 text-end">
                      <StatusPill
                        status={u.status}
                        label={t(`availabilities.${u.status}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {property.paymentPlan ? (
            <div className="p-4 border-t border-[#262E3B] bg-[#12161C] text-xs">
              <div className="text-[#7E8899] mb-1">{t('listing.paymentPlan')}</div>
              <div className="font-medium text-white">{property.paymentPlan}</div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="px-6 py-2.5 border-t border-[#262E3B] text-[11px] text-[#7E8899] flex items-center justify-between">
        <span>{t('presentation.shortcuts')}</span>
        <span>
          {property.agentOrg} · {property.agentOrn}
        </span>
      </footer>
    </div>
  );
}

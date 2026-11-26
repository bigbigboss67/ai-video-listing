'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Presentation,
  ShieldCheck,
} from 'lucide-react';
import type { PropertyWithVideos, RealtimeEvent } from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { buildWhatsAppUrl, formatArea, formatCurrency } from '@/lib/format';
import { isUsablePhone } from '@/lib/broker';
import { verifyOnSiteCapture } from '@/lib/geo-verify';
import { AdaptiveVideoPlayer } from '@/components/video/AdaptiveVideoPlayer';
import { StatusPill } from '@/components/ui/Primitives';

export function VerticalReelsFeed({
  properties: initialProperties,
}: {
  properties: PropertyWithVideos[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { currency } = useAppContext();

  const [properties, setProperties] =
    useState<PropertyWithVideos[]>(initialProperties);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSync = useCallback((event: RealtimeEvent) => {
    if (event.type === 'video.ready' && event.property) {
      const incoming = event.property;
      setProperties((prev) => [
        incoming,
        ...prev.filter((p) => p.id !== incoming.id),
      ]);
      setActiveIndex(0);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useRealtimeSync(handleSync);

  const scrollToReel = (index: number) => {
    const clamped = Math.max(0, Math.min(properties.length - 1, index));
    setActiveIndex(clamped);
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: clamped * container.clientHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-4rem)] bg-[#0D0F12]">
      {/* Active Reel Counter & Vertical Controls */}
      <div className="absolute top-3 end-3 z-20 flex flex-col items-center gap-1.5">
        <span className="px-2.5 py-1 rounded-[4px] bg-black/70 border border-[#262E3B] text-[11px] font-mono-code text-[#F4F5F7] tabular-nums bidi-ltr">
          {activeIndex + 1} / {properties.length}
        </span>
        <button
          type="button"
          onClick={() => scrollToReel(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous reel"
          className="w-9 h-9 rounded-full bg-black/70 border border-[#394355] text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToReel(activeIndex + 1)}
          disabled={activeIndex >= properties.length - 1}
          aria-label="Next reel"
          className="w-9 h-9 rounded-full bg-black/70 border border-[#394355] text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientHeight > 0) {
            const idx = Math.round(el.scrollTop / el.clientHeight);
            if (idx !== activeIndex) setActiveIndex(idx);
          }
        }}
        className="h-full overflow-y-auto snap-y snap-mandatory"
      >
        {properties.map((prop, idx) => {
          const video = prop.videos[0];
          const title = locale === 'ar' ? prop.titleAr : prop.titleEn;
          const proximity = verifyOnSiteCapture({
            captureLat: video?.captureLat,
            captureLng: video?.captureLng,
            propertyLat: prop.lat,
            propertyLng: prop.lng,
          });

          return (
            <section
              key={prop.id}
              className="h-full snap-start flex items-center justify-center p-3 sm:p-6"
            >
              <div className="w-full max-w-md h-full max-h-[760px] rounded-[12px] border border-[#262E3B] bg-[#151920] overflow-hidden flex flex-col justify-between">
                <div className="relative flex-1 bg-black flex items-center">
                  <AdaptiveVideoPlayer
                    videoId={video?.id}
                    src={video?.playbackUrl || '/api/media/sample'}
                    poster={video?.posterUrl || prop.galleryUrls[0]}
                    title={title}
                    durationSec={video?.durationSec ?? 60}
                    captionsEnUrl={video?.captionsEnUrl}
                    captionsArUrl={video?.captionsArUrl}
                    locale={locale}
                    autoPlay={idx === activeIndex}
                    className="w-full border-0 rounded-none"
                  />
                </div>

                <div className="p-4 text-[#F4F5F7] space-y-3 bg-[#151920]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <StatusPill
                        status={prop.status}
                        label={t(`statuses.${prop.status}`)}
                      />
                      {proximity.verifiedOnSite ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#0E2F23] text-[#34D399] text-[11px] font-medium">
                          <Navigation className="w-3 h-3" />
                          {t('proximity.onSite')}
                        </span>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-code text-[#34D399] bidi-ltr">
                      <ShieldCheck className="w-3.5 h-3.5" />#{prop.permitNumber}
                    </span>
                  </div>

                  <div>
                    <div className="text-xl font-bold tabular-nums text-[#D4AF6A]">
                      {formatCurrency(prop.priceAed, currency, locale)}
                    </div>
                    <h2 className="text-sm font-semibold line-clamp-2 mt-0.5">
                      {title}
                    </h2>
                    <div className="text-xs text-[#A3ACBA] flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF6A]" />
                      <span>{prop.community}</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {formatArea(prop.areaSqft, locale)} {t('listing.sqft')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Link
                      href={`/properties/${prop.slug}`}
                      className="inline-flex items-center justify-center gap-1 h-10 rounded-[6px] bg-white text-[#0D0F12] text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Dossier
                    </Link>
                    <Link
                      href={`/present/${prop.slug}`}
                      className="inline-flex items-center justify-center gap-1 h-10 rounded-[6px] border border-[#394355] text-white text-xs font-semibold"
                    >
                      <Presentation className="w-3.5 h-3.5 text-[#D4AF6A]" />
                      {t('nav.present')}
                    </Link>
                    {isUsablePhone(prop.agentWhatsapp) ? (
                      <a
                        href={buildWhatsAppUrl({
                          phone: prop.agentWhatsapp,
                          propertyTitle: title,
                          permitNumber: prop.permitNumber,
                          priceFormatted: formatCurrency(
                            prop.priceAed,
                            currency,
                            locale
                          ),
                          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/properties/${prop.slug}`,
                          locale,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1 h-10 rounded-[6px] bg-[#0F6E4A] text-white text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

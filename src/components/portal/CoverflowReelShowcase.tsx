'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { PropertyWithVideos } from '@/types/domain';
import { formatArea, formatCurrency } from '@/lib/format';
import { useAppContext } from '@/components/providers/AppProvider';

interface CoverflowReelShowcaseProps {
  properties: PropertyWithVideos[];
  locale: string;
  onSelectProperty: (property: PropertyWithVideos) => void;
}

/**
 * Style B — 3D Glass Card Coverflow (inspired by 21st.dev mg-wall-coverflow).
 * Perspective 3D rotating glass showcase for MakanReel's featured UAE video listings.
 */
export function CoverflowReelShowcase({
  properties,
  locale,
  onSelectProperty,
}: CoverflowReelShowcaseProps) {
  const { currency } = useAppContext();
  const featured = properties.slice(0, 7);
  const [activeIdx, setActiveIdx] = useState(Math.min(1, Math.max(0, featured.length - 1)));

  useEffect(() => {
    if (activeIdx >= featured.length && featured.length > 0) {
      setActiveIdx(0);
    }
  }, [featured.length, activeIdx]);

  if (featured.length === 0) return null;

  const isAr = locale === 'ar';
  const step = (delta: number) => {
    setActiveIdx((prev) => {
      const next = (prev + delta + featured.length) % featured.length;
      if (featured[next]) onSelectProperty(featured[next]);
      return next;
    });
  };

  return (
    <section
      aria-label={isAr ? 'معرض الفيديو ثلاثي الأبعاد' : '3D Glass Video Reel Coverflow'}
      className="relative overflow-hidden rounded-3xl border border-indigo-400/25 bg-[radial-gradient(circle_at_50%_15%,rgba(143,123,255,0.32)_0%,rgba(22,15,61,0.96)_48%,rgba(10,7,30,1)_100%)] px-4 sm:px-8 py-7 sm:py-9 text-white shadow-2xl mb-6"
    >
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-400/15 border border-violet-300/30 text-[11px] font-mono uppercase tracking-[0.14em] text-violet-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span>{isAr ? 'معرض ماكان ريل ثلاثي الأبعاد' : 'MAKANREEL / 3D GLASS COVERFLOW'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-violet-100 to-violet-300 bg-clip-text text-transparent">
            {isAr ? 'استعرض أبرز عقارات دبي بالفيديو' : 'Rotate. Watch. Verify in 3D Glass.'}
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous property reel"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-violet-500/35 border border-violet-300/30 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono text-xs text-violet-200 px-2 tabular-nums">
            {String(activeIdx + 1).padStart(2, '0')} / {String(featured.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next property reel"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-violet-500/35 border border-violet-300/30 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3D Perspective Stage */}
      <div
        className="relative h-[340px] sm:h-[365px] flex items-center justify-center"
        style={{ perspective: '1300px' }}
      >
        {featured.map((prop, idx) => {
          let offset = idx - activeIdx;
          if (offset > Math.floor(featured.length / 2)) offset -= featured.length;
          if (offset < -Math.floor(featured.length / 2)) offset += featured.length;
          const abs = Math.abs(offset);
          if (abs > 2) return null;

          const isCenter = offset === 0;
          const translateX = offset * 245;
          const translateZ = isCenter ? 40 : abs === 1 ? -110 : -220;
          const rotateY = offset * -24;
          const scale = isCenter ? 1 : abs === 1 ? 0.88 : 0.78;
          const opacity = isCenter ? 1 : abs === 1 ? 0.72 : 0.4;
          const title = isAr ? prop.titleAr : prop.titleEn;
          const community = prop.community;
          const price = formatCurrency(prop.priceAed, currency, locale);
          const area = formatArea(prop.areaSqft, locale);
          const isVerified = prop.isVerified;

          return (
            <div
              key={prop.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveIdx(idx);
                onSelectProperty(prop);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveIdx(idx);
                  onSelectProperty(prop);
                }
              }}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex: 10 - abs * 2,
                transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
              }}
              className={`absolute w-[300px] sm:w-[410px] rounded-2xl p-5 sm:p-6 cursor-pointer backdrop-blur-xl select-none ${
                isCenter
                  ? 'bg-gradient-to-br from-[#241A57]/95 via-[#17103E]/95 to-[#0E0929]/98 border-2 border-violet-400/80 shadow-[0_30px_80px_-18px_rgba(0,0,0,0.85),0_0_55px_-14px_rgba(143,123,255,0.6)]'
                  : 'bg-white/[0.08] border border-violet-200/25 shadow-2xl hover:border-violet-300/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-400/20 border border-violet-300/35 text-[10px] font-mono font-bold uppercase tracking-wider text-violet-100">
                  {prop.propertyType} · {prop.status}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/45 text-[10px] font-mono font-bold text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    DLD VERIFIED
                  </span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug line-clamp-2">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-violet-200/80 mt-1">{community}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/35 border border-violet-300/20 p-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-violet-300/75 uppercase">Price</div>
                  <div className="font-extrabold text-emerald-300 mt-0.5 truncate">{price}</div>
                </div>
                <div>
                  <div className="text-[10px] text-violet-300/75 uppercase">Layout</div>
                  <div className="font-bold text-white mt-0.5">
                    {prop.bedrooms} BR · {prop.bathrooms} BA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-violet-300/75 uppercase">Area</div>
                  <div className="font-bold text-white mt-0.5 truncate">{area}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-mono text-violet-200/80">
                <span className="truncate">Trakheesi: {prop.permitNumber}</span>
                <span>{prop.videos.length} HD Reel{prop.videos.length === 1 ? '' : 's'}</span>
              </div>

              {isCenter && (
                <div className="mt-4 flex items-center gap-2.5">
                  <Link
                    href={`/properties/${prop.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-400 to-indigo-500 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-violet-500/40 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isAr ? 'شاهد الفيديو والتفاصيل' : 'Watch HD Reel & Inspect'}</span>
                  </Link>
                  <Link
                    href="/reels"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-violet-200/25 text-xs font-bold text-white transition-all"
                  >
                    {isAr ? 'ريلز' : 'Reels'}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-4">
        {featured.map((prop, idx) => (
          <button
            key={prop.id}
            type="button"
            aria-label={`Focus listing ${idx + 1}`}
            onClick={() => {
              setActiveIdx(idx);
              onSelectProperty(prop);
            }}
            className={`h-2 rounded-full transition-all ${
              idx === activeIdx ? 'w-7 bg-violet-400' : 'w-2 bg-violet-300/30 hover:bg-violet-300/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}

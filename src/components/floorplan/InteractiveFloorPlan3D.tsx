'use client';

import React, { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Compass,
  Layers,
  RotateCcw,
  Ruler,
  Sparkles,
} from 'lucide-react';
import type { PropertyType } from '@/types/domain';
import {
  getFloorPlanForProperty,
  type FloorPlanRoom,
} from '@/lib/floorplan-data';
import { formatArea } from '@/lib/format';

interface InteractiveFloorPlan3DProps {
  propertyType: PropertyType;
  areaSqft: number;
  bedrooms: number;
  darkSurface?: boolean;
  compact?: boolean;
}

const ZONE_STYLE: Record<
  FloorPlanRoom['zone'],
  { fill: string; border: string; badge: string }
> = {
  living: {
    fill: 'rgba(212, 175, 106, 0.22)',
    border: '#D4AF6A',
    badge: 'text-[#D4AF6A]',
  },
  bedroom: {
    fill: 'rgba(59, 130, 246, 0.18)',
    border: '#60A5FA',
    badge: 'text-[#60A5FA]',
  },
  kitchen: {
    fill: 'rgba(52, 211, 153, 0.18)',
    border: '#34D399',
    badge: 'text-[#34D399]',
  },
  outdoor: {
    fill: 'rgba(16, 185, 129, 0.14)',
    border: '#10B981',
    badge: 'text-[#34D399]',
  },
  utility: {
    fill: 'rgba(148, 163, 184, 0.16)',
    border: '#94A3B8',
    badge: 'text-[#94A3B8]',
  },
  commercial: {
    fill: 'rgba(212, 175, 106, 0.24)',
    border: '#D4AF6A',
    badge: 'text-[#D4AF6A]',
  },
};

export function InteractiveFloorPlan3D({
  propertyType,
  areaSqft,
  bedrooms,
  darkSurface = false,
  compact = false,
}: InteractiveFloorPlan3DProps) {
  const t = useTranslations('floorplan');
  const locale = useLocale();

  const plan = useMemo(
    () => getFloorPlanForProperty({ propertyType, areaSqft, bedrooms }),
    [propertyType, areaSqft, bedrooms]
  );

  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [orbitDeg, setOrbitDeg] = useState(-38);
  const [tiltDeg, setTiltDeg] = useState(56);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    plan.rooms[0]?.id ?? ''
  );

  const activeRoom =
    plan.rooms.find((r) => r.id === selectedRoomId) ?? plan.rooms[0];

  const resetCamera = () => {
    setOrbitDeg(-38);
    setTiltDeg(56);
    setViewMode('3d');
  };

  return (
    <section
      data-testid="interactive-floorplan-3d"
      className={`rounded-[8px] border overflow-hidden ${
        darkSurface
          ? 'border-[#262E3B] bg-[#151920] text-[#F4F5F7]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
      }`}
    >
      {/* Header Toolbar */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
          darkSurface ? 'border-[#262E3B]' : 'border-[var(--border-subtle)]'
        }`}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Box className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span>{t('title')}</span>
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {locale === 'ar' ? plan.levelLabelAr : plan.levelLabelEn} ·{' '}
            <span className="bidi-ltr inline-block">{plan.orientation}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Floor plan dimension toggle"
            className={`inline-flex p-0.5 rounded-[6px] border ${
              darkSurface
                ? 'border-[#262E3B] bg-[#0D0F12]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              data-testid="floorplan-mode-3d"
              className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-[4px] text-xs font-semibold cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              {t('mode3d')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              data-testid="floorplan-mode-2d"
              className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-[4px] text-xs font-semibold cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t('mode2d')}
            </button>
          </div>

          <button
            type="button"
            onClick={resetCamera}
            aria-label={t('resetView')}
            className="w-8 h-8 rounded-[6px] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Isometric / 2D Blueprint Interactive Stage */}
      <div
        className={`relative overflow-hidden bg-[#0D1016] select-none flex items-center justify-center ${
          compact ? 'h-64' : 'h-80 sm:h-96'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(212,175,106,0.10), transparent 65%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 24px 24px, 24px 24px',
          perspective: '1100px',
        }}
      >
        {/* Top Compass & Scale Chip */}
        <div className="absolute top-3 start-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-black/70 border border-[#262E3B] text-[11px] font-mono-code text-[#D4AF6A] bidi-ltr">
          <Compass className="w-3.5 h-3.5" />
          <span>{formatArea(plan.totalSqft, locale)} sq ft</span>
          <span>·</span>
          <span>{Math.round(plan.totalSqft * 0.0929)} m²</span>
        </div>

        {/* 3D Architectural Slab */}
        <div
          className="relative w-[82%] max-w-[440px] aspect-[16/11] transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform:
              viewMode === '3d'
                ? `rotateX(${tiltDeg}deg) rotateZ(${orbitDeg}deg) scale(0.92)`
                : 'rotateX(0deg) rotateZ(0deg) scale(0.96)',
          }}
        >
          {/* Base Architectural Slab Shadow */}
          <div
            className="absolute inset-0 rounded-[4px] border border-[#D4AF6A]/45 bg-[#141923]"
            style={{
              boxShadow:
                viewMode === '3d'
                  ? '0 22px 45px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(212,175,106,0.18)'
                  : '0 6px 20px rgba(0,0,0,0.45)',
            }}
          />

          {/* Interactive Rooms */}
          {plan.rooms.map((room) => {
            const style = ZONE_STYLE[room.zone];
            const isSelected = activeRoom?.id === room.id;
            const zLift = viewMode === '3d' ? (isSelected ? room.wallHeightPx * 0.45 : room.wallHeightPx * 0.25) : 0;
            const wallThickness = viewMode === '3d' ? Math.round(room.wallHeightPx * 0.35) : 0;

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoomId(room.id)}
                data-testid={`floorplan-room-${room.id}`}
                aria-pressed={isSelected}
                className="absolute text-start p-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                style={{
                  left: `${room.x}%`,
                  top: `${room.y}%`,
                  width: `${room.w}%`,
                  height: `${room.h}%`,
                  backgroundColor: isSelected ? 'rgba(212, 175, 106, 0.36)' : style.fill,
                  border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#F4D58D' : style.border}`,
                  transform: `translateZ(${zLift}px)`,
                  boxShadow:
                    viewMode === '3d'
                      ? `0 ${wallThickness}px 0 rgba(12, 16, 23, 0.92), 0 ${wallThickness + 8}px 18px rgba(0,0,0,0.45)`
                      : 'none',
                }}
              >
                <span className="text-[10px] font-semibold leading-tight text-white drop-shadow line-clamp-2">
                  {locale === 'ar' ? room.nameAr : room.nameEn}
                </span>
                <span className="text-[9px] font-mono-code text-[#F4D58D] bidi-ltr">
                  {room.areaSqft.toLocaleString()} ft²
                </span>
              </button>
            );
          })}
        </div>

        {/* 3D Camera Orbit & Pitch Controls */}
        {viewMode === '3d' ? (
          <div className="absolute bottom-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-[6px] bg-black/75 border border-[#262E3B] text-[11px] text-[#D1D5DB]">
            <label className="flex items-center gap-2">
              <span>{t('orbit')}</span>
              <input
                type="range"
                min={-65}
                max={-15}
                value={orbitDeg}
                onChange={(e) => setOrbitDeg(Number(e.target.value))}
                className="w-24 accent-[#D4AF6A]"
              />
            </label>
            <label className="flex items-center gap-2">
              <span>{t('tilt')}</span>
              <input
                type="range"
                min={35}
                max={68}
                value={tiltDeg}
                onChange={(e) => setTiltDeg(Number(e.target.value))}
                className="w-24 accent-[#D4AF6A]"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Selected Room Inspector Panel */}
      {activeRoom ? (
        <div
          className={`p-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${
            darkSurface
              ? 'border-[#262E3B] bg-[#12161C]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
          }`}
        >
          <div className="sm:col-span-2 space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span className="font-semibold text-sm">
                {locale === 'ar' ? activeRoom.nameAr : activeRoom.nameEn}
              </span>
            </div>
            <p className="text-[var(--text-secondary)]">
              {locale === 'ar' ? activeRoom.finishAr : activeRoom.finishEn}
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 tabular-nums">
            <div className="inline-flex items-center gap-1 font-mono-code font-semibold text-[var(--accent-primary)] bidi-ltr">
              <Ruler className="w-3.5 h-3.5" />
              {activeRoom.dimensionsLabel}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] bidi-ltr">
              {formatArea(activeRoom.areaSqft, locale)} sq ft (
              {Math.round(activeRoom.areaSqft * 0.0929)} m²)
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Compass,
  Layers,
  MoveHorizontal,
  RotateCcw,
  Ruler,
  Sparkles,
} from 'lucide-react';
import type { PropertyType } from '@/types/domain';
import { getFloorPlanForProperty } from '@/lib/floorplan-data';
import { formatArea } from '@/lib/format';
import { FloorPlan2DBlueprint } from './FloorPlan2DBlueprint';
import { FloorPlan3DDollhouse } from './FloorPlan3DDollhouse';

interface InteractiveFloorPlan3DProps {
  propertyType: PropertyType;
  areaSqft: number;
  bedrooms: number;
  darkSurface?: boolean;
  compact?: boolean;
}

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
  const [orbitDeg, setOrbitDeg] = useState(38);
  const [tiltDeg, setTiltDeg] = useState(52);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    plan.rooms[0]?.id ?? ''
  );

  const activeRoom =
    plan.rooms.find((r) => r.id === selectedRoomId) ?? plan.rooms[0];

  const resetCamera = () => {
    setOrbitDeg(38);
    setTiltDeg(52);
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

      {/* Unobstructed 3D Dollhouse or 2D CAD Blueprint Canvas */}
      <div
        className={`relative w-full bg-[#0B1018] overflow-hidden ${
          compact ? 'h-72 sm:h-80' : 'h-80 sm:h-[420px]'
        }`}
      >
        <div className="absolute top-3 start-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-black/75 border border-[#262E3B] text-[11px] font-mono-code text-[#D4AF6A] bidi-ltr pointer-events-none">
          <Compass className="w-3.5 h-3.5" />
          <span>{formatArea(plan.totalSqft, locale)} sq ft</span>
          <span>·</span>
          <span>{Math.round(plan.totalSqft * 0.0929)} m²</span>
        </div>

        {viewMode === '3d' ? (
          <FloorPlan3DDollhouse
            plan={plan}
            activeRoomId={activeRoom?.id ?? ''}
            orbitDeg={orbitDeg}
            tiltDeg={tiltDeg}
            locale={locale}
            onOrbitChange={setOrbitDeg}
            onSelectRoom={setSelectedRoomId}
          />
        ) : (
          <FloorPlan2DBlueprint
            plan={plan}
            activeRoomId={activeRoom?.id ?? ''}
            locale={locale}
            onSelectRoom={setSelectedRoomId}
          />
        )}
      </div>

      {/* Dedicated Non-Overlapping 3D Camera Control Bar */}
      {viewMode === '3d' ? (
        <div
          className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-[11px] ${
            darkSurface
              ? 'border-[#262E3B] bg-[#0F131A] text-[#CBD5E1]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--accent-primary)]">
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>360° Interactive Dollhouse (drag to rotate)</span>
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span>
                {t('orbit')} ({orbitDeg}°)
              </span>
              <input
                type="range"
                min={0}
                max={355}
                value={orbitDeg}
                onChange={(e) => setOrbitDeg(Number(e.target.value))}
                className="w-24 accent-[var(--accent-primary)]"
              />
            </label>
            <label className="flex items-center gap-2">
              <span>{t('tilt')}</span>
              <input
                type="range"
                min={28}
                max={68}
                value={tiltDeg}
                onChange={(e) => setTiltDeg(Number(e.target.value))}
                className="w-24 accent-[var(--accent-primary)]"
              />
            </label>
          </div>
        </div>
      ) : null}

      {/* Selected Room Architectural Inspector */}
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

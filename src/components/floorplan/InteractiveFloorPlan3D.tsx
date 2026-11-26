'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Compass,
  Layers,
  Maximize2,
  MoveHorizontal,
  RotateCcw,
  Ruler,
  Sparkles,
} from 'lucide-react';
import type { PropertyType } from '@/types/domain';
import { getFloorPlanForProperty } from '@/lib/floorplan-data';
import { formatArea } from '@/lib/format';
import { FloorPlan2DBlueprint } from './FloorPlan2DBlueprint';
import { FloorPlan3DWebGL } from './FloorPlan3DWebGL';

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
  const sectionRef = useRef<HTMLElement | null>(null);

  const plan = useMemo(
    () => getFloorPlanForProperty({ propertyType, areaSqft, bedrooms }),
    [propertyType, areaSqft, bedrooms]
  );

  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [resetSignal, setResetSignal] = useState(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    plan.rooms[0]?.id ?? ''
  );

  const activeRoom =
    plan.rooms.find((r) => r.id === selectedRoomId) ?? plan.rooms[0];

  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    setFocusTrigger((n) => n + 1);
  };

  const handleReset = () => {
    setViewMode('3d');
    setFocusTrigger(0);
    setResetSignal((n) => n + 1);
  };

  const handleFullscreen = () => {
    const el = sectionRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <section
      ref={sectionRef}
      data-testid="interactive-floorplan-3d"
      className={`rounded-[8px] border overflow-hidden flex flex-col ${
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
            onClick={handleReset}
            aria-label={t('resetView')}
            title={t('resetView')}
            className="w-8 h-8 rounded-[6px] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="Expand fullscreen floor plan"
            title="Expand fullscreen"
            className="w-8 h-8 rounded-[6px] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full-Scale Unobstructed 3D WebGL Dollhouse OR 2D CAD Blueprint Canvas */}
      <div
        className={`relative w-full bg-[#131822] overflow-hidden flex-1 ${
          compact
            ? 'min-h-[380px] sm:min-h-[440px] h-[380px] sm:h-[440px]'
            : 'min-h-[440px] sm:min-h-[520px] h-[440px] sm:h-[520px]'
        }`}
      >
        <div className="absolute top-3 start-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-black/75 border border-[#262E3B] text-[11px] font-mono-code text-[#D4AF6A] bidi-ltr pointer-events-none">
          <Compass className="w-3.5 h-3.5" />
          <span>{formatArea(plan.totalSqft, locale)} sq ft</span>
          <span>·</span>
          <span>{Math.round(plan.totalSqft * 0.0929)} m²</span>
        </div>

        {/* Live "Where You Are" Active Room Indicator + Instant Full-View Reset */}
        {viewMode === '3d' && activeRoom ? (
          <div className="absolute top-3 end-3 z-10 flex items-center gap-1.5">
            <div
              data-testid="floorplan-active-hud"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-black/80 border border-[#D4AF6A]/60 text-[11px] font-semibold text-[#F8FAFC] shadow-sm pointer-events-none"
            >
              <span className="w-2 h-2 rounded-full bg-[#D4AF6A] animate-pulse" />
              <span className="max-w-[190px] truncate">
                {focusTrigger > 0
                  ? `${locale === 'ar' ? 'العرض:' : 'Viewing:'} ${
                      locale === 'ar' ? activeRoom.nameAr : activeRoom.nameEn
                    }`
                  : locale === 'ar'
                    ? 'نظرة عامة · اختر غرفة للتقريب'
                    : 'Overview · Click any room to focus'}
              </span>
            </div>
            {focusTrigger > 0 ? (
              <button
                type="button"
                onClick={handleReset}
                data-testid="floorplan-full-view-btn"
                className="px-2 py-1 rounded-[4px] bg-[#D4AF6A] hover:bg-[#C49B50] text-[#11161F] text-[11px] font-bold cursor-pointer transition-colors"
              >
                {locale === 'ar' ? 'عرض كامل' : 'Full View'}
              </button>
            ) : null}
          </div>
        ) : null}

        {viewMode === '3d' ? (
          <div className="absolute bottom-3 end-3 z-10 px-2.5 py-1 rounded-[4px] bg-black/70 border border-[#262E3B] text-[11px] text-[#CBD5E1] inline-flex items-center gap-1.5 pointer-events-none">
            <MoveHorizontal className="w-3.5 h-3.5 text-[#D4AF6A]" />
            <span>Drag to orbit 360° · Scroll to zoom · Click any room</span>
          </div>
        ) : null}

        {viewMode === '3d' ? (
          <FloorPlan3DWebGL
            plan={plan}
            activeRoomId={activeRoom?.id ?? ''}
            focusTrigger={focusTrigger}
            resetSignal={resetSignal}
            onSelectRoom={handleSelectRoom}
            onWebglFallback={() => setViewMode('2d')}
          />
        ) : (
          <FloorPlan2DBlueprint
            plan={plan}
            activeRoomId={activeRoom?.id ?? ''}
            locale={locale}
            onSelectRoom={handleSelectRoom}
          />
        )}
      </div>

      {/* Clean Non-Blocking Room Selector Strip (replaces giant floating overlays!) */}
      <div
        className={`px-3 py-2.5 border-t flex flex-wrap items-center gap-1.5 ${
          darkSurface
            ? 'border-[#262E3B] bg-[#0F131A]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
        }`}
      >
        {plan.rooms.map((room, idx) => {
          const active = room.id === activeRoom?.id;
          return (
            <button
              key={room.id}
              type="button"
              data-testid={`floorplan-room-${room.id}`}
              onClick={() => handleSelectRoom(room.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-[6px] text-xs font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                  : darkSurface
                    ? 'bg-[#151920] text-[#CBD5E1] border-[#262E3B] hover:border-[#D4AF6A]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <span className="font-mono-code text-[10px] opacity-80">
                0{idx + 1}
              </span>
              <span>{locale === 'ar' ? room.nameAr : room.nameEn}</span>
              <span className="font-mono-code text-[10px] opacity-80 bidi-ltr">
                {room.areaSqft} ft²
              </span>
            </button>
          );
        })}
      </div>

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

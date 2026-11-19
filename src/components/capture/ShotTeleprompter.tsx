'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clapperboard, CheckCircle2 } from 'lucide-react';

const SHOT_WINDOWS = [
  { key: 'step1', start: 0, end: 10 },
  { key: 'step2', start: 10, end: 25 },
  { key: 'step3', start: 25, end: 38 },
  { key: 'step4', start: 38, end: 50 },
  { key: 'step5', start: 50, end: 180 },
] as const;

export function ShotTeleprompter({
  recordSeconds,
  isRecording,
}: {
  recordSeconds: number;
  isRecording: boolean;
}) {
  const t = useTranslations('teleprompter');
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold flex items-center gap-1.5 text-[var(--text-primary)]">
          <Clapperboard className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          {t('title')}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline cursor-pointer"
        >
          {open ? t('toggleHide') : t('toggleShow')}
        </button>
      </div>

      {open ? (
        <ol className="space-y-1 text-[11px]">
          {SHOT_WINDOWS.map((step) => {
            const active =
              isRecording &&
              recordSeconds >= step.start &&
              recordSeconds < step.end;
            const completed = isRecording && recordSeconds >= step.end;
            return (
              <li
                key={step.key}
                className={`flex items-center gap-2 px-2 py-1 rounded-[4px] transition-colors ${
                  active
                    ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold border border-[var(--accent-primary)]/40'
                    : completed
                      ? 'text-[var(--status-live)]'
                      : 'text-[var(--text-secondary)]'
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    completed
                      ? 'text-[var(--status-live)]'
                      : active
                        ? 'text-[var(--accent-primary)]'
                        : 'text-[var(--border-strong)]'
                  }`}
                />
                <span>{t(step.key)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

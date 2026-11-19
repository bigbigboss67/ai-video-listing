'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import type { PropertyStatus, VideoUploadStatus } from '@/types/domain';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-[6px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm min-w-[44px]',
        size === 'lg' && 'h-11 px-5 text-sm min-w-[44px]',
        variant === 'primary' &&
          'bg-[var(--accent-action)] text-[var(--accent-action-text)] hover:opacity-90',
        variant === 'accent' &&
          'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]',
        variant === 'secondary' &&
          'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]',
        variant === 'ghost' &&
          'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
        variant === 'danger' &&
          'bg-[var(--status-danger)] text-white hover:opacity-90',
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: VideoUploadStatus | PropertyStatus | 'available' | 'reserved' | 'sold';
  label: string;
}) {
  const tone =
    status === 'ready' || status === 'available'
      ? 'bg-[var(--status-live-bg)] text-[var(--status-live)]'
      : status === 'uploading' ||
          status === 'processing' ||
          status === 'in_review' ||
          status === 'off_plan' ||
          status === 'reserved'
        ? 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]'
        : status === 'failed' || status === 'sold'
          ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
          : 'bg-[var(--status-info-bg)] text-[var(--status-info)]';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-xs font-medium tracking-tight',
        tone
      )}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-current"
      />
      {label}
    </span>
  );
}

export function UploadProgressRing({
  percent,
  size = 64,
  strokeWidth = 5,
  status = 'uploading',
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  status?: 'uploading' | 'paused' | 'processing' | 'ready' | 'in_review' | 'failed';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    status === 'ready'
      ? 'var(--status-live)'
      : status === 'failed'
        ? 'var(--status-danger)'
        : status === 'paused' || status === 'processing' || status === 'in_review'
          ? 'var(--status-warn)'
          : 'var(--accent-primary)';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-[var(--text-primary)]">
        {clamped}%
      </span>
    </div>
  );
}

export function MadmounQrCard({
  permitNumber,
  verifyUrl,
  label,
  helperText,
  compact = false,
}: {
  permitNumber: string;
  verifyUrl: string;
  label: string;
  helperText: string;
  compact?: boolean;
}) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(verifyUrl || `https://dubailand.gov.ae/?permit=${permitNumber}`, {
      type: 'svg',
      margin: 1,
      width: compact ? 64 : 88,
      color: { dark: '#12151A', light: '#FFFFFF' },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [verifyUrl, permitNumber, compact]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
      <div
        className="shrink-0 bg-white p-1.5 rounded-[4px] border border-[var(--border-subtle)]"
        aria-label={`Madmoun QR code for permit ${permitNumber}`}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--status-live)]">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </div>
        <div className="mt-1 font-mono-code text-xs font-semibold text-[var(--text-primary)] bidi-ltr inline-block">
          #{permitNumber}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
          {helperText}
        </p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden animate-pulse"
      aria-busy="true"
    >
      <div className="aspect-[16/10] bg-[var(--bg-elevated)]" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-2/3 bg-[var(--bg-elevated)] rounded" />
        <div className="h-5 w-1/3 bg-[var(--bg-elevated)] rounded" />
        <div className="h-3 w-full bg-[var(--bg-elevated)] rounded" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]"
    >
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)] max-w-md">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

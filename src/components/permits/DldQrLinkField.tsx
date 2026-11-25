'use client';

import React, { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUp } from 'lucide-react';
import { parseDldPermitLink } from '@/lib/dld-permit';

const MAX_DECODE_EDGE_PX = 1600;

/** Decode a QR code from an image file in the browser. The image never leaves the device. */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const { default: jsQR } = await import('jsqr');
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_DECODE_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const result = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    return result?.data ?? null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Input for the link from an agent's DLD Madmoun QR. Agents paste the link, or pick a photo or
 * screenshot of the QR and the link is read from it on the device. Only DLD Trakheesi links pass.
 */
export function DldQrLinkField({
  value,
  onChange,
  required = false,
  compact = false,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations('permit');
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const statusId = `${inputId}-status`;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const parsed = value.trim() ? parseDldPermitLink(value) : null;
  const inlineError = parsed && !parsed.ok ? t(`errors.${parsed.code}`) : null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setNotice(null);
    try {
      const decoded = await decodeQrFromFile(file);
      if (!decoded) {
        setNotice({ tone: 'error', text: t('qrNotFound') });
        return;
      }
      const link = parseDldPermitLink(decoded);
      if (!link.ok) {
        setNotice({ tone: 'error', text: t('qrNotDld') });
        return;
      }
      onChange(link.url);
      setNotice({ tone: 'ok', text: t('qrRead') });
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      {!compact ? (
        <label htmlFor={inputId} className="block text-[11px] font-semibold">
          {t('linkLabel')}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={inputId}
          type="url"
          inputMode="url"
          dir="ltr"
          required={required}
          value={value}
          onChange={(e) => {
            setNotice(null);
            onChange(e.target.value);
          }}
          placeholder={t('linkPlaceholder')}
          aria-label={compact ? t('linkLabel') : undefined}
          aria-describedby={`${hintId} ${statusId}`}
          aria-invalid={inlineError ? true : undefined}
          className="flex-1 min-w-0 h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs font-mono-code bidi-ltr text-start"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs font-semibold cursor-pointer disabled:opacity-60 shrink-0"
        >
          <ImageUp className="w-3.5 h-3.5" aria-hidden />
          {reading ? t('readingQr') : t('uploadQr')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {!compact ? (
        <p id={hintId} className="text-[11px] leading-snug text-[var(--text-muted)]">
          {t('linkHint')}
        </p>
      ) : (
        <span id={hintId} hidden />
      )}
      <p
        id={statusId}
        role="status"
        className={`text-[11px] leading-snug ${
          inlineError || notice?.tone === 'error' ? 'text-[var(--status-danger)]' : 'text-[var(--status-live)]'
        }`}
      >
        {inlineError ?? notice?.text ?? ''}
      </p>
    </div>
  );
}

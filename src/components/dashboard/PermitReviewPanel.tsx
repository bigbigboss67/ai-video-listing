'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { PermitReview, PermitStatus, RealtimeEvent } from '@/types/domain';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatDate } from '@/lib/format';
import { Button, EmptyState } from '@/components/ui/Primitives';
import { DldQrLinkField } from '@/components/permits/DldQrLinkField';
import { isDldPermitLink } from '@/lib/dld-permit';

interface PermitRow {
  propertyId: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  community: string;
  agentName: string;
  agentBrn: string;
  ownerId: string;
  permitNumber: string;
  madmounQrUrl: string;
  looksLikeMadmoun: boolean;
  permitStatus: PermitStatus;
  permitReview?: PermitReview;
  updatedAt: string;
}

interface ApiErrorBody {
  error?: { message?: string; fieldErrors?: Record<string, string[]> };
}

const STATUS_STYLES: Record<PermitStatus, string> = {
  approved: 'bg-[var(--status-live-bg)] text-[var(--status-live)]',
  pending: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  rejected: 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
  not_submitted: 'bg-[var(--status-warn-bg)] text-[var(--status-warn)]',
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    const field = body.error?.fieldErrors ? Object.values(body.error.fieldErrors).flat()[0] : undefined;
    return field || body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Dashboard tab for DLD permit links. Agents add or replace the link from each listing's
 * Madmoun QR; Admins open each link, compare it with the listing and approve or reject it.
 */
export function PermitReviewPanel({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations('permit');
  const locale = useLocale();
  const [rows, setRows] = useState<PermitRow[] | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/permits', { cache: 'no-store' });
    if (!res.ok) {
      setError(t('loadFailed'));
      setRows([]);
      return;
    }
    const json = (await res.json()) as { canReview: boolean; rows: PermitRow[] };
    setCanReview(json.canReview);
    setRows(json.rows);
    if (!json.canReview) setFilter('all');
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Another reviewer or the agent changed a permit: refresh the list.
  useRealtimeSync(
    useCallback(
      (event: RealtimeEvent) => {
        if (event.type === 'property.updated' || event.type === 'property.created') load();
      },
      [load]
    )
  );

  const submitLink = async (row: PermitRow) => {
    const link = (drafts[row.propertyId] ?? '').trim();
    setBusyId(row.propertyId);
    setError(null);
    setSavedId(null);
    try {
      const res = await fetch(`/api/permits/${encodeURIComponent(row.propertyId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ madmounQrUrl: link }),
      });
      if (!res.ok) {
        setError(await readError(res, t('actionFailed')));
        return;
      }
      setDrafts((prev) => ({ ...prev, [row.propertyId]: '' }));
      setSavedId(row.propertyId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const review = async (row: PermitRow, action: 'approve' | 'reject') => {
    setBusyId(row.propertyId);
    setError(null);
    try {
      const res = await fetch(`/api/permits/${encodeURIComponent(row.propertyId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? reasons[row.propertyId] || undefined : undefined,
        }),
      });
      if (!res.ok) {
        setError(await readError(res, t('actionFailed')));
        return;
      }
      setReasons((prev) => ({ ...prev, [row.propertyId]: '' }));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const visible = (rows ?? []).filter((r) => filter === 'all' || r.permitStatus === 'pending');
  const pendingCount = (rows ?? []).filter((r) => r.permitStatus === 'pending').length;

  return (
    <section className="space-y-3" aria-labelledby="permit-panel-title">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 id="permit-panel-title" className="text-sm font-bold">
            {t('panelTitle')}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-2xl">
            {canReview ? t('panelBodyAdmin') : t('panelBodyAgent')}
          </p>
        </div>
        {canReview ? (
          <div className="inline-flex rounded-[6px] border border-[var(--border-subtle)] p-0.5 self-start" role="group">
            {(['pending', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`h-8 px-3 rounded-[4px] text-xs font-semibold cursor-pointer ${
                  filter === f
                    ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {f === 'pending' ? `${t('filterPending')} (${pendingCount})` : t('filterAll')}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="p-2.5 rounded-[6px] bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs">
          {error}
        </div>
      ) : null}

      {rows === null ? (
        <div className="h-32 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'pending' ? t('emptyPending') : t('emptyAll')}
          description={canReview ? t('panelBodyAdmin') : t('panelBodyAgent')}
        />
      ) : (
        <ul className="space-y-2" data-testid="permit-rows">
          {visible.map((row) => {
            const title = locale === 'ar' ? row.titleAr || row.titleEn : row.titleEn;
            const busy = busyId === row.propertyId;
            const canEditLink = row.ownerId === currentUserId || canReview;
            const draft = drafts[row.propertyId] ?? '';
            const hasLink = Boolean(row.madmounQrUrl);
            return (
              <li
                key={row.propertyId}
                className="p-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2.5"
                data-testid={`permit-row-${row.propertyId}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{title}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {row.community} · {row.agentName}
                      {row.agentBrn ? (
                        <>
                          {' · '}
                          <span className="bidi-ltr inline-block">{row.agentBrn}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold ${STATUS_STYLES[row.permitStatus]}`}
                  >
                    {row.permitStatus === 'approved' ? (
                      <ShieldCheck className="w-3 h-3" aria-hidden />
                    ) : (
                      <ShieldAlert className="w-3 h-3" aria-hidden />
                    )}
                    {t(`status.${row.permitStatus}`)}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt className="text-[var(--text-muted)]">{t('colPermit')}</dt>
                  <dd className="font-mono-code font-semibold bidi-ltr text-start">#{row.permitNumber}</dd>
                  <dt className="text-[var(--text-muted)]">{t('colLink')}</dt>
                  <dd className="min-w-0">
                    {hasLink ? (
                      <a
                        href={row.madmounQrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 max-w-full underline text-[var(--status-info)]"
                        dir="ltr"
                      >
                        <span className="truncate font-mono-code">{row.madmounQrUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">{t('noLink')}</span>
                    )}
                    {hasLink && !row.looksLikeMadmoun ? (
                      <div className="text-[11px] text-[var(--status-warn)]">{t('unusualPath')}</div>
                    ) : null}
                  </dd>
                </dl>

                {row.permitStatus === 'rejected' && row.permitReview?.reason ? (
                  <p className="text-[11px] text-[var(--status-danger)]">
                    {t('rejectedReason', { reason: row.permitReview.reason })}
                  </p>
                ) : null}
                {row.permitReview?.reviewedByName && row.permitReview.reviewedAt ? (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t('reviewedBy', { name: row.permitReview.reviewedByName })} ·{' '}
                    {formatDate(row.permitReview.reviewedAt, locale)}
                  </p>
                ) : null}

                {canReview && hasLink ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={reasons[row.propertyId] ?? ''}
                      onChange={(e) =>
                        setReasons((prev) => ({ ...prev, [row.propertyId]: e.target.value }))
                      }
                      maxLength={500}
                      placeholder={t('rejectReason')}
                      aria-label={`${t('rejectReason')}: ${title}`}
                      className="flex-1 min-w-0 h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                    />
                    <div className="flex gap-2">
                      {row.permitStatus !== 'approved' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={busy || !isDldPermitLink(row.madmounQrUrl)}
                          onClick={() => review(row, 'approve')}
                        >
                          {t('approve')}
                        </Button>
                      ) : null}
                      {row.permitStatus !== 'rejected' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={busy || (reasons[row.propertyId] ?? '').trim().length < 3}
                          onClick={() => review(row, 'reject')}
                        >
                          {t('reject')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {canEditLink ? (
                  <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                    <DldQrLinkField
                      value={draft}
                      onChange={(next) => setDrafts((prev) => ({ ...prev, [row.propertyId]: next }))}
                      compact
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy || !isDldPermitLink(draft)}
                        onClick={() => submitLink(row)}
                      >
                        {hasLink ? t('replace') : t('save')}
                      </Button>
                      {savedId === row.propertyId ? (
                        <span role="status" className="text-[11px] text-[var(--status-live)]">
                          {t('saved')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

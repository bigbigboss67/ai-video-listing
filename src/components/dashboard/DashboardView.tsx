'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileCheck2,
  Film,
  Lock,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import type { AuditLog, PropertyVideo } from '@/types/domain';
import { useAppContext } from '@/components/providers/AppProvider';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatDate, formatDuration } from '@/lib/format';
import { Button, EmptyState, StatusPill } from '@/components/ui/Primitives';
import { UserManagementPanel } from './UserManagementPanel';

type DashboardTab = 'inventory' | 'moderation' | 'analytics' | 'audit' | 'team';

interface DashboardVideoRow extends PropertyVideo {
  propertyTitleEn: string;
  propertyTitleAr: string;
  propertySlug: string;
  permitNumber: string;
  community: string;
}

interface DashboardPayload {
  permissions: {
    canManageUsers: boolean;
    canModerate: boolean;
    canViewAuditLogs: boolean;
  };
  analytics: {
    liveVideos: number;
    pendingModeration: number;
    totalViews: number;
    totalWatchMin: number;
    totalEnquiries: number;
    perListing: {
      propertyId: string;
      slug: string;
      titleEn: string;
      titleAr: string;
      community: string;
      views: number;
      watchMin: number;
      enquiries: number;
      videoCount: number;
    }[];
  };
  videos: DashboardVideoRow[];
  auditLogs: AuditLog[];
}

export function DashboardView() {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useAppContext();

  const [tab, setTab] = useState<DashboardTab>('inventory');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setData(null);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as DashboardPayload;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, user?.role]);

  // Live refresh dashboard whenever any mobile upload state changes
  useRealtimeSync(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const handleModerate = async (
    videoId: string,
    action: 'approve' | 'reject' | 'retry'
  ) => {
    const res = await fetch(`/api/videos/${videoId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        reason: rejectReasons[videoId] || undefined,
      }),
    });
    if (res.ok) {
      await loadDashboard();
    }
  };

  const handleExportAnalyticsCsv = () => {
    if (!data) return;
    const header = [
      'Property ID',
      'Title',
      'Community',
      'Videos',
      'Views',
      'Watch Minutes',
      'Avg Watch Sec',
      'Enquiries',
      'Conversion %',
    ];
    const rows = data.analytics.perListing.map((r) => {
      const avgSec = r.views > 0 ? Math.round((r.watchMin * 60) / r.views) : 0;
      const convPct = r.views > 0 ? ((r.enquiries / r.views) * 100).toFixed(2) : '0.00';
      return [
        r.propertyId,
        `"${r.titleEn.replace(/"/g, '""')}"`,
        `"${r.community}"`,
        r.videoCount,
        r.views,
        r.watchMin,
        avgSec,
        r.enquiries,
        convPct,
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `makanreel-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (forbidden) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <EmptyState
          title={t('dashboard.unauthorizedTitle')}
          description={t('dashboard.unauthorizedBody')}
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <Lock className="w-4 h-4" />
              {user ? t(`roles.${user.role}`) : t('auth.signIn')}
            </span>
          }
        />
        {user ? (
          <div className="mt-6">
            <PrivacyRightsPanel />
          </div>
        ) : null}
      </div>
    );
  }

  const pendingVideos =
    data?.videos.filter(
      (v) => v.uploadStatus === 'in_review' || v.moderationStatus === 'pending'
    ) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-5 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={loadDashboard}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Strip */}
      {data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: t('dashboard.kpiLive'), val: data.analytics.liveVideos },
            { label: t('dashboard.kpiPending'), val: data.analytics.pendingModeration },
            { label: t('dashboard.kpiViews'), val: data.analytics.totalViews.toLocaleString() },
            { label: t('dashboard.kpiWatchTime'), val: data.analytics.totalWatchMin.toLocaleString() },
            { label: t('dashboard.kpiEnquiries'), val: data.analytics.totalEnquiries },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            >
              <div className="text-xs text-[var(--text-muted)]">{kpi.label}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">
                {kpi.val}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-2">
        {[
          { id: 'inventory', label: t('dashboard.tabInventory'), icon: Film },
          {
            id: 'moderation',
            label: `${t('dashboard.tabModeration')} (${pendingVideos.length})`,
            icon: FileCheck2,
          },
          { id: 'analytics', label: t('dashboard.tabAnalytics'), icon: BarChart3 },
          { id: 'audit', label: t('dashboard.tabAudit'), icon: ShieldAlert },
          ...(data?.permissions.canManageUsers
            ? [{ id: 'team', label: t('team.tab'), icon: Users }]
            : []),
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as DashboardTab)}
              className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[6px] text-xs font-semibold cursor-pointer ${
                active
                  ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading || !data ? (
        <div className="h-48 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
      ) : tab === 'inventory' ? (
        <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 text-start">Property / Video</th>
                <th className="py-3 px-4 text-start">Permit</th>
                <th className="py-3 px-4 text-start">Pipeline State</th>
                <th className="py-3 px-4 text-end">Duration</th>
                <th className="py-3 px-4 text-end">Views</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
              {data.videos.map((v) => (
                <tr key={v.id} className="hover:bg-[var(--bg-elevated)]/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={v.posterUrl}
                        alt=""
                        className="w-14 h-9 rounded-[4px] object-cover border border-[var(--border-subtle)] shrink-0"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/properties/${v.propertySlug}`}
                          className="font-semibold hover:text-[var(--accent-primary)] line-clamp-1"
                        >
                          {locale === 'ar' ? v.propertyTitleAr : v.propertyTitleEn}
                        </Link>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {v.community} · {v.uploaderName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono-code bidi-ltr">
                    #{v.permitNumber}
                  </td>
                  <td className="py-3 px-4">
                    <StatusPill
                      status={v.uploadStatus}
                      label={`${t(`videoStatus.${v.uploadStatus}`)} ${
                        v.uploadStatus === 'uploading'
                          ? `${v.uploadProgressPct}%`
                          : ''
                      }`}
                    />
                  </td>
                  <td className="py-3 px-4 text-end font-mono-code bidi-ltr">
                    {formatDuration(v.durationSec)}
                  </td>
                  <td className="py-3 px-4 text-end font-semibold">{v.viewCount}</td>
                  <td className="py-3 px-4 text-end">
                    {v.uploadStatus === 'failed' && data.permissions.canModerate ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleModerate(v.id, 'retry')}
                      >
                        {t('dashboard.retry')}
                      </Button>
                    ) : (
                      <Link
                        href={`/properties/${v.propertySlug}`}
                        className="text-[var(--accent-primary)] font-semibold hover:underline"
                      >
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'moderation' ? (
        pendingVideos.length === 0 ? (
          <EmptyState
            title={t('dashboard.tabModeration')}
            description={t('dashboard.noPending')}
          />
        ) : (
          <div className="space-y-3">
            {pendingVideos.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={v.posterUrl}
                    alt=""
                    className="w-24 h-16 rounded-[6px] object-cover border border-[var(--border-subtle)] shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {locale === 'ar' ? v.propertyTitleAr : v.propertyTitleEn}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {v.community} · Permit{' '}
                      <span className="font-mono-code bidi-ltr">#{v.permitNumber}</span> ·
                      Uploaded by {v.uploaderName}
                    </div>
                    <div className="text-[11px] text-[var(--status-live)]">
                      PDPL Filming Consent Attested:{' '}
                      {formatDate(v.consentAttestedAt, locale)}
                    </div>
                  </div>
                </div>

                {data.permissions.canModerate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={rejectReasons[v.id] ?? ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({
                          ...prev,
                          [v.id]: e.target.value,
                        }))
                      }
                      placeholder={t('dashboard.rejectPlaceholder')}
                      className="h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs w-56"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="accent"
                      onClick={() => handleModerate(v.id, 'approve')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('dashboard.approve')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => handleModerate(v.id, 'reject')}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t('dashboard.reject')}
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">
                    {t('dashboard.moderatorOnly')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      ) : tab === 'analytics' ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportAnalyticsCsv}
              data-testid="export-analytics-csv"
            >
              <Download className="w-3.5 h-3.5" />
              {t('dashboard.exportCsv')}
            </Button>
          </div>
          <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs text-start">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">Listing</th>
                  <th className="py-3 px-4 text-start">Community</th>
                  <th className="py-3 px-4 text-end">Videos</th>
                  <th className="py-3 px-4 text-end">Views</th>
                  <th className="py-3 px-4 text-end">{t('dashboard.avgWatchSec')}</th>
                  <th className="py-3 px-4 text-end">Watch Min</th>
                  <th className="py-3 px-4 text-end">Enquiries</th>
                  <th className="py-3 px-4 text-end">{t('dashboard.conversionPct')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
                {data.analytics.perListing.map((row) => {
                  const avgSec =
                    row.views > 0 ? Math.round((row.watchMin * 60) / row.views) : 0;
                  const convPct =
                    row.views > 0 ? ((row.enquiries / row.views) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={row.propertyId}>
                      <td className="py-3 px-4 font-semibold">
                        <Link
                          href={`/properties/${row.slug}`}
                          className="hover:text-[var(--accent-primary)]"
                        >
                          {locale === 'ar' ? row.titleAr : row.titleEn}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {row.community}
                      </td>
                      <td className="py-3 px-4 text-end">{row.videoCount}</td>
                      <td className="py-3 px-4 text-end font-semibold">
                        {row.views.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-code bidi-ltr">
                        {formatDuration(avgSec)}
                      </td>
                      <td className="py-3 px-4 text-end">
                        {row.watchMin.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-end font-semibold text-[var(--accent-primary)]">
                        {row.enquiries}
                      </td>
                      <td className="py-3 px-4 text-end text-[var(--status-live)] font-semibold">
                        {convPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'team' ? (
        data.permissions.canManageUsers && user ? (
          <UserManagementPanel currentUserId={user.id} />
        ) : null
      ) : !data.permissions.canViewAuditLogs ? (
        <EmptyState
          title="Admin / Manager Only"
          description="Immutable compliance audit logs require Admin or Manager authorization."
        />
      ) : (
        <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs text-start">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 text-start">Timestamp</th>
                <th className="py-3 px-4 text-start">Actor</th>
                <th className="py-3 px-4 text-start">Action</th>
                <th className="py-3 px-4 text-start">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-4 font-mono-code text-[11px] bidi-ltr">
                    {log.createdAt}
                  </td>
                  <td className="py-2.5 px-4">
                    {log.actorName}{' '}
                    <span className="text-[var(--text-muted)]">({log.actorRole})</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono-code font-semibold">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 font-mono-code text-[11px] bidi-ltr">
                    {log.entityType}:{log.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PrivacyRightsPanel />
    </div>
  );
}

/** UAE PDPL / GDPR self-service data rights for the signed-in account (any role). */
function PrivacyRightsPanel() {
  const t = useTranslations();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    window.open('/api/account/me', '_blank', 'noopener');
  };

  const handleErase = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/account/me', { method: 'DELETE' });
      if (res.ok) {
        const json = (await res.json()) as { erasedReceiptId: string };
        setNotice(`${t('dashboard.deleteConfirm')} (Receipt: ${json.erasedReceiptId})`);
      } else {
        setNotice(t('dashboard.deleteFailed'));
      }
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold">{t('dashboard.gdprTitle')}</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Federal Decree-Law No. 45 of 2021 (PDPL) & GDPR Data Portability / Right to Erasure.
        </p>
        {notice ? (
          <p role="status" className="mt-2 text-xs font-medium text-[var(--status-live)]">
            {notice}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          {t('dashboard.exportData')}
        </Button>
        {confirming ? (
          <>
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={handleErase}>
              <Trash2 className="w-3.5 h-3.5" />
              {t('dashboard.deleteConfirmAction')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              {t('dashboard.cancel')}
            </Button>
          </>
        ) : (
          <Button type="button" variant="danger" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 className="w-3.5 h-3.5" />
            {t('dashboard.deleteAccount')}
          </Button>
        )}
      </div>
    </section>
  );
}

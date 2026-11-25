'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui/Primitives';
import type { SessionUser, UserRole } from '@/types/domain';

type ManagedUser = SessionUser & {
  disabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

const ROLES: UserRole[] = ['admin', 'manager', 'verified_agent', 'agent', 'viewer'];

const fieldClass =
  'h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs w-full';

interface ApiErrorBody {
  error?: { message?: string };
}

export function UserManagementPanel({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations();
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'agent' as UserRole,
    brn: '',
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!res.ok) {
      setError(t('team.loadFailed'));
      setUsers([]);
      return;
    }
    const json = (await res.json()) as { users: ManagedUser[] };
    setUsers(json.users);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const updateUser = async (id: string, changes: { role?: UserRole; disabled?: boolean }) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        setError(body.error?.message ?? t('team.updateFailed'));
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(form.brn.trim() ? { brn: form.brn.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        setError(body.error?.message ?? t('team.createFailed'));
        return;
      }
      setForm({ fullName: '', email: '', password: '', role: 'agent', brn: '' });
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-xs font-medium text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="p-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end"
      >
        <label className="text-[11px] font-semibold lg:col-span-1">
          {t('team.fullName')}
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-[11px] font-semibold lg:col-span-1">
          {t('auth.email')}
          <input
            required
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-[11px] font-semibold lg:col-span-1">
          {t('team.initialPassword')}
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={10}
            dir="ltr"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-[11px] font-semibold lg:col-span-1">
          {t('team.role')}
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            className={`${fieldClass} mt-1`}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold lg:col-span-1">
          BRN
          <input
            dir="ltr"
            value={form.brn}
            onChange={(e) => setForm((f) => ({ ...f, brn: e.target.value }))}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <Button type="submit" size="sm" variant="accent" disabled={creating}>
          <UserPlus className="w-3.5 h-3.5" />
          {t('team.addUser')}
        </Button>
      </form>

      {users === null ? (
        <div className="h-32 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
      ) : users.length === 0 ? (
        <EmptyState title={t('team.emptyTitle')} description={t('team.emptyBody')} />
      ) : (
        <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs text-start">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 text-start">{t('team.fullName')}</th>
                <th className="py-3 px-4 text-start">{t('auth.email')}</th>
                <th className="py-3 px-4 text-start">{t('team.role')}</th>
                <th className="py-3 px-4 text-start">{t('team.lastLogin')}</th>
                <th className="py-3 px-4 text-end">{t('team.access')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className={u.disabled ? 'opacity-60' : undefined}>
                    <td className="py-2.5 px-4 font-semibold">
                      {u.fullName}
                      {isSelf ? (
                        <span className="ms-1.5 text-[var(--text-muted)] font-normal">
                          ({t('team.you')})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 bidi-ltr">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <select
                        aria-label={`${t('team.role')}: ${u.fullName}`}
                        value={u.role}
                        disabled={busyId === u.id || isSelf}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                        className="h-8 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-4 font-mono-code text-[11px] bidi-ltr">
                      {u.lastLoginAt ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 text-end">
                      {isSelf ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant={u.disabled ? 'secondary' : 'danger'}
                          disabled={busyId === u.id}
                          onClick={() => updateUser(u.id, { disabled: !u.disabled })}
                        >
                          {u.disabled ? t('team.enable') : t('team.disable')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

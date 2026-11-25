'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CurrencyCode, SessionUser } from '@/types/domain';

interface AppContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; status: number }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrencyState] = useState<CurrencyCode>('AED');
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('makanreel_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const savedCurrency = window.localStorage.getItem('makanreel_currency') as CurrencyCode | null;
    if (savedCurrency && ['AED', 'USD', 'EUR', 'GBP'].includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
    }
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      window.localStorage.setItem('makanreel_theme', next);
      return next;
    });
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    window.localStorage.setItem('makanreel_currency', next);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { user: SessionUser };
        setUser(data.user);
      }
    } catch {
      // Keep current session on transient network failure
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: SessionUser };
      setUser(data.user);
    }
    return { ok: res.ok, status: res.status };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currency,
        setCurrency,
        user,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}

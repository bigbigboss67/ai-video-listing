'use client';

import React, { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Calculator } from 'lucide-react';
import type { CurrencyCode } from '@/types/domain';
import { calculateDubaiInvestment } from '@/lib/mortgage-math';
import { formatCurrency } from '@/lib/format';

interface YieldCalculatorProps {
  priceAed: number;
  areaSqft: number;
  defaultGrossYieldPct?: number;
  serviceChargeAedSqft?: number;
  currency: CurrencyCode;
}

export function YieldCalculator({
  priceAed,
  areaSqft,
  defaultGrossYieldPct = 7.8,
  serviceChargeAedSqft = 20,
  currency,
}: YieldCalculatorProps) {
  const t = useTranslations('calculator');
  const locale = useLocale();

  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [annualInterestRatePct, setAnnualInterestRatePct] = useState(4.65);
  const [tenureYears, setTenureYears] = useState(25);
  const [grossYieldPct, setGrossYieldPct] = useState(defaultGrossYieldPct);

  const metrics = useMemo(
    () =>
      calculateDubaiInvestment({
        priceAed,
        areaSqft,
        downPaymentPct,
        annualInterestRatePct,
        tenureYears,
        grossYieldPct,
        serviceChargeAedSqft,
      }),
    [
      priceAed,
      areaSqft,
      downPaymentPct,
      annualInterestRatePct,
      tenureYears,
      grossYieldPct,
      serviceChargeAedSqft,
    ]
  );

  return (
    <section
      data-testid="yield-calculator"
      className="p-5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[var(--accent-primary)]" />
          {t('title')}
        </h2>

        {/* Buyer Profile Presets */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: t('presetResident'), pct: 20 },
            { label: t('presetIntl'), pct: 40 },
            { label: t('presetCash'), pct: 100 },
          ].map((preset) => (
            <button
              key={preset.pct}
              type="button"
              onClick={() => setDownPaymentPct(preset.pct)}
              className={`px-2.5 h-7 rounded-[4px] text-[11px] font-semibold border cursor-pointer transition-colors ${
                downPaymentPct === preset.pct
                  ? 'bg-[var(--accent-action)] text-[var(--accent-action-text)] border-[var(--accent-action)]'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="space-y-1.5 block">
          <div className="flex justify-between font-medium">
            <span className="text-[var(--text-secondary)]">{t('downPayment')}</span>
            <span className="tabular-nums font-semibold">{downPaymentPct}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="w-full accent-[var(--accent-primary)]"
          />
        </label>

        <label className="space-y-1.5 block">
          <div className="flex justify-between font-medium">
            <span className="text-[var(--text-secondary)]">{t('interestRate')}</span>
            <span className="tabular-nums font-semibold">
              {annualInterestRatePct.toFixed(2)}%
            </span>
          </div>
          <input
            type="range"
            min={3.5}
            max={7.5}
            step={0.15}
            disabled={downPaymentPct === 100}
            value={annualInterestRatePct}
            onChange={(e) => setAnnualInterestRatePct(Number(e.target.value))}
            className="w-full accent-[var(--accent-primary)] disabled:opacity-40"
          />
        </label>

        <label className="space-y-1.5 block">
          <div className="flex justify-between font-medium">
            <span className="text-[var(--text-secondary)]">{t('tenure')}</span>
            <span className="tabular-nums font-semibold">{tenureYears}y</span>
          </div>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            disabled={downPaymentPct === 100}
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="w-full accent-[var(--accent-primary)] disabled:opacity-40"
          />
        </label>

        <label className="space-y-1.5 block">
          <div className="flex justify-between font-medium">
            <span className="text-[var(--text-secondary)]">{t('grossYield')}</span>
            <span className="tabular-nums font-semibold">
              {grossYieldPct.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={14}
            step={0.5}
            value={grossYieldPct}
            onChange={(e) => setGrossYieldPct(Number(e.target.value))}
            className="w-full accent-[var(--accent-primary)]"
          />
        </label>
      </div>

      {/* Institutional Output Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)] tabular-nums">
        <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
          <div className="text-[11px] text-[var(--text-muted)]">
            {t('monthlyPayment')}
          </div>
          <div className="text-base font-bold mt-0.5 text-[var(--text-primary)]">
            {formatCurrency(metrics.monthlyMortgageAed, currency, locale)}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
          <div className="text-[11px] text-[var(--text-muted)]">{t('dldFee')}</div>
          <div className="text-base font-bold mt-0.5 text-[var(--text-primary)]">
            {formatCurrency(metrics.dldTransferFeeAed, currency, locale)}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
          <div className="text-[11px] text-[var(--text-muted)]">
            {t('upfrontCash')}
          </div>
          <div className="text-base font-bold mt-0.5 text-[var(--accent-primary)]">
            {formatCurrency(metrics.totalUpfrontCashAed, currency, locale)}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)]">
          <div className="text-[11px] text-[var(--text-muted)]">{t('netNoi')}</div>
          <div className="text-base font-bold mt-0.5 text-[var(--status-live)]">
            {formatCurrency(metrics.annualNetOperatingIncomeAed, currency, locale)}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[var(--bg-elevated)] sm:col-span-2">
          <div className="text-[11px] text-[var(--text-muted)]">
            {t('netYield')}
          </div>
          <div className="text-base font-bold mt-0.5 text-[var(--status-live)]">
            {metrics.netYieldPct}%
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">{t('disclaimer')}</p>
    </section>
  );
}

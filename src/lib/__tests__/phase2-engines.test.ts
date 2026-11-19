import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  verifyOnSiteCapture,
} from '@/lib/geo-verify';
import { calculateDubaiInvestment } from '@/lib/mortgage-math';

describe('GPS On-Site Proximity Verification', () => {
  it('awards verifiedOnSite badge when video is captured within 250m of property', () => {
    const res = verifyOnSiteCapture({
      captureLat: 25.1187,
      captureLng: 55.1348,
      propertyLat: 25.1186,
      propertyLng: 55.1347,
    });
    expect(res.verifiedOnSite).toBe(true);
    expect(res.tier).toBe('on_site');
    expect(res.distanceMeters).not.toBeNull();
    expect(res.distanceMeters!).toBeLessThan(50);
  });

  it('flags remote uploads captured kilometers away from the property', () => {
    const dist = calculateDistanceMeters(25.1186, 55.1347, 25.1972, 55.2744);
    expect(dist).toBeGreaterThan(10_000);

    const res = verifyOnSiteCapture({
      captureLat: 25.1972,
      captureLng: 55.2744,
      propertyLat: 25.1186,
      propertyLng: 55.1347,
    });
    expect(res.verifiedOnSite).toBe(false);
    expect(res.tier).toBe('remote');
  });

  it('handles missing capture coordinates safely', () => {
    const res = verifyOnSiteCapture({
      propertyLat: 25.1972,
      propertyLng: 55.2744,
    });
    expect(res.tier).toBe('unknown');
    expect(res.distanceMeters).toBeNull();
  });
});

describe('Dubai Investment, Mortgage & Net Yield Calculator', () => {
  it('computes 4% DLD fee, monthly mortgage, NOI, and net yield accurately', () => {
    const out = calculateDubaiInvestment({
      priceAed: 5_000_000,
      areaSqft: 2_000,
      downPaymentPct: 20,
      annualInterestRatePct: 4.5,
      tenureYears: 25,
      grossYieldPct: 8,
      serviceChargeAedSqft: 20,
    });

    expect(out.downPaymentAed).toBe(1_000_000);
    expect(out.loanAmountAed).toBe(4_000_000);
    expect(out.dldTransferFeeAed).toBe(200_000);
    expect(out.totalUpfrontCashAed).toBe(1_200_000);
    expect(out.annualGrossRentAed).toBe(400_000);
    expect(out.annualServiceChargeAed).toBe(40_000);
    expect(out.annualNetOperatingIncomeAed).toBe(360_000);
    expect(out.netYieldPct).toBe(7.2);
    // Standard 25yr amortization for 4M at 4.5% is ~22,233 AED/mo
    expect(out.monthlyMortgageAed).toBeGreaterThan(22_000);
    expect(out.monthlyMortgageAed).toBeLessThan(22_500);
  });

  it('supports 100% cash purchase with zero monthly mortgage', () => {
    const out = calculateDubaiInvestment({
      priceAed: 3_000_000,
      areaSqft: 1_500,
      downPaymentPct: 100,
      annualInterestRatePct: 5,
      tenureYears: 20,
      grossYieldPct: 7,
      serviceChargeAedSqft: 18,
    });
    expect(out.loanAmountAed).toBe(0);
    expect(out.monthlyMortgageAed).toBe(0);
    expect(out.annualNetCashFlowAfterDebtAed).toBe(out.annualNetOperatingIncomeAed);
  });
});

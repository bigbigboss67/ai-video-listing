export interface InvestmentInputs {
  priceAed: number;
  areaSqft: number;
  downPaymentPct: number; // e.g., 20 (UAE resident) or 40 (international)
  annualInterestRatePct: number; // e.g., 4.75
  tenureYears: number; // e.g., 25
  grossYieldPct: number; // e.g., 7.5
  serviceChargeAedSqft: number; // e.g., 20
}

export interface InvestmentOutputs {
  downPaymentAed: number;
  loanAmountAed: number;
  dldTransferFeeAed: number; // Standard 4% Dubai Land Department transfer fee
  totalUpfrontCashAed: number;
  monthlyMortgageAed: number;
  annualGrossRentAed: number;
  annualServiceChargeAed: number;
  annualNetOperatingIncomeAed: number;
  netYieldPct: number;
  annualNetCashFlowAfterDebtAed: number;
}

export function calculateDubaiInvestment(
  inputs: InvestmentInputs
): InvestmentOutputs {
  const price = Math.max(0, inputs.priceAed);
  const downPct = Math.min(Math.max(inputs.downPaymentPct, 10), 100);
  const downPaymentAed = Math.round((price * downPct) / 100);
  const loanAmountAed = Math.max(0, price - downPaymentAed);
  const dldTransferFeeAed = Math.round(price * 0.04); // 4% DLD fee
  const totalUpfrontCashAed = downPaymentAed + dldTransferFeeAed;

  const monthlyRate = Math.max(0, inputs.annualInterestRatePct) / 100 / 12;
  const totalMonths = Math.max(1, Math.round(inputs.tenureYears * 12));

  let monthlyMortgageAed = 0;
  if (loanAmountAed > 0) {
    if (monthlyRate === 0) {
      monthlyMortgageAed = Math.round(loanAmountAed / totalMonths);
    } else {
      const factor = Math.pow(1 + monthlyRate, totalMonths);
      monthlyMortgageAed = Math.round(
        (loanAmountAed * monthlyRate * factor) / (factor - 1)
      );
    }
  }

  const annualGrossRentAed = Math.round(
    (price * Math.max(0, inputs.grossYieldPct)) / 100
  );
  const annualServiceChargeAed = Math.round(
    Math.max(0, inputs.areaSqft) * Math.max(0, inputs.serviceChargeAedSqft)
  );
  const annualNetOperatingIncomeAed = Math.max(
    0,
    annualGrossRentAed - annualServiceChargeAed
  );
  const netYieldPct =
    price > 0
      ? Number(((annualNetOperatingIncomeAed / price) * 100).toFixed(2))
      : 0;
  const annualNetCashFlowAfterDebtAed =
    annualNetOperatingIncomeAed - monthlyMortgageAed * 12;

  return {
    downPaymentAed,
    loanAmountAed,
    dldTransferFeeAed,
    totalUpfrontCashAed,
    monthlyMortgageAed,
    annualGrossRentAed,
    annualServiceChargeAed,
    annualNetOperatingIncomeAed,
    netYieldPct,
    annualNetCashFlowAfterDebtAed,
  };
}

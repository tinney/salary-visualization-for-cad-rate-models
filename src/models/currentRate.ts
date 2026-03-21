/**
 * Model 3 – Current Rate
 *
 * For each payroll, converts USD pay to CAD using that month's
 * Bank of Canada exchange rate.  Both semi-monthly payrolls within
 * the same month use the same monthly rate snapshot.
 */

import type { PayrollEntry } from "../utils/payroll";
import { getRateForMonth, toMonthKey } from "../utils/rateData";

export interface CurrentRateResult {
  /** Payroll date (ISO "YYYY-MM-DD") */
  date: string;
  /** USD/CAD rate used for this payroll */
  rate: number;
  /** Semi-monthly pay in USD */
  payUSD: number;
  /** Semi-monthly pay converted to CAD (payUSD × rate) */
  payCAD: number;
  /** Running cumulative CAD total */
  cumulativeCAD: number;
}

/**
 * Applies Model 3 (Current Rate) to a payroll schedule.
 *
 * Each payroll's USD amount is converted using the Bank of Canada
 * monthly rate for that payroll's month. Payrolls whose month has
 * no rate data are skipped.
 *
 * @param payroll - Array of PayrollEntry with date and payAmountUSD
 * @returns Array of CurrentRateResult with per-payroll CAD conversion
 */
export function computeCurrentRate(
  payroll: PayrollEntry[]
): CurrentRateResult[] {
  const results: CurrentRateResult[] = [];
  let cumulative = 0;

  for (const entry of payroll) {
    const monthKey = toMonthKey(entry.date);
    const rate = getRateForMonth(monthKey);
    if (rate === undefined) continue; // skip months with no data

    const payCAD = entry.payAmountUSD * rate;
    cumulative += payCAD;

    results.push({
      date: entry.date,
      rate,
      payUSD: entry.payAmountUSD,
      payCAD,
      cumulativeCAD: cumulative,
    });
  }

  return results;
}

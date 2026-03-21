/**
 * Model 2 – Rolling Average
 *
 * For each payroll month, calculates the N-month rolling average of USD/CAD
 * rates, ending at and including the payroll's month.
 *
 * Example: window=4, payroll in 2023-06 → average of Mar, Apr, May, Jun 2023
 *
 * Both semi-monthly payrolls within the same month use the same rolling
 * average rate, since only monthly rate snapshots are available.
 *
 * If fewer than N months of data are available (e.g. near the start of the
 * dataset), only the available months are averaged.
 */

import type { PayrollEntry } from "../utils/payroll";
import { toMonthKey, getAverageRate } from "../utils/rateData";

export interface RollingAverageResult {
  /** Payroll date (ISO string "YYYY-MM-DD") */
  date: string;
  /** USD pay amount for this payroll period */
  payAmountUSD: number;
  /** N-month rolling average USD/CAD rate used for this payroll */
  averageRate: number;
  /** CAD pay amount (payAmountUSD × averageRate) */
  payAmountCAD: number;
}

/**
 * Compute the rolling-average rate for each payroll entry.
 *
 * @param payrolls      Ordered payroll schedule from generatePayrollSchedule
 * @param windowMonths  Number of months to include in the rolling average (e.g. 4)
 * @returns Array of results with per-payroll rolling-average rates and CAD amounts.
 *          Payroll entries whose month has no rate data are omitted.
 */
export function computeRollingAverage(
  payrolls: PayrollEntry[],
  windowMonths: number
): RollingAverageResult[] {
  const results: RollingAverageResult[] = [];

  for (const p of payrolls) {
    const monthKey = toMonthKey(p.date);
    const averageRate = getAverageRate(monthKey, windowMonths);
    if (averageRate === undefined) continue; // skip if no rate data

    results.push({
      date: p.date,
      payAmountUSD: p.payAmountUSD,
      averageRate,
      payAmountCAD: p.payAmountUSD * averageRate,
    });
  }

  return results;
}

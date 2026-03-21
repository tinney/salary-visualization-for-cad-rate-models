/**
 * Model 1 – Anniversary Lock
 *
 * Locks the USD/CAD exchange rate at the employee's start date and at each
 * yearly anniversary.  The locked rate is the N-month trailing average
 * (where N = averagingWindow) ending at the anniversary month.
 *
 * The locked rate stays constant for all payrolls between two consecutive
 * anniversaries.
 */

import { PayrollEntry } from "../utils/payroll";
import { toMonthKey, getAverageRate } from "../utils/rateData";

export interface AnniversaryLockResult {
  /** Payroll date (ISO string) */
  date: string;
  /** USD pay amount for this payroll period */
  payAmountUSD: number;
  /** The locked USD/CAD rate in effect for this payroll */
  lockedRate: number;
  /** CAD pay amount (payAmountUSD × lockedRate) */
  payAmountCAD: number;
}

/**
 * Compute the anniversary-locked rate for each payroll entry.
 *
 * @param payrolls       Ordered payroll schedule from generatePayrollSchedule
 * @param startDate      Employee start date (ISO string YYYY-MM-DD)
 * @param averagingWindow Number of months to average for rate lock (e.g. 4)
 * @returns Array of results with locked rates and CAD amounts
 */
export function computeAnniversaryLock(
  payrolls: PayrollEntry[],
  startDate: string,
  averagingWindow: number
): AnniversaryLockResult[] {
  const start = new Date(startDate + "T00:00:00");
  const startMonth = start.getMonth(); // 0-based
  const startDay = start.getDate();

  // Pre-compute locked rates for each anniversary year we might need.
  // Cache: year-index → locked rate
  const lockedRateCache = new Map<number, number>();

  function getLockedRateForAnniversary(yearIndex: number): number {
    if (lockedRateCache.has(yearIndex)) {
      return lockedRateCache.get(yearIndex)!;
    }

    // The anniversary date for yearIndex
    const anniversaryDate = new Date(
      start.getFullYear() + yearIndex,
      startMonth,
      startDay
    );
    const monthKey = toMonthKey(anniversaryDate);
    const rate = getAverageRate(monthKey, averagingWindow);

    // Fallback: if no rate data available, use 1.0 (shouldn't happen with real data)
    const finalRate = rate ?? 1.0;
    lockedRateCache.set(yearIndex, finalRate);
    return finalRate;
  }

  /**
   * Determine which anniversary year-index governs a given payroll date.
   * Year-index 0 = from start date until first anniversary.
   * Year-index 1 = from first anniversary until second, etc.
   */
  function getAnniversaryYearIndex(payrollDate: Date): number {
    const pYear = payrollDate.getFullYear();
    const pMonth = payrollDate.getMonth();
    const pDay = payrollDate.getDate();

    let years = pYear - start.getFullYear();

    // If we haven't reached the anniversary in this calendar year yet
    if (
      pMonth < startMonth ||
      (pMonth === startMonth && pDay < startDay)
    ) {
      years -= 1;
    }

    return Math.max(0, years);
  }

  return payrolls.map((p) => {
    const payDate = new Date(p.date + "T00:00:00");
    const yearIndex = getAnniversaryYearIndex(payDate);
    const lockedRate = getLockedRateForAnniversary(yearIndex);

    return {
      date: p.date,
      payAmountUSD: p.payAmountUSD,
      lockedRate,
      payAmountCAD: p.payAmountUSD * lockedRate,
    };
  });
}

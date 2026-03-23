/**
 * Model 1 – Anniversary Lock (with configurable lock period)
 *
 * Locks the USD/CAD exchange rate at the employee's start date and at each
 * lock-period boundary.  The locked rate is the N-month trailing average
 * (where N = averagingWindow) ending at the boundary month.
 *
 * When lockPeriodMonths = 12, this behaves like a yearly anniversary lock.
 * When lockPeriodMonths = 2, the rate resets every 2 months, etc.
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
 * @param payrolls          Ordered payroll schedule from generatePayrollSchedule
 * @param startDate         Employee start date (ISO string YYYY-MM-DD)
 * @param averagingWindow   Number of months to average for rate lock (e.g. 4)
 * @param lockPeriodMonths  How often the rate resets, in months (1–12, default 12)
 * @returns Array of results with locked rates and CAD amounts
 */
export function computeAnniversaryLock(
  payrolls: PayrollEntry[],
  startDate: string,
  averagingWindow: number,
  lockPeriodMonths: number = 12
): AnniversaryLockResult[] {
  const start = new Date(startDate + "T00:00:00");

  // Cache: period-index → locked rate
  const lockedRateCache = new Map<number, number>();

  function getLockedRateForPeriod(periodIndex: number): number {
    if (lockedRateCache.has(periodIndex)) {
      return lockedRateCache.get(periodIndex)!;
    }

    // The boundary date for this period: start + (periodIndex * lockPeriodMonths) months
    const boundaryDate = new Date(
      start.getFullYear(),
      start.getMonth() + periodIndex * lockPeriodMonths,
      start.getDate()
    );
    const monthKey = toMonthKey(boundaryDate);
    const rate = getAverageRate(monthKey, averagingWindow);

    const finalRate = rate ?? 1.0;
    lockedRateCache.set(periodIndex, finalRate);
    return finalRate;
  }

  /**
   * Determine which lock-period index governs a given payroll date.
   * Period 0 = from start date until start + lockPeriodMonths.
   * Period 1 = from start + lockPeriodMonths until start + 2*lockPeriodMonths, etc.
   */
  function getLockPeriodIndex(payrollDate: Date): number {
    // Calculate total months elapsed since start
    const monthsElapsed =
      (payrollDate.getFullYear() - start.getFullYear()) * 12 +
      (payrollDate.getMonth() - start.getMonth());

    // Check if we haven't reached the day-of-month boundary yet
    const dayAdjust = payrollDate.getDate() < start.getDate() ? 1 : 0;
    const adjustedMonths = monthsElapsed - dayAdjust;

    const periodIndex = Math.floor(Math.max(0, adjustedMonths) / lockPeriodMonths);
    return Math.max(0, periodIndex);
  }

  return payrolls.map((p) => {
    const payDate = new Date(p.date + "T00:00:00");
    const periodIndex = getLockPeriodIndex(payDate);
    const lockedRate = getLockedRateForPeriod(periodIndex);

    return {
      date: p.date,
      payAmountUSD: p.payAmountUSD,
      lockedRate,
      payAmountCAD: p.payAmountUSD * lockedRate,
    };
  });
}

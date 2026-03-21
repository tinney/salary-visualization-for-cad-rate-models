/**
 * Utility for computing anniversary dates and their N-month average USD/CAD rates.
 *
 * An "anniversary" is the start date itself (year 0) plus each subsequent yearly
 * interval (year 1, year 2, …).  For each anniversary we compute the N-month
 * trailing average rate that ends on (and includes) that anniversary's month.
 */

import { toMonthKey, getAverageRate } from "./rateData";

export interface AnniversaryRate {
  /** 0 = start date, 1 = first anniversary, 2 = second, … */
  yearIndex: number;
  /** Anniversary date as ISO string "YYYY-MM-DD" */
  anniversaryDate: string;
  /** Month key "YYYY-MM" derived from anniversaryDate */
  monthKey: string;
  /**
   * N-month trailing average USD/CAD rate ending at anniversaryDate's month.
   * Only months with available data contribute to the average.
   */
  averageRate: number;
}

/**
 * Compute all anniversary dates from `startDate` up to (and including) `endDate`,
 * and for each anniversary return the N-month trailing average USD/CAD rate.
 *
 * @param startDate      Employee start date – ISO string "YYYY-MM-DD"
 * @param averagingWindow Number of months to include in the trailing average (e.g. 4)
 * @param endDate        Upper bound for anniversaries – ISO string "YYYY-MM-DD".
 *                       Defaults to today.
 * @returns Array of AnniversaryRate objects sorted by yearIndex ascending.
 *          The array always includes at least the year-0 entry (start date itself)
 *          provided rate data exists for that month.
 */
export function computeAnniversaryRates(
  startDate: string,
  averagingWindow: number,
  endDate?: string
): AnniversaryRate[] {
  const start = new Date(startDate + "T00:00:00");
  const end = endDate
    ? new Date(endDate + "T00:00:00")
    : new Date();

  const results: AnniversaryRate[] = [];

  let yearIndex = 0;

  while (true) {
    // Compute the anniversary date for this yearIndex
    const anniversaryDate = new Date(
      start.getFullYear() + yearIndex,
      start.getMonth(),
      start.getDate()
    );

    // Stop once we've passed the end date
    if (anniversaryDate > end) {
      break;
    }

    const monthKey = toMonthKey(anniversaryDate);
    const averageRate = getAverageRate(monthKey, averagingWindow);

    // Only include anniversaries for which rate data is available
    if (averageRate !== undefined) {
      results.push({
        yearIndex,
        anniversaryDate: formatDate(anniversaryDate),
        monthKey,
        averageRate,
      });
    }

    yearIndex++;
  }

  return results;
}

/**
 * Look up the locked rate that applies to a given payroll date, given a
 * pre-computed list of anniversary rates.
 *
 * The governing anniversary is the most recent one whose date is ≤ the
 * payroll date (i.e. year-index 0 until the first anniversary, year-index 1
 * until the second, …).
 *
 * @param payrollDate     ISO string "YYYY-MM-DD"
 * @param anniversaryRates Pre-computed result of computeAnniversaryRates()
 * @returns The locked rate for this payroll date, or undefined if no
 *          anniversary rate precedes it.
 */
export function getLockedRateForDate(
  payrollDate: string,
  anniversaryRates: AnniversaryRate[]
): number | undefined {
  if (anniversaryRates.length === 0) return undefined;

  const payDate = new Date(payrollDate + "T00:00:00");

  // Walk backwards through anniversary rates to find the most recent one
  // whose anniversary date is ≤ payroll date.
  for (let i = anniversaryRates.length - 1; i >= 0; i--) {
    const anniv = new Date(anniversaryRates[i].anniversaryDate + "T00:00:00");
    if (anniv <= payDate) {
      return anniversaryRates[i].averageRate;
    }
  }

  return undefined;
}

/** Format a Date as "YYYY-MM-DD" in local time. */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

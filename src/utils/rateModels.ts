/**
 * Rate calculation models for USD/CAD conversion.
 *
 * Each model takes a rate lookup and payroll date, returning the effective
 * USD/CAD exchange rate to use for that payroll.
 */

import rateData from "../data/usdcad-monthly.json";

export interface MonthlyRate {
  month: string; // "YYYY-MM"
  rate: number;
}

/** Original rates from JSON */
const originalRatesByMonth: Record<string, number> = {};
for (const entry of (rateData as { rates: MonthlyRate[] }).rates) {
  originalRatesByMonth[entry.month] = entry.rate;
}

/** All monthly rates indexed by "YYYY-MM" for O(1) lookup */
const ratesByMonth: Record<string, number> = { ...originalRatesByMonth };

/**
 * Update a single month's rate in the rateModels lookup.
 */
export function setRateInModels(month: string, rate: number): void {
  ratesByMonth[month] = rate;
}

/**
 * Reset all rates to original JSON values.
 */
export function resetRatesInModels(): void {
  for (const key of Object.keys(ratesByMonth)) {
    delete ratesByMonth[key];
  }
  Object.assign(ratesByMonth, originalRatesByMonth);
}

/**
 * Get the rate for a specific month key ("YYYY-MM").
 * Returns undefined if no data exists for that month.
 */
export function getRateForMonth(monthKey: string): number | undefined {
  return ratesByMonth[monthKey];
}

/**
 * Convert a payroll date string ("YYYY-MM-DD") to the month key ("YYYY-MM").
 */
export function dateToMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Model 2: Rolling Average Rate
 *
 * For each payroll month, calculates the average of the USD/CAD rates over the
 * preceding N months (inclusive of the current month).
 *
 * Example with windowMonths=4 and payroll in 2023-06:
 *   average of rates for 2023-03, 2023-04, 2023-05, 2023-06
 *
 * If some months in the window lack data (e.g., near the start of the dataset),
 * only the available months are averaged.
 *
 * @param payrollDate - Payroll date as "YYYY-MM-DD"
 * @param windowMonths - Number of months to include in the rolling average (default 4)
 * @returns The rolling average USD/CAD rate, or undefined if no data at all
 */
export function getRollingAverageRate(
  payrollDate: string,
  windowMonths: number = 4
): number | undefined {
  const monthKey = dateToMonthKey(payrollDate);
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-indexed

  const rates: number[] = [];

  for (let i = 0; i < windowMonths; i++) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const rate = ratesByMonth[key];
    if (rate !== undefined) {
      rates.push(rate);
    }

    // Move to prior month
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  if (rates.length === 0) return undefined;

  return rates.reduce((sum, r) => sum + r, 0) / rates.length;
}

/**
 * Compute rolling average rates for an array of payroll dates.
 *
 * @param payrollDates - Array of "YYYY-MM-DD" strings
 * @param windowMonths - Rolling average window size in months
 * @returns Array of { date, rate } objects (rate may be undefined)
 */
export function computeRollingAverageRates(
  payrollDates: string[],
  windowMonths: number = 4
): { date: string; rate: number | undefined }[] {
  return payrollDates.map((date) => ({
    date,
    rate: getRollingAverageRate(date, windowMonths),
  }));
}

/** Export the raw rate map for other models to use */
export { ratesByMonth };

/**
 * Utilities for accessing the static Bank of Canada USD/CAD rate data.
 */
import rawData from "../data/usdcad-monthly.json";

export interface RateEntry {
  /** Month key in "YYYY-MM" format */
  month: string;
  /** USD/CAD exchange rate (1 USD = rate CAD) */
  rate: number;
}

/** Original rates from JSON (immutable reference) */
const originalRates: RateEntry[] = (rawData as any).rates as RateEntry[];

/** All monthly rates sorted chronologically (may include overrides) */
export let rates: RateEntry[] = [...originalRates];

/** Map from "YYYY-MM" → rate for O(1) lookup */
const rateMap = new Map<string, number>(rates.map((r) => [r.month, r.rate]));

/**
 * Update a single month's rate. Mutates the module-level rate map and array.
 */
export function setRate(month: string, rate: number): void {
  rateMap.set(month, rate);
  const idx = rates.findIndex((r) => r.month === month);
  if (idx >= 0) {
    rates[idx] = { month, rate };
  } else {
    rates.push({ month, rate });
    rates.sort((a, b) => a.month.localeCompare(b.month));
  }
}

/**
 * Reset all rates to original JSON values.
 */
export function resetRates(): void {
  rateMap.clear();
  rates = [...originalRates];
  for (const r of rates) {
    rateMap.set(r.month, r.rate);
  }
}

/**
 * Get all current rates as an array.
 */
export function getAllRates(): RateEntry[] {
  return rates;
}

/**
 * Get the rate for a specific month key (e.g. "2020-01").
 * Returns undefined if not found.
 */
export function getRateForMonth(monthKey: string): number | undefined {
  return rateMap.get(monthKey);
}

/**
 * Compute the month key ("YYYY-MM") for a Date or ISO date string.
 */
export function toMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + (date.length === 10 ? "T00:00:00" : "")) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Get N month keys ending at (and including) the given month key,
 * going backwards in time.
 * E.g. getPrecedingMonthKeys("2020-03", 3) → ["2020-01", "2020-02", "2020-03"]
 */
export function getPrecedingMonthKeys(monthKey: string, n: number): string[] {
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-based

  const keys: string[] = [];
  // Go back n-1 months from the target month
  month -= (n - 1);
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  for (let i = 0; i < n; i++) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return keys;
}

/**
 * Compute the average rate over the N months ending at (and including) the
 * given month. Only months with available data are included in the average.
 * Returns undefined if no data is available for any of those months.
 */
export function getAverageRate(monthKey: string, windowMonths: number): number | undefined {
  const keys = getPrecedingMonthKeys(monthKey, windowMonths);
  const availableRates = keys
    .map((k) => rateMap.get(k))
    .filter((r): r is number => r !== undefined);

  if (availableRates.length === 0) return undefined;
  return availableRates.reduce((sum, r) => sum + r, 0) / availableRates.length;
}

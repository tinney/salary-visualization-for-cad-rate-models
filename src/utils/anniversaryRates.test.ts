import { describe, test, expect } from "bun:test";
import { computeAnniversaryRates, getLockedRateForDate } from "./anniversaryRates";
import { getAverageRate, toMonthKey } from "./rateData";

// ─── computeAnniversaryRates ────────────────────────────────────────────────

describe("computeAnniversaryRates", () => {
  test("returns year-0 entry for start date itself", () => {
    const results = computeAnniversaryRates("2020-01-01", 4, "2020-06-01");
    expect(results.length).toBeGreaterThanOrEqual(1);

    const year0 = results[0];
    expect(year0.yearIndex).toBe(0);
    expect(year0.anniversaryDate).toBe("2020-01-01");
    expect(year0.monthKey).toBe("2020-01");
  });

  test("year-0 averageRate equals getAverageRate for start month", () => {
    const results = computeAnniversaryRates("2020-01-01", 4, "2020-06-01");
    const expected = getAverageRate("2020-01", 4)!;
    expect(results[0].averageRate).toBeCloseTo(expected, 10);
  });

  test("includes yearly anniversary entries within endDate", () => {
    // Start 2020-01-01, end 2022-06-01 → anniversaries: 0=Jan 2020, 1=Jan 2021, 2=Jan 2022
    const results = computeAnniversaryRates("2020-01-01", 4, "2022-06-01");
    const yearIndices = results.map((r) => r.yearIndex);
    expect(yearIndices).toContain(0);
    expect(yearIndices).toContain(1);
    expect(yearIndices).toContain(2);
  });

  test("does not include anniversary beyond endDate", () => {
    // End date is before the first anniversary
    const results = computeAnniversaryRates("2020-01-01", 4, "2020-12-31");
    const yearIndices = results.map((r) => r.yearIndex);
    expect(yearIndices).not.toContain(1);
  });

  test("includes anniversary exactly on endDate", () => {
    // End date is exactly the 1-year anniversary
    const results = computeAnniversaryRates("2020-01-01", 4, "2021-01-01");
    const yearIndices = results.map((r) => r.yearIndex);
    expect(yearIndices).toContain(1);
  });

  test("results are sorted by yearIndex ascending", () => {
    const results = computeAnniversaryRates("2015-06-01", 4, "2025-12-01");
    for (let i = 1; i < results.length; i++) {
      expect(results[i].yearIndex).toBe(results[i - 1].yearIndex + 1);
    }
  });

  test("each entry's monthKey matches its anniversaryDate", () => {
    const results = computeAnniversaryRates("2019-03-15", 4, "2023-12-01");
    for (const entry of results) {
      expect(entry.monthKey).toBe(toMonthKey(entry.anniversaryDate));
    }
  });

  test("each entry's averageRate matches getAverageRate for that monthKey", () => {
    const results = computeAnniversaryRates("2019-03-15", 4, "2023-12-01");
    for (const entry of results) {
      const expected = getAverageRate(entry.monthKey, 4)!;
      expect(entry.averageRate).toBeCloseTo(expected, 10);
    }
  });

  test("mid-month start date computes correct anniversary months", () => {
    // Start March 15 → anniversaries on March 15 each year
    const results = computeAnniversaryRates("2020-03-15", 4, "2022-06-01");
    expect(results[0].monthKey).toBe("2020-03");
    expect(results[1]?.monthKey).toBe("2021-03");
    expect(results[2]?.monthKey).toBe("2022-03");
  });

  test("window of 1 uses only the anniversary month's rate", () => {
    const results = computeAnniversaryRates("2020-06-01", 1, "2021-06-30");
    const year0 = results.find((r) => r.yearIndex === 0)!;
    const expected = getAverageRate("2020-06", 1)!;
    expect(year0.averageRate).toBeCloseTo(expected, 10);
  });

  test("window of 12 averages 12 months ending at anniversary month", () => {
    const results = computeAnniversaryRates("2021-12-01", 12, "2022-01-01");
    const year0 = results.find((r) => r.yearIndex === 0)!;
    const expected = getAverageRate("2021-12", 12)!;
    expect(year0.averageRate).toBeCloseTo(expected, 10);
  });

  test("returns empty array if start date is after endDate", () => {
    const results = computeAnniversaryRates("2025-01-01", 4, "2024-01-01");
    expect(results).toHaveLength(0);
  });

  test("different averaging windows produce different rates", () => {
    const results1 = computeAnniversaryRates("2020-01-01", 1, "2020-06-01");
    const results4 = computeAnniversaryRates("2020-01-01", 4, "2020-06-01");

    // Window=1 just uses Jan 2020; window=4 averages Oct-Jan 2020
    expect(results1[0].averageRate).not.toBeCloseTo(results4[0].averageRate, 6);
  });

  test("all averageRate values are positive", () => {
    const results = computeAnniversaryRates("2015-01-01", 4, "2025-12-31");
    for (const entry of results) {
      expect(entry.averageRate).toBeGreaterThan(0);
    }
  });

  test("produces approximately N+1 entries for N full years covered", () => {
    // 5 full years (2020–2025) → 6 entries (years 0–5)
    const results = computeAnniversaryRates("2020-01-01", 4, "2025-01-01");
    expect(results.length).toBe(6);
  });
});

// ─── getLockedRateForDate ────────────────────────────────────────────────────

describe("getLockedRateForDate", () => {
  const anniversaryRates = computeAnniversaryRates("2020-01-01", 4, "2023-12-31");

  test("payroll on start date uses year-0 rate", () => {
    const rate = getLockedRateForDate("2020-01-01", anniversaryRates);
    expect(rate).toBeCloseTo(anniversaryRates[0].averageRate, 10);
  });

  test("payroll before first anniversary uses year-0 rate", () => {
    const rate = getLockedRateForDate("2020-12-15", anniversaryRates);
    expect(rate).toBeCloseTo(anniversaryRates[0].averageRate, 10);
  });

  test("payroll on first anniversary uses year-1 rate", () => {
    const rate = getLockedRateForDate("2021-01-01", anniversaryRates);
    const year1 = anniversaryRates.find((r) => r.yearIndex === 1)!;
    expect(rate).toBeCloseTo(year1.averageRate, 10);
  });

  test("payroll between anniversaries 1 and 2 uses year-1 rate", () => {
    const rate = getLockedRateForDate("2021-06-15", anniversaryRates);
    const year1 = anniversaryRates.find((r) => r.yearIndex === 1)!;
    expect(rate).toBeCloseTo(year1.averageRate, 10);
  });

  test("payroll on second anniversary uses year-2 rate", () => {
    const rate = getLockedRateForDate("2022-01-01", anniversaryRates);
    const year2 = anniversaryRates.find((r) => r.yearIndex === 2)!;
    expect(rate).toBeCloseTo(year2.averageRate, 10);
  });

  test("returns undefined for empty anniversary list", () => {
    const rate = getLockedRateForDate("2020-06-01", []);
    expect(rate).toBeUndefined();
  });

  test("payroll just before first anniversary still uses year-0 rate", () => {
    const rate = getLockedRateForDate("2020-12-31", anniversaryRates);
    expect(rate).toBeCloseTo(anniversaryRates[0].averageRate, 10);
  });

  test("rate changes exactly on anniversary date, not before", () => {
    const rateBefore = getLockedRateForDate("2020-12-31", anniversaryRates);
    const rateOn = getLockedRateForDate("2021-01-01", anniversaryRates);

    const year0Rate = anniversaryRates.find((r) => r.yearIndex === 0)!.averageRate;
    const year1Rate = anniversaryRates.find((r) => r.yearIndex === 1)!.averageRate;

    // Rates in different years should differ (they do for real data)
    expect(rateBefore).toBeCloseTo(year0Rate, 10);
    expect(rateOn).toBeCloseTo(year1Rate, 10);
  });

  test("both payrolls in anniversary month use the new rate", () => {
    // Jan 1 and Jan 15 2021 are both in the anniversary month (Jan 2021)
    const rate1st = getLockedRateForDate("2021-01-01", anniversaryRates);
    const rate15th = getLockedRateForDate("2021-01-15", anniversaryRates);
    expect(rate1st).toBeCloseTo(rate15th!, 10);
  });
});

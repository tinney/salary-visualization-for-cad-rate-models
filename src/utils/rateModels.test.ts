import { describe, test, expect } from "bun:test";
import {
  getRollingAverageRate,
  getRateForMonth,
  dateToMonthKey,
  computeRollingAverageRates,
  ratesByMonth,
} from "./rateModels";

describe("dateToMonthKey", () => {
  test("extracts YYYY-MM from YYYY-MM-DD", () => {
    expect(dateToMonthKey("2023-06-15")).toBe("2023-06");
    expect(dateToMonthKey("2011-01-01")).toBe("2011-01");
  });
});

describe("getRateForMonth", () => {
  test("returns rate for known month", () => {
    // First entry in dataset
    expect(getRateForMonth("2011-01")).toBe(0.9938);
  });

  test("returns undefined for unknown month", () => {
    expect(getRateForMonth("1999-01")).toBeUndefined();
  });
});

describe("getRollingAverageRate", () => {
  test("window of 1 returns exactly that month's rate", () => {
    const rate = getRollingAverageRate("2020-06-01", 1);
    expect(rate).toBe(getRateForMonth("2020-06"));
  });

  test("window of 4 averages current + 3 prior months", () => {
    // For June 2020 with window=4: average of Jun, May, Apr, Mar 2020
    const jun = getRateForMonth("2020-06")!;
    const may = getRateForMonth("2020-05")!;
    const apr = getRateForMonth("2020-04")!;
    const mar = getRateForMonth("2020-03")!;
    const expected = (jun + may + apr + mar) / 4;

    const result = getRollingAverageRate("2020-06-15", 4);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("window of 12 averages 12 months", () => {
    // For Dec 2020 with window=12: Jan-Dec 2020
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(getRateForMonth(`2020-${String(m).padStart(2, "0")}`)!);
    }
    const expected = months.reduce((s, r) => s + r, 0) / 12;

    const result = getRollingAverageRate("2020-12-01", 12);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("both payroll dates in same month get same rate", () => {
    const rate1 = getRollingAverageRate("2022-03-01", 4);
    const rate15 = getRollingAverageRate("2022-03-15", 4);
    expect(rate1).toBe(rate15);
  });

  test("window crossing year boundary works correctly", () => {
    // Feb 2020 with window=4: Feb, Jan 2020, Dec, Nov 2019
    const feb20 = getRateForMonth("2020-02")!;
    const jan20 = getRateForMonth("2020-01")!;
    const dec19 = getRateForMonth("2019-12")!;
    const nov19 = getRateForMonth("2019-11")!;
    const expected = (feb20 + jan20 + dec19 + nov19) / 4;

    const result = getRollingAverageRate("2020-02-01", 4);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("returns undefined when no data available", () => {
    const result = getRollingAverageRate("1990-01-01", 4);
    expect(result).toBeUndefined();
  });
});

describe("computeRollingAverageRates", () => {
  test("returns rates for multiple dates", () => {
    const dates = ["2020-01-01", "2020-01-15", "2020-02-01"];
    const results = computeRollingAverageRates(dates, 4);
    expect(results).toHaveLength(3);
    expect(results[0].date).toBe("2020-01-01");
    expect(results[0].rate).toBeDefined();
    // Both Jan payrolls should have same rate
    expect(results[0].rate).toBe(results[1].rate);
  });
});

describe("ratesByMonth completeness", () => {
  test("has data from Jan 2011 through Mar 2026", () => {
    expect(ratesByMonth["2011-01"]).toBeDefined();
    expect(ratesByMonth["2026-03"]).toBeDefined();
  });

  test("all rates are positive numbers", () => {
    for (const [key, rate] of Object.entries(ratesByMonth)) {
      expect(rate).toBeGreaterThan(0);
    }
  });
});

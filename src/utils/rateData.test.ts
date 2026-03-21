import { describe, test, expect } from "bun:test";
import {
  getRateForMonth,
  toMonthKey,
  getPrecedingMonthKeys,
  getAverageRate,
  rates,
} from "./rateData";

describe("getRateForMonth", () => {
  test("returns rate for known month", () => {
    // First entry in dataset (Jan 2011)
    expect(getRateForMonth("2011-01")).toBe(0.9938);
  });

  test("returns rate for last entry (Mar 2026)", () => {
    const rate = getRateForMonth("2026-03");
    expect(rate).toBeDefined();
    expect(rate).toBeGreaterThan(0);
  });

  test("returns undefined for unknown month before dataset", () => {
    expect(getRateForMonth("1999-01")).toBeUndefined();
  });

  test("returns undefined for unknown month after dataset", () => {
    expect(getRateForMonth("2030-01")).toBeUndefined();
  });
});

describe("toMonthKey", () => {
  test("converts ISO date string to YYYY-MM", () => {
    expect(toMonthKey("2023-06-15")).toBe("2023-06");
    expect(toMonthKey("2011-01-01")).toBe("2011-01");
    expect(toMonthKey("2026-03-31")).toBe("2026-03");
  });

  test("converts Date object to YYYY-MM", () => {
    const date = new Date("2020-07-01T00:00:00");
    expect(toMonthKey(date)).toBe("2020-07");
  });

  test("handles end-of-month date", () => {
    expect(toMonthKey("2020-02-29")).toBe("2020-02");
  });
});

describe("getPrecedingMonthKeys", () => {
  test("window of 1 returns only the target month", () => {
    const keys = getPrecedingMonthKeys("2020-06", 1);
    expect(keys).toEqual(["2020-06"]);
  });

  test("window of 3 returns 3 months ending at target", () => {
    const keys = getPrecedingMonthKeys("2020-06", 3);
    expect(keys).toEqual(["2020-04", "2020-05", "2020-06"]);
  });

  test("window of 4 returns 4 months ending at target", () => {
    const keys = getPrecedingMonthKeys("2020-06", 4);
    expect(keys).toEqual(["2020-03", "2020-04", "2020-05", "2020-06"]);
  });

  test("crosses year boundary correctly", () => {
    const keys = getPrecedingMonthKeys("2020-02", 4);
    expect(keys).toEqual(["2019-11", "2019-12", "2020-01", "2020-02"]);
  });

  test("crosses multiple year boundaries", () => {
    const keys = getPrecedingMonthKeys("2020-01", 4);
    expect(keys).toEqual(["2019-10", "2019-11", "2019-12", "2020-01"]);
  });

  test("returns keys in chronological order (oldest first)", () => {
    const keys = getPrecedingMonthKeys("2020-06", 4);
    expect(keys[0] < keys[1]).toBe(true);
    expect(keys[1] < keys[2]).toBe(true);
    expect(keys[2] < keys[3]).toBe(true);
  });

  test("window of 12 covers a full year", () => {
    const keys = getPrecedingMonthKeys("2020-12", 12);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe("2020-01");
    expect(keys[11]).toBe("2020-12");
  });
});

describe("getAverageRate", () => {
  test("window of 1 returns exactly that month's rate", () => {
    const result = getAverageRate("2020-06", 1);
    expect(result).toBe(getRateForMonth("2020-06"));
  });

  test("window of 4 averages current + 3 prior months", () => {
    // For June 2020 with window=4: average of Mar, Apr, May, Jun 2020
    const jun = getRateForMonth("2020-06")!;
    const may = getRateForMonth("2020-05")!;
    const apr = getRateForMonth("2020-04")!;
    const mar = getRateForMonth("2020-03")!;
    const expected = (mar + apr + may + jun) / 4;

    const result = getAverageRate("2020-06", 4);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("window of 12 averages all 12 months of 2020", () => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(getRateForMonth(`2020-${String(m).padStart(2, "0")}`)!);
    }
    const expected = months.reduce((s, r) => s + r, 0) / 12;

    const result = getAverageRate("2020-12", 12);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("crosses year boundary correctly", () => {
    // Feb 2020 with window=4: Nov, Dec 2019, Jan, Feb 2020
    const nov19 = getRateForMonth("2019-11")!;
    const dec19 = getRateForMonth("2019-12")!;
    const jan20 = getRateForMonth("2020-01")!;
    const feb20 = getRateForMonth("2020-02")!;
    const expected = (nov19 + dec19 + jan20 + feb20) / 4;

    const result = getAverageRate("2020-02", 4);
    expect(result).toBeCloseTo(expected, 10);
  });

  test("returns undefined when no data is available for any month in window", () => {
    const result = getAverageRate("1990-01", 4);
    expect(result).toBeUndefined();
  });

  test("partial window at dataset start still returns average of available months", () => {
    // Jan 2011 is the first month; with window=4, only 1 month has data
    const result = getAverageRate("2011-01", 4);
    // Only 2011-01 has data; prior months don't exist
    expect(result).toBe(getRateForMonth("2011-01"));
  });

  test("result is a positive number for any valid month in dataset", () => {
    const result = getAverageRate("2022-06", 4);
    expect(result).toBeDefined();
    expect(result!).toBeGreaterThan(0);
  });

  test("both payroll dates in same month (1st and 15th) produce same average rate", () => {
    // Convert both payroll dates to the same month key, so rate should be identical
    const monthKey = toMonthKey("2022-03-01");
    const rate1 = getAverageRate(monthKey, 4);

    const monthKey15 = toMonthKey("2022-03-15");
    const rate15 = getAverageRate(monthKey15, 4);

    expect(rate1).toBe(rate15);
  });
});

describe("rates dataset completeness", () => {
  test("has data from Jan 2011 through Mar 2026", () => {
    expect(getRateForMonth("2011-01")).toBeDefined();
    expect(getRateForMonth("2026-03")).toBeDefined();
  });

  test("all rates are positive numbers", () => {
    for (const entry of rates) {
      expect(entry.rate).toBeGreaterThan(0);
    }
  });

  test("has approximately 183 monthly entries (Jan 2011 - Mar 2026)", () => {
    // 15 full years * 12 months = 180, plus Jan-Mar 2026 = 183
    expect(rates.length).toBeGreaterThanOrEqual(180);
    expect(rates.length).toBeLessThanOrEqual(186);
  });
});

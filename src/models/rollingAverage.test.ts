import { describe, it, expect } from "bun:test";
import { computeRollingAverage } from "./rollingAverage";
import { generatePayrollSchedule } from "../utils/payroll";
import { getAverageRate } from "../utils/rateData";

describe("computeRollingAverage", () => {
  it("returns correct CAD amounts using N-month rolling average rate", () => {
    const startDate = "2020-06-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-06-15");
    const results = computeRollingAverage(payrolls, 4);

    // window=4, payroll in 2020-06 → average of Mar, Apr, May, Jun 2020
    const expectedRate = getAverageRate("2020-06", 4);
    expect(expectedRate).toBeDefined();

    expect(results).toHaveLength(2); // 1st and 15th
    for (const r of results) {
      expect(r.averageRate).toBeCloseTo(expectedRate!, 8);
      expect(r.payAmountCAD).toBeCloseTo(r.payAmountUSD * expectedRate!, 2);
    }
  });

  it("both payrolls in the same month use the same rolling average rate", () => {
    const startDate = "2022-03-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2022-03-15");
    const results = computeRollingAverage(payrolls, 4);

    expect(results).toHaveLength(2);
    expect(results[0].averageRate).toBe(results[1].averageRate);
  });

  it("rolling average changes month-to-month as new rate enters window", () => {
    const startDate = "2020-05-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-06-15");
    const results = computeRollingAverage(payrolls, 4);

    // May 2020: avg of Feb, Mar, Apr, May 2020
    const may1Rate = results.find((r) => r.date === "2020-05-01")?.averageRate;
    // Jun 2020: avg of Mar, Apr, May, Jun 2020
    const jun1Rate = results.find((r) => r.date === "2020-06-01")?.averageRate;

    expect(may1Rate).toBeDefined();
    expect(jun1Rate).toBeDefined();
    // Different months should generally produce different rates
    expect(may1Rate).not.toBeCloseTo(jun1Rate!, 8);
  });

  it("window of 1 returns that month's exact rate", () => {
    const startDate = "2021-06-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2021-06-15");
    const results = computeRollingAverage(payrolls, 1);

    const expectedRate = getAverageRate("2021-06", 1);
    expect(expectedRate).toBeDefined();

    for (const r of results) {
      expect(r.averageRate).toBeCloseTo(expectedRate!, 8);
    }
  });

  it("window crossing a year boundary averages correctly", () => {
    // Feb 2020 with window=4 → Nov 2019, Dec 2019, Jan 2020, Feb 2020
    const startDate = "2020-02-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-02-15");
    const results = computeRollingAverage(payrolls, 4);

    const expectedRate = getAverageRate("2020-02", 4);
    expect(expectedRate).toBeDefined();

    for (const r of results) {
      expect(r.averageRate).toBeCloseTo(expectedRate!, 8);
    }
  });

  it("omits payrolls with no rate data", () => {
    // Dates far in the future have no rate data
    const payrolls = generatePayrollSchedule(160000, 0, "2099-01-01", "2099-01-15");
    const results = computeRollingAverage(payrolls, 4);
    expect(results).toHaveLength(0);
  });

  it("CAD amount equals USD amount times the average rate", () => {
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 3, startDate, "2023-12-15");
    const results = computeRollingAverage(payrolls, 4);

    for (const r of results) {
      expect(r.payAmountCAD).toBeCloseTo(r.payAmountUSD * r.averageRate, 2);
    }
  });

  it("larger window smooths rate more than smaller window", () => {
    // A 12-month window should produce less variance than a 1-month window
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-12-31");

    const resultsWindow1 = computeRollingAverage(payrolls, 1);
    const resultsWindow12 = computeRollingAverage(payrolls, 12);

    // Both produce results for every month
    expect(resultsWindow1.length).toBeGreaterThan(0);
    expect(resultsWindow12.length).toBeGreaterThan(0);

    // Calculate variance for each window
    const rates1 = resultsWindow1.map((r) => r.averageRate);
    const rates12 = resultsWindow12.map((r) => r.averageRate);

    const variance = (arr: number[]) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    };

    // Shorter window should have more variance (less smoothing)
    expect(variance(rates1)).toBeGreaterThan(variance(rates12));
  });

  it("window=4 averages correct months (inclusive of current month)", () => {
    // Verify exact months included: payroll in 2023-06, window=4
    // Should include 2023-03, 2023-04, 2023-05, 2023-06
    const startDate = "2023-06-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2023-06-01");
    const results = computeRollingAverage(payrolls, 4);

    expect(results).toHaveLength(1);
    const expected = getAverageRate("2023-06", 4);
    expect(results[0].averageRate).toBeCloseTo(expected!, 8);
  });
});

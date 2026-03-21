import { describe, it, expect } from "bun:test";
import { computeAnniversaryLock } from "./anniversaryLock";
import { generatePayrollSchedule, PayrollEntry } from "../utils/payroll";
import { getAverageRate, toMonthKey } from "../utils/rateData";

describe("computeAnniversaryLock", () => {
  it("locks rate at start date using N-month average", () => {
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-02-15");
    const results = computeAnniversaryLock(payrolls, startDate, 4);

    // The locked rate for year 0 should be the 4-month average ending at 2020-01
    const expectedRate = getAverageRate("2020-01", 4);
    expect(expectedRate).toBeDefined();

    // All payrolls in the first year should use the same locked rate
    for (const r of results) {
      expect(r.lockedRate).toBeCloseTo(expectedRate!, 6);
      expect(r.payAmountCAD).toBeCloseTo(r.payAmountUSD * expectedRate!, 2);
    }
  });

  it("locks a new rate at the first anniversary", () => {
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 3, startDate, "2021-03-15");
    const results = computeAnniversaryLock(payrolls, startDate, 4);

    const rateYear0 = getAverageRate("2020-01", 4)!;
    const rateYear1 = getAverageRate("2021-01", 4)!;

    // Payrolls before 2021-01-01 should use year 0 rate
    const dec2020 = results.find((r) => r.date === "2020-12-15");
    expect(dec2020).toBeDefined();
    expect(dec2020!.lockedRate).toBeCloseTo(rateYear0, 6);

    // Payrolls on/after 2021-01-01 should use year 1 rate
    const jan2021 = results.find((r) => r.date === "2021-01-01");
    expect(jan2021).toBeDefined();
    expect(jan2021!.lockedRate).toBeCloseTo(rateYear1, 6);
  });

  it("both payrolls in an anniversary month use the new rate", () => {
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2021-01-15");
    const results = computeAnniversaryLock(payrolls, startDate, 4);

    const rateYear1 = getAverageRate("2021-01", 4)!;

    // Both Jan 1 and Jan 15 2021 should use year 1 rate
    const jan1 = results.find((r) => r.date === "2021-01-01");
    const jan15 = results.find((r) => r.date === "2021-01-15");
    expect(jan1!.lockedRate).toBeCloseTo(rateYear1, 6);
    expect(jan15!.lockedRate).toBeCloseTo(rateYear1, 6);
  });

  it("works with a 1-month averaging window", () => {
    const startDate = "2020-06-01";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2020-07-15");
    const results = computeAnniversaryLock(payrolls, startDate, 1);

    // With window=1, rate is just the month's rate
    const expectedRate = getAverageRate("2020-06", 1);
    expect(expectedRate).toBeDefined();
    for (const r of results) {
      expect(r.lockedRate).toBeCloseTo(expectedRate!, 6);
    }
  });

  it("CAD amount equals USD amount × locked rate", () => {
    const startDate = "2020-01-01";
    const payrolls = generatePayrollSchedule(160000, 3, startDate, "2023-12-15");
    const results = computeAnniversaryLock(payrolls, startDate, 4);

    for (const r of results) {
      expect(r.payAmountCAD).toBeCloseTo(r.payAmountUSD * r.lockedRate, 2);
    }
  });

  it("handles mid-month start date correctly", () => {
    const startDate = "2020-03-15";
    const payrolls = generatePayrollSchedule(160000, 0, startDate, "2021-04-15");
    const results = computeAnniversaryLock(payrolls, startDate, 4);

    const rateYear0 = getAverageRate("2020-03", 4)!;
    const rateYear1 = getAverageRate("2021-03", 4)!;

    // March 1 2021 should still be year 0 (anniversary is March 15)
    const mar1_2021 = results.find((r) => r.date === "2021-03-01");
    expect(mar1_2021!.lockedRate).toBeCloseTo(rateYear0, 6);

    // March 15 2021 should be year 1
    const mar15_2021 = results.find((r) => r.date === "2021-03-15");
    expect(mar15_2021!.lockedRate).toBeCloseTo(rateYear1, 6);
  });
});

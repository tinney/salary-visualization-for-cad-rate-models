import { describe, expect, it } from "bun:test";
import { computeCurrentRate } from "./currentRate";
import type { PayrollEntry } from "../utils/payroll";
import { getRateForMonth } from "../utils/rateData";

describe("Model 3 – Current Rate", () => {
  const semiMonthly = 160000 / 24;
  const payroll: PayrollEntry[] = [
    { date: "2020-01-01", annualSalaryUSD: 160000, payAmountUSD: semiMonthly },
    { date: "2020-01-15", annualSalaryUSD: 160000, payAmountUSD: semiMonthly },
    { date: "2020-02-01", annualSalaryUSD: 160000, payAmountUSD: semiMonthly },
  ];

  it("uses the correct month's rate for each payroll", () => {
    const results = computeCurrentRate(payroll);
    const janRate = getRateForMonth("2020-01")!;
    const febRate = getRateForMonth("2020-02")!;

    expect(results[0].rate).toBe(janRate);
    expect(results[1].rate).toBe(janRate); // same month, same rate
    expect(results[2].rate).toBe(febRate);
  });

  it("converts USD to CAD correctly", () => {
    const results = computeCurrentRate(payroll);

    for (const r of results) {
      expect(r.payCAD).toBeCloseTo(semiMonthly * r.rate, 2);
    }
  });

  it("accumulates cumulative CAD correctly", () => {
    const results = computeCurrentRate(payroll);
    let sum = 0;
    for (const r of results) {
      sum += r.payCAD;
      expect(r.cumulativeCAD).toBeCloseTo(sum, 2);
    }
  });

  it("returns empty array for empty payroll", () => {
    expect(computeCurrentRate([])).toEqual([]);
  });

  it("skips payrolls with no rate data", () => {
    const futurePayroll: PayrollEntry[] = [
      { date: "2099-01-01", annualSalaryUSD: 160000, payAmountUSD: semiMonthly },
    ];
    const results = computeCurrentRate(futurePayroll);
    expect(results).toEqual([]);
  });
});

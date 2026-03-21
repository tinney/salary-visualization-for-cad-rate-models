import { describe, it, expect } from "vitest";
import { computeAllModels } from "./computeAllModels";

describe("computeAllModels", () => {
  it("returns zero CAD for dates with no rate data", () => {
    const result = computeAllModels(160000, 3, "2030-01-01", 4, "2030-06-01");
    // Payrolls are generated but no rate data exists past Mar 2026,
    // so rolling average and current rate should have 0 payrolls with CAD
    expect(result.summary.rollingAverage.payrollCount).toBe(0);
    expect(result.summary.currentRate.payrollCount).toBe(0);
    expect(result.summary.rollingAverage.totalCAD).toBe(0);
    expect(result.summary.currentRate.totalCAD).toBe(0);
  });

  it("computes totals for a known period", () => {
    // Use a short period where we know rate data exists (2020)
    const result = computeAllModels(160000, 0, "2020-01-01", 4, "2020-06-30");

    // Should have 12 payrolls (Jan-Jun, 2 per month)
    expect(result.payrolls.length).toBe(12);

    // All models should have positive CAD totals
    expect(result.summary.anniversaryLock.totalCAD).toBeGreaterThan(0);
    expect(result.summary.rollingAverage.totalCAD).toBeGreaterThan(0);
    expect(result.summary.currentRate.totalCAD).toBeGreaterThan(0);

    // Total USD should be ~$40,000 (160k/24 * 12 payrolls = 80k... no, 160k/24 ≈ 6666.67 * 12 = 80000)
    expect(result.summary.currentRate.totalUSD).toBeCloseTo(80000, -1);
  });

  it("differences are consistent", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const s = result.summary;

    // diff(A, B) = A.total - B.total
    expect(s.diffAnniversaryVsRolling).toBeCloseTo(
      s.anniversaryLock.totalCAD - s.rollingAverage.totalCAD,
      2
    );
    expect(s.diffAnniversaryVsCurrent).toBeCloseTo(
      s.anniversaryLock.totalCAD - s.currentRate.totalCAD,
      2
    );
    expect(s.diffRollingVsCurrent).toBeCloseTo(
      s.rollingAverage.totalCAD - s.currentRate.totalCAD,
      2
    );
  });

  it("all models produce CAD > USD (rate should be > 1 for CAD)", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2023-12-31");
    // USD/CAD rate is always > 1 (1 USD buys more than 1 CAD)
    expect(result.summary.anniversaryLock.totalCAD).toBeGreaterThan(
      result.summary.anniversaryLock.totalUSD
    );
    expect(result.summary.currentRate.totalCAD).toBeGreaterThan(
      result.summary.currentRate.totalUSD
    );
  });

  it("payroll count matches across models", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2021-12-31");
    // All three models should process the same payrolls (all within data range)
    expect(result.summary.anniversaryLock.payrollCount).toBe(
      result.summary.currentRate.payrollCount
    );
  });
});

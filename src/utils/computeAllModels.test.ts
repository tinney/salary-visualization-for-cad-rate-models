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

  it("changing averagingWindow N affects Anniversary Lock totals", () => {
    // N=1 vs N=12 should produce different Anniversary Lock CAD totals
    // because the locked rate at the start date will differ
    const resultN1 = computeAllModels(160000, 0, "2020-01-01", 1, "2022-12-31");
    const resultN12 = computeAllModels(160000, 0, "2020-01-01", 12, "2022-12-31");

    // Both should have positive totals
    expect(resultN1.summary.anniversaryLock.totalCAD).toBeGreaterThan(0);
    expect(resultN12.summary.anniversaryLock.totalCAD).toBeGreaterThan(0);

    // The totals should differ because the N-month average rate differs
    expect(resultN1.summary.anniversaryLock.totalCAD).not.toBeCloseTo(
      resultN12.summary.anniversaryLock.totalCAD,
      0
    );
  });

  it("Anniversary Lock rate stays constant within an anniversary year", () => {
    // All payrolls in the same anniversary year should have the same locked rate
    const result = computeAllModels(160000, 0, "2020-01-01", 4, "2020-12-31");

    const unifiedPayrolls = result.payrolls.filter(
      (p) => p.anniversaryLockRate !== undefined
    );
    expect(unifiedPayrolls.length).toBeGreaterThan(0);

    // All rates should be identical (locked at start-date anniversary)
    const firstRate = unifiedPayrolls[0].anniversaryLockRate!;
    for (const p of unifiedPayrolls) {
      expect(p.anniversaryLockRate).toBeCloseTo(firstRate, 8);
    }
  });

  // Sub-AC 11.1: totalCAD equals sum of individual payroll CAD values for all three models
  it("totalCAD equals sum of individual anniversaryLockCAD payroll values", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const expected = result.payrolls.reduce(
      (sum, p) => sum + (p.anniversaryLockCAD ?? 0),
      0
    );
    expect(result.summary.anniversaryLock.totalCAD).toBeCloseTo(expected, 2);
  });

  it("totalCAD equals sum of individual rollingAverageCAD payroll values", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const expected = result.payrolls.reduce(
      (sum, p) => sum + (p.rollingAverageCAD ?? 0),
      0
    );
    expect(result.summary.rollingAverage.totalCAD).toBeCloseTo(expected, 2);
  });

  it("totalCAD equals sum of individual currentRateCAD payroll values", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const expected = result.payrolls.reduce(
      (sum, p) => sum + (p.currentRateCAD ?? 0),
      0
    );
    expect(result.summary.currentRate.totalCAD).toBeCloseTo(expected, 2);
  });

  it("all three model totals are independently computed and non-zero", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2025-12-31");
    const { anniversaryLock, rollingAverage, currentRate } = result.summary;

    // Each model independently sums its own CAD converted amounts
    expect(anniversaryLock.totalCAD).toBeGreaterThan(0);
    expect(rollingAverage.totalCAD).toBeGreaterThan(0);
    expect(currentRate.totalCAD).toBeGreaterThan(0);

    // Totals differ between models (different rate methods produce different results)
    expect(anniversaryLock.totalCAD).not.toBeCloseTo(rollingAverage.totalCAD, 0);
  });

  // Sub-AC 11.3: Percentage differences between model pairs
  it("percentage differences are consistent with absolute differences", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const s = result.summary;

    // pct = (diff / denominator) * 100
    const expectedAvRollingPct =
      (s.diffAnniversaryVsRolling / s.rollingAverage.totalCAD) * 100;
    const expectedAvCurrentPct =
      (s.diffAnniversaryVsCurrent / s.currentRate.totalCAD) * 100;
    const expectedRvCurrentPct =
      (s.diffRollingVsCurrent / s.currentRate.totalCAD) * 100;

    expect(s.diffAnniversaryVsRollingPct).toBeCloseTo(expectedAvRollingPct, 4);
    expect(s.diffAnniversaryVsCurrentPct).toBeCloseTo(expectedAvCurrentPct, 4);
    expect(s.diffRollingVsCurrentPct).toBeCloseTo(expectedRvCurrentPct, 4);
  });

  it("percentage difference sign matches absolute difference sign", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2022-12-31");
    const s = result.summary;

    // Sign of pct should always match sign of absolute diff
    expect(Math.sign(s.diffAnniversaryVsRollingPct)).toBe(
      Math.sign(s.diffAnniversaryVsRolling)
    );
    expect(Math.sign(s.diffAnniversaryVsCurrentPct)).toBe(
      Math.sign(s.diffAnniversaryVsCurrent)
    );
    expect(Math.sign(s.diffRollingVsCurrentPct)).toBe(
      Math.sign(s.diffRollingVsCurrent)
    );
  });

  it("percentage differences are zero when no payroll data exists", () => {
    const result = computeAllModels(160000, 3, "2030-01-01", 4, "2030-06-01");
    const s = result.summary;

    expect(s.diffAnniversaryVsRollingPct).toBe(0);
    expect(s.diffAnniversaryVsCurrentPct).toBe(0);
    expect(s.diffRollingVsCurrentPct).toBe(0);
  });

  it("percentage differences reflect relative magnitude between models", () => {
    const result = computeAllModels(160000, 3, "2020-01-01", 4, "2025-12-31");
    const s = result.summary;

    // |pct| should be small (models are within ~10% of each other for realistic periods)
    expect(Math.abs(s.diffAnniversaryVsRollingPct)).toBeLessThan(10);
    expect(Math.abs(s.diffAnniversaryVsCurrentPct)).toBeLessThan(10);
    expect(Math.abs(s.diffRollingVsCurrentPct)).toBeLessThan(10);
  });
});

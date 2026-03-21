import { describe, it, expect } from "vitest";
import { computeChartData } from "./computeChartData";

const BASE_PARAMS = {
  baseSalary: 160000,
  raisePercent: 0,
  startDate: "2020-01-01",
  averagingWindow: 4,
};

describe("computeChartData – three-model integration", () => {
  it("returns an array of data points for a known period", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(0);
  });

  it("each data point has all required keys", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(0);

    for (const point of data) {
      expect(point).toHaveProperty("date");
      expect(point).toHaveProperty("label");
      expect(point).toHaveProperty("payUSD");

      // Per-payroll CAD fields for all three models
      expect(point).toHaveProperty("anniversaryCAD");
      expect(point).toHaveProperty("rollingCAD");
      expect(point).toHaveProperty("currentCAD");

      // Cumulative CAD fields for all three models
      expect(point).toHaveProperty("anniversaryCumCAD");
      expect(point).toHaveProperty("rollingCumCAD");
      expect(point).toHaveProperty("currentCumCAD");
    }
  });

  it("all three per-payroll CAD values are positive (rate > 1 for CAD)", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(0);

    for (const point of data) {
      if (point.anniversaryCAD !== null) {
        expect(point.anniversaryCAD).toBeGreaterThan(0);
      }
      if (point.rollingCAD !== null) {
        expect(point.rollingCAD).toBeGreaterThan(0);
      }
      if (point.currentCAD !== null) {
        expect(point.currentCAD).toBeGreaterThan(0);
      }
    }
  });

  it("cumulative CAD values are monotonically non-decreasing", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(1);

    for (let i = 1; i < data.length; i++) {
      expect(data[i].anniversaryCumCAD).toBeGreaterThanOrEqual(
        data[i - 1].anniversaryCumCAD
      );
      expect(data[i].rollingCumCAD).toBeGreaterThanOrEqual(
        data[i - 1].rollingCumCAD
      );
      expect(data[i].currentCumCAD).toBeGreaterThanOrEqual(
        data[i - 1].currentCumCAD
      );
    }
  });

  it("all three models produce different CAD values (models are distinct)", () => {
    // Use a longer period so the models diverge measurably
    const data = computeChartData({ ...BASE_PARAMS });
    const last = data[data.length - 1];

    // Anniversary lock and rolling average should differ in most periods
    // (rolling average is recalculated every payroll, anniversary is locked per year)
    // We can't guarantee every single point differs, but cumulative totals should
    expect(last.anniversaryCumCAD).toBeGreaterThan(0);
    expect(last.rollingCumCAD).toBeGreaterThan(0);
    expect(last.currentCumCAD).toBeGreaterThan(0);

    // The three cumulative totals should not all be identical
    const allSame =
      last.anniversaryCumCAD === last.rollingCumCAD &&
      last.rollingCumCAD === last.currentCumCAD;
    expect(allSame).toBe(false);
  });

  it("dates are in ascending chronological order", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(1);

    for (let i = 1; i < data.length; i++) {
      expect(data[i].date > data[i - 1].date).toBe(true);
    }
  });

  it("payUSD is consistently the semi-monthly salary amount", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    // baseSalary=160000, no raises → semi-monthly = 160000/24 ≈ 6666.67
    const expectedSemiMonthly = 160000 / 24;
    for (const point of data) {
      expect(point.payUSD).toBeCloseTo(expectedSemiMonthly, 2);
    }
  });

  it("cumulative totals grow correctly across per-payroll values", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    let runningAnniv = 0;
    let runningRolling = 0;
    let runningCurrent = 0;

    for (const point of data) {
      if (point.anniversaryCAD !== null) runningAnniv += point.anniversaryCAD;
      if (point.rollingCAD !== null) runningRolling += point.rollingCAD;
      if (point.currentCAD !== null) runningCurrent += point.currentCAD;

      expect(point.anniversaryCumCAD).toBeCloseTo(runningAnniv, 2);
      expect(point.rollingCumCAD).toBeCloseTo(runningRolling, 2);
      expect(point.currentCumCAD).toBeCloseTo(runningCurrent, 2);
    }
  });

  it("changing averagingWindow changes rolling average and anniversary lock values", () => {
    const dataN1 = computeChartData({ ...BASE_PARAMS, averagingWindow: 1 });
    const dataN12 = computeChartData({ ...BASE_PARAMS, averagingWindow: 12 });

    expect(dataN1.length).toBeGreaterThan(0);
    expect(dataN12.length).toBeGreaterThan(0);

    const lastN1 = dataN1[dataN1.length - 1];
    const lastN12 = dataN12[dataN12.length - 1];

    // Rolling average cumulative should differ between window sizes
    expect(lastN1.rollingCumCAD).not.toBeCloseTo(lastN12.rollingCumCAD, 0);

    // Anniversary lock cumulative should also differ (locked rate uses averaging window)
    expect(lastN1.anniversaryCumCAD).not.toBeCloseTo(lastN12.anniversaryCumCAD, 0);

    // Current rate is not affected by averaging window
    expect(lastN1.currentCumCAD).toBeCloseTo(lastN12.currentCumCAD, 2);
  });

  it("returns empty array for start date beyond rate data range", () => {
    const data = computeChartData({
      ...BASE_PARAMS,
      startDate: "2100-01-01",
    });
    expect(data).toEqual([]);
  });

  it("label is a human-readable date string", () => {
    const data = computeChartData({ ...BASE_PARAMS });
    expect(data.length).toBeGreaterThan(0);
    // Label should include the year 2020
    expect(data[0].label).toContain("2020");
  });
});

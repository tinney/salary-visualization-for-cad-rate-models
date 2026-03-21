import { describe, it, expect } from "vitest";
import {
  computeCumulativeSeries,
  computeAllCumulatives,
  type PerPayrollPoint,
} from "./computeCumulative";

// ---------------------------------------------------------------------------
// computeCumulativeSeries
// ---------------------------------------------------------------------------

describe("computeCumulativeSeries", () => {
  it("returns an empty array for an empty input", () => {
    expect(computeCumulativeSeries([])).toEqual([]);
  });

  it("single positive value – cumCad equals that value", () => {
    const result = computeCumulativeSeries([{ date: "2020-01-01", cad: 1000 }]);
    expect(result).toHaveLength(1);
    expect(result[0].cumCad).toBe(1000);
    expect(result[0].cad).toBe(1000);
    expect(result[0].date).toBe("2020-01-01");
  });

  it("accumulates across multiple positive values", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 100 },
      { date: "2020-01-15", cad: 200 },
      { date: "2020-02-01", cad: 150 },
    ];
    const result = computeCumulativeSeries(input);

    expect(result[0].cumCad).toBe(100);
    expect(result[1].cumCad).toBe(300);
    expect(result[2].cumCad).toBe(450);
  });

  it("skips null values but carries the running total forward", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 100 },
      { date: "2020-01-15", cad: null }, // no rate data
      { date: "2020-02-01", cad: 200 },
    ];
    const result = computeCumulativeSeries(input);

    expect(result[0].cumCad).toBe(100);
    expect(result[1].cumCad).toBe(100); // null row doesn't change running total
    expect(result[1].cad).toBeNull();
    expect(result[2].cumCad).toBe(300);
  });

  it("all null values – cumCad stays 0 throughout", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: null },
      { date: "2020-01-15", cad: null },
    ];
    const result = computeCumulativeSeries(input);
    for (const r of result) {
      expect(r.cumCad).toBe(0);
    }
  });

  it("preserves input order", () => {
    const input: PerPayrollPoint[] = [
      { date: "2023-03-01", cad: 50 },
      { date: "2023-03-15", cad: 75 },
      { date: "2023-04-01", cad: 25 },
    ];
    const result = computeCumulativeSeries(input);
    expect(result.map((r) => r.date)).toEqual([
      "2023-03-01",
      "2023-03-15",
      "2023-04-01",
    ]);
  });

  it("cumCad is monotonically non-decreasing when all cad values are non-negative", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 500 },
      { date: "2020-01-15", cad: null },
      { date: "2020-02-01", cad: 600 },
      { date: "2020-02-15", cad: 0 },
      { date: "2020-03-01", cad: 700 },
    ];
    const result = computeCumulativeSeries(input);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cumCad).toBeGreaterThanOrEqual(result[i - 1].cumCad);
    }
  });

  it("final cumCad equals sum of all non-null values", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 111.11 },
      { date: "2020-01-15", cad: null },
      { date: "2020-02-01", cad: 222.22 },
      { date: "2020-02-15", cad: 333.33 },
    ];
    const result = computeCumulativeSeries(input);
    const expectedTotal = 111.11 + 222.22 + 333.33;
    expect(result[result.length - 1].cumCad).toBeCloseTo(expectedTotal, 6);
  });

  it("does not mutate the input array", () => {
    const input: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 100 },
      { date: "2020-01-15", cad: 200 },
    ];
    const inputCopy = JSON.parse(JSON.stringify(input));
    computeCumulativeSeries(input);
    expect(input).toEqual(inputCopy);
  });

  it("handles large arrays without floating-point catastrophe", () => {
    // 300 payrolls each worth $6666.67
    const amount = 160000 / 24;
    const input: PerPayrollPoint[] = Array.from({ length: 300 }, (_, i) => ({
      date: `2020-01-${String(i + 1).padStart(2, "0")}`, // dummy dates
      cad: amount,
    }));
    const result = computeCumulativeSeries(input);
    const expected = amount * 300;
    expect(result[result.length - 1].cumCad).toBeCloseTo(expected, 2);
  });
});

// ---------------------------------------------------------------------------
// computeAllCumulatives
// ---------------------------------------------------------------------------

describe("computeAllCumulatives", () => {
  it("returns empty array when all inputs are empty", () => {
    expect(computeAllCumulatives([], [], [])).toEqual([]);
  });

  it("correctly accumulates all three models in parallel", () => {
    const dates = ["2020-01-01", "2020-01-15", "2020-02-01"];
    const a: PerPayrollPoint[] = [
      { date: dates[0], cad: 100 },
      { date: dates[1], cad: 150 },
      { date: dates[2], cad: 200 },
    ];
    const b: PerPayrollPoint[] = [
      { date: dates[0], cad: 110 },
      { date: dates[1], cad: 160 },
      { date: dates[2], cad: 210 },
    ];
    const c: PerPayrollPoint[] = [
      { date: dates[0], cad: 120 },
      { date: dates[1], cad: 170 },
      { date: dates[2], cad: 220 },
    ];

    const result = computeAllCumulatives(a, b, c);

    expect(result).toHaveLength(3);

    // First point
    expect(result[0].anniversaryCumCAD).toBe(100);
    expect(result[0].rollingCumCAD).toBe(110);
    expect(result[0].currentCumCAD).toBe(120);

    // Second point
    expect(result[1].anniversaryCumCAD).toBe(250);
    expect(result[1].rollingCumCAD).toBe(270);
    expect(result[1].currentCumCAD).toBe(290);

    // Third point
    expect(result[2].anniversaryCumCAD).toBe(450);
    expect(result[2].rollingCumCAD).toBe(480);
    expect(result[2].currentCumCAD).toBe(510);
  });

  it("each result point has correct per-payroll CAD values", () => {
    const a: PerPayrollPoint[] = [{ date: "2020-01-01", cad: 500 }];
    const b: PerPayrollPoint[] = [{ date: "2020-01-01", cad: 600 }];
    const c: PerPayrollPoint[] = [{ date: "2020-01-01", cad: null }];

    const result = computeAllCumulatives(a, b, c);
    expect(result[0].anniversaryCAD).toBe(500);
    expect(result[0].rollingCAD).toBe(600);
    expect(result[0].currentCAD).toBeNull();
  });

  it("null values propagate correctly and don't affect other models", () => {
    const dates = ["2020-01-01", "2020-01-15"];
    const a: PerPayrollPoint[] = [
      { date: dates[0], cad: 100 },
      { date: dates[1], cad: null },
    ];
    const b: PerPayrollPoint[] = [
      { date: dates[0], cad: 200 },
      { date: dates[1], cad: 300 },
    ];
    const c: PerPayrollPoint[] = [
      { date: dates[0], cad: null },
      { date: dates[1], cad: 400 },
    ];

    const result = computeAllCumulatives(a, b, c);

    // After first point
    expect(result[0].anniversaryCumCAD).toBe(100);
    expect(result[0].rollingCumCAD).toBe(200);
    expect(result[0].currentCumCAD).toBe(0);

    // After second point
    expect(result[1].anniversaryCumCAD).toBe(100); // null – no change
    expect(result[1].rollingCumCAD).toBe(500);
    expect(result[1].currentCumCAD).toBe(400);
  });

  it("throws if arrays have mismatched lengths", () => {
    const a: PerPayrollPoint[] = [{ date: "2020-01-01", cad: 100 }];
    const b: PerPayrollPoint[] = [
      { date: "2020-01-01", cad: 100 },
      { date: "2020-01-15", cad: 100 },
    ];
    const c: PerPayrollPoint[] = [{ date: "2020-01-01", cad: 100 }];

    expect(() => computeAllCumulatives(a, b, c)).toThrow();
  });

  it("date field comes from the anniversary series", () => {
    const dates = ["2021-06-01", "2021-06-15"];
    const a: PerPayrollPoint[] = dates.map((d) => ({ date: d, cad: 50 }));
    const b: PerPayrollPoint[] = dates.map((d) => ({ date: d, cad: 60 }));
    const c: PerPayrollPoint[] = dates.map((d) => ({ date: d, cad: 70 }));

    const result = computeAllCumulatives(a, b, c);
    expect(result[0].date).toBe("2021-06-01");
    expect(result[1].date).toBe("2021-06-15");
  });
});

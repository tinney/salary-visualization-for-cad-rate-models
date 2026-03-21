/**
 * Utilities for transforming per-payroll CAD series into running cumulative totals.
 *
 * These functions operate on plain arrays so they can be used independently of the
 * chart pipeline and are easily unit-tested.
 */

export interface PerPayrollPoint {
  date: string;
  cad: number | null;
}

export interface CumulativePoint {
  date: string;
  /** Per-payroll CAD for this period (null if no rate data) */
  cad: number | null;
  /** Running cumulative CAD total up to and including this period */
  cumCad: number;
}

/**
 * Convert an array of per-payroll CAD amounts into a cumulative series.
 *
 * - Null values are skipped (no rate data) but the running total is carried forward.
 * - Input order is preserved.
 *
 * @param payrolls Array of payroll points with an optional CAD amount.
 * @returns New array where each element includes both the per-payroll `cad`
 *          value and the running `cumCad` total.
 */
export function computeCumulativeSeries(
  payrolls: PerPayrollPoint[]
): CumulativePoint[] {
  let runningTotal = 0;
  return payrolls.map((p) => {
    if (p.cad !== null && p.cad !== undefined) {
      runningTotal += p.cad;
    }
    return { date: p.date, cad: p.cad, cumCad: runningTotal };
  });
}

/**
 * Convenience helper: given three parallel per-payroll series (one per model),
 * compute three cumulative totals in lockstep.
 *
 * All three arrays must have the same length and the same date at each index.
 *
 * @returns An array of objects with per-payroll and cumulative amounts for each
 *          of the three models, keyed as `anniversary`, `rolling`, and `current`.
 */
export function computeAllCumulatives(
  anniversaryPayrolls: PerPayrollPoint[],
  rollingPayrolls: PerPayrollPoint[],
  currentPayrolls: PerPayrollPoint[]
): Array<{
  date: string;
  anniversaryCAD: number | null;
  rollingCAD: number | null;
  currentCAD: number | null;
  anniversaryCumCAD: number;
  rollingCumCAD: number;
  currentCumCAD: number;
}> {
  const anniv = computeCumulativeSeries(anniversaryPayrolls);
  const rolling = computeCumulativeSeries(rollingPayrolls);
  const current = computeCumulativeSeries(currentPayrolls);

  // All three series must be the same length (same payroll schedule)
  const length = anniv.length;
  if (length !== rolling.length || length !== current.length) {
    throw new Error(
      "computeAllCumulatives: all three series must have the same length"
    );
  }

  return anniv.map((a, i) => ({
    date: a.date,
    anniversaryCAD: a.cad,
    rollingCAD: rolling[i].cad,
    currentCAD: current[i].cad,
    anniversaryCumCAD: a.cumCad,
    rollingCumCAD: rolling[i].cumCad,
    currentCumCAD: current[i].cumCad,
  }));
}

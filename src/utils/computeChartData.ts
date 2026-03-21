/**
 * Unified chart data pipeline.
 *
 * Runs all three rate models on a payroll schedule and produces
 * a single array of normalised data points ready for Recharts.
 *
 * Cumulative totals are computed via the dedicated `computeAllCumulatives`
 * utility so the running-total logic is encapsulated and independently tested.
 */

import { generatePayrollSchedule } from "./payroll";
import { computeAnniversaryLock } from "../models/anniversaryLock";
import { computeCurrentRate } from "../models/currentRate";
import { getRollingAverageRate } from "./rateModels";
import { toMonthKey, getRateForMonth } from "./rateData";
import { computeAllCumulatives, type PerPayrollPoint } from "./computeCumulative";

export interface ChartDataPoint {
  /** Payroll date label "YYYY-MM-DD" */
  date: string;
  /** Display label for tooltip / x-axis */
  label: string;
  /** USD pay this period (same across models) */
  payUSD: number;

  // --- per-payroll CAD amounts ---
  anniversaryCAD: number | null;
  rollingCAD: number | null;
  currentCAD: number | null;

  // --- cumulative CAD amounts ---
  anniversaryCumCAD: number;
  rollingCumCAD: number;
  currentCumCAD: number;
}

export interface ComputeChartDataParams {
  baseSalary: number;
  raisePercent: number;
  startDate: string;      // "YYYY-MM-DD"
  averagingWindow: number; // months for rolling avg & anniversary lock
}

/**
 * Build the unified chart dataset.
 *
 * End date is today's date, capped at the last month with real rate data.
 */
export function computeChartData(params: ComputeChartDataParams): ChartDataPoint[] {
  const { baseSalary, raisePercent, startDate, averagingWindow } = params;

  // End at present date
  const now = new Date();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const payrolls = generatePayrollSchedule(baseSalary, raisePercent, startDate, endDate);
  if (payrolls.length === 0) return [];

  // Model 1 – Anniversary Lock
  const model1 = computeAnniversaryLock(payrolls, startDate, averagingWindow);

  // Model 3 – Current Rate
  const model3 = computeCurrentRate(payrolls);
  const model3Map = new Map(model3.map((r) => [r.date, r]));

  // --- Step 1: collect per-payroll CAD amounts for all three models ---

  const anniversaryPoints: PerPayrollPoint[] = [];
  const rollingPoints: PerPayrollPoint[] = [];
  const currentPoints: PerPayrollPoint[] = [];
  const metaRows: Array<{ date: string; payUSD: number; label: string }> = [];

  for (let i = 0; i < payrolls.length; i++) {
    const p = payrolls[i];
    const monthKey = toMonthKey(p.date);

    // Skip if no rate data for this month at all
    const spotRate = getRateForMonth(monthKey);
    if (spotRate === undefined) continue;

    // Model 1
    const m1 = model1[i];
    const annivCAD = m1 ? m1.payAmountCAD : null;

    // Model 2 – Rolling Average
    const rollingRate = getRollingAverageRate(p.date, averagingWindow);
    const rollCAD = rollingRate !== undefined ? p.payAmountUSD * rollingRate : null;

    // Model 3 – Current Rate
    const m3 = model3Map.get(p.date);
    const curCAD = m3 ? m3.payCAD : null;

    anniversaryPoints.push({ date: p.date, cad: annivCAD });
    rollingPoints.push({ date: p.date, cad: rollCAD });
    currentPoints.push({ date: p.date, cad: curCAD });

    // Friendly label
    const d = new Date(p.date + "T00:00:00");
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    metaRows.push({ date: p.date, payUSD: p.payAmountUSD, label });
  }

  // --- Step 2: compute cumulative running totals for all three models ---
  const cumRows = computeAllCumulatives(anniversaryPoints, rollingPoints, currentPoints);

  // --- Step 3: merge per-payroll + cumulative data with display metadata ---
  return cumRows.map((cum, i) => ({
    date: metaRows[i].date,
    label: metaRows[i].label,
    payUSD: metaRows[i].payUSD,
    anniversaryCAD: cum.anniversaryCAD,
    rollingCAD: cum.rollingCAD,
    currentCAD: cum.currentCAD,
    anniversaryCumCAD: cum.anniversaryCumCAD,
    rollingCumCAD: cum.rollingCumCAD,
    currentCumCAD: cum.currentCumCAD,
  }));
}

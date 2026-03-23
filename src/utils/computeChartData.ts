/**
 * Unified chart data pipeline.
 *
 * Runs all three rate models on a payroll schedule and produces
 * a single array of normalised data points ready for Recharts.
 */

import { generatePayrollSchedule, type PayrollEntry } from "./payroll";
import { computeAnniversaryLock } from "../models/anniversaryLock";
import { computeCurrentRate } from "../models/currentRate";
import { getRollingAverageRate } from "./rateModels";
import { toMonthKey, getRateForMonth } from "./rateData";

export interface ChartDataPoint {
  /** Payroll date label "YYYY-MM-DD" */
  date: string;
  /** Display label for tooltip / x-axis */
  label: string;
  /** USD pay this period (same across models) */
  payUSD: number;

  // --- per-payroll CAD amounts ---
  anniversaryCAD: number | null;
  tdModelCAD: number | null;
  rollingCAD: number | null;
  currentCAD: number | null;

  // --- cumulative CAD amounts ---
  anniversaryCumCAD: number;
  tdModelCumCAD: number;
  rollingCumCAD: number;
  currentCumCAD: number;

  // --- cumulative diff vs Avg Rate Locked baseline ---
  anniversaryDiffCAD: number;
  tdModelDiffCAD: number;
  rollingDiffCAD: number;
  currentDiffCAD: number;
}

export interface ComputeChartDataParams {
  baseSalary: number;
  raisePercent: number;
  startDate: string;      // "YYYY-MM-DD"
  averagingWindow: number; // months for rolling avg & anniversary lock
  lockPeriodMonths: number; // how often the locked rate resets (1–12)
}

/**
 * Build the unified chart dataset.
 *
 * End date is today's date, capped at the last month with real rate data.
 */
export function computeChartData(params: ComputeChartDataParams): ChartDataPoint[] {
  const { baseSalary, raisePercent, startDate, averagingWindow, lockPeriodMonths } = params;

  // End at present date
  const now = new Date();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const payrolls = generatePayrollSchedule(baseSalary, raisePercent, startDate, endDate);
  if (payrolls.length === 0) return [];

  // Model 1 – Avg Rate Locked
  const model1 = computeAnniversaryLock(payrolls, startDate, averagingWindow, lockPeriodMonths);

  // TD Model – Anniversary Lock with fixed 4-month window, 12-month lock period
  const tdModel = computeAnniversaryLock(payrolls, startDate, 4, 12);

  // Model 3 – Current Rate (has its own skip logic, but we'll compute inline too)
  const model3 = computeCurrentRate(payrolls);
  const model3Map = new Map(model3.map((r) => [r.date, r]));

  // Build unified data
  let anniversaryCum = 0;
  let tdModelCum = 0;
  let rollingCum = 0;
  let currentCum = 0;

  const points: ChartDataPoint[] = [];

  for (let i = 0; i < payrolls.length; i++) {
    const p = payrolls[i];
    const monthKey = toMonthKey(p.date);

    // Skip if no rate data for this month at all
    const spotRate = getRateForMonth(monthKey);
    if (spotRate === undefined) continue;

    // Model 1 – Avg Rate Locked
    const m1 = model1[i];
    const annivCAD = m1 ? m1.payAmountCAD : null;

    // TD Model
    const td = tdModel[i];
    const tdCAD = td ? td.payAmountCAD : null;

    // Model 2 – Rolling Average
    const rollingRate = getRollingAverageRate(p.date, averagingWindow);
    const rollCAD = rollingRate !== undefined ? p.payAmountUSD * rollingRate : null;

    // Model 3 – Current Rate
    const m3 = model3Map.get(p.date);
    const curCAD = m3 ? m3.payCAD : null;

    // Cumulative
    if (annivCAD !== null) anniversaryCum += annivCAD;
    if (tdCAD !== null) tdModelCum += tdCAD;
    if (rollCAD !== null) rollingCum += rollCAD;
    if (curCAD !== null) currentCum += curCAD;

    // Friendly label
    const d = new Date(p.date + "T00:00:00");
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    points.push({
      date: p.date,
      label,
      payUSD: p.payAmountUSD,
      anniversaryCAD: annivCAD,
      tdModelCAD: tdCAD,
      rollingCAD: rollCAD,
      currentCAD: curCAD,
      anniversaryCumCAD: anniversaryCum,
      tdModelCumCAD: tdModelCum,
      rollingCumCAD: rollingCum,
      currentCumCAD: currentCum,
      tdModelDiffCAD: 0,
      anniversaryDiffCAD: anniversaryCum - tdModelCum,
      rollingDiffCAD: rollingCum - tdModelCum,
      currentDiffCAD: currentCum - tdModelCum,
    });
  }

  return points;
}

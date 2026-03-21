/**
 * Computes payroll results for all three rate models and derives summary statistics.
 *
 * Normalizes the different result shapes from each model into a unified format.
 */

import { PayrollEntry, generatePayrollSchedule } from "./payroll";
import { computeAnniversaryLock } from "../models/anniversaryLock";
import { computeCurrentRate } from "../models/currentRate";
import { computeRollingAverage } from "../models/rollingAverage";
import { toMonthKey } from "./rateData";

export interface UnifiedPayroll {
  date: string;
  payUSD: number;
  /** CAD amounts per model (may be undefined if rate data missing) */
  anniversaryLockCAD: number | undefined;
  rollingAverageCAD: number | undefined;
  currentRateCAD: number | undefined;
  /** Rates used */
  anniversaryLockRate: number | undefined;
  rollingAverageRate: number | undefined;
  currentRate: number | undefined;
}

export interface ModelSummary {
  totalCAD: number;
  totalUSD: number;
  payrollCount: number;
}

export interface SummaryStats {
  anniversaryLock: ModelSummary;
  rollingAverage: ModelSummary;
  currentRate: ModelSummary;
  /** Differences: positive means first model earned more CAD */
  diffAnniversaryVsRolling: number;
  diffAnniversaryVsCurrent: number;
  diffRollingVsCurrent: number;
  /** Percentage differences relative to the second model (e.g. 2.3 means +2.3%) */
  diffAnniversaryVsRollingPct: number;
  diffAnniversaryVsCurrentPct: number;
  diffRollingVsCurrentPct: number;
}

export interface AllModelResults {
  payrolls: UnifiedPayroll[];
  summary: SummaryStats;
}

/**
 * Compute all three models for the given parameters and return unified results.
 */
export function computeAllModels(
  baseSalary: number,
  raisePercent: number,
  startDate: string,
  averagingWindow: number,
  endDate?: string
): AllModelResults {
  // Default end date to today
  const end = endDate || new Date().toISOString().slice(0, 10);

  // Generate payroll schedule
  const payrolls = generatePayrollSchedule(baseSalary, raisePercent, startDate, end);

  if (payrolls.length === 0) {
    const emptySummary: ModelSummary = { totalCAD: 0, totalUSD: 0, payrollCount: 0 };
    return {
      payrolls: [],
      summary: {
        anniversaryLock: emptySummary,
        rollingAverage: emptySummary,
        currentRate: emptySummary,
        diffAnniversaryVsRolling: 0,
        diffAnniversaryVsCurrent: 0,
        diffRollingVsCurrent: 0,
        diffAnniversaryVsRollingPct: 0,
        diffAnniversaryVsCurrentPct: 0,
        diffRollingVsCurrentPct: 0,
      },
    };
  }

  // Model 1: Anniversary Lock
  const alResults = computeAnniversaryLock(payrolls, startDate, averagingWindow);
  const alByDate = new Map(alResults.map((r) => [r.date, r]));

  // Model 3: Current Rate
  const crResults = computeCurrentRate(payrolls);
  const crByDate = new Map(crResults.map((r) => [r.date, r]));

  // Model 2: Rolling Average
  const raResults = computeRollingAverage(payrolls, averagingWindow);
  const raByDate = new Map(raResults.map((r) => [r.date, r]));

  // Build unified payroll array
  const unified: UnifiedPayroll[] = payrolls.map((p) => {
    const al = alByDate.get(p.date);
    const cr = crByDate.get(p.date);
    const ra = raByDate.get(p.date);

    return {
      date: p.date,
      payUSD: p.payAmountUSD,
      anniversaryLockCAD: al?.payAmountCAD,
      rollingAverageCAD: ra?.payAmountCAD,
      currentRateCAD: cr?.payCAD,
      anniversaryLockRate: al?.lockedRate,
      rollingAverageRate: ra?.averageRate,
      currentRate: cr?.rate,
    };
  });

  // Compute summaries
  const anniversaryLock = computeModelSummary(unified, "anniversaryLockCAD");
  const rollingAverage = computeModelSummary(unified, "rollingAverageCAD");
  const currentRate = computeModelSummary(unified, "currentRateCAD");

  const diffAnniversaryVsRolling = anniversaryLock.totalCAD - rollingAverage.totalCAD;
  const diffAnniversaryVsCurrent = anniversaryLock.totalCAD - currentRate.totalCAD;
  const diffRollingVsCurrent = rollingAverage.totalCAD - currentRate.totalCAD;

  return {
    payrolls: unified,
    summary: {
      anniversaryLock,
      rollingAverage,
      currentRate,
      diffAnniversaryVsRolling,
      diffAnniversaryVsCurrent,
      diffRollingVsCurrent,
      diffAnniversaryVsRollingPct: rollingAverage.totalCAD !== 0
        ? (diffAnniversaryVsRolling / rollingAverage.totalCAD) * 100
        : 0,
      diffAnniversaryVsCurrentPct: currentRate.totalCAD !== 0
        ? (diffAnniversaryVsCurrent / currentRate.totalCAD) * 100
        : 0,
      diffRollingVsCurrentPct: currentRate.totalCAD !== 0
        ? (diffRollingVsCurrent / currentRate.totalCAD) * 100
        : 0,
    },
  };
}

function computeModelSummary(
  payrolls: UnifiedPayroll[],
  cadField: "anniversaryLockCAD" | "rollingAverageCAD" | "currentRateCAD"
): ModelSummary {
  let totalCAD = 0;
  let totalUSD = 0;
  let count = 0;

  for (const p of payrolls) {
    const cad = p[cadField];
    if (cad !== undefined) {
      totalCAD += cad;
      totalUSD += p.payUSD;
      count++;
    }
  }

  return { totalCAD, totalUSD, payrollCount: count };
}

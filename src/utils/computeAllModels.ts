/**
 * Computes payroll results for all three rate models and derives summary statistics.
 *
 * Normalizes the different result shapes from each model into a unified format.
 */

import { PayrollEntry, generatePayrollSchedule } from "./payroll";
import { computeAnniversaryLock } from "../models/anniversaryLock";
import { computeCurrentRate } from "../models/currentRate";
import { getRollingAverageRate } from "./rateModels";
import { toMonthKey } from "./rateData";

export interface UnifiedPayroll {
  date: string;
  payUSD: number;
  /** CAD amounts per model (may be undefined if rate data missing) */
  anniversaryLockCAD: number | undefined;
  tdModelCAD: number | undefined;
  rollingAverageCAD: number | undefined;
  currentRateCAD: number | undefined;
  /** Rates used */
  anniversaryLockRate: number | undefined;
  tdModelRate: number | undefined;
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
  tdModel: ModelSummary;
  rollingAverage: ModelSummary;
  currentRate: ModelSummary;
  /** Differences: positive means first model earned more CAD */
  diffAnniversaryVsRolling: number;
  diffAnniversaryVsCurrent: number;
  diffRollingVsCurrent: number;
  diffTdModelVsAnniversaryLock: number;
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
  endDate?: string,
  lockPeriodMonths: number = 12
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
        tdModel: emptySummary,
        rollingAverage: emptySummary,
        currentRate: emptySummary,
        diffAnniversaryVsRolling: 0,
        diffAnniversaryVsCurrent: 0,
        diffRollingVsCurrent: 0,
        diffTdModelVsAnniversaryLock: 0,
      },
    };
  }

  // Model 1: Avg Rate Locked (Anniversary Lock with configurable averaging window & lock period)
  const alResults = computeAnniversaryLock(payrolls, startDate, averagingWindow, lockPeriodMonths);
  const alByDate = new Map(alResults.map((r) => [r.date, r]));

  // TD Model: Anniversary Lock with fixed 4-month window, 12-month lock period
  const tdResults = computeAnniversaryLock(payrolls, startDate, 4, 12);
  const tdByDate = new Map(tdResults.map((r) => [r.date, r]));

  // Model 3: Current Rate
  const crResults = computeCurrentRate(payrolls);
  const crByDate = new Map(crResults.map((r) => [r.date, r]));

  // Model 2: Rolling Average (compute inline since it doesn't have a unified compute function)
  const raByDate = new Map<string, { rate: number; payCAD: number }>();
  for (const p of payrolls) {
    const rate = getRollingAverageRate(p.date, averagingWindow);
    if (rate !== undefined) {
      raByDate.set(p.date, { rate, payCAD: p.payAmountUSD * rate });
    }
  }

  // Build unified payroll array
  const unified: UnifiedPayroll[] = payrolls.map((p) => {
    const al = alByDate.get(p.date);
    const td = tdByDate.get(p.date);
    const cr = crByDate.get(p.date);
    const ra = raByDate.get(p.date);

    return {
      date: p.date,
      payUSD: p.payAmountUSD,
      anniversaryLockCAD: al?.payAmountCAD,
      tdModelCAD: td?.payAmountCAD,
      rollingAverageCAD: ra?.payCAD,
      currentRateCAD: cr?.payCAD,
      anniversaryLockRate: al?.lockedRate,
      tdModelRate: td?.lockedRate,
      rollingAverageRate: ra?.rate,
      currentRate: cr?.rate,
    };
  });

  // Compute summaries
  const anniversaryLock = computeModelSummary(unified, "anniversaryLockCAD");
  const tdModel = computeModelSummary(unified, "tdModelCAD");
  const rollingAverage = computeModelSummary(unified, "rollingAverageCAD");
  const currentRate = computeModelSummary(unified, "currentRateCAD");

  return {
    payrolls: unified,
    summary: {
      anniversaryLock,
      tdModel,
      rollingAverage,
      currentRate,
      diffAnniversaryVsRolling: anniversaryLock.totalCAD - rollingAverage.totalCAD,
      diffAnniversaryVsCurrent: anniversaryLock.totalCAD - currentRate.totalCAD,
      diffRollingVsCurrent: rollingAverage.totalCAD - currentRate.totalCAD,
      diffTdModelVsAnniversaryLock: tdModel.totalCAD - anniversaryLock.totalCAD,
    },
  };
}

function computeModelSummary(
  payrolls: UnifiedPayroll[],
  cadField: "anniversaryLockCAD" | "tdModelCAD" | "rollingAverageCAD" | "currentRateCAD"
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

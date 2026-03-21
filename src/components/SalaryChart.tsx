import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  computeAllCumulatives,
  type PerPayrollPoint,
} from "../utils/computeCumulative";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single payroll entry for one model (output of computeAllModels mapping). */
export interface ModelPayroll {
  date: string;    // "YYYY-MM-DD"
  payUSD: number;
  payCAD: number | undefined;
}

export interface SalaryChartProps {
  anniversaryLock: ModelPayroll[];
  rollingAverage: ModelPayroll[];
  currentRate: ModelPayroll[];
}

/** Internal chart-ready data point produced by merging the three model datasets. */
interface ChartDataPoint {
  date: string;
  label: string;
  payUSD: number;
  // per-payroll CAD (null when model has no rate for this date)
  anniversaryCAD: number | null;
  rollingCAD: number | null;
  currentCAD: number | null;
  // running cumulative totals
  anniversaryCumCAD: number;
  rollingCumCAD: number;
  currentCumCAD: number;
}

type ViewMode = "per-payroll" | "cumulative";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_COLORS = {
  anniversary: "#2563eb", // blue
  rolling: "#16a34a",     // green
  current: "#dc2626",     // red
} as const;

const VIEW_CONFIG = {
  "per-payroll": {
    yAxisLabel: "CAD per Payroll",
    chartTitle: "CAD Earnings per Payroll Period",
    legendSuffix: "",
  },
  cumulative: {
    yAxisLabel: "Cumulative CAD Earned",
    chartTitle: "Cumulative CAD Earnings Over Time",
    legendSuffix: " (Cumulative)",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCAD(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCADFull(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Merge the three model datasets into a single array of ChartDataPoints.
 *
 * Steps:
 *  1. Build date-keyed lookup maps for each model.
 *  2. Collect the union of all dates and sort chronologically.
 *  3. For each date, read CAD values from each model's map (null if absent).
 *  4. Delegate running cumulative total computation to computeAllCumulatives.
 */
function buildChartData(
  anniversaryLock: ModelPayroll[],
  rollingAverage: ModelPayroll[],
  currentRate: ModelPayroll[]
): ChartDataPoint[] {
  // Build lookup maps: date → payroll entry
  const annMap = new Map(anniversaryLock.map((p) => [p.date, p]));
  const rollMap = new Map(rollingAverage.map((p) => [p.date, p]));
  const currMap = new Map(currentRate.map((p) => [p.date, p]));

  // Union of all dates across the three models, sorted ascending
  const allDates = [
    ...new Set([
      ...anniversaryLock.map((p) => p.date),
      ...rollingAverage.map((p) => p.date),
      ...currentRate.map((p) => p.date),
    ]),
  ].sort();

  if (allDates.length === 0) return [];

  // Build parallel PerPayrollPoint arrays and metadata rows
  const annPoints: PerPayrollPoint[] = [];
  const rollPoints: PerPayrollPoint[] = [];
  const currPoints: PerPayrollPoint[] = [];
  const metaRows: Array<{ date: string; payUSD: number; label: string }> = [];

  for (const date of allDates) {
    const annEntry = annMap.get(date);
    const rollEntry = rollMap.get(date);
    const currEntry = currMap.get(date);

    annPoints.push({ date, cad: annEntry?.payCAD !== undefined ? annEntry.payCAD : null });
    rollPoints.push({ date, cad: rollEntry?.payCAD !== undefined ? rollEntry.payCAD : null });
    currPoints.push({ date, cad: currEntry?.payCAD !== undefined ? currEntry.payCAD : null });

    // Prefer USD from whichever model has data (all models share the same payroll schedule)
    const payUSD = annEntry?.payUSD ?? rollEntry?.payUSD ?? currEntry?.payUSD ?? 0;

    const d = new Date(date + "T00:00:00");
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    metaRows.push({ date, payUSD, label });
  }

  // Delegate cumulative running totals to the standalone utility (independently tested)
  const cumRows = computeAllCumulatives(annPoints, rollPoints, currPoints);

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

/** Thin out x-axis ticks to roughly one per year. */
function getYearTicks(data: ChartDataPoint[]): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];
  for (const d of data) {
    const year = d.date.slice(0, 4);
    if (!seen.has(year)) {
      seen.add(year);
      ticks.push(d.date);
    }
  }
  return ticks;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as ChartDataPoint;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{point.label}</div>
      <div style={{ color: "#666", marginBottom: 6 }}>
        USD Pay: {formatCADFull(point.payUSD).replace("CA", "US")}
      </div>
      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          style={{ color: entry.color, marginBottom: 2 }}
        >
          {entry.name}: {formatCADFull(entry.value)}
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SalaryChart visualizes USD→CAD salary conversion using three rate models.
 *
 * Accepts pre-computed payroll arrays for each model and renders them as
 * overlapping colored lines on a single Recharts LineChart. Supports toggling
 * between per-payroll and cumulative views.
 */
export default function SalaryChart({
  anniversaryLock,
  rollingAverage,
  currentRate,
}: SalaryChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("per-payroll");

  // Merge the three model datasets into a unified chart-ready array
  const data = useMemo(
    () => buildChartData(anniversaryLock, rollingAverage, currentRate),
    [anniversaryLock, rollingAverage, currentRate]
  );

  const yearTicks = useMemo(() => getYearTicks(data), [data]);

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No payroll data to display. Adjust start date or salary.
      </div>
    );
  }

  const isCumulative = viewMode === "cumulative";
  const viewConfig = VIEW_CONFIG[viewMode];

  const anniversaryKey = isCumulative ? "anniversaryCumCAD" : "anniversaryCAD";
  const rollingKey = isCumulative ? "rollingCumCAD" : "rollingCAD";
  const currentKey = isCumulative ? "currentCumCAD" : "currentCAD";

  const anniversaryLabel = `Anniversary Lock${viewConfig.legendSuffix}`;
  const rollingLabel = `Rolling Average${viewConfig.legendSuffix}`;
  const currentLabel = `Current Rate${viewConfig.legendSuffix}`;

  return (
    <div>
      {/* Chart title + view toggle row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111" }}>
          {viewConfig.chartTitle}
        </h2>

        {/* Per-payroll / Cumulative toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setViewMode("per-payroll")}
            aria-pressed={viewMode === "per-payroll"}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: viewMode === "per-payroll" ? MODEL_COLORS.anniversary : "white",
              color: viewMode === "per-payroll" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: viewMode === "per-payroll" ? 600 : 400,
              fontSize: 13,
            }}
          >
            Per Payroll
          </button>
          <button
            onClick={() => setViewMode("cumulative")}
            aria-pressed={viewMode === "cumulative"}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: viewMode === "cumulative" ? MODEL_COLORS.anniversary : "white",
              color: viewMode === "cumulative" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: viewMode === "cumulative" ? 600 : 400,
              fontSize: 13,
            }}
          >
            Cumulative
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            ticks={yearTicks}
            tickFormatter={(d: string) => d.slice(0, 4)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCAD(v)}
            tick={{ fontSize: 12 }}
            width={110}
            label={{
              value: viewConfig.yAxisLabel,
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 11, fill: "#555", textAnchor: "middle" },
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend />

          {/* Model 1: Anniversary Lock — blue */}
          <Line
            type="monotone"
            dataKey={anniversaryKey}
            name={anniversaryLabel}
            stroke={MODEL_COLORS.anniversary}
            dot={false}
            strokeWidth={2}
            connectNulls
          />

          {/* Model 2: Rolling Average — green */}
          <Line
            type="monotone"
            dataKey={rollingKey}
            name={rollingLabel}
            stroke={MODEL_COLORS.rolling}
            dot={false}
            strokeWidth={2}
            connectNulls
          />

          {/* Model 3: Current Rate — red */}
          <Line
            type="monotone"
            dataKey={currentKey}
            name={currentLabel}
            stroke={MODEL_COLORS.current}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

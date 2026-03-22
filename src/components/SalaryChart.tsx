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
  ReferenceLine,
} from "recharts";
import { computeChartData, type ChartDataPoint } from "../utils/computeChartData";

interface SalaryChartProps {
  baseSalary: number;
  raisePercent: number;
  startDate: string;
  averagingWindow: number;
}

type ViewMode = "per-payroll" | "cumulative";

const MODEL_COLORS = {
  anniversary: "#2563eb", // blue
  rolling: "#16a34a",     // green
  current: "#dc2626",     // red
};

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

/** Custom tooltip */
function ChartTooltip({ active, payload, label, isCumulative }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as ChartDataPoint;

  const formatValue = (value: number) => {
    if (isCumulative) {
      const sign = value >= 0 ? "+" : "";
      return `${sign}${formatCADFull(value)}`;
    }
    return formatCADFull(value);
  };

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
      {!isCumulative && (
        <div style={{ color: "#666", marginBottom: 6 }}>
          USD Pay: {formatCADFull(point.payUSD).replace("CA", "US")}
        </div>
      )}
      {isCumulative && (
        <div style={{ color: "#666", marginBottom: 6, fontStyle: "italic" }}>
          vs Anniversary Lock baseline
        </div>
      )}
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 2 }}>
          {entry.name}: {formatValue(entry.value)}
        </div>
      ))}
    </div>
  );
}

/** Thin out x-axis ticks to roughly one per year */
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

export default function SalaryChart({
  baseSalary,
  raisePercent,
  startDate,
  averagingWindow,
}: SalaryChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("per-payroll");

  const data = useMemo(
    () =>
      computeChartData({ baseSalary, raisePercent, startDate, averagingWindow }),
    [baseSalary, raisePercent, startDate, averagingWindow]
  );

  const yearTicks = useMemo(() => getYearTicks(data), [data]);

  // Compute a tight y-axis domain for per-payroll view
  const perPayrollDomain = useMemo(() => {
    const vals = data.flatMap((d) =>
      [d.anniversaryCAD, d.rollingCAD, d.currentCAD].filter(
        (v): v is number => v !== null
      )
    );
    if (vals.length === 0) return [0, 1] as [number, number];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 100;
    return [
      Math.floor((min - padding) / 100) * 100,
      Math.ceil((max + padding) / 100) * 100,
    ] as [number, number];
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No payroll data to display. Adjust start date or salary.
      </div>
    );
  }

  const isCumulative = viewMode === "cumulative";

  const anniversaryKey = isCumulative ? "anniversaryDiffCAD" : "anniversaryCAD";
  const rollingKey = isCumulative ? "rollingDiffCAD" : "rollingCAD";
  const currentKey = isCumulative ? "currentDiffCAD" : "currentCAD";

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setViewMode("per-payroll")}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: viewMode === "per-payroll" ? "#2563eb" : "white",
            color: viewMode === "per-payroll" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: viewMode === "per-payroll" ? 600 : 400,
          }}
        >
          Per Payroll
        </button>
        <button
          onClick={() => setViewMode("cumulative")}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: viewMode === "cumulative" ? "#2563eb" : "white",
            color: viewMode === "cumulative" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: viewMode === "cumulative" ? 600 : 400,
          }}
        >
          Cumulative Diff
        </button>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            ticks={yearTicks}
            tickFormatter={(d: string) => d.slice(0, 4)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={isCumulative ? ["auto", "auto"] : perPayrollDomain}
            tickFormatter={(v: number) =>
              isCumulative
                ? (v >= 0 ? "+" : "") + formatCAD(v)
                : formatCAD(v)
            }
            tick={{ fontSize: 12 }}
            width={100}
          />
          {isCumulative && (
            <ReferenceLine y={0} stroke="#666" strokeDasharray="4 4" />
          )}
          <Tooltip content={<ChartTooltip isCumulative={isCumulative} />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={anniversaryKey}
            name={isCumulative ? "Anniversary Lock (baseline)" : "Anniversary Lock"}
            stroke={MODEL_COLORS.anniversary}
            dot={false}
            strokeWidth={isCumulative ? 1 : 2}
            strokeDasharray={isCumulative ? "4 4" : undefined}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey={rollingKey}
            name="Rolling Average"
            stroke={MODEL_COLORS.rolling}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey={currentKey}
            name="Current Rate"
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

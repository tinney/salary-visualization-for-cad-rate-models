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
function ChartTooltip({ active, payload, label }: any) {
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
        <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 2 }}>
          {entry.name}: {formatCADFull(entry.value)}
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

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No payroll data to display. Adjust start date or salary.
      </div>
    );
  }

  const isCumulative = viewMode === "cumulative";

  const anniversaryKey = isCumulative ? "anniversaryCumCAD" : "anniversaryCAD";
  const rollingKey = isCumulative ? "rollingCumCAD" : "rollingCAD";
  const currentKey = isCumulative ? "currentCumCAD" : "currentCAD";

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
          Cumulative
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
            tickFormatter={(v: number) => formatCAD(v)}
            tick={{ fontSize: 12 }}
            width={100}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={anniversaryKey}
            name="Anniversary Lock"
            stroke={MODEL_COLORS.anniversary}
            dot={false}
            strokeWidth={2}
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

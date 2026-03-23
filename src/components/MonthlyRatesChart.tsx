import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { RateEntry } from "../utils/rateData";

interface MonthlyRatesChartProps {
  rates: RateEntry[];
  startDate: string;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const YEAR_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#c026d3", "#65a30d", "#d97706", "#6366f1",
  "#e11d48", "#0d9488", "#7c3aed", "#ca8a04", "#059669",
  "#db2777",
];

function formatRate(value: number): string {
  return value.toFixed(4);
}

interface OverlayPoint {
  monthIndex: number;
  monthLabel: string;
  [year: string]: number | string;
}

function YearOverlayTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ color: entry.color, marginTop: 2 }}>
          {entry.name}: {formatRate(entry.value)}
        </div>
      ))}
    </div>
  );
}

export default function MonthlyRatesChart({ rates, startDate }: MonthlyRatesChartProps) {
  const { data, years } = useMemo(() => {
    const startMonth = startDate.slice(0, 7);
    const filtered = rates.filter((r) => r.month >= startMonth);

    // Group rates by year
    const byYear = new Map<string, Map<number, number>>();
    for (const r of filtered) {
      const year = r.month.slice(0, 4);
      const month = parseInt(r.month.slice(5, 7), 10) - 1; // 0-based
      if (!byYear.has(year)) byYear.set(year, new Map());
      byYear.get(year)!.set(month, r.rate);
    }

    const years = Array.from(byYear.keys()).sort();

    // Build data points for each month (Jan-Dec)
    const data: OverlayPoint[] = MONTH_LABELS.map((label, i) => {
      const point: OverlayPoint = { monthIndex: i, monthLabel: label };
      for (const year of years) {
        const monthRates = byYear.get(year)!;
        if (monthRates.has(i)) {
          point[year] = monthRates.get(i)!;
        }
      }
      return point;
    });

    return { data, years };
  }, [rates, startDate]);

  const domain = useMemo(() => {
    if (data.length === 0) return [1, 1.5] as [number, number];
    const vals: number[] = [];
    for (const point of data) {
      for (const year of years) {
        if (typeof point[year] === "number") {
          vals.push(point[year] as number);
        }
      }
    }
    if (vals.length === 0) return [1, 1.5] as [number, number];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 0.01;
    return [
      Math.floor((min - padding) * 100) / 100,
      Math.ceil((max + padding) * 100) / 100,
    ] as [number, number];
  }, [data, years]);

  if (years.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No rate data available for the selected time window.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={domain}
          tickFormatter={(v: number) => v.toFixed(2)}
          tick={{ fontSize: 12 }}
          width={60}
        />
        <Tooltip content={<YearOverlayTooltip />} />
        <Legend />
        {years.map((year, i) => (
          <Line
            key={year}
            type="monotone"
            dataKey={year}
            name={year}
            stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
            dot={false}
            strokeWidth={year === years[years.length - 1] ? 3 : 1.5}
            strokeOpacity={year === years[years.length - 1] ? 1 : 0.7}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RateEntry } from "../utils/rateData";

interface MonthlyRatesChartProps {
  rates: RateEntry[];
  startDate: string;
}

interface ChartPoint {
  month: string;
  label: string;
  rate: number;
}

function formatRate(value: number): string {
  return value.toFixed(4);
}

function RateTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as ChartPoint;
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{point.label}</div>
      <div style={{ color: "#2563eb" }}>
        USD/CAD: {formatRate(point.rate)}
      </div>
    </div>
  );
}

function getYearTicks(data: ChartPoint[]): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];
  for (const d of data) {
    const year = d.month.slice(0, 4);
    if (!seen.has(year)) {
      seen.add(year);
      ticks.push(d.month);
    }
  }
  return ticks;
}

export default function MonthlyRatesChart({ rates, startDate }: MonthlyRatesChartProps) {
  const data = useMemo(() => {
    const startMonth = startDate.slice(0, 7); // "YYYY-MM"
    return rates
      .filter((r) => r.month >= startMonth)
      .map((r) => ({
        month: r.month,
        label: new Date(r.month + "-01T00:00:00").toLocaleDateString("en-CA", {
          year: "numeric",
          month: "short",
        }),
        rate: r.rate,
      }));
  }, [rates, startDate]);

  const yearTicks = useMemo(() => getYearTicks(data), [data]);

  const domain = useMemo(() => {
    if (data.length === 0) return [1, 1.5] as [number, number];
    const vals = data.map((d) => d.rate);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 0.01;
    return [
      Math.floor((min - padding) * 100) / 100,
      Math.ceil((max + padding) * 100) / 100,
    ] as [number, number];
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No rate data available for the selected time window.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="month"
          ticks={yearTicks}
          tickFormatter={(d: string) => d.slice(0, 4)}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={domain}
          tickFormatter={(v: number) => v.toFixed(2)}
          tick={{ fontSize: 12 }}
          width={60}
        />
        <Tooltip content={<RateTooltip />} />
        <Line
          type="monotone"
          dataKey="rate"
          name="USD/CAD Rate"
          stroke="#2563eb"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

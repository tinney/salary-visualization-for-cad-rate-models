/**
 * SummaryStatistics component
 *
 * Displays total CAD earned per rate model and the differences between models.
 */
import React, { useMemo } from "react";
import { computeAllModels, type SummaryStats } from "../utils/computeAllModels";

interface SummaryStatisticsProps {
  baseSalary: number;
  raisePercent: number;
  startDate: string;
  averagingWindow: number;
}

const fmt = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

const fmtDiff = (n: number) => {
  const prefix = n >= 0 ? "+" : "";
  return prefix + fmt(n);
};

export default function SummaryStatistics({
  baseSalary,
  raisePercent,
  startDate,
  averagingWindow,
}: SummaryStatisticsProps) {
  const { summary } = useMemo(
    () => computeAllModels(baseSalary, raisePercent, startDate, averagingWindow),
    [baseSalary, raisePercent, startDate, averagingWindow]
  );

  const models = [
    { label: "TD Model", key: "tdModel" as const, color: "rgb(117, 254, 4)" },
    { label: "Avg Rate Locked", key: "anniversaryLock" as const, color: "#2563eb" },
    { label: "Rolling Average", key: "rollingAverage" as const, color: "#16a34a" },
    { label: "Current Rate", key: "currentRate" as const, color: "#dc2626" },
  ];

  const comparisons = [
    {
      label: "TD Model vs Avg Rate Locked",
      value: summary.diffTdModelVsAnniversaryLock,
    },
    {
      label: "Avg Rate Locked vs Rolling Average",
      value: summary.diffAnniversaryVsRolling,
    },
    {
      label: "Avg Rate Locked vs Current Rate",
      value: summary.diffAnniversaryVsCurrent,
    },
    {
      label: "Rolling Average vs Current Rate",
      value: summary.diffRollingVsCurrent,
    },
  ];

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Summary Statistics</h2>

      {/* Total CAD per model */}
      <div style={cardsRow}>
        {models.map((m) => {
          const data = summary[m.key];
          const avgRate = data.totalUSD > 0 ? data.totalCAD / data.totalUSD : 0;
          return (
            <div key={m.key} style={{ ...cardStyle, borderTop: `4px solid ${m.color}` }}>
              <div style={cardLabel}>{m.label}</div>
              <div style={cardValue}>{fmt(data.totalCAD)}</div>
              <div style={cardMeta}>
                {data.payrollCount} payrolls &middot; Avg rate: {avgRate.toFixed(4)}
              </div>
              <div style={cardMeta}>Total USD: {data.totalUSD.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</div>
            </div>
          );
        })}
      </div>

      {/* Differences between models */}
      <h3 style={{ margin: "20px 0 12px 0", fontSize: 15, color: "#555" }}>
        Model Differences
      </h3>
      <div style={cardsRow}>
        {comparisons.map((c) => (
          <div key={c.label} style={diffCardStyle}>
            <div style={cardLabel}>{c.label}</div>
            <div
              style={{
                ...cardValue,
                color: c.value >= 0 ? "#16a34a" : "#dc2626",
                fontSize: 20,
              }}
            >
              {fmtDiff(c.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Styles */

const containerStyle: React.CSSProperties = {
  padding: 20,
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  marginTop: 24,
};

const cardsRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  flex: "1 1 200px",
  padding: 16,
  background: "#fafafa",
  borderRadius: 8,
  minWidth: 200,
};

const diffCardStyle: React.CSSProperties = {
  flex: "1 1 200px",
  padding: 16,
  background: "#f9fafb",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  minWidth: 200,
};

const cardLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginBottom: 4,
  fontWeight: 500,
};

const cardValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111",
};

const cardMeta: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
  marginTop: 4,
};

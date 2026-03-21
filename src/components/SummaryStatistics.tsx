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

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDiff = (n: number) => {
  const prefix = n >= 0 ? "+" : "";
  return prefix + fmt(n);
};

const fmtPct = (n: number) => {
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}${n.toFixed(2)}%`;
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
    { label: "Anniversary Lock", key: "anniversaryLock" as const, color: "#2563eb" },
    { label: "Rolling Average", key: "rollingAverage" as const, color: "#16a34a" },
    { label: "Current Rate", key: "currentRate" as const, color: "#dc2626" },
  ];

  const comparisons = [
    {
      label: "Anniversary Lock vs Rolling Average",
      modelA: "Anniversary Lock",
      modelB: "Rolling Average",
      colorA: "#2563eb",
      colorB: "#16a34a",
      diff: summary.diffAnniversaryVsRolling,
      pct: summary.diffAnniversaryVsRollingPct,
    },
    {
      label: "Anniversary Lock vs Current Rate",
      modelA: "Anniversary Lock",
      modelB: "Current Rate",
      colorA: "#2563eb",
      colorB: "#dc2626",
      diff: summary.diffAnniversaryVsCurrent,
      pct: summary.diffAnniversaryVsCurrentPct,
    },
    {
      label: "Rolling Average vs Current Rate",
      modelA: "Rolling Average",
      modelB: "Current Rate",
      colorA: "#16a34a",
      colorB: "#dc2626",
      diff: summary.diffRollingVsCurrent,
      pct: summary.diffRollingVsCurrentPct,
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
              <div style={cardMeta}>Total USD: {fmtUSD(data.totalUSD)}</div>
            </div>
          );
        })}
      </div>

      {/* Differences between models */}
      <h3 style={{ margin: "20px 0 12px 0", fontSize: 15, color: "#555" }}>
        Model Differences
      </h3>
      <div style={cardsRow}>
        {comparisons.map((c) => {
          const positive = c.diff >= 0;
          const diffColor = positive ? "#16a34a" : "#dc2626";
          const winnerLabel = positive ? c.modelA : c.modelB;
          const winnerColor = positive ? c.colorA : c.colorB;
          return (
            <div key={c.label} style={diffCardStyle}>
              <div style={diffCardHeader}>
                <span style={{ ...modelTag, background: c.colorA + "22", color: c.colorA }}>
                  {c.modelA}
                </span>
                <span style={vsText}>vs</span>
                <span style={{ ...modelTag, background: c.colorB + "22", color: c.colorB }}>
                  {c.modelB}
                </span>
              </div>
              <div
                style={{
                  ...cardValue,
                  color: diffColor,
                  fontSize: 20,
                  marginTop: 8,
                }}
              >
                {fmtDiff(c.diff)}
              </div>
              <div style={{ ...cardMeta, color: diffColor, fontWeight: 600 }}>
                {fmtPct(c.pct)} relative to {c.modelB}
              </div>
              <div style={{ ...cardMeta, marginTop: 6 }}>
                <span style={{ color: winnerColor, fontWeight: 600 }}>{winnerLabel}</span>
                {" "}earns more in CAD
              </div>
            </div>
          );
        })}
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
  flex: "1 1 220px",
  padding: 16,
  background: "#f9fafb",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  minWidth: 220,
};

const diffCardHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

const modelTag: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const vsText: React.CSSProperties = {
  fontSize: 11,
  color: "#999",
  fontWeight: 500,
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

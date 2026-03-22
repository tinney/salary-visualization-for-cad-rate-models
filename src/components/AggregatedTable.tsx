import React, { useState, useMemo } from "react";

/**
 * Normalized payroll entry — a common shape for all three models.
 * Each model's raw output should be mapped to this before passing in.
 */
export interface NormalizedPayroll {
  /** Payroll date "YYYY-MM-DD" */
  date: string;
  /** USD pay for this payroll */
  payUSD: number;
  /** CAD pay for this payroll */
  payCAD: number;
}

export interface AggregatedTableProps {
  /** Model 1 (Anniversary Lock) payrolls */
  anniversaryLock: NormalizedPayroll[];
  /** Model 2 (Rolling Average) payrolls */
  rollingAverage: NormalizedPayroll[];
  /** Model 3 (Current Rate) payrolls */
  currentRate: NormalizedPayroll[];
}

type PeriodMode = "yearly" | "quarterly";

interface PeriodRow {
  label: string;
  sortKey: string;
  anniversaryLockCAD: number;
  rollingAverageCAD: number;
  currentRateCAD: number;
  usd: number;
}

/**
 * Extracts a period key from a date string.
 */
function getPeriodKey(dateStr: string, mode: PeriodMode): { label: string; sortKey: string } {
  const year = dateStr.slice(0, 4);
  if (mode === "yearly") {
    return { label: year, sortKey: year };
  }
  const month = parseInt(dateStr.slice(5, 7), 10);
  const quarter = Math.ceil(month / 3);
  return {
    label: `${year} Q${quarter}`,
    sortKey: `${year}-Q${quarter}`,
  };
}

/**
 * Aggregate an array of normalized payrolls into period buckets.
 */
function aggregateByPeriod(
  payrolls: NormalizedPayroll[],
  mode: PeriodMode
): Map<string, { label: string; totalCAD: number; totalUSD: number }> {
  const map = new Map<string, { label: string; totalCAD: number; totalUSD: number }>();
  for (const p of payrolls) {
    const { label, sortKey } = getPeriodKey(p.date, mode);
    const existing = map.get(sortKey);
    if (existing) {
      existing.totalCAD += p.payCAD;
      existing.totalUSD += p.payUSD;
    } else {
      map.set(sortKey, { label, totalCAD: p.payCAD, totalUSD: p.payUSD });
    }
  }
  return map;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDiff(diff: number): { text: string; color: string } {
  if (diff > 0) {
    return { text: `+${formatCurrency(diff)}`, color: "#22863a" };
  } else if (diff < 0) {
    return { text: `−${formatCurrency(Math.abs(diff))}`, color: "#d73a49" };
  }
  return { text: formatCurrency(0), color: "#0366d6" };
}

function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AggregatedTable({
  anniversaryLock,
  rollingAverage,
  currentRate,
}: AggregatedTableProps) {
  const [mode, setMode] = useState<PeriodMode>("yearly");

  const rows = useMemo(() => {
    const m1 = aggregateByPeriod(anniversaryLock, mode);
    const m2 = aggregateByPeriod(rollingAverage, mode);
    const m3 = aggregateByPeriod(currentRate, mode);

    // Collect all period keys
    const allKeys = new Set<string>();
    for (const k of m1.keys()) allKeys.add(k);
    for (const k of m2.keys()) allKeys.add(k);
    for (const k of m3.keys()) allKeys.add(k);

    const sorted = Array.from(allKeys).sort();

    const periodRows: PeriodRow[] = sorted.map((key) => ({
      label: m1.get(key)?.label ?? m2.get(key)?.label ?? m3.get(key)?.label ?? key,
      sortKey: key,
      anniversaryLockCAD: m1.get(key)?.totalCAD ?? 0,
      rollingAverageCAD: m2.get(key)?.totalCAD ?? 0,
      currentRateCAD: m3.get(key)?.totalCAD ?? 0,
      usd: m1.get(key)?.totalUSD ?? m2.get(key)?.totalUSD ?? m3.get(key)?.totalUSD ?? 0,
    }));

    return periodRows;
  }, [anniversaryLock, rollingAverage, currentRate, mode]);

  // Grand totals
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        usd: acc.usd + r.usd,
        anniversaryLockCAD: acc.anniversaryLockCAD + r.anniversaryLockCAD,
        rollingAverageCAD: acc.rollingAverageCAD + r.rollingAverageCAD,
        currentRateCAD: acc.currentRateCAD + r.currentRateCAD,
      }),
      { usd: 0, anniversaryLockCAD: 0, rollingAverageCAD: 0, currentRateCAD: 0 }
    );
  }, [rows]);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Aggregated Totals</h3>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setMode("yearly")}
            style={{
              padding: "4px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: mode === "yearly" ? "#4a90d9" : "#fff",
              color: mode === "yearly" ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Yearly
          </button>
          <button
            onClick={() => setMode("quarterly")}
            style={{
              padding: "4px 12px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: mode === "quarterly" ? "#4a90d9" : "#fff",
              color: mode === "quarterly" ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc", textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: "8px 12px" }}>Period</th>
              <th style={{ padding: "8px 12px" }}>USD Total</th>
              <th style={{ padding: "8px 12px", color: "#8884d8" }}>Anniversary Lock (CAD)</th>
              <th style={{ padding: "8px 12px", color: "#82ca9d" }}>Rolling Avg (CAD)</th>
              <th style={{ padding: "8px 12px", color: "#ff7300" }}>Current Rate (CAD)</th>
              <th style={{ padding: "8px 12px" }}>Max − Min Spread</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const vals = [row.anniversaryLockCAD, row.rollingAverageCAD, row.currentRateCAD];
              const spread = Math.max(...vals) - Math.min(...vals);
              const rollingDiff = formatDiff(row.rollingAverageCAD - row.anniversaryLockCAD);
              const currentDiff = formatDiff(row.currentRateCAD - row.anniversaryLockCAD);
              return (
                <tr
                  key={row.sortKey}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "6px 12px", fontWeight: 500 }}>{row.label}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    {formatUSD(row.usd)}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    {formatCurrency(row.anniversaryLockCAD)}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: rollingDiff.color }}>
                    {rollingDiff.text}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: currentDiff.color }}>
                    {currentDiff.text}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: "#666" }}>
                    {formatCurrency(spread)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(() => {
              const rollingDiff = formatDiff(totals.rollingAverageCAD - totals.anniversaryLockCAD);
              const currentDiff = formatDiff(totals.currentRateCAD - totals.anniversaryLockCAD);
              return (
                <tr style={{ borderTop: "2px solid #333", fontWeight: 700 }}>
                  <td style={{ padding: "8px 12px" }}>Grand Total</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    {formatUSD(totals.usd)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#8884d8" }}>
                    {formatCurrency(totals.anniversaryLockCAD)}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: rollingDiff.color, fontWeight: 700 }}>
                    {rollingDiff.text}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: currentDiff.color, fontWeight: 700 }}>
                    {currentDiff.text}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#666" }}>
                    {formatCurrency(
                      Math.max(totals.anniversaryLockCAD, totals.rollingAverageCAD, totals.currentRateCAD) -
                      Math.min(totals.anniversaryLockCAD, totals.rollingAverageCAD, totals.currentRateCAD)
                    )}
                  </td>
                </tr>
              );
            })()}
          </tfoot>
        </table>
      </div>
    </div>
  );
}

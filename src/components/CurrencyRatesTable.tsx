import React, { useState, useCallback } from "react";
import type { RateEntry } from "../utils/rateData";

interface Props {
  rates: RateEntry[];
  onRateChange: (month: string, rate: number) => void;
  onReset: () => void;
}

export default function CurrencyRatesTable({ rates, onRateChange, onReset }: Props) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback((month: string, currentRate: number) => {
    setEditingCell(month);
    setEditValue(String(currentRate));
  }, []);

  const commitEdit = useCallback(
    (month: string) => {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed) && parsed > 0) {
        onRateChange(month, Math.round(parsed * 10000) / 10000);
      }
      setEditingCell(null);
    },
    [editValue, onRateChange]
  );

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Group rates by year
  const byYear = new Map<string, RateEntry[]>();
  for (const r of rates) {
    const year = r.month.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(r);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Monthly USD/CAD Rates</h3>
        <button
          onClick={onReset}
          style={{
            padding: "6px 12px",
            background: "#e0e0e0",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Reset to Original
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
        Click any rate to edit it. Changes will update all calculations.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={headerStyle}>Year</th>
              {months.map((m) => (
                <th key={m} style={headerStyle}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(byYear.entries()).map(([year, yearRates]) => {
              const rateMap = new Map(yearRates.map((r) => [r.month, r.rate]));
              return (
                <tr key={year}>
                  <td style={{ ...cellStyle, fontWeight: 600, background: "#f9f9f9" }}>{year}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
                    const rate = rateMap.get(monthKey);

                    if (rate === undefined) {
                      return <td key={monthKey} style={{ ...cellStyle, color: "#ccc" }}>—</td>;
                    }

                    if (editingCell === monthKey) {
                      return (
                        <td key={monthKey} style={cellStyle}>
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(monthKey)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(monthKey);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            style={{
                              width: 60,
                              padding: "2px 4px",
                              fontSize: 13,
                              border: "1px solid #4a90d9",
                              borderRadius: 2,
                              outline: "none",
                              textAlign: "right",
                            }}
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={monthKey}
                        onClick={() => startEdit(monthKey, rate)}
                        style={{
                          ...cellStyle,
                          cursor: "pointer",
                          textAlign: "right",
                        }}
                        title={`Click to edit ${monthKey}`}
                      >
                        {rate.toFixed(4)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "6px 8px",
  textAlign: "right",
  borderBottom: "2px solid #ddd",
  background: "#f0f0f0",
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

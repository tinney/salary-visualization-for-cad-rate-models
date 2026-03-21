import React, { useCallback } from "react";

interface RaiseInputProps {
  /** Annual raise percentage (e.g. 3 means 3%) */
  raisePercent: number;
  /** Callback when the raise percentage changes */
  onChange: (raisePercent: number) => void;
}

const MIN_RAISE = 0;
const MAX_RAISE = 20;
const STEP = 0.5;

/**
 * Interactive control for adjusting the annual USD raise percentage.
 * Provides both a range slider and a numeric input for precision.
 * Default value is 3%.
 */
export default function RaiseInput({ raisePercent, onChange }: RaiseInputProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= MIN_RAISE && val <= MAX_RAISE) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div className="raise-input" style={{ marginBottom: "1rem" }}>
      <label
        htmlFor="raise-percent"
        style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
      >
        Annual Raise (%)
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <input
          id="raise-percent-slider"
          type="range"
          min={MIN_RAISE}
          max={MAX_RAISE}
          step={STEP}
          value={raisePercent}
          onChange={handleSliderChange}
          style={{ flex: 1 }}
          aria-label="Annual raise percentage slider"
        />
        <input
          id="raise-percent"
          type="number"
          min={MIN_RAISE}
          max={MAX_RAISE}
          step={STEP}
          value={raisePercent}
          onChange={handleNumberChange}
          style={{ width: 70, textAlign: "right", padding: "4px 8px" }}
          aria-label="Annual raise percentage"
        />
        <span>%</span>
      </div>
      <div
        style={{ fontSize: "0.8rem", color: "#666", marginTop: 4 }}
      >
        Raise applied annually on start-date anniversary ({MIN_RAISE}%–{MAX_RAISE}%)
      </div>
    </div>
  );
}

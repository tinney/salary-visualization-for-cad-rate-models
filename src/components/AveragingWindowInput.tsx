import React, { useCallback } from "react";

interface AveragingWindowInputProps {
  /** Rate averaging window in months */
  windowMonths: number;
  /** Callback when the window size changes */
  onChange: (windowMonths: number) => void;
}

const MIN_WINDOW = 1;
const MAX_WINDOW = 24;
const STEP = 1;

/**
 * Interactive control for adjusting the rate averaging window in months.
 * Provides both a range slider and a numeric input.
 * Default value is 4 months.
 *
 * The averaging window determines how many prior months of USD/CAD exchange
 * rates are averaged together in the rolling-average rate model.
 */
export default function AveragingWindowInput({
  windowMonths,
  onChange,
}: AveragingWindowInputProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value, 10));
    },
    [onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= MIN_WINDOW && val <= MAX_WINDOW) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div className="control-group">
      <label
        htmlFor="averaging-window"
        style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
      >
        Rate Averaging Window (months)
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <input
          id="averaging-window-slider"
          type="range"
          min={MIN_WINDOW}
          max={MAX_WINDOW}
          step={STEP}
          value={windowMonths}
          onChange={handleSliderChange}
          style={{ flex: 1 }}
          aria-label="Rate averaging window slider"
        />
        <input
          id="averaging-window"
          type="number"
          min={MIN_WINDOW}
          max={MAX_WINDOW}
          step={STEP}
          value={windowMonths}
          onChange={handleNumberChange}
          style={{ width: 70, textAlign: "right", padding: "4px 8px" }}
          aria-label="Rate averaging window in months"
        />
        <span>mo</span>
      </div>
      <span className="control-hint">
        Number of prior months averaged for the Anniversary Lock and Rolling
        Average rate models ({MIN_WINDOW}–{MAX_WINDOW})
      </span>
    </div>
  );
}

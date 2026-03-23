import React, { useCallback } from "react";
import "./InputSection.css";

interface AveragingWindowInputProps {
  windowMonths: number;
  onChange: (windowMonths: number) => void;
}

const MIN_WINDOW = 1;
const MAX_WINDOW = 24;
const STEP = 1;

function sliderBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #2563EB ${pct}%, #E4E4E7 ${pct}%)`;
}

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
    <div className="input-card">
      <div className="input-card__label">
        <svg className="input-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="2" x2="14" y2="2" />
          <line x1="12" y1="14" x2="12" y2="10" />
          <circle cx="12" cy="14" r="8" />
        </svg>
        <span className="input-card__label-text">Rate Averaging Window</span>
      </div>
      <div className="input-card__field">
        <input
          id="averaging-window"
          type="number"
          min={MIN_WINDOW}
          max={MAX_WINDOW}
          step={STEP}
          value={windowMonths}
          onChange={handleNumberChange}
          aria-label="Rate averaging window in months"
        />
        <span className="input-card__unit">months</span>
      </div>
      <input
        type="range"
        className="input-card__slider"
        min={MIN_WINDOW}
        max={MAX_WINDOW}
        step={STEP}
        value={windowMonths}
        onChange={handleSliderChange}
        style={{ background: sliderBackground(windowMonths, MIN_WINDOW, MAX_WINDOW) }}
        aria-label="Rate averaging window slider"
      />
      <span className="input-card__hint">
        Number of prior months averaged for the rolling-average rate model ({MIN_WINDOW}&ndash;{MAX_WINDOW})
      </span>
    </div>
  );
}

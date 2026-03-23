import React, { useCallback } from "react";
import "./InputSection.css";

interface RaiseInputProps {
  raisePercent: number;
  onChange: (raisePercent: number) => void;
}

const MIN_RAISE = 0;
const MAX_RAISE = 20;
const STEP = 0.5;

function sliderBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #2563EB ${pct}%, #E4E4E7 ${pct}%)`;
}

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
    <div className="input-card">
      <div className="input-card__label">
        <svg className="input-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        <span className="input-card__label-text">Annual Raise (%)</span>
      </div>
      <div className="input-card__field">
        <input
          id="raise-percent"
          type="number"
          min={MIN_RAISE}
          max={MAX_RAISE}
          step={STEP}
          value={raisePercent}
          onChange={handleNumberChange}
          aria-label="Annual raise percentage"
        />
        <span className="input-card__unit">%</span>
      </div>
      <input
        type="range"
        className="input-card__slider"
        min={MIN_RAISE}
        max={MAX_RAISE}
        step={STEP}
        value={raisePercent}
        onChange={handleSliderChange}
        style={{ background: sliderBackground(raisePercent, MIN_RAISE, MAX_RAISE) }}
        aria-label="Annual raise percentage slider"
      />
      <span className="input-card__hint">
        Raise applied annually on start-date anniversary ({MIN_RAISE}%&ndash;{MAX_RAISE}%)
      </span>
    </div>
  );
}

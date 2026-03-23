import React, { useCallback } from "react";
import "./InputSection.css";

interface RateLockPeriodInputProps {
  lockPeriodMonths: number;
  onChange: (months: number) => void;
}

const MIN = 1;
const MAX = 12;
const STEP = 1;

function sliderBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #2563EB ${pct}%, #E4E4E7 ${pct}%)`;
}

export default function RateLockPeriodInput({
  lockPeriodMonths,
  onChange,
}: RateLockPeriodInputProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value, 10));
    },
    [onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= MIN && val <= MAX) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div className="input-card">
      <div className="input-card__label">
        <svg className="input-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="input-card__label-text">Rate Lock Period</span>
      </div>
      <div className="input-card__field">
        <input
          id="lock-period"
          type="number"
          min={MIN}
          max={MAX}
          step={STEP}
          value={lockPeriodMonths}
          onChange={handleNumberChange}
          aria-label="Rate lock period in months"
        />
        <span className="input-card__unit">months</span>
      </div>
      <input
        type="range"
        className="input-card__slider"
        min={MIN}
        max={MAX}
        step={STEP}
        value={lockPeriodMonths}
        onChange={handleSliderChange}
        style={{ background: sliderBackground(lockPeriodMonths, MIN, MAX) }}
        aria-label="Rate lock period slider"
      />
      <span className="input-card__hint">
        How often the locked rate resets ({MIN}&ndash;{MAX} months). 12 = annual anniversary lock.
      </span>
    </div>
  );
}

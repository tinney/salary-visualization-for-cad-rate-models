import React, { useState, useCallback } from "react";
import "./InputSection.css";

interface BaseSalaryInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const DEFAULT_MIN = 30000;
const DEFAULT_MAX = 500000;
const DEFAULT_STEP = 5000;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function sliderBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #2563EB ${pct}%, #E4E4E7 ${pct}%)`;
}

export default function BaseSalaryInput({
  value,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
}: BaseSalaryInputProps) {
  const [textValue, setTextValue] = useState(formatCurrency(value));
  const [isEditing, setIsEditing] = useState(false);

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max]
  );

  const commitValue = useCallback(
    (raw: string) => {
      const parsed = parseCurrencyInput(raw);
      if (parsed !== null) {
        const clamped = clamp(parsed);
        onChange(clamped);
        setTextValue(formatCurrency(clamped));
      } else {
        setTextValue(formatCurrency(value));
      }
    },
    [clamp, onChange, value]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    commitValue(textValue);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleTextFocus = () => {
    setIsEditing(true);
    setTextValue(value.toString());
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
    if (!isEditing) {
      setTextValue(formatCurrency(newValue));
    }
  };

  return (
    <div className="input-card">
      <div className="input-card__label">
        <svg className="input-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span className="input-card__label-text">Base Salary (USD)</span>
      </div>
      <div className="input-card__field">
        <input
          id="base-salary"
          type="text"
          value={isEditing ? textValue : formatCurrency(value)}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          aria-label="Base annual salary in USD"
        />
      </div>
      <input
        type="range"
        className="input-card__slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        style={{ background: sliderBackground(value, min, max) }}
        aria-label="Base salary slider"
      />
      <span className="input-card__hint">
        Annual base salary before raises ({formatCurrency(min)} &ndash;{" "}
        {formatCurrency(max)})
      </span>
    </div>
  );
}

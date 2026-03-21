import React, { useState, useCallback } from "react";

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
        // Reset to current value on invalid input
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
    <div className="control-group">
      <label htmlFor="base-salary">Base Salary (USD)</label>
      <div className="salary-input-row">
        <input
          id="base-salary"
          type="text"
          className="salary-text-input"
          value={isEditing ? textValue : formatCurrency(value)}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          aria-label="Base annual salary in USD"
        />
        <input
          type="range"
          className="salary-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          aria-label="Base salary slider"
        />
      </div>
      <span className="control-hint">
        Annual base salary before raises ({formatCurrency(min)} &ndash;{" "}
        {formatCurrency(max)})
      </span>
    </div>
  );
}

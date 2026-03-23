import React from "react";
import "./InputSection.css";

interface StartDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const MIN_DATE = "2011-01-01";
const MAX_DATE = "2026-03-01";

function formatDisplayDate(iso: string): string {
  const [year, month] = iso.split("-");
  return `${month}/${year}`;
}

export default function StartDatePicker({
  value,
  onChange,
}: StartDatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDate = e.target.value;
    if (!rawDate) return;
    const [year, month] = rawDate.split("-");
    const snapped = `${year}-${month}-01`;
    if (snapped < MIN_DATE) {
      onChange(MIN_DATE);
    } else if (snapped > MAX_DATE) {
      onChange(MAX_DATE);
    } else {
      onChange(snapped);
    }
  };

  return (
    <div className="input-card">
      <div className="input-card__label">
        <svg className="input-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="input-card__label-text">Start Date</span>
      </div>
      <div className="input-card__field">
        <input
          id="start-date"
          type="date"
          value={value}
          min={MIN_DATE}
          max={MAX_DATE}
          onChange={handleChange}
          aria-label="Employee start date"
        />
      </div>
      <span className="input-card__hint">
        Snaps to 1st of month (payroll alignment)
      </span>
    </div>
  );
}

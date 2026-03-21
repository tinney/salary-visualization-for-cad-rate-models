import React from "react";
import "./StartDatePicker.css";

/**
 * StartDatePicker – allows the user to adjust the employee start date.
 * Default: January 1, 2020 (see defaults.ts)
 *
 * The selected date is always snapped to the 1st of the month for
 * semi-monthly payroll alignment (payrolls fall on the 1st and 15th).
 *
 * Props:
 *   value    – ISO date string (YYYY-MM-DD), e.g. '2020-01-01'
 *   onChange – callback receiving the new ISO date string
 */

interface StartDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const MIN_DATE = "2011-01-01"; // start of Bank of Canada rate data
const MAX_DATE = "2026-03-01"; // end of rate data range

export default function StartDatePicker({
  value,
  onChange,
}: StartDatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDate = e.target.value; // YYYY-MM-DD
    if (!rawDate) return;

    // Snap to the 1st of the selected month for payroll alignment
    const [year, month] = rawDate.split("-");
    const snapped = `${year}-${month}-01`;

    // Clamp within valid range
    if (snapped < MIN_DATE) {
      onChange(MIN_DATE);
    } else if (snapped > MAX_DATE) {
      onChange(MAX_DATE);
    } else {
      onChange(snapped);
    }
  };

  return (
    <div className="control-group">
      <label htmlFor="start-date">Start Date</label>
      <input
        id="start-date"
        type="date"
        className="start-date-input"
        value={value}
        min={MIN_DATE}
        max={MAX_DATE}
        onChange={handleChange}
        aria-label="Employee start date"
      />
      <span className="control-hint">
        Snaps to 1st of month (payroll alignment)
      </span>
    </div>
  );
}

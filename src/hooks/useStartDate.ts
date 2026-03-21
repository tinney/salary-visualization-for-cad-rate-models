import { useState, useCallback } from "react";
import { DEFAULTS } from "../defaults";

const MIN_DATE = "2011-01-01";
const MAX_DATE = "2026-03-01";

/**
 * Hook to manage the employee start date.
 * Default is 2020-01-01. Always snaps to the 1st of the month.
 */
export function useStartDate(initial: string = DEFAULTS.START_DATE) {
  const [startDate, setStartDateRaw] = useState<string>(initial);

  const setStartDate = useCallback((value: string) => {
    if (!value) return;

    // Snap to 1st of month
    const [year, month] = value.split("-");
    const snapped = `${year}-${month}-01`;

    // Clamp
    if (snapped < MIN_DATE) {
      setStartDateRaw(MIN_DATE);
    } else if (snapped > MAX_DATE) {
      setStartDateRaw(MAX_DATE);
    } else {
      setStartDateRaw(snapped);
    }
  }, []);

  return { startDate, setStartDate } as const;
}

export const DEFAULT_START_DATE = DEFAULTS.START_DATE;

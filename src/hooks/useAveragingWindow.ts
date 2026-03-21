import { useState, useCallback } from "react";
import { DEFAULTS } from "../defaults";

const MIN_WINDOW = 1;
const MAX_WINDOW = 24;

/**
 * Hook to manage the rate averaging window (in months).
 * Default is 4 months. Returns current value and setter.
 */
export function useAveragingWindow(
  initial: number = DEFAULTS.RATE_AVERAGING_WINDOW_MONTHS
) {
  const [windowMonths, setWindowMonths] = useState<number>(initial);

  const updateWindowMonths = useCallback((value: number) => {
    const clamped = Math.max(MIN_WINDOW, Math.min(MAX_WINDOW, Math.round(value)));
    setWindowMonths(clamped);
  }, []);

  return { windowMonths, setWindowMonths: updateWindowMonths } as const;
}

export const DEFAULT_AVERAGING_WINDOW = DEFAULTS.RATE_AVERAGING_WINDOW_MONTHS;

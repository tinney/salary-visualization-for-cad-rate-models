import { useState, useCallback } from "react";
import { DEFAULTS } from "../defaults";

/**
 * Hook to manage the annual raise percentage state.
 * Default is 3%. Returns current value and setter.
 */
export function useRaisePercentage(initial: number = DEFAULTS.ANNUAL_RAISE_PCT) {
  const [raisePercent, setRaisePercent] = useState<number>(initial);

  const updateRaisePercent = useCallback((value: number) => {
    // Clamp to valid range
    const clamped = Math.max(0, Math.min(20, value));
    setRaisePercent(clamped);
  }, []);

  return { raisePercent, setRaisePercent: updateRaisePercent } as const;
}

export const DEFAULT_RAISE_PERCENT = DEFAULTS.ANNUAL_RAISE_PCT;

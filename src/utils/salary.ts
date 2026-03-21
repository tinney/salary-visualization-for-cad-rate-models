/**
 * Calculates the annual USD salary at a given date, accounting for
 * annual raises applied on the employee's start-date anniversary.
 *
 * @param baseSalary  - Starting annual salary in USD
 * @param raisePercent - Annual raise as a percentage (e.g. 3 for 3%)
 * @param startDate   - Employee start date
 * @param asOfDate    - Date to calculate salary for
 * @returns Annual salary in USD effective on asOfDate
 */
export function getAnnualSalaryAtDate(
  baseSalary: number,
  raisePercent: number,
  startDate: Date,
  asOfDate: Date
): number {
  const yearsElapsed = countAnniversariesPassed(startDate, asOfDate);
  const multiplier = Math.pow(1 + raisePercent / 100, yearsElapsed);
  return baseSalary * multiplier;
}

/**
 * Returns the semi-monthly payroll amount (annual / 24) at a given date.
 */
export function getSemiMonthlyPayAtDate(
  baseSalary: number,
  raisePercent: number,
  startDate: Date,
  asOfDate: Date
): number {
  return getAnnualSalaryAtDate(baseSalary, raisePercent, startDate, asOfDate) / 24;
}

/**
 * Count how many full anniversary years have passed between startDate and asOfDate.
 * A raise applies ON the anniversary date (e.g., if start is Jan 1 2020,
 * the first raise is effective Jan 1 2021).
 */
function countAnniversariesPassed(startDate: Date, asOfDate: Date): number {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();

  const asOfYear = asOfDate.getFullYear();
  const asOfMonth = asOfDate.getMonth();
  const asOfDay = asOfDate.getDate();

  let years = asOfYear - startYear;

  // If the anniversary hasn't occurred yet this year, subtract one
  if (
    asOfMonth < startMonth ||
    (asOfMonth === startMonth && asOfDay < startDay)
  ) {
    years -= 1;
  }

  return Math.max(0, years);
}

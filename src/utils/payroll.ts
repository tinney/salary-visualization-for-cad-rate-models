import { getAnnualSalaryAtDate, getSemiMonthlyPayAtDate } from "./salary";

export interface PayrollEntry {
  /** Payroll date as ISO string (YYYY-MM-DD) */
  date: string;
  /** The annual USD salary in effect on this payroll date */
  annualSalaryUSD: number;
  /** Semi-monthly gross pay in USD (annualSalaryUSD / 24) */
  payAmountUSD: number;
}

/**
 * Generates a list of semi-monthly payroll entries from the employee's start
 * date through the end date.  Payroll falls on the 1st and 15th of each month.
 *
 * Annual raises apply on the employee's start-date anniversary (handled by
 * getAnnualSalaryAtDate).  Both payrolls within the anniversary month will
 * reflect the new salary if the anniversary has already passed by that
 * payroll date.
 *
 * @param baseSalary   Starting annual salary in USD
 * @param raisePercent Annual raise percentage (e.g. 3 for 3%)
 * @param startDate    Employee start date (ISO string YYYY-MM-DD)
 * @param endDate      Last date to include payrolls for (ISO string YYYY-MM-DD)
 * @returns Ordered list of PayrollEntry objects
 */
export function generatePayrollSchedule(
  baseSalary: number,
  raisePercent: number,
  startDate: string,
  endDate: string
): PayrollEntry[] {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const entries: PayrollEntry[] = [];

  // Begin from the first payroll date on or after the start date
  let year = start.getFullYear();
  let month = start.getMonth(); // 0-indexed

  // Determine the first payroll day in the start month
  const startDay = start.getDate();
  const payDays = [1, 15];
  let dayIndex = startDay <= 1 ? 0 : startDay <= 15 ? 1 : -1;

  // If the start date is after the 15th, move to the 1st of next month
  if (dayIndex === -1) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    dayIndex = 0;
  }

  while (true) {
    const payDay = payDays[dayIndex];
    const payDate = new Date(year, month, payDay);

    if (payDate > end) break;
    if (payDate >= start) {
      const annualSalary = getAnnualSalaryAtDate(
        baseSalary,
        raisePercent,
        start,
        payDate
      );
      entries.push({
        date: formatDate(payDate),
        annualSalaryUSD: annualSalary,
        payAmountUSD: annualSalary / 24,
      });
    }

    // Advance to next payroll date
    dayIndex += 1;
    if (dayIndex >= payDays.length) {
      dayIndex = 0;
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }

  return entries;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

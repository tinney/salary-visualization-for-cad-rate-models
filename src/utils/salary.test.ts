import { getAnnualSalaryAtDate, getSemiMonthlyPayAtDate } from "./salary";
import { generatePayrollSchedule } from "./payroll";

// Helper to create dates without timezone issues
const d = (iso: string) => new Date(iso + "T00:00:00");

describe("getAnnualSalaryAtDate", () => {
  const base = 160_000;
  const raise = 3; // 3%
  const start = d("2020-01-01");

  test("returns base salary before first anniversary", () => {
    expect(getAnnualSalaryAtDate(base, raise, start, d("2020-06-15"))).toBe(160_000);
    expect(getAnnualSalaryAtDate(base, raise, start, d("2020-12-31"))).toBe(160_000);
  });

  test("applies first raise on first anniversary", () => {
    const expected = 160_000 * 1.03;
    expect(getAnnualSalaryAtDate(base, raise, start, d("2021-01-01"))).toBeCloseTo(expected);
  });

  test("applies second raise on second anniversary", () => {
    const expected = 160_000 * 1.03 * 1.03;
    expect(getAnnualSalaryAtDate(base, raise, start, d("2022-01-01"))).toBeCloseTo(expected);
  });

  test("raise not applied day before anniversary", () => {
    // Dec 31 2020 is still year 0
    expect(getAnnualSalaryAtDate(base, raise, start, d("2020-12-31"))).toBe(160_000);
    // Jan 1 2021 is year 1
    expect(getAnnualSalaryAtDate(base, raise, start, d("2021-01-01"))).toBeCloseTo(160_000 * 1.03);
  });

  test("handles mid-year start date anniversary correctly", () => {
    const midYearStart = d("2020-07-15");
    // Before first anniversary (Jul 14 2021)
    expect(getAnnualSalaryAtDate(base, raise, midYearStart, d("2021-07-14"))).toBe(160_000);
    // On first anniversary (Jul 15 2021)
    expect(getAnnualSalaryAtDate(base, raise, midYearStart, d("2021-07-15"))).toBeCloseTo(160_000 * 1.03);
  });

  test("handles 0% raise", () => {
    expect(getAnnualSalaryAtDate(base, 0, start, d("2025-01-01"))).toBe(160_000);
  });

  test("compounds correctly over 5 years", () => {
    const expected = 160_000 * Math.pow(1.03, 5);
    expect(getAnnualSalaryAtDate(base, raise, start, d("2025-01-01"))).toBeCloseTo(expected, 2);
  });
});

describe("getSemiMonthlyPayAtDate", () => {
  test("returns annual / 24", () => {
    const pay = getSemiMonthlyPayAtDate(160_000, 3, d("2020-01-01"), d("2020-06-15"));
    expect(pay).toBeCloseTo(160_000 / 24);
  });

  test("semi-monthly pay reflects raise after anniversary", () => {
    const payBefore = getSemiMonthlyPayAtDate(160_000, 3, d("2020-01-01"), d("2020-12-15"));
    const payAfter = getSemiMonthlyPayAtDate(160_000, 3, d("2020-01-01"), d("2021-01-01"));
    expect(payAfter).toBeGreaterThan(payBefore);
    expect(payAfter).toBeCloseTo((160_000 * 1.03) / 24);
  });
});

describe("generatePayrollSchedule", () => {
  test("generates payroll on 1st and 15th", () => {
    const schedule = generatePayrollSchedule(160_000, 3, "2020-01-01", "2020-03-31");
    const dates = schedule.map((e) => e.date);
    expect(dates).toEqual([
      "2020-01-01",
      "2020-01-15",
      "2020-02-01",
      "2020-02-15",
      "2020-03-01",
      "2020-03-15",
    ]);
  });

  test("salary increases on anniversary payroll", () => {
    const schedule = generatePayrollSchedule(160_000, 3, "2020-01-01", "2021-01-15");
    const dec15 = schedule.find((e) => e.date === "2020-12-15")!;
    const jan1 = schedule.find((e) => e.date === "2021-01-01")!;
    expect(dec15.annualSalaryUSD).toBe(160_000);
    expect(jan1.annualSalaryUSD).toBeCloseTo(160_000 * 1.03);
  });

  test("mid-month start date picks up first payroll correctly", () => {
    const schedule = generatePayrollSchedule(160_000, 3, "2020-01-10", "2020-02-28");
    expect(schedule[0].date).toBe("2020-01-15");
    expect(schedule[1].date).toBe("2020-02-01");
  });

  test("start date after 15th picks up 1st of next month", () => {
    const schedule = generatePayrollSchedule(160_000, 3, "2020-01-20", "2020-03-15");
    expect(schedule[0].date).toBe("2020-02-01");
  });
});

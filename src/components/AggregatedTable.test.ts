import { describe, expect, it } from "bun:test";
import { getPeriodKey, aggregateByPeriod } from "./AggregatedTable";
import type { NormalizedPayroll } from "./AggregatedTable";

describe("getPeriodKey", () => {
  describe("yearly mode", () => {
    it("returns the year as label and sortKey", () => {
      expect(getPeriodKey("2020-01-01", "yearly")).toEqual({ label: "2020", sortKey: "2020" });
      expect(getPeriodKey("2020-12-15", "yearly")).toEqual({ label: "2020", sortKey: "2020" });
      expect(getPeriodKey("2023-06-01", "yearly")).toEqual({ label: "2023", sortKey: "2023" });
    });

    it("groups Jan and Dec of same year into same bucket", () => {
      const jan = getPeriodKey("2021-01-01", "yearly");
      const dec = getPeriodKey("2021-12-15", "yearly");
      expect(jan.sortKey).toBe(dec.sortKey);
    });

    it("separates different years", () => {
      const y2020 = getPeriodKey("2020-06-01", "yearly");
      const y2021 = getPeriodKey("2021-06-01", "yearly");
      expect(y2020.sortKey).not.toBe(y2021.sortKey);
    });
  });

  describe("quarterly mode", () => {
    it("assigns Q1 for Jan, Feb, Mar", () => {
      expect(getPeriodKey("2020-01-01", "quarterly")).toEqual({ label: "2020 Q1", sortKey: "2020-Q1" });
      expect(getPeriodKey("2020-02-15", "quarterly")).toEqual({ label: "2020 Q1", sortKey: "2020-Q1" });
      expect(getPeriodKey("2020-03-01", "quarterly")).toEqual({ label: "2020 Q1", sortKey: "2020-Q1" });
    });

    it("assigns Q2 for Apr, May, Jun", () => {
      expect(getPeriodKey("2020-04-01", "quarterly")).toEqual({ label: "2020 Q2", sortKey: "2020-Q2" });
      expect(getPeriodKey("2020-05-15", "quarterly")).toEqual({ label: "2020 Q2", sortKey: "2020-Q2" });
      expect(getPeriodKey("2020-06-01", "quarterly")).toEqual({ label: "2020 Q2", sortKey: "2020-Q2" });
    });

    it("assigns Q3 for Jul, Aug, Sep", () => {
      expect(getPeriodKey("2020-07-01", "quarterly")).toEqual({ label: "2020 Q3", sortKey: "2020-Q3" });
      expect(getPeriodKey("2020-08-15", "quarterly")).toEqual({ label: "2020 Q3", sortKey: "2020-Q3" });
      expect(getPeriodKey("2020-09-01", "quarterly")).toEqual({ label: "2020 Q3", sortKey: "2020-Q3" });
    });

    it("assigns Q4 for Oct, Nov, Dec", () => {
      expect(getPeriodKey("2020-10-01", "quarterly")).toEqual({ label: "2020 Q4", sortKey: "2020-Q4" });
      expect(getPeriodKey("2020-11-15", "quarterly")).toEqual({ label: "2020 Q4", sortKey: "2020-Q4" });
      expect(getPeriodKey("2020-12-01", "quarterly")).toEqual({ label: "2020 Q4", sortKey: "2020-Q4" });
    });

    it("separates same quarter in different years", () => {
      const q1_2020 = getPeriodKey("2020-01-01", "quarterly");
      const q1_2021 = getPeriodKey("2021-01-01", "quarterly");
      expect(q1_2020.sortKey).not.toBe(q1_2021.sortKey);
    });
  });
});

describe("aggregateByPeriod", () => {
  const makePayroll = (date: string, payUSD: number, payCAD: number): NormalizedPayroll => ({
    date,
    payUSD,
    payCAD,
  });

  describe("yearly mode", () => {
    it("sums payrolls within the same year", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-01-01", 6000, 8000),
        makePayroll("2020-01-15", 6000, 8100),
        makePayroll("2020-02-01", 6000, 7900),
      ];
      const result = aggregateByPeriod(payrolls, "yearly");
      expect(result.size).toBe(1);
      const entry = result.get("2020")!;
      expect(entry.label).toBe("2020");
      expect(entry.totalCAD).toBeCloseTo(24000);
      expect(entry.totalUSD).toBeCloseTo(18000);
    });

    it("separates payrolls across different years", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-12-15", 6000, 8000),
        makePayroll("2021-01-01", 6000, 8200),
      ];
      const result = aggregateByPeriod(payrolls, "yearly");
      expect(result.size).toBe(2);
      expect(result.get("2020")!.totalCAD).toBeCloseTo(8000);
      expect(result.get("2021")!.totalCAD).toBeCloseTo(8200);
    });

    it("returns an empty map for empty payrolls", () => {
      const result = aggregateByPeriod([], "yearly");
      expect(result.size).toBe(0);
    });

    it("correctly accumulates USD totals independently of CAD", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2022-01-01", 7000, 9100),
        makePayroll("2022-01-15", 7000, 9050),
      ];
      const result = aggregateByPeriod(payrolls, "yearly");
      const entry = result.get("2022")!;
      expect(entry.totalUSD).toBeCloseTo(14000);
      expect(entry.totalCAD).toBeCloseTo(18150);
    });
  });

  describe("quarterly mode", () => {
    it("sums payrolls within the same quarter", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-01-01", 6000, 8000),
        makePayroll("2020-01-15", 6000, 8100),
        makePayroll("2020-02-01", 6000, 7900),
        makePayroll("2020-02-15", 6000, 8050),
        makePayroll("2020-03-01", 6000, 7950),
        makePayroll("2020-03-15", 6000, 8010),
      ];
      const result = aggregateByPeriod(payrolls, "quarterly");
      expect(result.size).toBe(1);
      const entry = result.get("2020-Q1")!;
      expect(entry.label).toBe("2020 Q1");
      expect(entry.totalUSD).toBeCloseTo(36000);
      expect(entry.totalCAD).toBeCloseTo(48010);
    });

    it("separates payrolls across different quarters in the same year", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-03-15", 6000, 8000),
        makePayroll("2020-04-01", 6000, 8100),
      ];
      const result = aggregateByPeriod(payrolls, "quarterly");
      expect(result.size).toBe(2);
      expect(result.get("2020-Q1")!.totalCAD).toBeCloseTo(8000);
      expect(result.get("2020-Q2")!.totalCAD).toBeCloseTo(8100);
    });

    it("separates the same quarter in different years", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-01-01", 6000, 8000),
        makePayroll("2021-01-01", 6500, 8400),
      ];
      const result = aggregateByPeriod(payrolls, "quarterly");
      expect(result.size).toBe(2);
      const q1_2020 = result.get("2020-Q1")!;
      const q1_2021 = result.get("2021-Q1")!;
      expect(q1_2020.totalCAD).toBeCloseTo(8000);
      expect(q1_2020.totalUSD).toBeCloseTo(6000);
      expect(q1_2021.totalCAD).toBeCloseTo(8400);
      expect(q1_2021.totalUSD).toBeCloseTo(6500);
    });

    it("produces 4 quarters for a full year of bi-monthly payrolls", () => {
      const months = [
        "01","02","03","04","05","06",
        "07","08","09","10","11","12",
      ];
      const payrolls: NormalizedPayroll[] = months.flatMap((m) => [
        makePayroll(`2020-${m}-01`, 6000, 8000),
        makePayroll(`2020-${m}-15`, 6000, 8000),
      ]);
      const result = aggregateByPeriod(payrolls, "quarterly");
      expect(result.size).toBe(4);
      expect(result.has("2020-Q1")).toBe(true);
      expect(result.has("2020-Q2")).toBe(true);
      expect(result.has("2020-Q3")).toBe(true);
      expect(result.has("2020-Q4")).toBe(true);
    });

    it("Q4 to Q1 year boundary is handled correctly", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-12-15", 6000, 8000),
        makePayroll("2021-01-01", 6000, 8200),
        makePayroll("2021-01-15", 6000, 8300),
      ];
      const result = aggregateByPeriod(payrolls, "quarterly");
      expect(result.size).toBe(2);
      expect(result.get("2020-Q4")!.totalCAD).toBeCloseTo(8000);
      expect(result.get("2021-Q1")!.totalCAD).toBeCloseTo(16500);
    });
  });

  describe("toggle produces different groupings for same data", () => {
    it("yearly mode produces fewer buckets than quarterly for multi-quarter data", () => {
      const payrolls: NormalizedPayroll[] = [
        makePayroll("2020-01-01", 6000, 8000),
        makePayroll("2020-04-01", 6000, 8100),
        makePayroll("2020-07-01", 6000, 7900),
        makePayroll("2020-10-01", 6000, 8050),
      ];
      const yearly = aggregateByPeriod(payrolls, "yearly");
      const quarterly = aggregateByPeriod(payrolls, "quarterly");

      expect(yearly.size).toBe(1);
      expect(quarterly.size).toBe(4);

      // Yearly total should match sum of all quarterly totals
      const yearlyTotal = yearly.get("2020")!.totalCAD;
      let quarterlySum = 0;
      for (const v of quarterly.values()) {
        quarterlySum += v.totalCAD;
      }
      expect(yearlyTotal).toBeCloseTo(quarterlySum);
    });
  });
});

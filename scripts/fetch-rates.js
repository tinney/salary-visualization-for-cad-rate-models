/**
 * Fetches historical USD/CAD exchange rate data from the Bank of Canada Valet API
 * and saves monthly average rates as a static JSON file.
 *
 * Bank of Canada series:
 *   - IEXE0101: USD/CAD daily rate (available until ~Apr 2017)
 *   - FXUSDCAD: USD/CAD daily rate (available from Jan 2017 onward)
 *
 * We use IEXE0101 for Jan 2011 – Dec 2016 and FXUSDCAD for Jan 2017 – Mar 2026,
 * then compute monthly averages from the daily observations.
 *
 * Usage: bun scripts/fetch-rates.js
 */

const VALET_BASE = "https://www.bankofcanada.ca/valet/observations";
const OUTPUT_PATH = new URL("../src/data/usdcad-monthly.json", import.meta.url).pathname;

/**
 * Fetch daily observations for a given series and date range.
 * Returns array of { date: string, rate: number }.
 */
async function fetchDailyRates(series, startDate, endDate) {
  const url = `${VALET_BASE}/${series}/json?start_date=${startDate}&end_date=${endDate}`;
  console.log(`  Fetching ${series} from ${startDate} to ${endDate}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const data = await res.json();
  const observations = data.observations || [];

  return observations
    .filter((obs) => obs[series]?.v !== undefined)
    .map((obs) => ({
      date: obs.d,
      rate: parseFloat(obs[series].v),
    }));
}

/**
 * Group daily rates by YYYY-MM and compute monthly averages.
 */
function computeMonthlyAverages(dailyRates) {
  const byMonth = new Map();

  for (const { date, rate } of dailyRates) {
    const month = date.slice(0, 7); // "YYYY-MM"
    if (!byMonth.has(month)) {
      byMonth.set(month, []);
    }
    byMonth.get(month).push(rate);
  }

  const monthly = [];
  for (const [month, rates] of byMonth) {
    const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    monthly.push({
      month,
      rate: Math.round(avg * 10000) / 10000, // 4 decimal places
      dailyCount: rates.length,
    });
  }

  return monthly.sort((a, b) => a.month.localeCompare(b.month));
}

async function main() {
  console.log("Fetching USD/CAD daily exchange rates from Bank of Canada...\n");

  // Fetch older data (IEXE0101: 2011-01 through 2016-12)
  const oldRates = await fetchDailyRates("IEXE0101", "2011-01-01", "2016-12-31");
  console.log(`  Got ${oldRates.length} daily observations from IEXE0101\n`);

  // Fetch newer data (FXUSDCAD: 2017-01 through 2026-03)
  const newRates = await fetchDailyRates("FXUSDCAD", "2017-01-01", "2026-03-31");
  console.log(`  Got ${newRates.length} daily observations from FXUSDCAD\n`);

  // Combine and compute monthly averages
  const allDailyRates = [...oldRates, ...newRates];
  const monthlyRates = computeMonthlyAverages(allDailyRates);

  console.log(`Computed ${monthlyRates.length} monthly averages`);
  console.log(`  Range: ${monthlyRates[0].month} to ${monthlyRates[monthlyRates.length - 1].month}`);

  // Validate completeness — expect roughly 183 months (Jan 2011 – Mar 2026)
  const expectedStart = "2011-01";
  const expectedEnd = "2026-03";
  if (monthlyRates[0].month !== expectedStart) {
    console.warn(`  ⚠ First month is ${monthlyRates[0].month}, expected ${expectedStart}`);
  }
  if (monthlyRates[monthlyRates.length - 1].month > expectedEnd) {
    // Trim any data past March 2026
    while (monthlyRates.length > 0 && monthlyRates[monthlyRates.length - 1].month > expectedEnd) {
      monthlyRates.pop();
    }
  }

  // Check for gaps
  let gaps = 0;
  for (let i = 1; i < monthlyRates.length; i++) {
    const prev = monthlyRates[i - 1].month;
    const curr = monthlyRates[i].month;
    const [py, pm] = prev.split("-").map(Number);
    const expectedYear = pm === 12 ? py + 1 : py;
    const expectedMon = pm === 12 ? 1 : pm + 1;
    const expectedMonth = `${expectedYear}-${String(expectedMon).padStart(2, "0")}`;
    if (curr !== expectedMonth) {
      console.warn(`  ⚠ Gap: expected ${expectedMonth} after ${prev}, got ${curr}`);
      gaps++;
    }
  }

  if (gaps === 0) {
    console.log("  ✓ No gaps detected in monthly data");
  }

  // Write output
  const output = {
    description: "Monthly average USD/CAD exchange rates from Bank of Canada",
    source: "Bank of Canada Valet API (IEXE0101 + FXUSDCAD series)",
    generatedAt: new Date().toISOString(),
    rates: monthlyRates.map(({ month, rate }) => ({ month, rate })),
  };

  await Bun.write(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

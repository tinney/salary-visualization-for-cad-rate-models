import React, { useState, useMemo, useCallback } from 'react';
import './components/InputSection.css';
import { DEFAULTS } from './defaults.ts';
import StartDatePicker from './components/StartDatePicker.tsx';
import BaseSalaryInput from './components/BaseSalaryInput.tsx';
import RaiseInput from './components/RaiseInput.tsx';
import AveragingWindowInput from './components/AveragingWindowInput.tsx';
import RateLockPeriodInput from './components/RateLockPeriodInput.tsx';
import SalaryChart from './components/SalaryChart.tsx';
import SummaryStatistics from './components/SummaryStatistics.tsx';
import AggregatedTable from './components/AggregatedTable.tsx';
import CurrencyRatesTable from './components/CurrencyRatesTable.tsx';
import MonthlyRatesChart from './components/MonthlyRatesChart.tsx';
import { computeAllModels } from './utils/computeAllModels.ts';
import { getAllRates, setRate as setRateInData, resetRates as resetRatesInData } from './utils/rateData.ts';
import { setRateInModels, resetRatesInModels } from './utils/rateModels.ts';

export default function App() {
  const [startDate, setStartDate] = useState(DEFAULTS.START_DATE);
  const [baseSalary, setBaseSalary] = useState(DEFAULTS.BASE_SALARY_USD);
  const [raisePercent, setRaisePercent] = useState(DEFAULTS.ANNUAL_RAISE_PCT);
  const [averagingWindow, setAveragingWindow] = useState(DEFAULTS.RATE_AVERAGING_WINDOW_MONTHS);
  const [lockPeriodMonths, setLockPeriodMonths] = useState(DEFAULTS.RATE_LOCK_PERIOD_MONTHS);
  const [rateVersion, setRateVersion] = useState(0);

  const handleRateChange = useCallback((month, rate) => {
    setRateInData(month, rate);
    setRateInModels(month, rate);
    setRateVersion((v) => v + 1);
  }, []);

  const handleRateReset = useCallback(() => {
    resetRatesInData();
    resetRatesInModels();
    setRateVersion((v) => v + 1);
  }, []);

  const currentRates = useMemo(() => getAllRates(), [rateVersion]);

  // Compute all models once and share across components
  const { payrolls } = useMemo(
    () => computeAllModels(baseSalary, raisePercent, startDate, averagingWindow, undefined, lockPeriodMonths),
    [baseSalary, raisePercent, startDate, averagingWindow, lockPeriodMonths, rateVersion]
  );

  // Map unified payrolls to the NormalizedPayroll shape for each model
  const anniversaryLockPayrolls = useMemo(
    () => payrolls
      .filter((p) => p.anniversaryLockCAD !== undefined)
      .map((p) => ({ date: p.date, payUSD: p.payUSD, payCAD: p.anniversaryLockCAD })),
    [payrolls]
  );

  const tdModelPayrolls = useMemo(
    () => payrolls
      .filter((p) => p.tdModelCAD !== undefined)
      .map((p) => ({ date: p.date, payUSD: p.payUSD, payCAD: p.tdModelCAD })),
    [payrolls]
  );

  const rollingAveragePayrolls = useMemo(
    () => payrolls
      .filter((p) => p.rollingAverageCAD !== undefined)
      .map((p) => ({ date: p.date, payUSD: p.payUSD, payCAD: p.rollingAverageCAD })),
    [payrolls]
  );

  const currentRatePayrolls = useMemo(
    () => payrolls
      .filter((p) => p.currentRateCAD !== undefined)
      .map((p) => ({ date: p.date, payUSD: p.payUSD, payCAD: p.currentRateCAD })),
    [payrolls]
  );

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div className="inputs-section" style={{ marginBottom: 32, borderRadius: 8 }}>
        <div className="inputs-header">
          <div className="inputs-title-block">
            <h1 className="inputs-title">USD &rarr; CAD Salary Visualization</h1>
            <p className="inputs-subtitle">Configure your salary parameters below</p>
          </div>
        </div>
        <hr className="inputs-divider" />
        <div className="inputs-grid">
          <StartDatePicker value={startDate} onChange={setStartDate} />
          <RaiseInput raisePercent={raisePercent} onChange={setRaisePercent} />
          <BaseSalaryInput value={baseSalary} onChange={setBaseSalary} />
          <AveragingWindowInput windowMonths={averagingWindow} onChange={setAveragingWindow} />
          <RateLockPeriodInput lockPeriodMonths={lockPeriodMonths} onChange={setLockPeriodMonths} />
        </div>
      </div>

      <div style={{ padding: 24, background: '#f0f4ff', borderRadius: 8, marginBottom: 24, border: '1px solid #d0d9f0' }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, color: '#1e293b' }}>How the Models Work</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
          This tool compares four different approaches to converting a USD salary into CAD using Bank of Canada monthly exchange rates.
          Each model applies a different strategy for determining which rate is used on each pay date.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid #2563eb' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#2563eb' }}>Avg Rate Locked</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Locks the exchange rate at each anniversary (or lock period boundary) of your start date.
              The locked rate is the trailing average over the configured averaging window ending at that boundary.
              The rate stays fixed until the next lock period begins.
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid rgb(117, 254, 4)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#16a34a' }}>TD Model</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              A fixed reference baseline using the same anniversary lock approach, but always with a 4-month averaging window and 12-month lock period regardless of your slider settings.
              Used as the comparison benchmark for the other models.
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid #16a34a' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#16a34a' }}>Rolling Average</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              For each pay date, uses the average exchange rate over the preceding N months (set by the averaging window slider).
              The rate updates every month as the window slides forward, providing gradual smoothing.
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid #dc2626' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#dc2626' }}>Current Rate</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Uses the actual Bank of Canada exchange rate for that specific month with no averaging or locking.
              This is the most volatile model and shows what you'd receive with real-time conversion.
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>CAD Salary Over Time</h2>
        <SalaryChart
          baseSalary={baseSalary}
          raisePercent={raisePercent}
          startDate={startDate}
          averagingWindow={averagingWindow}
          lockPeriodMonths={lockPeriodMonths}
        />
      </div>

      <SummaryStatistics
        baseSalary={baseSalary}
        raisePercent={raisePercent}
        startDate={startDate}
        averagingWindow={averagingWindow}
        lockPeriodMonths={lockPeriodMonths}
      />

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginTop: 24 }}>
        <AggregatedTable
          anniversaryLock={anniversaryLockPayrolls}
          tdModel={tdModelPayrolls}
          rollingAverage={rollingAveragePayrolls}
          currentRate={currentRatePayrolls}
        />
      </div>

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>USD/CAD Rate Change from January (Normalized)</h2>
        <MonthlyRatesChart rates={currentRates} startDate={startDate} />
      </div>

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginTop: 24 }}>
        <CurrencyRatesTable
          rates={currentRates}
          onRateChange={handleRateChange}
          onReset={handleRateReset}
        />
      </div>
    </div>
  );
}

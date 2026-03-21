import React, { useState, useMemo } from 'react';
import { DEFAULTS } from './defaults.ts';
import StartDatePicker from './components/StartDatePicker.tsx';
import BaseSalaryInput from './components/BaseSalaryInput.tsx';
import RaiseInput from './components/RaiseInput.tsx';
import AveragingWindowInput from './components/AveragingWindowInput.tsx';
import SalaryChart from './components/SalaryChart.tsx';
import SummaryStatistics from './components/SummaryStatistics.tsx';
import AggregatedTable from './components/AggregatedTable.tsx';
import { computeAllModels } from './utils/computeAllModels.ts';

export default function App() {
  const [startDate, setStartDate] = useState(DEFAULTS.START_DATE);
  const [baseSalary, setBaseSalary] = useState(DEFAULTS.BASE_SALARY_USD);
  const [raisePercent, setRaisePercent] = useState(DEFAULTS.ANNUAL_RAISE_PCT);
  const [averagingWindow, setAveragingWindow] = useState(DEFAULTS.RATE_AVERAGING_WINDOW_MONTHS);

  // Compute all models once and share across components
  const { payrolls } = useMemo(
    () => computeAllModels(baseSalary, raisePercent, startDate, averagingWindow),
    [baseSalary, raisePercent, startDate, averagingWindow]
  );

  // Map unified payrolls to the NormalizedPayroll shape for each model
  const anniversaryLockPayrolls = useMemo(
    () => payrolls
      .filter((p) => p.anniversaryLockCAD !== undefined)
      .map((p) => ({ date: p.date, payUSD: p.payUSD, payCAD: p.anniversaryLockCAD })),
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
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>USD &rarr; CAD Salary Visualization</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <StartDatePicker value={startDate} onChange={setStartDate} />
        <BaseSalaryInput value={baseSalary} onChange={setBaseSalary} />
        <RaiseInput raisePercent={raisePercent} onChange={setRaisePercent} />
        <AveragingWindowInput windowMonths={averagingWindow} onChange={setAveragingWindow} />
      </div>

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>CAD Salary Over Time</h2>
        <SalaryChart
          baseSalary={baseSalary}
          raisePercent={raisePercent}
          startDate={startDate}
          averagingWindow={averagingWindow}
        />
      </div>

      <SummaryStatistics
        baseSalary={baseSalary}
        raisePercent={raisePercent}
        startDate={startDate}
        averagingWindow={averagingWindow}
      />

      <div style={{ padding: 24, background: '#fafafa', borderRadius: 8, marginTop: 24 }}>
        <AggregatedTable
          anniversaryLock={anniversaryLockPayrolls}
          rollingAverage={rollingAveragePayrolls}
          currentRate={currentRatePayrolls}
        />
      </div>
    </div>
  );
}

import React, { useState, useMemo, useCallback } from 'react';
import './components/InputSection.css';
import { DEFAULTS } from './defaults.ts';
import StartDatePicker from './components/StartDatePicker.tsx';
import BaseSalaryInput from './components/BaseSalaryInput.tsx';
import RaiseInput from './components/RaiseInput.tsx';
import AveragingWindowInput from './components/AveragingWindowInput.tsx';
import SalaryChart from './components/SalaryChart.tsx';
import SummaryStatistics from './components/SummaryStatistics.tsx';
import AggregatedTable from './components/AggregatedTable.tsx';
import CurrencyRatesTable from './components/CurrencyRatesTable.tsx';
import { computeAllModels } from './utils/computeAllModels.ts';
import { getAllRates, setRate as setRateInData, resetRates as resetRatesInData } from './utils/rateData.ts';
import { setRateInModels, resetRatesInModels } from './utils/rateModels.ts';

export default function App() {
  const [startDate, setStartDate] = useState(DEFAULTS.START_DATE);
  const [baseSalary, setBaseSalary] = useState(DEFAULTS.BASE_SALARY_USD);
  const [raisePercent, setRaisePercent] = useState(DEFAULTS.ANNUAL_RAISE_PCT);
  const [averagingWindow, setAveragingWindow] = useState(DEFAULTS.RATE_AVERAGING_WINDOW_MONTHS);
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
    () => computeAllModels(baseSalary, raisePercent, startDate, averagingWindow),
    [baseSalary, raisePercent, startDate, averagingWindow, rateVersion]
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
        </div>
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
          tdModel={tdModelPayrolls}
          rollingAverage={rollingAveragePayrolls}
          currentRate={currentRatePayrolls}
        />
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

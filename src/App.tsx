import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { DashboardView } from './components/DashboardView';
import { OperatorReportView } from './components/OperatorReportView';
import { ProductReportView } from './components/ProductReportView';
import { ImportBasesView } from './components/ImportBasesView';
import { UnmatchedView } from './components/UnmatchedView';
import { HistoryView } from './components/HistoryView';
import {
  FilterState,
  OperatorReportRow,
  ProductReportRow,
  DashboardSummary,
  FilterOptions,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [filter, setFilter] = useState<FilterState>({
    dataInicio: '',
    dataFim: '',
    operador: '',
    produto: '',
    usuario: '',
  });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [operatorReport, setOperatorReport] = useState<OperatorReportRow[]>([]);
  const [productReport, setProductReport] = useState<ProductReportRow[]>([]);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        dataInicio: filter.dataInicio,
        dataFim: filter.dataFim,
        operador: filter.operador,
        produto: filter.produto,
        usuario: filter.usuario,
      }).toString();

      const [resSummary, resOp, resProd, resOptions] = await Promise.all([
        fetch(`/api/reports/summary?${queryParams}`),
        fetch(`/api/reports/operator?${queryParams}`),
        fetch(`/api/reports/product?${queryParams}`),
        fetch(`/api/filters/options`),
      ]);

      if (resSummary.ok) setSummary(await resSummary.json());
      if (resOp.ok) setOperatorReport(await resOp.json());
      if (resProd.ok) setProductReport(await resProd.json());
      if (resOptions.ok) setOptions(await resOptions.json());
    } catch (err) {
      console.error('Error fetching data from server:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleResetFilters = () => {
    setFilter({
      dataInicio: '',
      dataFim: '',
      operador: '',
      produto: '',
      usuario: '',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalOperadores={options?.totalOperadoresInDb || 0}
        totalPausas={options?.totalPausasInDb || 0}
        totalNuvidio={options?.totalNuvidioInDb || 0}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Filter Bar (Visible across reports and dashboard) */}
        {['dashboard', 'operador', 'produto'].includes(activeTab) && (
          <FilterBar
            filter={filter}
            setFilter={setFilter}
            options={options}
            onApplyFilters={fetchAllData}
            onResetFilters={handleResetFilters}
          />
        )}

        {/* Tab Content Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            productReport={productReport}
            loading={loading}
          />
        )}

        {activeTab === 'operador' && (
          <OperatorReportView
            reportData={operatorReport}
            filter={filter}
            loading={loading}
          />
        )}

        {activeTab === 'produto' && (
          <ProductReportView
            reportData={productReport}
            filter={filter}
            loading={loading}
          />
        )}

        {activeTab === 'importar' && (
          <ImportBasesView onImportSuccess={fetchAllData} />
        )}

        {activeTab === 'inconsistencias' && (
          <UnmatchedView filter={filter} />
        )}

        {activeTab === 'historico' && (
          <HistoryView options={options} onRefresh={fetchAllData} />
        )}
      </main>
    </div>
  );
}

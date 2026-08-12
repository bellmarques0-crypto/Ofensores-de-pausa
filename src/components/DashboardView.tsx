import React from 'react';
import { DashboardSummary, ProductReportRow } from '../types';
import {
  Users,
  PhoneCall,
  Clock,
  Coffee,
  Hourglass,
  Scale,
  TrendingUp,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  productReport: ProductReportRow[];
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  productReport,
  loading,
}) => {
  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-slate-500 text-sm">Carregando indicadores do dashboard...</p>
      </div>
    );
  }

  const isDiferencaPositiva = summary.diferencaTotalSec >= 0;

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Operadores */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operadores</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900">{summary.totalOperadores}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Cadastrados & analisados</p>
          </div>
        </div>

        {/* Total Nuvidios */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Qtd Nuvidios</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-700">{summary.totalNuvidios}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Chamadas registradas</p>
          </div>
        </div>

        {/* Tempo Total Nuvidio */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo Nuvidio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {summary.tempoTotalNuvidioFormatted}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Total em atendimento</p>
          </div>
        </div>

        {/* Total Pausas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Qtd Pausas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-700">{summary.totalPausas}</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Pausas tomadas</p>
          </div>
        </div>

        {/* Tempo Total Pausas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo Pausas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {summary.tempoTotalPausasFormatted}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Duração total de pausas</p>
          </div>
        </div>

        {/* Diferença Total */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diferença Total</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                isDiferencaPositiva
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span
              className={`text-2xl font-bold font-mono ${
                isDiferencaPositiva ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {summary.diferencaTotalFormatted}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Nuvidio - Pausas</p>
          </div>
        </div>
      </div>

      {/* 2. Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tempo Nuvidio vs Tempo Pausas por Produto */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                1. Tempo Nuvidio x Tempo Pausas (por Produto)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Nuvidio
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Pausas
              </span>
            </div>
          </div>

          {productReport.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">
              Nenhum registro encontrado para exibir gráfico.
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {productReport.map((prod) => {
                const maxSec = Math.max(prod.tempoNuvidioSec, prod.tempoPausasSec, 1);
                const nuvWidth = Math.min(100, Math.round((prod.tempoNuvidioSec / maxSec) * 100));
                const pauseWidth = Math.min(100, Math.round((prod.tempoPausasSec / maxSec) * 100));

                return (
                  <div key={prod.produto} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>{prod.produto}</span>
                      <span className="text-slate-500 font-normal">
                        Diferença: <strong className="text-slate-900 font-mono">{prod.diferencaFormatted}</strong>
                      </span>
                    </div>

                    {/* Nuvidio Bar */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-slate-500 shrink-0 font-mono text-[11px]">Nuvidio</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, nuvWidth)}%` }}
                        ></div>
                      </div>
                      <span className="w-20 text-right font-mono text-emerald-700 font-semibold">
                        {prod.tempoNuvidioFormatted}
                      </span>
                    </div>

                    {/* Pausas Bar */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-slate-500 shrink-0 font-mono text-[11px]">Pausas</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, pauseWidth)}%` }}
                        ></div>
                      </div>
                      <span className="w-20 text-right font-mono text-amber-700 font-semibold">
                        {prod.tempoPausasFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Quantidade Nuvidio x Quantidade Pausas por Produto */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                2. Quantidade Nuvidio x Quantidade Pausas (por Produto)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> Nuvidios
              </span>
              <span className="flex items-center gap-1.5 text-orange-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> Pausas
              </span>
            </div>
          </div>

          {productReport.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">
              Nenhum registro encontrado para exibir gráfico.
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {productReport.map((prod) => {
                const maxCount = Math.max(prod.qtdNuvidio, prod.qtdPausas, 1);
                const nuvWidth = Math.min(100, Math.round((prod.qtdNuvidio / maxCount) * 100));
                const pauseWidth = Math.min(100, Math.round((prod.qtdPausas / maxCount) * 100));

                return (
                  <div key={prod.produto} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>{prod.produto}</span>
                    </div>

                    {/* Qtd Nuvidio */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-slate-500 shrink-0 font-mono text-[11px]">Nuvidios</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, nuvWidth)}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right font-mono text-indigo-700 font-bold">
                        {prod.qtdNuvidio}
                      </span>
                    </div>

                    {/* Qtd Pausas */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-slate-500 shrink-0 font-mono text-[11px]">Pausas</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, pauseWidth)}%` }}
                        ></div>
                      </div>
                      <span className="w-12 text-right font-mono text-orange-700 font-bold">
                        {prod.qtdPausas}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Diferença Percentual por Produto */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              3. Diferença Percentual por Produto (`((Nuvidio - Pausas) / Pausas) * 100`)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {productReport.map((prod) => {
            const isPos = (prod.diferencaPercValue ?? 0) >= 0;
            return (
              <div
                key={prod.produto}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">{prod.produto}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        prod.diferencaPercValue === null
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : isPos
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      {prod.diferencaPercFormatted}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tempo Nuvidio:</span>
                      <span className="font-mono font-medium text-emerald-700">{prod.tempoNuvidioFormatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tempo Pausas:</span>
                      <span className="font-mono font-medium text-amber-700">{prod.tempoPausasFormatted}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-800">
                      <span className="text-slate-500">Diferença Tempo:</span>
                      <span className="font-mono">{prod.diferencaFormatted}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

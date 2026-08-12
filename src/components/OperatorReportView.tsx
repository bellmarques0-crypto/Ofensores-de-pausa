import React, { useState } from 'react';
import { OperatorReportRow, FilterState } from '../types';
import { Download, Search, Users, Scale } from 'lucide-react';

interface OperatorReportViewProps {
  reportData: OperatorReportRow[];
  filter: FilterState;
  loading: boolean;
}

export const OperatorReportView: React.FC<OperatorReportViewProps> = ({
  reportData,
  filter,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = reportData.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.operadorNome.toLowerCase().includes(term) ||
      r.operadorEmail.toLowerCase().includes(term) ||
      r.usuario.toLowerCase().includes(term) ||
      r.produto.toLowerCase().includes(term)
    );
  });

  // Calculate totals for footer
  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.qtdNuvidio += row.qtdNuvidio;
      acc.tempoNuvidioSec += row.tempoNuvidioSec;
      acc.qtdPausas += row.qtdPausas;
      acc.tempoPausasSec += row.tempoPausasSec;
      acc.diferencaSec += row.diferencaSec;
      return acc;
    },
    {
      qtdNuvidio: 0,
      tempoNuvidioSec: 0,
      qtdPausas: 0,
      tempoPausasSec: 0,
      diferencaSec: 0,
    }
  );

  const formatSec = (sec: number) => {
    const isNeg = sec < 0;
    const abs = Math.abs(Math.round(sec));
    const h = String(Math.floor(abs / 3600)).padStart(2, '0');
    const m = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
    const s = String(abs % 60).padStart(2, '0');
    const res = `${h}:${m}:${s}`;
    return isNeg ? `-${res}` : res;
  };

  const handleExportExcel = () => {
    const query = new URLSearchParams({
      dataInicio: filter.dataInicio,
      dataFim: filter.dataFim,
      operador: filter.operador,
      produto: filter.produto,
      usuario: filter.usuario,
    }).toString();

    window.open(`/api/export/operator?${query}`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Relatório de Produtividade por Operador</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparativo entre tempo e chamadas Nuvidio vs tempo e quantidade de pausas por operador e produto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Table */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar nesta tabela..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Calculando produtividade dos operadores...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-16 text-center px-4">
          <Scale className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-700 font-semibold text-sm">Nenhum operador encontrado.</p>
          <p className="text-xs text-slate-500 mt-1">
            Certifique-se de que importou as bases de Operadores, Pausas e Nuvidio.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4 text-center">Qtd Nuvidio</th>
                <th className="py-3 px-4 text-right">Tempo Nuvidio</th>
                <th className="py-3 px-4 text-center">Qtd Pausas</th>
                <th className="py-3 px-4 text-right">Tempo Pausas</th>
                <th className="py-3 px-4 text-right">Diferença (Nuvidio - Pausas)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
              {filteredRows.map((row, idx) => {
                const isNeg = row.diferencaSec < 0;
                return (
                  <tr key={`${row.operadorId}-${row.produto}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{row.operadorNome}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {row.produto}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {row.qtdNuvidio}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                      {row.tempoNuvidioFormatted}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {row.qtdPausas}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                      {row.tempoPausasFormatted}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs border ${
                          isNeg
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {row.diferencaFormatted}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary Footer */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td className="py-3.5 px-4" colSpan={2}>
                  TOTAL GERAL ({filteredRows.length} registros)
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-200">{totals.qtdNuvidio}</td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-300">
                  {formatSec(totals.tempoNuvidioSec)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-200">{totals.qtdPausas}</td>
                <td className="py-3.5 px-4 text-right font-mono text-amber-300">
                  {formatSec(totals.tempoPausasSec)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-blue-300">
                  {formatSec(totals.diferencaSec)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

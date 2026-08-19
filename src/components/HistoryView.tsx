import React from 'react';
import { FilterOptions } from '../types';
import { History, FileSpreadsheet } from 'lucide-react';

interface HistoryViewProps {
  options: FilterOptions | null;
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ options }) => {
  const importacoes = options?.importacoes || [];

  return (
    <div className="space-y-6">
      {/* History Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Histórico de Importações das Bases</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {importacoes.length} processos registrados
          </span>
        </div>

        {importacoes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Nenhuma importação realizada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Base</th>
                  <th className="py-3 px-4">Arquivo</th>
                  <th className="py-3 px-4 text-center">Registros Importados</th>
                  <th className="py-3 px-4 text-center">Modo</th>
                  <th className="py-3 px-4 text-right">Data & Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                {importacoes.map((imp) => (
                  <tr key={imp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                        {imp.tipo_base}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                      {imp.nome_arquivo}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 font-mono">
                      +{imp.quantidade_registros}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          imp.modo === 'substituir'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {imp.modo || 'substituir'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      {new Date(imp.data_importacao).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

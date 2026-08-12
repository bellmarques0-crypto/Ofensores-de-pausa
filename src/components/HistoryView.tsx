import React, { useState } from 'react';
import { FilterOptions } from '../types';
import { History, Database, Trash2, RotateCcw, FileSpreadsheet } from 'lucide-react';

interface HistoryViewProps {
  options: FilterOptions | null;
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ options, onRefresh }) => {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleReset = async (mode: 'seed' | 'empty') => {
    const confirmText =
      mode === 'empty'
        ? 'Tem certeza de que deseja ZERAR todo o banco de dados?'
        : 'Restaurar os dados de exemplo padrão?';

    if (!window.confirm(confirmText)) return;

    setResetting(true);
    setMsg(null);

    try {
      const res = await fetch('/api/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const importacoes = options?.importacoes || [];

  return (
    <div className="space-y-6">
      {/* DB Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Gerenciamento do Banco de Dados Persistente
            </h2>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
            Salvo no Servidor (Disk DB)
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          Todas as alterações e importações ficam armazenadas no banco de dados do servidor Node.js.
          Se você acessar a aplicação de outro computador ou navegador, os dados já importados estarão preservados!
        </p>

        {msg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
            {msg}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleReset('seed')}
            disabled={resetting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
            Restaurar Dados de Exemplo
          </button>

          <button
            onClick={() => handleReset('empty')}
            disabled={resetting}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Zerar Banco de Dados
          </button>
        </div>
      </div>

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

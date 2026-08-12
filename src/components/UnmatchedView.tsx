import React, { useEffect, useState } from 'react';
import { AlertTriangle, UserX, PhoneOff, RefreshCw } from 'lucide-react';
import { FilterState } from '../types';

interface UnmatchedViewProps {
  filter: FilterState;
}

export const UnmatchedView: React.FC<UnmatchedViewProps> = ({ filter }) => {
  const [data, setData] = useState<{ nuvidiosSemOperador: any[]; pausasSemOperador: any[] }>({
    nuvidiosSemOperador: [],
    pausasSemOperador: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchUnmatched = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        dataInicio: filter.dataInicio,
        dataFim: filter.dataFim,
      }).toString();

      const res = await fetch(`/api/reports/unmatched?${query}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching unmatched records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmatched();
  }, [filter.dataInicio, filter.dataFim]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-amber-500 text-white rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-100" />
            Inconsistências & Cadastros Não Localizados
          </h2>
          <p className="text-xs text-amber-100 mt-1 max-w-3xl">
            Registros de Pausas ou Nuvidios cujos e-mails ou usuários não foram encontrados na Base de Operadores.
            Utilize esta lista para corrigir o cadastro de e-mails/usuários.
          </p>
        </div>
        <button
          onClick={fetchUnmatched}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar Diagnóstico
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Buscando divergências de cadastro...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Nuvidios sem operador localizado */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneOff className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Nuvidios sem Operador Localizado ({data.nuvidiosSemOperador.length})
                  </h3>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  E-mail não cadastrado
                </span>
              </div>

              {data.nuvidiosSemOperador.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-700 font-semibold bg-emerald-50/30">
                  🎉 Nenhum registro órfão no Nuvidio! Todos os e-mails conferem com a base de operadores.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {data.nuvidiosSemOperador.map((item, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-50 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 font-mono">{item.email_atendente}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Entrada: {item.entrada} | Saída: {item.saida}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        {(item.tempo_segundos / 60).toFixed(1)}m
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Pausas sem operador localizado */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Pausas sem Operador Localizado ({data.pausasSemOperador.length})
                  </h3>
                </div>
                <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
                  Usuário não cadastrado
                </span>
              </div>

              {data.pausasSemOperador.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-700 font-semibold bg-emerald-50/30">
                  🎉 Nenhuma pausa órfã! Todos os logins conferem com a base de operadores.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {data.pausasSemOperador.map((item, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-50 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 font-mono">@{item.usuario}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {item.data} • {item.pausa} ({item.produto})
                        </div>
                      </div>
                      <div className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-200">
                        {item.tempo}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

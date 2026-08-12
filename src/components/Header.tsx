import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  UploadCloud,
  AlertTriangle,
  History,
  Database,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalOperadores: number;
  totalPausas: number;
  totalNuvidio: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalOperadores,
  totalPausas,
  totalNuvidio,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'operador', label: 'Relatório por Operador', icon: Users },
    { id: 'produto', label: 'Relatório por Produto', icon: Package },
    { id: 'importar', label: 'Importar Bases', icon: UploadCloud },
    { id: 'inconsistencias', label: 'Inconsistências', icon: AlertTriangle },
    { id: 'historico', label: 'Histórico & DB', icon: History },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
              AP
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Análise de Produtividade
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Cruzamento de Operadores • Pausas • Nuvidio
              </p>
            </div>
          </div>

          {/* Database Status Pill */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Banco de Dados Persistente:</span>
            <span>{totalOperadores} Operadores</span>
            <span>•</span>
            <span>{totalPausas} Pausas</span>
            <span>•</span>
            <span>{totalNuvidio} Nuvidios</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

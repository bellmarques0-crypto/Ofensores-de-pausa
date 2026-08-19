import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  UploadCloud,
  Globe,
  AlertTriangle,
  History,
  Settings,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalOperadores?: number;
  totalPausas?: number;
  totalNuvidio?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const adminTabs = [
    { id: 'importar', label: 'Importar Planilhas', icon: UploadCloud },
    { id: 'api', label: 'API Usuários', icon: Globe },
    { id: 'inconsistencias', label: 'Inconsistências', icon: AlertTriangle },
    { id: 'historico', label: 'Histórico & DB', icon: History },
  ];

  const isAdminActive = adminTabs.some((t) => t.id === activeTab);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'operador', label: 'Relatório por Operador', icon: Users },
    { id: 'produto', label: 'Relatório por Produto', icon: Package },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs overflow-hidden p-1">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Logo Ofensores de Pausa"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-bold text-blue-600 text-base">OP</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Ofensores de Pausa
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Pausa Rosa • Nuvidio
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setAdminDropdownOpen(false);
                }}
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

          {/* Administrar Dropdown Button */}
          <div className="relative inline-block text-left" ref={dropdownRef}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (!isAdminActive) {
                    setActiveTab('importar');
                  }
                  setAdminDropdownOpen(!adminDropdownOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isAdminActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className={`w-4 h-4 ${isAdminActive ? 'text-white' : 'text-slate-500'}`} />
                <span>Administrar</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    adminDropdownOpen ? 'rotate-180' : ''
                  } ${isAdminActive ? 'text-white' : 'text-slate-400'}`}
                />
              </button>
            </div>

            {/* Dropdown Menu */}
            {adminDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Módulos de Administração
                </div>
                {adminTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isCurrent = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setAdminDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors text-left cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Sub-bar for Admin Navigation (When inside any Administrar view) */}
      {isAdminActive && (
        <div className="bg-slate-50/80 border-t border-slate-200/80 py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { FilterState, FilterOptions } from '../types';
import { Calendar, User, Package, UserCheck, RotateCcw, Search, ChevronDown, X } from 'lucide-react';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  options: FilterOptions | null;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

interface CustomComboboxProps {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  items: { label: string; value: string; sublabel?: string }[];
}

const CustomCombobox: React.FC<CustomComboboxProps> = ({
  icon,
  label,
  placeholder,
  value,
  onChange,
  items,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTerm = value.toLowerCase().trim();
  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(searchTerm) ||
      item.value.toLowerCase().includes(searchTerm) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(searchTerm))
  ).slice(0, 30); // limit to top 30 items

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full text-xs border border-slate-300 rounded-lg pl-3 pr-7 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
          />
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs">
          {filtered.map((item, idx) => (
            <button
              key={`${item.value}-${idx}`}
              type="button"
              onClick={() => {
                onChange(item.label);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
            >
              <span className="font-medium truncate">{item.label}</span>
              {item.sublabel && (
                <span className="text-[10px] text-slate-400 ml-2 shrink-0">{item.sublabel}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  setFilter,
  options,
  onApplyFilters,
  onResetFilters,
}) => {
  const handleChange = (field: keyof FilterState, value: string) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
  };

  const operadorItems =
    options?.operadores.map((op) => ({
      label: op.nome,
      value: op.nome,
      sublabel: op.usuario || op.email,
    })) || [];

  const usuarioItems =
    options?.usuarios.map((u) => ({
      label: u,
      value: u,
    })) || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Search className="w-4 h-4 text-blue-600" />
          Filtros de Análise
        </div>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpar Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Data Inicial */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Data Inicial
          </label>
          <input
            type="date"
            value={filter.dataInicio}
            onChange={(e) => handleChange('dataInicio', e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
          />
        </div>

        {/* Data Final */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Data Final
          </label>
          <input
            type="date"
            value={filter.dataFim}
            onChange={(e) => handleChange('dataFim', e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
          />
        </div>

        {/* Operador */}
        <CustomCombobox
          icon={<User className="w-3.5 h-3.5 text-slate-400" />}
          label="Operador"
          placeholder="Nome do operador..."
          value={filter.operador}
          onChange={(val) => handleChange('operador', val)}
          items={operadorItems}
        />

        {/* Produto */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            Produto
          </label>
          <select
            value={filter.produto}
            onChange={(e) => handleChange('produto', e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
          >
            <option value="">Todos os Produtos</option>
            {options?.produtos.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>
        </div>

        {/* Usuário */}
        <CustomCombobox
          icon={<UserCheck className="w-3.5 h-3.5 text-slate-400" />}
          label="Usuário"
          placeholder="Login do usuário..."
          value={filter.usuario}
          onChange={(val) => handleChange('usuario', val)}
          items={usuarioItems}
        />
      </div>
    </div>
  );
};


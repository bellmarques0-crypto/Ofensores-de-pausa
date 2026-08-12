export interface FilterState {
  dataInicio: string;
  dataFim: string;
  operador: string;
  produto: string;
  usuario: string;
}

export interface OperatorReportRow {
  operadorId: string;
  operadorNome: string;
  operadorEmail: string;
  usuario: string;
  produto: string;
  qtdNuvidio: number;
  tempoNuvidioSec: number;
  tempoNuvidioFormatted: string;
  qtdPausas: number;
  tempoPausasSec: number;
  tempoPausasFormatted: string;
  diferencaSec: number;
  diferencaFormatted: string;
}

export interface ProductReportRow {
  produto: string;
  qtdNuvidio: number;
  tempoNuvidioSec: number;
  tempoNuvidioFormatted: string;
  qtdPausas: number;
  tempoPausasSec: number;
  tempoPausasFormatted: string;
  diferencaSec: number;
  diferencaFormatted: string;
  diferencaPercFormatted: string;
  diferencaPercValue: number | null;
}

export interface DashboardSummary {
  totalOperadores: number;
  totalNuvidios: number;
  tempoTotalNuvidioSec: number;
  tempoTotalNuvidioFormatted: string;
  totalPausas: number;
  tempoTotalPausasSec: number;
  tempoTotalPausasFormatted: string;
  diferencaTotalSec: number;
  diferencaTotalFormatted: string;
}

export interface FilterOptions {
  operadores: { id: string; nome: string; email: string; usuario: string }[];
  produtos: string[];
  usuarios: string[];
  totalOperadoresInDb: number;
  totalPausasInDb: number;
  totalNuvidioInDb: number;
  importacoes: any[];
}

export interface PreviewData {
  valid: boolean;
  tipoBase: 'operadores' | 'pausas' | 'nuvidio';
  fileName: string;
  totalRows: number;
  columnsFound: string[];
  missingColumns: string[];
  mappedColumns: Record<string, string>;
  sampleRows: any[];
}

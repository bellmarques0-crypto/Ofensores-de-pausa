export interface FilterState {
  dataInicio: string;
  dataFim: string;
  operador: string;
  produto: string;
  usuario: string;
  supervisor: string;
}

export interface OperatorReportRow {
  operadorId: string;
  operadorNome: string;
  operadorEmail: string;
  usuario: string;
  produto: string;
  supervisor: string;
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
  operadores: { id: string; nome: string; email: string; usuario: string; supervisor?: string }[];
  produtos: string[];
  usuarios: string[];
  supervisores: string[];
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

export interface ApiIntegracaoUsuarios {
  enabled: boolean;
  url: string;
  metodo: 'GET' | 'POST';
  auth_tipo: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_token?: string;
  api_key_header?: string;
  api_key_valor?: string;
  basic_user?: string;
  basic_pass?: string;
  custom_headers?: Record<string, string>;
  request_body?: string;
  json_path?: string;
  mapeamento: {
    nome: string;
    usuario: string;
    email?: string;
    produto?: string;
    supervisor?: string;
  };
  modo_padrao: 'substituir' | 'adicionar';
  ultima_sincronizacao?: string;
  ultimo_status?: 'sucesso' | 'erro' | 'nunca';
  ultimo_total_importados?: number;
  ultimo_erro_msg?: string;
}

export interface ApiTestResult {
  success: boolean;
  status: number;
  statusText: string;
  elapsedMs: number;
  totalFound: number;
  pathUsed: string;
  detectedFields: string[];
  suggestedMapping: {
    nome: string;
    usuario: string;
    email?: string;
    produto?: string;
    supervisor?: string;
  };
  sampleRecords: any[];
  error?: string;
}

export interface ApiSyncResult {
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  totalFound: number;
  totalOperadoresAtuais: number;
  mode: string;
  pathUsed: string;
  timestamp: string;
  elapsedMs: number;
  error?: string;
}

export interface SqlIntegracaoPausas {
  enabled: boolean;
  modo_execucao: 'sqlserver' | 'postgres' | 'mysql' | 'rest_api' | 'direct_paste';
  url?: string;
  metodo?: 'GET' | 'POST';
  auth_tipo?: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_token?: string;
  api_key_header?: string;
  api_key_valor?: string;
  basic_user?: string;
  basic_pass?: string;
  custom_headers?: Record<string, string>;
  json_path?: string;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  db_ssl?: boolean;
  sql_query: string;
  mapeamento: {
    data: string;
    intergrall: string;
    pausa: string;
    inicio: string;
    fim: string;
    tempo?: string;
    produto?: string;
  };
  modo_padrao: 'substituir' | 'adicionar';
  ultima_sincronizacao?: string;
  ultimo_status?: 'sucesso' | 'erro' | 'nunca';
  ultimo_total_importados?: number;
  ultimo_erro_msg?: string;
}

export interface SqlTestResult {
  success: boolean;
  status?: number;
  elapsedMs: number;
  totalFound: number;
  pathUsed?: string;
  detectedColumns: string[];
  suggestedMapping: {
    data: string;
    intergrall: string;
    pausa: string;
    inicio: string;
    fim: string;
    tempo?: string;
    produto?: string;
  };
  sampleRecords: any[];
  error?: string;
}

export interface SqlSyncResult {
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  totalFound: number;
  totalPausasAtuais: number;
  mode: string;
  timestamp: string;
  elapsedMs: number;
  error?: string;
}



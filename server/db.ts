import fs from 'fs';
import path from 'path';
import { calculatePauseDurationSeconds, formatSecondsToHHMMSS, parseDateToISO } from './utils';

export interface Operador {
  id: string;
  nome: string;
  email: string; // normalized lowercase trimmed
  usuario: string; // normalized lowercase trimmed
  produto?: string; // optional product from base de operadores
  supervisor?: string; // optional supervisor from base de operadores
  created_at: string;
  updated_at: string;
  fingerprint: string;
}

export interface Pausa {
  id: string;
  data: string; // original format e.g. 11/08/2026
  data_iso: string; // YYYY-MM-DD
  usuario: string; // normalized lowercase trimmed
  pausa: string;
  inicio: string;
  fim: string;
  tempo: string; // original string e.g. 00:05:30
  tempo_segundos: number;
  produto: string;
  created_at: string;
  fingerprint: string;
}

export interface Nuvidio {
  id: string;
  email_atendente: string; // normalized lowercase trimmed
  entrada: string; // e.g. 11/08/2026 19:56
  saida: string; // e.g. 11/08/2026 19:58
  data_iso: string; // YYYY-MM-DD derived from entrada
  tempo_segundos: number;
  created_at: string;
  fingerprint: string;
}

export interface Importacao {
  id: string;
  tipo_base: 'operadores' | 'pausas' | 'nuvidio';
  nome_arquivo: string;
  quantidade_registros: number;
  data_importacao: string;
  status: 'sucesso' | 'erro' | 'parcial';
  modo: 'substituir' | 'adicionar';
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

export interface SqlIntegracaoPausas {
  enabled: boolean;
  modo_execucao: 'sqlserver' | 'rest_api' | 'postgres' | 'mysql' | 'direct_paste';
  // For REST API / Web SQL Gateway
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
  // For Direct Database connection
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  db_ssl?: boolean;
  // SQL Query Text
  sql_query: string;
  // Mappings
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

export interface DatabaseSchema {
  operadores: Operador[];
  pausas: Pausa[];
  nuvidio: Nuvidio[];
  importacoes: Importacao[];
  api_integracao_usuarios?: ApiIntegracaoUsuarios;
  sql_integracao_pausas?: SqlIntegracaoPausas;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'productivity_db.json');

// Memory cache of DB for fast queries
let dbState: DatabaseSchema = {
  operadores: [],
  pausas: [],
  nuvidio: [],
  importacoes: [],
};

function ensureDbDirectoryExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * Loads the database from persistent disk file
 */
export function loadDatabase(): DatabaseSchema {
  try {
    ensureDbDirectoryExists();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      dbState = {
        operadores: Array.isArray(parsed.operadores) ? parsed.operadores : [],
        pausas: Array.isArray(parsed.pausas) ? parsed.pausas : [],
        nuvidio: Array.isArray(parsed.nuvidio) ? parsed.nuvidio : [],
        importacoes: Array.isArray(parsed.importacoes) ? parsed.importacoes : [],
        api_integracao_usuarios: parsed.api_integracao_usuarios || undefined,
        sql_integracao_pausas: parsed.sql_integracao_pausas || undefined,
      };
      sanitizeDatabasePausas();
    } else {
      // Initialize empty DB or with sample data
      dbState = {
        operadores: [],
        pausas: [],
        nuvidio: [],
        importacoes: [],
      };
      saveDatabase();
      seedSampleDataIfEmpty();
    }
  } catch (error) {
    console.error('Error loading database file:', error);
  }
  return dbState;
}

function sanitizeDatabasePausas() {
  let modified = false;
  dbState.pausas.forEach((p) => {
    if (p.tempo_segundos > 86400 || (p.tempo && p.tempo.length > 8)) {
      const sanitizedSec = calculatePauseDurationSeconds(p.inicio, p.fim, p.tempo_segundos);
      p.tempo_segundos = sanitizedSec;
      p.tempo = formatSecondsToHHMMSS(sanitizedSec);
      modified = true;
    }
    const computedIso = parseDateToISO(p.data) || parseDateToISO(p.inicio) || parseDateToISO(p.data_iso);
    if (computedIso && p.data_iso !== computedIso) {
      p.data_iso = computedIso;
      modified = true;
    }
  });

  dbState.nuvidio.forEach((n) => {
    const computedIso = parseDateToISO(n.entrada) || parseDateToISO(n.data_iso);
    if (computedIso && n.data_iso !== computedIso) {
      n.data_iso = computedIso;
      modified = true;
    }
  });

  if (modified) {
    saveDatabase();
  }
}

/**
 * Atomic save to disk file
 */
export function saveDatabase() {
  try {
    ensureDbDirectoryExists();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error saving database to file:', error);
  }
}

/**
 * Returns current DB state
 */
export function getDb(): DatabaseSchema {
  return dbState;
}

/**
 * Seeds sample initial data so system has instant previewable data
 */
export function seedSampleDataIfEmpty() {
  // Empty implementation - no mock data
}

// Initialize DB on module import
loadDatabase();

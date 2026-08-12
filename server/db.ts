import fs from 'fs';
import path from 'path';
import { calculatePauseDurationSeconds, formatSecondsToHHMMSS } from './utils';

export interface Operador {
  id: string;
  nome: string;
  email: string; // normalized lowercase trimmed
  usuario: string; // normalized lowercase trimmed
  produto?: string; // optional product from base de operadores
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

export interface DatabaseSchema {
  operadores: Operador[];
  pausas: Pausa[];
  nuvidio: Nuvidio[];
  importacoes: Importacao[];
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
  if (dbState.operadores.length > 0 || dbState.pausas.length > 0 || dbState.nuvidio.length > 0) {
    return;
  }

  const now = new Date().toISOString();

  // Sample Operadores
  const sampleOperadores: Operador[] = [
    {
      id: 'op-1',
      nome: 'Tainá Martins',
      email: 'taina.martins@proativacontactcenter.com.br',
      usuario: 'taina.martins',
      created_at: now,
      updated_at: now,
      fingerprint: 'taina.martins@proativacontactcenter.com.br||taina.martins',
    },
    {
      id: 'op-2',
      nome: 'Maria Silva',
      email: 'maria.silva@proativacontactcenter.com.br',
      usuario: 'maria.silva',
      created_at: now,
      updated_at: now,
      fingerprint: 'maria.silva@proativacontactcenter.com.br||maria.silva',
    },
    {
      id: 'op-3',
      nome: 'João Santos',
      email: 'joao.santos@proativacontactcenter.com.br',
      usuario: 'joao.santos',
      created_at: now,
      updated_at: now,
      fingerprint: 'joao.santos@proativacontactcenter.com.br||joao.santos',
    },
    {
      id: 'op-4',
      nome: 'Ana Oliveira',
      email: 'ana.oliveira@proativacontactcenter.com.br',
      usuario: 'ana.oliveira',
      created_at: now,
      updated_at: now,
      fingerprint: 'ana.oliveira@proativacontactcenter.com.br||ana.oliveira',
    },
  ];

  // Sample Pausas
  const samplePausas: Pausa[] = [
    {
      id: 'p-1',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'taina.martins',
      pausa: 'Lanche',
      inicio: '10:00:00',
      fim: '10:15:00',
      tempo: '00:15:00',
      tempo_segundos: 900,
      produto: 'PINE',
      created_at: now,
      fingerprint: '2026-08-11||taina.martins||10:00:00||10:15:00||lanche',
    },
    {
      id: 'p-2',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'taina.martins',
      pausa: 'Almoço',
      inicio: '12:30:00',
      fim: '13:30:00',
      tempo: '01:00:00',
      tempo_segundos: 3600,
      produto: 'PINE',
      created_at: now,
      fingerprint: '2026-08-11||taina.martins||12:30:00||13:30:00||almoço',
    },
    {
      id: 'p-3',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'maria.silva',
      pausa: 'Lanche',
      inicio: '09:30:00',
      fim: '09:45:00',
      tempo: '00:15:00',
      tempo_segundos: 900,
      produto: 'PINE',
      created_at: now,
      fingerprint: '2026-08-11||maria.silva||09:30:00||09:45:00||lanche',
    },
    {
      id: 'p-4',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'maria.silva',
      pausa: 'Treinamento',
      inicio: '14:00:00',
      fim: '15:00:00',
      tempo: '01:00:00',
      tempo_segundos: 3600,
      produto: 'PINE',
      created_at: now,
      fingerprint: '2026-08-11||maria.silva||14:00:00||15:00:00||treinamento',
    },
    {
      id: 'p-5',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'joao.santos',
      pausa: 'Lanche',
      inicio: '15:00:00',
      fim: '15:20:00',
      tempo: '00:20:00',
      tempo_segundos: 1200,
      produto: 'CEDRO',
      created_at: now,
      fingerprint: '2026-08-11||joao.santos||15:00:00||15:20:00||lanche',
    },
    // Pausa sem operador para teste de inconsistências
    {
      id: 'p-6',
      data: '11/08/2026',
      data_iso: '2026-08-11',
      usuario: 'usuario.desconhecido',
      pausa: 'Feedback',
      inicio: '11:00:00',
      fim: '11:30:00',
      tempo: '00:30:00',
      tempo_segundos: 1800,
      produto: 'CEDRO',
      created_at: now,
      fingerprint: '2026-08-11||usuario.desconhecido||11:00:00||11:30:00||feedback',
    },
  ];

  // Sample Nuvidio
  const sampleNuvidio: Nuvidio[] = [
    // Tainá Martins: 19:56 to 19:58 (00:02:00) + another 02:45:00 call
    {
      id: 'n-1',
      email_atendente: 'taina.martins@proativacontactcenter.com.br',
      entrada: '11/08/2026 19:56',
      saida: '11/08/2026 19:58',
      data_iso: '2026-08-11',
      tempo_segundos: 120, // 2 mins
      created_at: now,
      fingerprint: 'taina.martins@proativacontactcenter.com.br||11/08/2026 19:56||11/08/2026 19:58',
    },
    {
      id: 'n-2',
      email_atendente: 'taina.martins@proativacontactcenter.com.br',
      entrada: '11/08/2026 08:00',
      saida: '11/08/2026 11:30',
      data_iso: '2026-08-11',
      tempo_segundos: 12600, // 3h 30m
      created_at: now,
      fingerprint: 'taina.martins@proativacontactcenter.com.br||11/08/2026 08:00||11/08/2026 11:30',
    },
    // Maria Silva: 15 calls totaling 02:35:20 (9320s)
    {
      id: 'n-3',
      email_atendente: 'maria.silva@proativacontactcenter.com.br',
      entrada: '11/08/2026 08:30',
      saida: '11/08/2026 11:05:20',
      data_iso: '2026-08-11',
      tempo_segundos: 9320,
      created_at: now,
      fingerprint: 'maria.silva@proativacontactcenter.com.br||11/08/2026 08:30||11/08/2026 11:05:20',
    },
    // João Santos: 04:00:00 (14400s)
    {
      id: 'n-4',
      email_atendente: 'joao.santos@proativacontactcenter.com.br',
      entrada: '11/08/2026 09:00',
      saida: '11/08/2026 13:00',
      data_iso: '2026-08-11',
      tempo_segundos: 14400,
      created_at: now,
      fingerprint: 'joao.santos@proativacontactcenter.com.br||11/08/2026 09:00||11/08/2026 13:00',
    },
    // Nuvidio sem operador para teste de inconsistências
    {
      id: 'n-5',
      email_atendente: 'atendente.orfao@proativacontactcenter.com.br',
      entrada: '11/08/2026 14:00',
      saida: '11/08/2026 14:35',
      data_iso: '2026-08-11',
      tempo_segundos: 2100,
      created_at: now,
      fingerprint: 'atendente.orfao@proativacontactcenter.com.br||11/08/2026 14:00||11/08/2026 14:35',
    },
  ];

  const sampleImportacoes: Importacao[] = [
    {
      id: 'imp-1',
      tipo_base: 'operadores',
      nome_arquivo: 'base_operadores_exemplo.xlsx',
      quantidade_registros: 4,
      data_importacao: now,
      status: 'sucesso',
      modo: 'substituir',
    },
    {
      id: 'imp-2',
      tipo_base: 'pausas',
      nome_arquivo: 'base_pausas_exemplo.xlsx',
      quantidade_registros: 6,
      data_importacao: now,
      status: 'sucesso',
      modo: 'substituir',
    },
    {
      id: 'imp-3',
      tipo_base: 'nuvidio',
      nome_arquivo: 'base_nuvidio_exemplo.csv',
      quantidade_registros: 5,
      data_importacao: now,
      status: 'sucesso',
      modo: 'substituir',
    },
  ];

  dbState.operadores = sampleOperadores;
  dbState.pausas = samplePausas;
  dbState.nuvidio = sampleNuvidio;
  dbState.importacoes = sampleImportacoes;

  saveDatabase();
}

// Initialize DB on module import
loadDatabase();

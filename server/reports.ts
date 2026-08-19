import { getDb, Operador, Pausa, Nuvidio } from './db';
import {
  formatSecondsToHHMMSS,
  parseDateToISO,
  normalizeUsername,
  normalizeEmail,
  matchUserOrNumericSuffix,
  cleanSearchString,
} from './utils';

export interface ReportFilter {
  dataInicio?: string;
  dataFim?: string;
  operador?: string;
  produto?: string;
  usuario?: string;
  supervisor?: string;
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
  diferencaPercFormatted: string; // e.g. "+14.50%" or "N/A"
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

export interface UnmatchedReport {
  nuvidiosSemOperador: Nuvidio[];
  pausasSemOperador: Pausa[];
}

/**
 * Normalizes filter date to ISO format YYYY-MM-DD
 */
function toIsoDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  return parseDateToISO(dateStr);
}

/**
 * High-Performance Indexed Lookup Engine for Operators
 */
export class OperatorLookupIndex {
  private byEmail = new Map<string, Operador>();
  private byEmailPrefix = new Map<string, Operador>();
  private byUser = new Map<string, Operador>();
  private byUserNumeric = new Map<string, Operador>();
  private byCleanName = new Map<string, Operador>();
  private allOps: Operador[];
  private memo = new Map<string, Operador | null>();

  constructor(operadores: Operador[]) {
    this.allOps = operadores;
    for (const op of operadores) {
      if (op.email) {
        const cleanE = normalizeEmail(op.email);
        if (cleanE) {
          this.byEmail.set(cleanE, op);
          const prefix = cleanE.split('@')[0];
          if (prefix && !this.byEmailPrefix.has(prefix)) {
            this.byEmailPrefix.set(prefix, op);
          }
        }
      }
      if (op.usuario) {
        const cleanU = normalizeUsername(op.usuario);
        if (cleanU) {
          this.byUser.set(cleanU, op);
          const digits = cleanU.replace(/\D/g, '');
          if (digits && digits.length >= 2 && !this.byUserNumeric.has(digits)) {
            this.byUserNumeric.set(digits, op);
          }
        }
      }
      if (op.nome) {
        const cleanN = cleanSearchString(op.nome);
        if (cleanN && !this.byCleanName.has(cleanN)) {
          this.byCleanName.set(cleanN, op);
        }
      }
    }
  }

  public find(identifier?: string): Operador | null {
    if (!identifier) return null;
    const raw = String(identifier).trim();
    if (!raw) return null;

    if (this.memo.has(raw)) {
      return this.memo.get(raw) || null;
    }

    const cleanE = normalizeEmail(raw);
    if (cleanE && this.byEmail.has(cleanE)) {
      const res = this.byEmail.get(cleanE)!;
      this.memo.set(raw, res);
      return res;
    }

    const cleanU = normalizeUsername(raw);
    if (cleanU && this.byUser.has(cleanU)) {
      const res = this.byUser.get(cleanU)!;
      this.memo.set(raw, res);
      return res;
    }

    const rawPrefix = (cleanE ? cleanE.split('@')[0] : (raw.includes('@') ? raw.split('@')[0] : raw)).trim().toLowerCase();
    if (rawPrefix) {
      if (this.byUser.has(rawPrefix)) {
        const res = this.byUser.get(rawPrefix)!;
        this.memo.set(raw, res);
        return res;
      }
      if (this.byEmailPrefix.has(rawPrefix)) {
        const res = this.byEmailPrefix.get(rawPrefix)!;
        this.memo.set(raw, res);
        return res;
      }
    }

    const cleanN = cleanSearchString(raw);
    if (cleanN && this.byCleanName.has(cleanN)) {
      const res = this.byCleanName.get(cleanN)!;
      this.memo.set(raw, res);
      return res;
    }

    // Numeric match
    const digits = cleanU ? cleanU.replace(/\D/g, '') : raw.replace(/\D/g, '');
    if (digits && digits.length >= 2 && this.byUserNumeric.has(digits)) {
      const res = this.byUserNumeric.get(digits)!;
      this.memo.set(raw, res);
      return res;
    }

    // Fast fuzzy fallback
    const matched = findOperatorForIdentifierSlow(raw, this.allOps);
    this.memo.set(raw, matched);
    return matched;
  }
}

/**
 * Fallback fuzzy matcher (cached through OperatorLookupIndex)
 */
function findOperatorForIdentifierSlow(
  rawId: string,
  operadores: Operador[]
): Operador | null {
  const cleanPrefixText = cleanSearchString(rawId.includes('@') ? rawId.split('@')[0] : rawId);
  const STOP_WORDS = new Set(['com', 'br', 'de', 'da', 'dos', 'do', 'del', 'e', 'proativacontactcenter', 'gmail', 'hotmail', 'outlook']);
  const idTokens = cleanPrefixText.split(' ').filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  for (const op of operadores) {
    const opEmail = normalizeEmail(op.email);
    const opUser = normalizeUsername(op.usuario);
    const opName = (op.nome || '').trim().toLowerCase();

    if (
      matchUserOrNumericSuffix(rawId, opUser) ||
      matchUserOrNumericSuffix(rawId, opEmail) ||
      matchUserOrNumericSuffix(rawId, opName)
    ) {
      return op;
    }
  }

  // Token Overlap
  if (idTokens.length >= 2) {
    for (const op of operadores) {
      const opNameTokens = new Set(cleanSearchString(op.nome).split(' '));
      const opEmailTokens = new Set(cleanSearchString((op.email || '').split('@')[0]).split(' '));
      if (idTokens.every((t) => opNameTokens.has(t)) || idTokens.every((t) => opEmailTokens.has(t))) {
        return op;
      }
    }
  }

  return null;
}

export function findOperatorForIdentifier(
  identifier: string,
  operadores: Operador[]
): Operador | null {
  const idx = new OperatorLookupIndex(operadores);
  return idx.find(identifier);
}

/**
 * Builds unified operators list (including synthetic ones from pausas/nuvidio if not present)
 */
export function getUnifiedOperatorsIndex() {
  const db = getDb();
  const baseOps = [...db.operadores];
  const initialIndex = new OperatorLookupIndex(baseOps);

  const synthMap = new Map<string, Operador>();

  // Discover operators from Pausas
  for (const p of db.pausas) {
    if (!p.usuario) continue;
    const found = initialIndex.find(p.usuario);
    if (!found) {
      const u = normalizeUsername(p.usuario);
      if (u && !synthMap.has(u)) {
        synthMap.set(u, {
          id: `op-synth-${u}`,
          nome: p.usuario.toUpperCase(),
          email: `${u}@proativacontactcenter.com.br`,
          usuario: u,
          produto: p.produto && p.produto !== 'Sem Produto' ? p.produto : undefined,
          supervisor: 'Não Informado',
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.created_at || new Date().toISOString(),
          fingerprint: `synth||${u}`,
        });
      }
    }
  }

  // Discover operators from Nuvidio
  for (const n of db.nuvidio) {
    if (!n.email_atendente) continue;
    const found = initialIndex.find(n.email_atendente);
    if (!found) {
      const raw = n.email_atendente.toLowerCase();
      const prefix = raw.includes('@') ? raw.split('@')[0] : raw;
      if (prefix && !synthMap.has(prefix) && !synthMap.has(raw)) {
        synthMap.set(prefix, {
          id: `op-synth-${prefix}`,
          nome: prefix.replace(/\./g, ' ').toUpperCase(),
          email: raw.includes('@') ? raw : `${raw}@proativacontactcenter.com.br`,
          usuario: prefix,
          produto: undefined,
          supervisor: 'Não Informado',
          created_at: n.created_at || new Date().toISOString(),
          updated_at: n.created_at || new Date().toISOString(),
          fingerprint: `synth||${raw}`,
        });
      }
    }
  }

  const allOperators = [...baseOps, ...Array.from(synthMap.values())];
  const fullIndex = new OperatorLookupIndex(allOperators);

  return { allOperators, fullIndex };
}

/**
 * Filter Helper
 */
export function filterRecords(dbFilter: ReportFilter) {
  const db = getDb();
  const { allOperators, fullIndex } = getUnifiedOperatorsIndex();

  const isoStart = toIsoDate(dbFilter.dataInicio);
  const isoEnd = toIsoDate(dbFilter.dataFim);

  const opSearch = (dbFilter.operador || '').trim().toLowerCase();
  const prodSearch = (dbFilter.produto || '').trim().toLowerCase();
  const userSearch = (dbFilter.usuario || '').trim().toLowerCase();
  const normUserSearch = normalizeUsername(dbFilter.usuario);
  const supSearch = (dbFilter.supervisor || '').trim().toLowerCase();

  // Filter Operadores
  const filteredOperadores = allOperators.filter((op) => {
    if (userSearch) {
      const normOpUser = normalizeUsername(op.usuario);
      const matchNorm = normUserSearch && matchUserOrNumericSuffix(normOpUser, normUserSearch);
      const matchInc = op.usuario.toLowerCase().includes(userSearch);
      if (!matchNorm && !matchInc) return false;
    }
    if (supSearch && (op.supervisor || 'Não Informado').toLowerCase() !== supSearch) return false;
    if (opSearch) {
      const matchName = op.nome.toLowerCase().includes(opSearch);
      const matchEmail = op.email.toLowerCase().includes(opSearch);
      const matchUser = op.usuario.toLowerCase().includes(opSearch) || matchUserOrNumericSuffix(op.usuario, opSearch);
      const matchSup = (op.supervisor || '').toLowerCase().includes(opSearch);
      if (!matchName && !matchEmail && !matchUser && !matchSup) return false;
    }
    return true;
  });

  // Filter Pausas
  const filteredPausas = db.pausas.filter((p) => {
    const pDateIso = p.data_iso || parseDateToISO(p.data) || parseDateToISO(p.inicio);
    if (isoStart && (!pDateIso || pDateIso < isoStart)) return false;
    if (isoEnd && (!pDateIso || pDateIso > isoEnd)) return false;

    if (prodSearch) {
      const pProd = (p.produto || '').trim().toLowerCase();
      const normProdSearch = prodSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normPProd = pProd.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const matchExact = pProd === prodSearch || normPProd === normProdSearch;
      const matchContains = pProd.includes(prodSearch) || prodSearch.includes(pProd) || normPProd.includes(normProdSearch) || normProdSearch.includes(normPProd);

      const pBase = normPProd.split(/[-_\s]/)[0];
      const searchBase = normProdSearch.split(/[-_\s]/)[0];
      const matchBase = (pBase.length >= 3 && searchBase.length >= 3) && (pBase === searchBase || pBase.includes(searchBase) || searchBase.includes(pBase));

      if (!matchExact && !matchContains && !matchBase) return false;
    }

    if (userSearch) {
      const normPausUser = normalizeUsername(p.usuario);
      const matchNorm = normUserSearch && matchUserOrNumericSuffix(normPausUser, normUserSearch);
      const matchInc = p.usuario.toLowerCase().includes(userSearch);
      if (!matchNorm && !matchInc) return false;
    }

    return true;
  });

  // Filter Nuvidio
  const filteredNuvidio = db.nuvidio.filter((n) => {
    const nDateIso = n.data_iso || parseDateToISO(n.entrada) || parseDateToISO(n.saida);
    if (isoStart && (!nDateIso || nDateIso < isoStart)) return false;
    if (isoEnd && (!nDateIso || nDateIso > isoEnd)) return false;
    return true;
  });

  return {
    operadores: filteredOperadores,
    pausas: filteredPausas,
    nuvidio: filteredNuvidio,
    allDbOperadores: allOperators,
    allDbPausas: db.pausas,
    opIndex: fullIndex,
  };
}

/**
 * Generates Report 1: Por Operador (Ultra-fast single-pass calculation)
 */
export function generateOperatorReport(filter: ReportFilter): OperatorReportRow[] {
  const { operadores, pausas, nuvidio, allDbPausas, opIndex } = filterRecords(filter);

  // Set of valid operator IDs matching the filter
  const validOpIds = new Set(operadores.map((o) => o.id));
  const opMap = new Map<string, Operador>();
  operadores.forEach((o) => opMap.set(o.id, o));

  // 1. Group Nuvidio by Operador ID in O(N)
  interface NuvidioAgg {
    count: number;
    totalSeconds: number;
  }
  const nuvidioByOpId = new Map<string, NuvidioAgg>();

  for (const n of nuvidio) {
    const matchedOp = opIndex.find(n.email_atendente);
    if (matchedOp && validOpIds.has(matchedOp.id)) {
      const existing = nuvidioByOpId.get(matchedOp.id) || { count: 0, totalSeconds: 0 };
      existing.count += 1;
      existing.totalSeconds += n.tempo_segundos;
      nuvidioByOpId.set(matchedOp.id, existing);
    }
  }

  // 2. Group Pausas by Operador ID and Product in O(P)
  interface PauseProdAgg {
    produto: string;
    count: number;
    totalSeconds: number;
  }
  const pausasByOpId = new Map<string, Map<string, PauseProdAgg>>();

  for (const p of pausas) {
    if (!p.usuario) continue;
    const matchedOp = opIndex.find(p.usuario);
    if (matchedOp && validOpIds.has(matchedOp.id)) {
      let prodName = (p.produto || '').trim();
      if (!prodName || prodName.toLowerCase() === 'sem produto') {
        prodName = (matchedOp.produto || '').trim() || 'Sem Produto';
      }
      let opProdMap = pausasByOpId.get(matchedOp.id);
      if (!opProdMap) {
        opProdMap = new Map<string, PauseProdAgg>();
        pausasByOpId.set(matchedOp.id, opProdMap);
      }
      const existing = opProdMap.get(prodName) || { produto: prodName, count: 0, totalSeconds: 0 };
      existing.count += 1;
      existing.totalSeconds += p.tempo_segundos;
      opProdMap.set(prodName, existing);
    }
  }

  // 3. Precompute best known product for operators from allDbPausas if needed
  const bestProdByOpId = new Map<string, string>();
  for (const p of allDbPausas) {
    if (!p.usuario || !p.produto || p.produto === 'Sem Produto') continue;
    const matchedOp = opIndex.find(p.usuario);
    if (matchedOp && !bestProdByOpId.has(matchedOp.id)) {
      bestProdByOpId.set(matchedOp.id, p.produto.trim());
    }
  }

  const rowsMap = new Map<string, OperatorReportRow>();

  // 4. Generate rows for each operator
  for (const op of operadores) {
    const nuvData = nuvidioByOpId.get(op.id) || { count: 0, totalSeconds: 0 };
    const opProdMap = pausasByOpId.get(op.id);
    const prodGroups = opProdMap ? Array.from(opProdMap.values()) : [];

    // Skip if operator has no activity in this filter
    if (nuvData.count === 0 && prodGroups.length === 0) {
      continue;
    }

    const defaultProd = (op.produto && op.produto !== 'Sem Produto')
      ? op.produto.trim()
      : (bestProdByOpId.get(op.id) || filter.produto || 'Sem Produto');

    if (prodGroups.length === 0) {
      // Operator has Nuvidio but 0 Pausas in this period
      const rowKey = `${op.id}||${defaultProd}`;
      rowsMap.set(rowKey, {
        operadorId: op.id,
        operadorNome: op.nome,
        operadorEmail: op.email,
        usuario: op.usuario,
        produto: defaultProd,
        supervisor: op.supervisor || 'Não Informado',
        qtdNuvidio: nuvData.count,
        tempoNuvidioSec: nuvData.totalSeconds,
        tempoNuvidioFormatted: formatSecondsToHHMMSS(nuvData.totalSeconds),
        qtdPausas: 0,
        tempoPausasSec: 0,
        tempoPausasFormatted: '00:00:00',
        diferencaSec: nuvData.totalSeconds,
        diferencaFormatted: formatSecondsToHHMMSS(nuvData.totalSeconds),
      });
    } else if (prodGroups.length === 1) {
      const pg = prodGroups[0];
      const prodName = pg.produto || defaultProd;
      const rowKey = `${op.id}||${prodName}`;
      const diferenca = nuvData.totalSeconds - pg.totalSeconds;

      rowsMap.set(rowKey, {
        operadorId: op.id,
        operadorNome: op.nome,
        operadorEmail: op.email,
        usuario: op.usuario,
        produto: prodName,
        supervisor: op.supervisor || 'Não Informado',
        qtdNuvidio: nuvData.count,
        tempoNuvidioSec: nuvData.totalSeconds,
        tempoNuvidioFormatted: formatSecondsToHHMMSS(nuvData.totalSeconds),
        qtdPausas: pg.count,
        tempoPausasSec: pg.totalSeconds,
        tempoPausasFormatted: formatSecondsToHHMMSS(pg.totalSeconds),
        diferencaSec: diferenca,
        diferencaFormatted: formatSecondsToHHMMSS(diferenca),
      });
    } else {
      // Multiple products in Pausas for this operator -> allocate Nuvidio proportionally
      const totalPausasSec = prodGroups.reduce((acc, g) => acc + g.totalSeconds, 0);

      prodGroups.forEach((pg) => {
        const prodName = pg.produto || defaultProd;
        const rowKey = `${op.id}||${prodName}`;
        const weight = totalPausasSec > 0 ? pg.totalSeconds / totalPausasSec : 1 / prodGroups.length;

        const allocatedNuvCount = Math.round(nuvData.count * weight);
        const allocatedNuvSec = Math.round(nuvData.totalSeconds * weight);
        const diferenca = allocatedNuvSec - pg.totalSeconds;

        rowsMap.set(rowKey, {
          operadorId: op.id,
          operadorNome: op.nome,
          operadorEmail: op.email,
          usuario: op.usuario,
          produto: prodName,
          supervisor: op.supervisor || 'Não Informado',
          qtdNuvidio: allocatedNuvCount,
          tempoNuvidioSec: allocatedNuvSec,
          tempoNuvidioFormatted: formatSecondsToHHMMSS(allocatedNuvSec),
          qtdPausas: pg.count,
          tempoPausasSec: pg.totalSeconds,
          tempoPausasFormatted: formatSecondsToHHMMSS(pg.totalSeconds),
          diferencaSec: diferenca,
          diferencaFormatted: formatSecondsToHHMMSS(diferenca),
        });
      });
    }
  }

  let result = Array.from(rowsMap.values());

  // Filter by product if requested
  if (filter.produto) {
    const pSearch = filter.produto.trim().toLowerCase();
    result = result.filter((r) => r.produto.toLowerCase().includes(pSearch));
  }

  // Sort by Operator Name then Product
  result.sort((a, b) => {
    const comp = a.operadorNome.localeCompare(b.operadorNome);
    if (comp !== 0) return comp;
    return a.produto.localeCompare(b.produto);
  });

  return result;
}

/**
 * Generates Report 2: Por Produto (Ultra-fast derivation)
 */
export function generateProductReport(filter: ReportFilter): ProductReportRow[] {
  const opRows = generateOperatorReport(filter);

  const productMap = new Map<
    string,
    {
      produto: string;
      qtdNuvidio: number;
      tempoNuvidioSec: number;
      qtdPausas: number;
      tempoPausasSec: number;
    }
  >();

  for (const row of opRows) {
    const pName = row.produto || 'Sem Produto';
    const existing = productMap.get(pName) || {
      produto: pName,
      qtdNuvidio: 0,
      tempoNuvidioSec: 0,
      qtdPausas: 0,
      tempoPausasSec: 0,
    };

    existing.qtdNuvidio += row.qtdNuvidio;
    existing.tempoNuvidioSec += row.tempoNuvidioSec;
    existing.qtdPausas += row.qtdPausas;
    existing.tempoPausasSec += row.tempoPausasSec;

    productMap.set(pName, existing);
  }

  const result: ProductReportRow[] = [];

  for (const [prodName, data] of productMap.entries()) {
    const diferencaSec = data.tempoNuvidioSec - data.tempoPausasSec;

    let diferencaPercValue: number | null = null;
    let diferencaPercFormatted = 'N/A';

    if (data.tempoPausasSec > 0) {
      diferencaPercValue = ((data.tempoNuvidioSec - data.tempoPausasSec) / data.tempoPausasSec) * 100;
      diferencaPercFormatted = `${diferencaPercValue >= 0 ? '+' : ''}${diferencaPercValue.toFixed(2)}%`;
    }

    result.push({
      produto: prodName,
      qtdNuvidio: data.qtdNuvidio,
      tempoNuvidioSec: data.tempoNuvidioSec,
      tempoNuvidioFormatted: formatSecondsToHHMMSS(data.tempoNuvidioSec),
      qtdPausas: data.qtdPausas,
      tempoPausasSec: data.tempoPausasSec,
      tempoPausasFormatted: formatSecondsToHHMMSS(data.tempoPausasSec),
      diferencaSec,
      diferencaFormatted: formatSecondsToHHMMSS(diferencaSec),
      diferencaPercFormatted,
      diferencaPercValue,
    });
  }

  result.sort((a, b) => a.produto.localeCompare(b.produto));
  return result;
}

/**
 * Generates Dashboard Summary Cards Data (Instant Single-Pass)
 */
export function generateDashboardSummary(filter: ReportFilter): DashboardSummary {
  const { operadores, pausas, nuvidio } = filterRecords(filter);
  const opReport = generateOperatorReport(filter);

  // Count unique operators that appear in the report or in the filtered list
  const activeOperatorIds = new Set<string>();
  opReport.forEach((r) => activeOperatorIds.add(r.operadorId));
  const totalOperadores = activeOperatorIds.size > 0 ? activeOperatorIds.size : operadores.length;

  let totalNuvidios = 0;
  let tempoTotalNuvidioSec = 0;
  for (const row of opReport) {
    totalNuvidios += row.qtdNuvidio;
    tempoTotalNuvidioSec += row.tempoNuvidioSec;
  }

  // If no filters are blocking raw nuvidio and opReport is 0, show raw totals
  if (totalNuvidios === 0 && nuvidio.length > 0) {
    totalNuvidios = nuvidio.length;
    tempoTotalNuvidioSec = nuvidio.reduce((acc, n) => acc + n.tempo_segundos, 0);
  }

  let totalPausas = 0;
  let tempoTotalPausasSec = 0;
  for (const row of opReport) {
    totalPausas += row.qtdPausas;
    tempoTotalPausasSec += row.tempoPausasSec;
  }

  if (totalPausas === 0 && pausas.length > 0) {
    totalPausas = pausas.length;
    tempoTotalPausasSec = pausas.reduce((acc, p) => acc + p.tempo_segundos, 0);
  }

  const diferencaTotalSec = tempoTotalNuvidioSec - tempoTotalPausasSec;

  return {
    totalOperadores,
    totalNuvidios,
    tempoTotalNuvidioSec,
    tempoTotalNuvidioFormatted: formatSecondsToHHMMSS(tempoTotalNuvidioSec),
    totalPausas,
    tempoTotalPausasSec,
    tempoTotalPausasFormatted: formatSecondsToHHMMSS(tempoTotalPausasSec),
    diferencaTotalSec,
    diferencaTotalFormatted: formatSecondsToHHMMSS(diferencaTotalSec),
  };
}

/**
 * Detects unmatched records (Inconsistências)
 */
export function getUnmatchedRecords(filter: ReportFilter): UnmatchedReport {
  const { pausas, nuvidio, allDbOperadores, opIndex } = filterRecords(filter);

  const nuvidiosSemOperador = nuvidio.filter((n) => {
    return !opIndex.find(n.email_atendente);
  });

  const pausasSemOperador = pausas.filter((p) => {
    return !opIndex.find(p.usuario);
  });

  return {
    nuvidiosSemOperador,
    pausasSemOperador,
  };
}

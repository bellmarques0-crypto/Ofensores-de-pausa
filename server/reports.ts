import { getDb, Operador, Pausa, Nuvidio } from './db';
import {
  formatSecondsToHHMMSS,
  parseDateToISO,
  normalizeUsername,
  normalizeEmail,
  matchUserOrNumericSuffix,
  cleanSearchString,
  fixEncoding,
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
 * Builds operators list strictly from registered operators in the database
 */
export function getUnifiedOperatorsIndex() {
  const db = getDb();
  const baseOps = [...db.operadores];
  const fullIndex = new OperatorLookupIndex(baseOps);

  return { allOperators: baseOps, fullIndex };
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

  // 2. Group Pausas by Operador ID and Product in O(P) (prioritizing product from Pausas)
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
      let prodName = (p.produto || '').trim() || 'Sem Produto';
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

  // 3. Precompute best known product for operators from allDbPausas
  const bestProdByOpId = new Map<string, string>();
  for (const p of allDbPausas) {
    if (!p.usuario || !p.produto || p.produto.trim().toLowerCase() === 'sem produto') continue;
    const matchedOp = opIndex.find(p.usuario);
    if (matchedOp && !bestProdByOpId.has(matchedOp.id)) {
      bestProdByOpId.set(matchedOp.id, p.produto.trim());
    }
  }

  const rowsMap = new Map<string, OperatorReportRow>();

  // 4. Generate EXACTLY ONE consolidated row for each operator
  for (const op of operadores) {
    const nuvData = nuvidioByOpId.get(op.id) || { count: 0, totalSeconds: 0 };
    const opProdMap = pausasByOpId.get(op.id);
    const prodGroups = opProdMap ? Array.from(opProdMap.values()) : [];

    const totalPausasCount = prodGroups.reduce((acc, g) => acc + g.count, 0);
    const totalPausasSec = prodGroups.reduce((acc, g) => acc + g.totalSeconds, 0);

    // Skip if operator has no activity in this filter
    if (nuvData.count === 0 && totalPausasCount === 0) {
      continue;
    }

    // Determine primary product from Base de Pausas
    let primaryProd = '';
    if (prodGroups.length > 0) {
      // Pick the product from Pausas with the highest pause time or count (preferring named products over 'Sem Produto')
      const sortedProds = [...prodGroups].sort((a, b) => {
        const isASem = !a.produto || a.produto.toLowerCase() === 'sem produto' || a.produto.toLowerCase().includes('nao mapeado');
        const isBSem = !b.produto || b.produto.toLowerCase() === 'sem produto' || b.produto.toLowerCase().includes('nao mapeado');
        if (!isASem && isBSem) return -1;
        if (isASem && !isBSem) return 1;
        return b.totalSeconds - a.totalSeconds || b.count - a.count;
      });
      primaryProd = sortedProds[0].produto;
    } else if (bestProdByOpId.get(op.id)) {
      primaryProd = bestProdByOpId.get(op.id)!;
    } else if (op.produto && op.produto.trim() && op.produto.trim().toLowerCase() !== 'sem produto') {
      primaryProd = op.produto.trim();
    } else if (filter.produto) {
      primaryProd = filter.produto;
    } else {
      primaryProd = 'Sem Produto';
    }

    primaryProd = fixEncoding(primaryProd) || 'Sem Produto';
    const diferenca = nuvData.totalSeconds - totalPausasSec;

    rowsMap.set(op.id, {
      operadorId: op.id,
      operadorNome: fixEncoding(op.nome),
      operadorEmail: op.email,
      usuario: op.usuario,
      produto: primaryProd,
      supervisor: fixEncoding(op.supervisor || 'Não Informado'),
      qtdNuvidio: nuvData.count,
      tempoNuvidioSec: nuvData.totalSeconds,
      tempoNuvidioFormatted: formatSecondsToHHMMSS(nuvData.totalSeconds),
      qtdPausas: totalPausasCount,
      tempoPausasSec: totalPausasSec,
      tempoPausasFormatted: formatSecondsToHHMMSS(totalPausasSec),
      diferencaSec: diferenca,
      diferencaFormatted: formatSecondsToHHMMSS(diferenca),
    });
  }

  let result = Array.from(rowsMap.values());

  // Filter by product if requested
  if (filter.produto) {
    const pSearch = cleanSearchString(filter.produto);
    result = result.filter((r) => cleanSearchString(r.produto).includes(pSearch));
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
 * Generates Report 2: Por Produto (Grouped cleanly by Product from Pausas)
 */
export function generateProductReport(filter: ReportFilter): ProductReportRow[] {
  const { pausas, nuvidio, operadores, allDbPausas, opIndex } = filterRecords(filter);
  const validOpIds = new Set(operadores.map((o) => o.id));

  // Precompute best known product for operators from allDbPausas
  const bestProdByOpId = new Map<string, string>();
  for (const p of allDbPausas) {
    if (!p.usuario || !p.produto || p.produto.trim().toLowerCase() === 'sem produto') continue;
    const matchedOp = opIndex.find(p.usuario);
    if (matchedOp && !bestProdByOpId.has(matchedOp.id)) {
      bestProdByOpId.set(matchedOp.id, p.produto.trim());
    }
  }

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

  const getOrCreateProd = (rawProdName?: string) => {
    const pName = fixEncoding(rawProdName) || 'Sem Produto';
    let existing = productMap.get(pName);
    if (!existing) {
      existing = {
        produto: pName,
        qtdNuvidio: 0,
        tempoNuvidioSec: 0,
        qtdPausas: 0,
        tempoPausasSec: 0,
      };
      productMap.set(pName, existing);
    }
    return existing;
  };

  // Group pausas by operator to know their main active product
  const pausasByOpId = new Map<string, Map<string, number>>();

  // 1. Group Pausas by Product (directly from base de pausas)
  for (const p of pausas) {
    if (!p.usuario) continue;
    const matchedOp = opIndex.find(p.usuario);
    if (matchedOp && validOpIds.has(matchedOp.id)) {
      const rawProd = (p.produto || '').trim();
      const prodName = rawProd && rawProd.toLowerCase() !== 'sem produto'
        ? fixEncoding(rawProd)
        : (bestProdByOpId.get(matchedOp.id) || (matchedOp.produto ? fixEncoding(matchedOp.produto) : '') || 'Sem Produto');
      
      const pProd = getOrCreateProd(prodName);
      pProd.qtdPausas += 1;
      pProd.tempoPausasSec += p.tempo_segundos;

      let opMap = pausasByOpId.get(matchedOp.id);
      if (!opMap) {
        opMap = new Map<string, number>();
        pausasByOpId.set(matchedOp.id, opMap);
      }
      opMap.set(prodName, (opMap.get(prodName) || 0) + p.tempo_segundos);
    }
  }

  // 2. Pre-calculate main product for each operator from base de pausas
  const opMainProduct = new Map<string, string>();
  for (const op of operadores) {
    const opProds = pausasByOpId.get(op.id);
    if (opProds && opProds.size > 0) {
      const sorted = Array.from(opProds.entries()).sort((a, b) => {
        const isASem = !a[0] || a[0].toLowerCase() === 'sem produto';
        const isBSem = !b[0] || b[0].toLowerCase() === 'sem produto';
        if (!isASem && isBSem) return -1;
        if (isASem && !isBSem) return 1;
        return b[1] - a[1];
      });
      opMainProduct.set(op.id, fixEncoding(sorted[0][0]));
    } else if (bestProdByOpId.get(op.id)) {
      opMainProduct.set(op.id, fixEncoding(bestProdByOpId.get(op.id)!));
    } else if (op.produto && op.produto.trim() && op.produto.trim().toLowerCase() !== 'sem produto') {
      opMainProduct.set(op.id, fixEncoding(op.produto.trim()));
    }
  }

  // 3. Allocate Nuvidio to Operator's product from base de pausas
  for (const n of nuvidio) {
    const matchedOp = opIndex.find(n.email_atendente);
    if (matchedOp && validOpIds.has(matchedOp.id)) {
      const prodName = opMainProduct.get(matchedOp.id) || (matchedOp.produto ? fixEncoding(matchedOp.produto) : '') || 'Sem Produto';
      const pProd = getOrCreateProd(prodName);
      pProd.qtdNuvidio += 1;
      pProd.tempoNuvidioSec += n.tempo_segundos;
    }
  }

  const result: ProductReportRow[] = [];

  for (const [prodName, data] of productMap.entries()) {
    if (data.qtdNuvidio === 0 && data.qtdPausas === 0) continue;

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

  if (filter.produto) {
    const pSearch = cleanSearchString(filter.produto);
    return result.filter((r) => cleanSearchString(r.produto).includes(pSearch)).sort((a, b) => a.produto.localeCompare(b.produto));
  }

  result.sort((a, b) => a.produto.localeCompare(b.produto));
  return result;
}

/**
 * Generates Dashboard Summary Cards Data (Instant Single-Pass)
 */
export function generateDashboardSummary(filter: ReportFilter): DashboardSummary {
  const opReport = generateOperatorReport(filter);

  // Count unique operators that appear in the report
  const totalOperadores = opReport.length;

  let totalNuvidios = 0;
  let tempoTotalNuvidioSec = 0;
  let totalPausas = 0;
  let tempoTotalPausasSec = 0;

  for (const row of opReport) {
    totalNuvidios += row.qtdNuvidio;
    tempoTotalNuvidioSec += row.tempoNuvidioSec;
    totalPausas += row.qtdPausas;
    tempoTotalPausasSec += row.tempoPausasSec;
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

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
  diferencaPercFormatted: string; // e.g. "14.50%" or "N/A"
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
 * Flexible attendant identifier matching:
 * Matches Nuvidio or Pausas attendant string against Operador email, usuario (INTERGRALL), name, or email prefix.
 */
export function findOperatorForIdentifier(
  identifier: string,
  operadores: Operador[]
): Operador | null {
  if (!identifier) return null;

  const rawId = String(identifier).trim();
  if (!rawId) return null;

  const cleanUser = normalizeUsername(rawId);
  const cleanEmail = normalizeEmail(rawId);
  const cleanTextId = cleanSearchString(rawId);

  if (!cleanUser && !cleanEmail && !cleanTextId) return null;

  const rawPrefix = rawId.includes('@') ? rawId.split('@')[0] : rawId;
  const cleanPrefixText = cleanSearchString(rawPrefix);

  const STOP_WORDS = new Set(['com', 'br', 'de', 'da', 'dos', 'do', 'del', 'e', 'proativacontactcenter', 'gmail', 'hotmail', 'outlook']);

  const idTokens = cleanPrefixText
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // 1. Pass 1: Direct or Numeric Suffix / Username / Email / Name match
  for (const op of operadores) {
    const opEmail = normalizeEmail(op.email);
    const opUser = normalizeUsername(op.usuario);
    const opName = (op.nome || '').trim().toLowerCase();

    if (
      matchUserOrNumericSuffix(rawId, opUser) ||
      matchUserOrNumericSuffix(rawId, opEmail) ||
      matchUserOrNumericSuffix(rawId, opName) ||
      matchUserOrNumericSuffix(rawPrefix, opUser) ||
      matchUserOrNumericSuffix(rawPrefix, opEmail) ||
      matchUserOrNumericSuffix(rawPrefix, opName)
    ) {
      return op;
    }
  }

  // 2. Pass 2: Cleaned String Exact Equality
  for (const op of operadores) {
    const opNameClean = cleanSearchString(op.nome);
    const opEmailClean = cleanSearchString(op.email);
    const opUserClean = cleanSearchString(op.usuario);
    const opEmailPrefixClean = cleanSearchString((op.email || '').split('@')[0]);

    if (
      (cleanTextId && (cleanTextId === opNameClean || cleanTextId === opEmailClean || cleanTextId === opUserClean || cleanTextId === opEmailPrefixClean)) ||
      (cleanPrefixText && (cleanPrefixText === opNameClean || cleanPrefixText === opEmailClean || cleanPrefixText === opUserClean || cleanPrefixText === opEmailPrefixClean))
    ) {
      return op;
    }
  }

  // 3. Pass 3: Substring Containment (when length >= 3)
  for (const op of operadores) {
    const opNameClean = cleanSearchString(op.nome);
    const opEmailClean = cleanSearchString(op.email);
    const opEmailPrefixClean = cleanSearchString((op.email || '').split('@')[0]);

    if (cleanPrefixText.length >= 3) {
      if (
        (opNameClean.length >= 3 && (opNameClean.includes(cleanPrefixText) || cleanPrefixText.includes(opNameClean))) ||
        (opEmailPrefixClean.length >= 3 && (opEmailPrefixClean.includes(cleanPrefixText) || cleanPrefixText.includes(opEmailPrefixClean))) ||
        (opEmailClean.length >= 3 && opEmailClean.includes(cleanPrefixText))
      ) {
        return op;
      }
    }
  }

  // 4. Pass 4: Token Overlap (Matching Name / Email Tokens)
  if (idTokens.length >= 2) {
    for (const op of operadores) {
      const opNameTokens = new Set(cleanSearchString(op.nome).split(' '));
      const opEmailTokens = new Set(cleanSearchString((op.email || '').split('@')[0]).split(' '));

      const matchInName = idTokens.every((t) => opNameTokens.has(t));
      const matchInEmail = idTokens.every((t) => opEmailTokens.has(t));

      if (matchInName || matchInEmail) {
        return op;
      }
    }
  }

  // 5. Pass 5: Unique First Name or Username match (if idTokens has 1 token and length >= 4)
  if (idTokens.length === 1 && idTokens[0].length >= 4) {
    const singleToken = idTokens[0];
    const candidateOps = operadores.filter((op) => {
      const opFirstName = cleanSearchString(op.nome).split(' ')[0];
      const opUser = cleanSearchString(op.usuario);
      const opEmailPrefix = cleanSearchString((op.email || '').split('@')[0]);
      return opFirstName === singleToken || opUser === singleToken || opEmailPrefix === singleToken;
    });

    if (candidateOps.length === 1) {
      return candidateOps[0];
    }
  }

  return null;
}

/**
 * Filter Helper
 */
export function filterRecords(dbFilter: ReportFilter) {
  const db = getDb();

  const isoStart = toIsoDate(dbFilter.dataInicio);
  const isoEnd = toIsoDate(dbFilter.dataFim);

  const opSearch = (dbFilter.operador || '').trim().toLowerCase();
  const prodSearch = (dbFilter.produto || '').trim().toLowerCase();
  const userSearch = (dbFilter.usuario || '').trim().toLowerCase();
  const normUserSearch = normalizeUsername(dbFilter.usuario);
  const supSearch = (dbFilter.supervisor || '').trim().toLowerCase();

  // Filter Operadores
  const filteredOperadores = db.operadores.filter((op) => {
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
    const pDateIso = parseDateToISO(p.data) || parseDateToISO(p.data_iso) || parseDateToISO(p.inicio);
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
    const nDateIso = parseDateToISO(n.data_iso) || parseDateToISO(n.entrada);
    if (isoStart && (!nDateIso || nDateIso < isoStart)) return false;
    if (isoEnd && (!nDateIso || nDateIso > isoEnd)) return false;
    return true;
  });

  return {
    operadores: filteredOperadores,
    pausas: filteredPausas,
    nuvidio: filteredNuvidio,
    allDbOperadores: db.operadores,
    allDbPausas: db.pausas,
  };
}

/**
 * Generates Report 1: Por Operador
 */
export function generateOperatorReport(filter: ReportFilter): OperatorReportRow[] {
  const { operadores, pausas, nuvidio, allDbPausas } = filterRecords(filter);

  // Group Nuvidio by matched Operador ID (only for operators in db.operadores)
  interface NuvidioAgg {
    count: number;
    totalSeconds: number;
  }
  const nuvidioByOpId = new Map<string, NuvidioAgg>();

  for (const n of nuvidio) {
    const matchedOp = findOperatorForIdentifier(n.email_atendente, operadores);
    if (matchedOp) {
      const existing = nuvidioByOpId.get(matchedOp.id) || { count: 0, totalSeconds: 0 };
      existing.count += 1;
      existing.totalSeconds += n.tempo_segundos;
      nuvidioByOpId.set(matchedOp.id, existing);
    }
  }

  // Helper function to match pausas to an operator
  function getPausasForOp(op: Operador, pausaList: Pausa[]): Pausa[] {
    return pausaList.filter((p) => {
      if (!p.usuario) return false;
      const matched = findOperatorForIdentifier(p.usuario, [op]);
      return matched?.id === op.id;
    });
  }

  function getBestKnownProductForOperator(
    op: Operador,
    opPausas: Pausa[],
    allDbPausas: Pausa[],
    activeFilterProd?: string
  ): string | null {
    if (op.produto && op.produto.trim() && op.produto.trim().toLowerCase() !== 'sem produto') {
      return op.produto.trim();
    }

    for (const p of opPausas) {
      const pProd = (p.produto || '').trim();
      if (pProd && pProd.toLowerCase() !== 'sem produto') {
        return pProd;
      }
    }

    const allOpPausas = getPausasForOp(op, allDbPausas);
    const prodCounts = new Map<string, number>();

    for (const p of allOpPausas) {
      const pProd = (p.produto || '').trim();
      if (pProd && pProd.toLowerCase() !== 'sem produto') {
        prodCounts.set(pProd, (prodCounts.get(pProd) || 0) + 1);
      }
    }

    if (prodCounts.size > 0) {
      let bestProd = '';
      let maxCount = -1;
      for (const [prod, count] of prodCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestProd = prod;
        }
      }
      if (bestProd) return bestProd;
    }

    if (activeFilterProd && activeFilterProd.trim() && activeFilterProd.trim().toLowerCase() !== 'sem produto') {
      return activeFilterProd.trim();
    }

    return null;
  }

  const rowsMap = new Map<string, OperatorReportRow>();

  // Process ONLY operators registered in db.operadores
  for (const op of operadores) {
    const nuvData = nuvidioByOpId.get(op.id) || { count: 0, totalSeconds: 0 };
    const opPausas = getPausasForOp(op, pausas);

    // Operator must have at least Pausas OR Nuvidio in the filtered period
    if (nuvData.count === 0 && opPausas.length === 0) {
      continue;
    }

    const bestKnownProd = getBestKnownProductForOperator(op, opPausas, allDbPausas, filter.produto);

    if (opPausas.length > 0) {
      // Group pausas by product
      interface ProductGroup {
        produto: string;
        count: number;
        totalSeconds: number;
      }
      const prodGroupMap = new Map<string, ProductGroup>();

      for (const p of opPausas) {
        let pName = (p.produto || '').trim();
        if (op.produto && op.produto.trim() && op.produto.trim().toLowerCase() !== 'sem produto') {
          pName = op.produto.trim();
        } else if (!pName || pName.toLowerCase() === 'sem produto') {
          pName = bestKnownProd || 'Sem Produto';
        }
        const existing = prodGroupMap.get(pName) || {
          produto: pName,
          count: 0,
          totalSeconds: 0,
        };
        existing.count += 1;
        existing.totalSeconds += p.tempo_segundos;
        prodGroupMap.set(pName, existing);
      }

      const prodGroups = Array.from(prodGroupMap.values());

      if (prodGroups.length === 1) {
        const pg = prodGroups[0];
        const rowKey = `${op.id}||${pg.produto}`;
        const diferenca = nuvData.totalSeconds - pg.totalSeconds;

        rowsMap.set(rowKey, {
          operadorId: op.id,
          operadorNome: op.nome,
          operadorEmail: op.email,
          usuario: op.usuario,
          produto: pg.produto,
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
      } else if (prodGroups.length > 1) {
        const totalPausasSecAllProds = prodGroups.reduce((acc, g) => acc + g.totalSeconds, 0);

        prodGroups.forEach((pg) => {
          const rowKey = `${op.id}||${pg.produto}`;
          const weight =
            totalPausasSecAllProds > 0 ? pg.totalSeconds / totalPausasSecAllProds : 1 / prodGroups.length;

          const allocatedNuvCount = Math.round(nuvData.count * weight);
          const allocatedNuvSec = Math.round(nuvData.totalSeconds * weight);
          const diferenca = allocatedNuvSec - pg.totalSeconds;

          rowsMap.set(rowKey, {
            operadorId: op.id,
            operadorNome: op.nome,
            operadorEmail: op.email,
            usuario: op.usuario,
            produto: pg.produto,
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
    } else {
      // Operator has Nuvidio calls BUT NO pausas in current date filter
      const prodName = bestKnownProd || 'Sem Produto';
      const rowKey = `${op.id}||${prodName}`;

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
        qtdPausas: 0,
        tempoPausasSec: 0,
        tempoPausasFormatted: '00:00:00',
        diferencaSec: nuvData.totalSeconds,
        diferencaFormatted: formatSecondsToHHMMSS(nuvData.totalSeconds),
      });
    }
  }

  let result = Array.from(rowsMap.values());

  // Filter by product if specified
  if (filter.produto) {
    const pSearch = filter.produto.trim().toLowerCase();
    result = result.filter((r) => r.produto.toLowerCase().includes(pSearch));
  }

  // Sort by Operator name then Product
  result.sort((a, b) => {
    const compName = a.operadorNome.localeCompare(b.operadorNome);
    if (compName !== 0) return compName;
    return a.produto.localeCompare(b.produto);
  });

  return result;
}

/**
 * Generates Report 2: Por Produto
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
 * Generates Dashboard Summary Cards Data
 */
export function generateDashboardSummary(filter: ReportFilter): DashboardSummary {
  const { operadores, pausas, nuvidio } = filterRecords(filter);
  const opReport = generateOperatorReport(filter);

  const totalOperadores = operadores.length;

  let totalNuvidios = 0;
  let tempoTotalNuvidioSec = 0;
  for (const row of opReport) {
    totalNuvidios += row.qtdNuvidio;
    tempoTotalNuvidioSec += row.tempoNuvidioSec;
  }

  // Fallback if opReport empty but raw nuvidio exists
  if (totalNuvidios === 0 && nuvidio.length > 0) {
    totalNuvidios = nuvidio.length;
    tempoTotalNuvidioSec = nuvidio.reduce((acc, n) => acc + n.tempo_segundos, 0);
  }

  let totalPausas = 0;
  let tempoTotalPausasSec = 0;
  for (const p of pausas) {
    totalPausas += 1;
    tempoTotalPausasSec += p.tempo_segundos;
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
  const { pausas, nuvidio, allDbOperadores } = filterRecords(filter);

  const nuvidiosSemOperador = nuvidio.filter((n) => {
    return !findOperatorForIdentifier(n.email_atendente, allDbOperadores);
  });

  const pausasSemOperador = pausas.filter((p) => {
    return !findOperatorForIdentifier(p.usuario, allDbOperadores);
  });

  return {
    nuvidiosSemOperador,
    pausasSemOperador,
  };
}


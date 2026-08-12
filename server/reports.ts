import { getDb, Operador, Pausa, Nuvidio } from './db';
import { formatSecondsToHHMMSS, parseDateToISO } from './utils';

export interface ReportFilter {
  dataInicio?: string;
  dataFim?: string;
  operador?: string;
  produto?: string;
  usuario?: string;
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
 * Matches Nuvidio attendant string against Operador email, usuario (INTERGRALL), name, or email prefix.
 */
export function findOperatorForIdentifier(
  identifier: string,
  operadores: Operador[]
): Operador | null {
  if (!identifier) return null;

  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  const cleanPrefix = clean.split('@')[0];

  // 1. Exact match on email, usuario, or nome
  for (const op of operadores) {
    const opEmail = (op.email || '').trim().toLowerCase();
    const opUser = (op.usuario || '').trim().toLowerCase();
    const opName = (op.nome || '').trim().toLowerCase();

    if (clean === opEmail || clean === opUser || clean === opName) {
      return op;
    }
  }

  // 2. Prefix match (e.g. taina.martins matches taina.martins@domain.com)
  for (const op of operadores) {
    const opEmail = (op.email || '').trim().toLowerCase();
    const opEmailPrefix = opEmail.split('@')[0];
    const opUser = (op.usuario || '').trim().toLowerCase();

    if (cleanPrefix && (cleanPrefix === opEmailPrefix || cleanPrefix === opUser)) {
      return op;
    }
  }

  // 3. Substring match
  for (const op of operadores) {
    const opUser = (op.usuario || '').trim().toLowerCase();
    const opName = (op.nome || '').trim().toLowerCase();

    if (opUser && opUser.length >= 3 && clean.includes(opUser)) {
      return op;
    }
    if (opName && opName.length >= 3 && clean.includes(opName)) {
      return op;
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

  // Filter Operadores
  const filteredOperadores = db.operadores.filter((op) => {
    if (userSearch && op.usuario.toLowerCase() !== userSearch) return false;
    if (opSearch) {
      const matchName = op.nome.toLowerCase().includes(opSearch);
      const matchEmail = op.email.toLowerCase().includes(opSearch);
      const matchUser = op.usuario.toLowerCase().includes(opSearch);
      if (!matchName && !matchEmail && !matchUser) return false;
    }
    return true;
  });

  // Filter Pausas
  const filteredPausas = db.pausas.filter((p) => {
    if (isoStart && p.data_iso && p.data_iso < isoStart) return false;
    if (isoEnd && p.data_iso && p.data_iso > isoEnd) return false;
    if (prodSearch && p.produto.toLowerCase() !== prodSearch) return false;
    if (userSearch && p.usuario.toLowerCase() !== userSearch) return false;
    return true;
  });

  // Filter Nuvidio
  const filteredNuvidio = db.nuvidio.filter((n) => {
    if (isoStart && n.data_iso && n.data_iso < isoStart) return false;
    if (isoEnd && n.data_iso && n.data_iso > isoEnd) return false;
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

  // Group Nuvidio by matched Operador ID (only for operators registered in db.operadores)
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
    let opUser = (op.usuario || '').trim().toLowerCase();
    if (opUser.endsWith('.0')) opUser = opUser.slice(0, -2);

    const opEmail = (op.email || '').trim().toLowerCase();
    const opEmailPrefix = opEmail.split('@')[0];
    const opName = (op.nome || '').trim().toLowerCase();

    return pausaList.filter((p) => {
      let pUser = (p.usuario || '').trim().toLowerCase();
      if (pUser.endsWith('.0')) pUser = pUser.slice(0, -2);
      if (!pUser) return false;

      return (
        pUser === opUser ||
        pUser === opEmail ||
        pUser === opEmailPrefix ||
        pUser === opName ||
        (opUser && opUser.length >= 2 && (pUser.includes(opUser) || opUser.includes(pUser))) ||
        (opEmailPrefix && opEmailPrefix.length >= 2 && (pUser.includes(opEmailPrefix) || opEmailPrefix.includes(pUser))) ||
        (opName && opName.length >= 3 && (pUser.includes(opName) || opName.includes(pUser)))
      );
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

  // Process ONLY operators registered in Operadores base
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


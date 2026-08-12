import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  getDb,
  saveDatabase,
  Operador,
  Pausa,
  Nuvidio,
  Importacao,
} from '../db';
import {
  normalizeEmail,
  normalizeUsername,
  normalizeColumnHeader,
  parseTimeToSeconds,
  calculatePauseDurationSeconds,
  formatSecondsToHHMMSS,
  parseDateToISO,
  calculateNuvidioDurationSeconds,
  createFingerprint,
} from '../utils';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Column Mapping Configuration
const REQUIRED_FIELDS = {
  operadores: [
    {
      key: 'nome',
      label: 'Nome',
      aliases: [
        'nome',
        'nomedooperador',
        'operador',
        'nomeoperador',
        'atendente',
        'nomedoatendente',
        'colaborador',
        'funcionario',
        'agente',
        'analista',
        'pessoa',
        'nomecompleto',
      ],
    },
    {
      key: 'email',
      label: 'E-mail',
      aliases: [
        'email',
        'emaildooperador',
        'emailoperador',
        'emaildoatendente',
        'emailatendente',
        'e-mail',
        'e-maildooperador',
        'e-mailoperador',
        'correioeletronico',
        'mail',
        'emailnuvidio',
      ],
    },
    {
      key: 'usuario',
      label: 'INTERGRALL',
      aliases: [
        'intergrall',
        'integral',
        'usuario',
        'user',
        'login',
        'operadorusuario',
        'usuariopausas',
        'loginpausas',
        'matricula',
        'id',
        'username',
        'codigo',
        'cod',
        'cadastro',
        're',
        'idoperador',
        'id_operador',
        'userid',
      ],
    },
    {
      key: 'produto',
      label: 'Produto',
      aliases: [
        'produto',
        'product',
        'atendimento',
        'atendimentos',
        'atend',
        'campanha',
        'fila',
        'skill',
        'servico',
        'operacao',
        'equipe',
        'carteira',
        'projeto',
        'negocio',
        'segmento',
        'cliente',
        'canal',
        'celula',
        'ilha',
        'frente',
        'prod',
        'sgm',
        'setor',
        'grupo',
        'unidade',
        'linha',
        'area',
        'time',
        'cluster',
        'contrato',
        'empresa',
        'filial',
      ],
      optional: true,
    },
  ],
  pausas: [
    {
      key: 'data',
      label: 'Data',
      aliases: ['data', 'date', 'datapausa', 'datadapausa', 'dataemissao', 'dia'],
    },
    {
      key: 'usuario',
      label: 'INTERGRALL / Usuário',
      aliases: [
        'intergrall',
        'integral',
        'usuario',
        'user',
        'login',
        'operador',
        'nomedooperador',
        'atendente',
        'colaborador',
        'matricula',
        'codigo',
        'cod',
        'id',
      ],
    },
    {
      key: 'pausa',
      label: 'Pausa',
      aliases: ['pausa', 'tipopausa', 'motivo', 'motivopausa', 'nomepausa', 'descricao', 'status'],
    },
    {
      key: 'inicio',
      label: 'Início',
      aliases: ['inicio', 'horainicio', 'start', 'horadeinicio', 'entrada', 'horarioinicio'],
    },
    {
      key: 'fim',
      label: 'Fim',
      aliases: ['fim', 'horafim', 'end', 'horadefim', 'termino', 'horariofim', 'saida'],
    },
    {
      key: 'tempo',
      label: 'Tempo',
      aliases: ['tempo', 'duracao', 'duracaopausa', 'tempopausa', 'tempototal', 'duracaototal'],
      optional: true,
    },
    {
      key: 'produto',
      label: 'Produto',
      aliases: [
        'produto',
        'product',
        'atendimento',
        'atendimentos',
        'atend',
        'campanha',
        'fila',
        'skill',
        'servico',
        'operacao',
        'carteira',
        'projeto',
        'negocio',
        'segmento',
        'cliente',
        'canal',
        'celula',
        'ilha',
        'frente',
        'prod',
        'sgm',
        'setor',
        'grupo',
        'unidade',
      ],
      optional: true,
    },
  ],
  nuvidio: [
    {
      key: 'email_atendente',
      label: 'Email do atendente',
      aliases: [
        'emaildoatendente',
        'emailatendente',
        'email',
        'atendenteemail',
        'emaildooperador',
        'emailoperador',
        'e-mail',
        'atendente',
        'emailatend',
      ],
    },
    {
      key: 'entrada',
      label: 'Atendente entrou na chamada (Formatado)',
      aliases: [
        'atendenteentrounachamadaformatado',
        'atendenteentrounachamada',
        'entrounachamadaformatado',
        'entrounachamada',
        'entrada',
        'horainicio',
        'inicio',
        'atendenteentrou',
        'entrou',
      ],
    },
    {
      key: 'saida',
      label: 'Atendente saiu da chamada (Formatado)',
      aliases: [
        'atendentesaiudachamadaformatado',
        'atendentesaiudachamada',
        'atendentesaiunachamadaformatado',
        'atendentesaiunachamada',
        'saiudachamadaformatado',
        'saiudachamada',
        'saiunachamada',
        'saida',
        'horafim',
        'fim',
        'atendentesaiu',
        'saiu',
      ],
    },
  ],
};

/**
 * Helper to parse Excel or CSV buffer into row objects using XLSX (SheetJS)
 */
async function parseFileRows(fileBuffer: Buffer, fileName: string): Promise<{ headers: string[]; rows: any[] }> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [] };

    const worksheet = workbook.Sheets[sheetName];
    // Convert sheet to array of row arrays
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

    if (!jsonData || jsonData.length === 0) return { headers: [], rows: [] };

    // Find first non-empty row as header row
    let headerRowIndex = 0;
    while (
      headerRowIndex < jsonData.length &&
      (!jsonData[headerRowIndex] || jsonData[headerRowIndex].every((cell) => String(cell || '').trim() === ''))
    ) {
      headerRowIndex++;
    }

    if (headerRowIndex >= jsonData.length) return { headers: [], rows: [] };

    const rawHeaderRow = jsonData[headerRowIndex];
    const headers: string[] = rawHeaderRow.map((h: any) => String(h || '').trim());

    // Trim trailing empty headers
    while (headers.length > 0 && headers[headers.length - 1] === '') {
      headers.pop();
    }

    const rows: any[] = [];
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const rowArr = jsonData[i];
      if (!rowArr || rowArr.length === 0) continue;

      const rowObj: Record<string, string> = {};
      let hasData = false;

      for (let c = 0; c < headers.length; c++) {
        const header = headers[c];
        if (!header) continue;

        const rawCell = rowArr[c];
        let strVal = '';
        if (rawCell !== undefined && rawCell !== null) {
          if (rawCell instanceof Date) {
            strVal = rawCell.toISOString();
          } else if (typeof rawCell === 'object') {
            if (rawCell.w !== undefined) strVal = String(rawCell.w);
            else if (rawCell.v !== undefined) strVal = String(rawCell.v);
            else strVal = String(rawCell);
          } else {
            strVal = String(rawCell);
          }
        }

        strVal = strVal.trim();
        if (strVal !== '') {
          hasData = true;
        }
        rowObj[header] = strVal;
      }

      if (hasData) {
        rows.push(rowObj);
      }
    }

    return { headers, rows };
  } catch (err) {
    console.warn('XLSX parser warning, attempting PapaParse fallback for CSV/Text:', err);
    try {
      const content = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
      const headers = (parsed.meta.fields || []).map((h) => String(h || '').trim());
      const cleanRows = (parsed.data as any[]).map((row) => {
        const obj: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k) obj[k] = String(v || '').trim();
        }
        return obj;
      });
      return { headers, rows: cleanRows };
    } catch (csvErr) {
      console.error('File parsing failed completely:', csvErr);
      throw new Error('Formato de arquivo inválido. Por favor envie um arquivo .xlsx, .xls ou .csv válido.');
    }
  }
}

/**
 * Maps input file headers to target field definitions
 */
function findColumnMappings(headers: string[], baseType: 'operadores' | 'pausas' | 'nuvidio') {
  const fields = REQUIRED_FIELDS[baseType];
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeColumnHeader(h),
  }));

  const mappings: Record<string, string> = {}; // key -> original header
  const missingLabels: string[] = [];
  const usedHeaders = new Set<string>();

  for (const field of fields) {
    let matchedHeader = '';

    // 1. Exact alias match
    for (const hObj of normalizedHeaders) {
      if (!usedHeaders.has(hObj.original) && field.aliases.includes(hObj.normalized)) {
        matchedHeader = hObj.original;
        break;
      }
    }

    // 2. Fuzzy substring match fallback
    if (!matchedHeader) {
      for (const hObj of normalizedHeaders) {
        if (usedHeaders.has(hObj.original) || !hObj.normalized) continue;

        if (
          (field.key === 'saida' && (hObj.normalized.includes('saiu') || hObj.normalized.includes('saida') || hObj.normalized.includes('horafim'))) ||
          (field.key === 'entrada' && (hObj.normalized.includes('entrou') || hObj.normalized.includes('entrada') || hObj.normalized.includes('horainicio'))) ||
          (field.key === 'email_atendente' && (hObj.normalized.includes('email') || hObj.normalized.includes('atendente'))) ||
          (field.key === 'nome' && (hObj.normalized.includes('nome') || hObj.normalized.includes('operador') || hObj.normalized.includes('atendente'))) ||
          (field.key === 'email' && hObj.normalized.includes('email')) ||
          (field.key === 'usuario' && (hObj.normalized.includes('intergrall') || hObj.normalized.includes('integral') || hObj.normalized.includes('usuario') || hObj.normalized.includes('user') || hObj.normalized.includes('login'))) ||
          (field.key === 'pausa' && (hObj.normalized.includes('pausa') || hObj.normalized.includes('motivo'))) ||
          (field.key === 'tempo' && (hObj.normalized.includes('tempo') || hObj.normalized.includes('duracao'))) ||
          (field.key === 'produto' &&
            (hObj.normalized.includes('produto') ||
              hObj.normalized.includes('atendimento') ||
              hObj.normalized.includes('atend') ||
              hObj.normalized.includes('prod') ||
              hObj.normalized.includes('campanha') ||
              hObj.normalized.includes('fila') ||
              hObj.normalized.includes('carteira') ||
              hObj.normalized.includes('projeto') ||
              hObj.normalized.includes('segmento') ||
              hObj.normalized.includes('cliente') ||
              hObj.normalized.includes('celula') ||
              hObj.normalized.includes('equipe') ||
              hObj.normalized.includes('operacao') ||
              hObj.normalized.includes('sgm') ||
              hObj.normalized.includes('setor') ||
              hObj.normalized.includes('grupo') ||
              hObj.normalized.includes('unidade')))
        ) {
          matchedHeader = hObj.original;
          break;
        }
      }
    }

    if (matchedHeader) {
      mappings[field.key] = matchedHeader;
      usedHeaders.add(matchedHeader);
    } else if (!(field as any).optional) {
      missingLabels.push(field.label);
    }
  }

  // 3. Unmapped fallback for operadores base: if produto is still unmapped, pick a remaining unused column that is NOT cargo/função/gestor/etc.
  if (baseType === 'operadores' && !mappings.produto) {
    const nonProductKeywords = ['cargo', 'funcao', 'gestor', 'supervisor', 'nivel', 'role', 'status', 'situacao', 'admissao', 'demissao', 'salario', 'cpf', 'rg', 'turno', 'escala', 'horario', 'data', 'nome', 'email', 'user', 'login', 'matricula', 'id', 're'];
    const candidateHeader = normalizedHeaders.find(
      (hObj) =>
        !usedHeaders.has(hObj.original) &&
        hObj.normalized &&
        !nonProductKeywords.some((kw) => hObj.normalized.includes(kw))
    );
    if (candidateHeader) {
      mappings.produto = candidateHeader.original;
      usedHeaders.add(candidateHeader.original);
    }
  }

  return {
    valid: missingLabels.length === 0,
    mappings,
    missingLabels,
    columnsFound: headers,
  };
}

/**
 * Preview endpoint: validates file structure and displays detected columns
 */
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const baseType = req.body.tipo_base as 'operadores' | 'pausas' | 'nuvidio';

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    if (!baseType || !REQUIRED_FIELDS[baseType]) {
      return res.status(400).json({ error: 'Tipo de base inválido.' });
    }

    const { headers, rows } = await parseFileRows(file.buffer, file.originalname);
    const validation = findColumnMappings(headers, baseType);

    const sampleRows = rows.slice(0, 5).map((row) => {
      const mappedSample: any = {};
      for (const [key, origHeader] of Object.entries(validation.mappings)) {
        mappedSample[key] = row[origHeader];
      }
      return mappedSample;
    });

    return res.json({
      valid: validation.valid,
      tipoBase: baseType,
      fileName: file.originalname,
      totalRows: rows.length,
      columnsFound: validation.columnsFound,
      missingColumns: validation.missingLabels,
      mappedColumns: validation.mappings,
      sampleRows,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return res.status(500).json({ error: `Erro ao analisar arquivo: ${error.message || error}` });
  }
});

/**
 * Process & Import endpoint: inserts or replaces base records in database
 */
router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const baseType = req.body.tipo_base as 'operadores' | 'pausas' | 'nuvidio';
    const mode = ((req.body.modo || req.body.mode || 'substituir') as 'substituir' | 'adicionar');
    const modo = mode;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    if (!baseType || !REQUIRED_FIELDS[baseType]) {
      return res.status(400).json({ error: 'Tipo de base inválido.' });
    }

    const { headers, rows } = await parseFileRows(file.buffer, file.originalname);
    const validation = findColumnMappings(headers, baseType);

    if (!validation.valid) {
      return res.status(400).json({
        error: `Colunas obrigatórias ausentes: ${validation.missingLabels.join(', ')}`,
        missingColumns: validation.missingLabels,
      });
    }

    const db = getDb();
    const now = new Date().toISOString();
    let importedCount = 0;
    let skippedCount = 0;

    const mappings = validation.mappings;

    if (baseType === 'operadores') {
      const existingFingerprints = new Set(
        mode === 'substituir' ? [] : db.operadores.map((o) => o.fingerprint)
      );
      const newOperadores: Operador[] = mode === 'substituir' ? [] : [...db.operadores];

      rows.forEach((row, idx) => {
        const nome = String(row[mappings.nome] || '').trim();
        const email = normalizeEmail(row[mappings.email]);
        const usuario = normalizeUsername(row[mappings.usuario]);
        const produto = mappings.produto ? String(row[mappings.produto] || '').trim() : '';

        if (!email && !usuario && !nome) return;

        const fingerprint = createFingerprint(email, usuario);

        if (existingFingerprints.has(fingerprint)) {
          const existingOp = newOperadores.find((o) => o.fingerprint === fingerprint);
          if (existingOp && produto && (!existingOp.produto || existingOp.produto === 'Sem Produto')) {
            existingOp.produto = produto;
          }
          skippedCount += 1;
          return;
        }

        existingFingerprints.add(fingerprint);
        importedCount += 1;

        newOperadores.push({
          id: `op-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          nome: nome || usuario || email,
          email,
          usuario,
          produto: produto || undefined,
          created_at: now,
          updated_at: now,
          fingerprint,
        });
      });

      db.operadores = newOperadores;
    } else if (baseType === 'pausas') {
      const existingFingerprints = new Set(
        mode === 'substituir' ? [] : db.pausas.map((p) => p.fingerprint)
      );
      const newPausas: Pausa[] = mode === 'substituir' ? [] : [...db.pausas];

      rows.forEach((row, idx) => {
        const dataRaw = String(row[mappings.data] || '').trim();
        const data_iso = parseDateToISO(dataRaw);
        const usuario = normalizeUsername(row[mappings.usuario]);
        const pausa = String(row[mappings.pausa] || '').trim();
        const inicio = String(row[mappings.inicio] || '').trim();
        const fim = String(row[mappings.fim] || '').trim();
        const tempoRaw = row[mappings.tempo];
        const tempo_segundos = calculatePauseDurationSeconds(inicio, fim, tempoRaw);
        const produto = String(row[mappings.produto] || '').trim() || 'Sem Produto';

        if (!usuario) return;

        const tempoFormatted = formatSecondsToHHMMSS(tempo_segundos);
        const fingerprint = createFingerprint(data_iso, usuario, inicio, fim, pausa, String(tempo_segundos));

        if (existingFingerprints.has(fingerprint)) {
          skippedCount += 1;
          return;
        }

        existingFingerprints.add(fingerprint);
        importedCount += 1;

        newPausas.push({
          id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          data: dataRaw,
          data_iso,
          usuario,
          pausa,
          inicio,
          fim,
          tempo: tempoFormatted,
          tempo_segundos,
          produto,
          created_at: now,
          fingerprint,
        });
      });

      db.pausas = newPausas;
    } else if (baseType === 'nuvidio') {
      const existingFingerprints = new Set(
        mode === 'substituir' ? [] : db.nuvidio.map((n) => n.fingerprint)
      );
      const newNuvidio: Nuvidio[] = mode === 'substituir' ? [] : [...db.nuvidio];

      rows.forEach((row, idx) => {
        const rawAtendente = String(row[mappings.email_atendente] || '').trim();
        const email_atendente = rawAtendente.toLowerCase();
        const entrada = String(row[mappings.entrada] || '').trim();
        const saida = String(row[mappings.saida] || '').trim();

        if (!email_atendente || !entrada || !saida) return;

        const data_iso = parseDateToISO(entrada);
        const tempo_segundos = calculateNuvidioDurationSeconds(entrada, saida);
        const fingerprint = createFingerprint(email_atendente, entrada, saida);

        if (existingFingerprints.has(fingerprint)) {
          skippedCount += 1;
          return;
        }

        existingFingerprints.add(fingerprint);
        importedCount += 1;

        newNuvidio.push({
          id: `n-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          email_atendente,
          entrada,
          saida,
          data_iso,
          tempo_segundos,
          created_at: now,
          fingerprint,
        });
      });

      db.nuvidio = newNuvidio;
    }

    // Record import history
    const importRecord: Importacao = {
      id: `imp-${Date.now()}`,
      tipo_base: baseType,
      nome_arquivo: file.originalname,
      quantidade_registros: importedCount,
      data_importacao: now,
      status: 'sucesso',
      modo,
    };

    db.importacoes.unshift(importRecord);

    // Save to persistent file
    saveDatabase();

    return res.json({
      success: true,
      message: `Base de ${baseType.toUpperCase()} processada com sucesso!`,
      importedCount,
      skippedCount,
      totalRows: rows.length,
      mode,
    });
  } catch (error: any) {
    console.error('Process import error:', error);
    return res.status(500).json({ error: `Erro ao importar base: ${error.message || error}` });
  }
});

export default router;

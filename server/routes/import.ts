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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Column Mapping Configuration with extensive aliases
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
        'nomecolaborador',
        'funcionario',
        'agente',
        'nomeagente',
        'analista',
        'pessoa',
        'nomecompleto',
        'name',
        'fullname',
        'nome_operador',
        'nome_atendente',
        'nome_colaborador',
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
        'emailcorporativo',
        'emailcontato',
        'emailusuario',
        'email_atendente',
        'email_operador',
        'email_colaborador',
        'e_mail',
      ],
      optional: true,
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
        'usuariomultimidia',
        'loginintergrall',
        'loginintegral',
        'usuario_intergrall',
        'usuariointergrall',
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
    {
      key: 'supervisor',
      label: 'Supervisor',
      aliases: [
        'supervisor',
        'supervisora',
        'superv',
        'sup',
        'gestor',
        'gestora',
        'coordenador',
        'coordenadora',
        'coord',
        'lider',
        'lideranca',
        'chefe',
        'gerente',
        'supervisor_nome',
        'nome_supervisor',
        'nomedosupervisor',
        'supervisordoperador',
      ],
      optional: true,
    },
  ],
  pausas: [
    {
      key: 'data',
      label: 'Data',
      aliases: [
        'data',
        'date',
        'datapausa',
        'datadapausa',
        'dataemissao',
        'dia',
        'datainicio',
        'dtpausa',
        'dt_pausa',
        'data_pausa',
        'data_inicio',
      ],
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
        'loginintergrall',
        'loginpausa',
        'operadorpausa',
        'usuario_intergrall',
        'usuariointergrall',
      ],
    },
    {
      key: 'pausa',
      label: 'Pausa',
      aliases: [
        'pausa',
        'tipopausa',
        'motivo',
        'motivopausa',
        'nomepausa',
        'descricao',
        'status',
        'tipo',
        'despausa',
        'descpausa',
        'tipo_pausa',
        'motivo_pausa',
      ],
    },
    {
      key: 'inicio',
      label: 'Início',
      aliases: [
        'inicio',
        'horainicio',
        'start',
        'horadeinicio',
        'entrada',
        'horarioinicio',
        'iniciopausa',
        'horainiciopausa',
        'h_inicio',
        'hora_inicio',
        'inicio_pausa',
        'abertura',
      ],
    },
    {
      key: 'fim',
      label: 'Fim',
      aliases: [
        'fim',
        'horafim',
        'end',
        'horadefim',
        'termino',
        'horariofim',
        'saida',
        'fimpausa',
        'horafimpausa',
        'h_fim',
        'hora_fim',
        'fim_pausa',
        'fechamento',
      ],
    },
    {
      key: 'tempo',
      label: 'Tempo',
      aliases: [
        'tempo',
        'duracao',
        'duracaopausa',
        'tempopausa',
        'tempototal',
        'duracaototal',
        'tempo_pausa',
        'duracao_pausa',
      ],
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
        'emailnuvidio',
        'atendente_email',
        'email_atendente',
        'e_mail_atendente',
        'nome',
        'nomedoatendente',
        'nomeatendente',
        'nomedooperador',
        'nomeoperador',
        'operador',
        'colaborador',
        'nomedocolaborador',
        'usuario',
        'user',
        'agente',
        'nomedoagente',
        'emaildoagente',
        'login',
        'atendentenome',
        'nome_atendente',
        'nome_operador',
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
        'datahoraentrada',
        'data_hora_entrada',
        'dt_entrada',
        'entrada_chamada',
        'atendente_entrou',
        'inicio_chamada',
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
        'datahorasaida',
        'data_hora_saida',
        'dt_saida',
        'saida_chamada',
        'atendente_saiu',
        'fim_chamada',
      ],
    },
  ],
};

/**
 * Split single-row strings if delimited by semicolon, tab, or pipe
 */
function normalizeRowData(row: any[]): string[] {
  if (!row || row.length === 0) return [];

  if (row.length === 1 && typeof row[0] === 'string') {
    const val = row[0];
    if (val.includes(';')) {
      return val.split(';').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
    if (val.includes('\t')) {
      return val.split('\t').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
    if (val.includes('|')) {
      return val.split('|').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
  }

  return row.map((cell: any) => {
    if (cell === null || cell === undefined) return '';
    if (cell instanceof Date) return cell.toISOString();
    if (typeof cell === 'object') {
      if (cell.w !== undefined) return String(cell.w).trim();
      if (cell.v !== undefined) return String(cell.v).trim();
      return String(cell).trim();
    }
    return String(cell).trim();
  });
}

/**
 * Helper to parse Excel or CSV buffer into row objects using XLSX (SheetJS) and PapaParse
 */
async function parseFileRows(
  fileBuffer: Buffer,
  fileName: string,
  baseType?: 'operadores' | 'pausas' | 'nuvidio'
): Promise<{ headers: string[]; rows: any[] }> {
  let rawMatrix: string[][] = [];
  const textContent = fileBuffer.toString('utf-8');

  // 1. Check if textContent is JSON array
  const trimmed = textContent.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const arr = Array.isArray(parsedJson)
        ? parsedJson
        : parsedJson.data || parsedJson.items || parsedJson.rows || [parsedJson];
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
        const headers = Object.keys(arr[0]);
        const rows = arr.map((item) => {
          const rowObj: Record<string, string> = {};
          headers.forEach((h) => {
            rowObj[h] = item[h] !== undefined && item[h] !== null ? String(item[h]).trim() : '';
          });
          return rowObj;
        });
        return { headers, rows };
      }
    } catch {}
  }

  // 2. Try parsing with XLSX (if binary/excel file)
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
      rawMatrix = jsonData.map(normalizeRowData);
    }
  } catch (xlsxErr) {
    // console.warn('XLSX parse error, falling back to PapaParse:', xlsxErr);
  }

  // 3. Fallback to PapaParse for CSV, TSV (tab-separated from Excel/SSMS), or semicolon delimited
  if (rawMatrix.length === 0) {
    try {
      const parsed = Papa.parse(textContent, { header: false, skipEmptyLines: true });
      rawMatrix = (parsed.data as any[][]).map(normalizeRowData);
    } catch (csvErr) {
      console.error('PapaParse failed as well:', csvErr);
    }
  }

  if (rawMatrix.length === 0) {
    return { headers: [], rows: [] };
  }

  // Determine the best header row by scoring candidate rows (0 to 15)
  const knownAliases = baseType
    ? REQUIRED_FIELDS[baseType].flatMap((f) => f.aliases)
    : Object.values(REQUIRED_FIELDS)
        .flatMap((fields) => fields.flatMap((f) => f.aliases));

  let bestHeaderIndex = 0;
  let maxScore = -1;

  for (let i = 0; i < Math.min(15, rawMatrix.length); i++) {
    const row = rawMatrix[i];
    if (!row || row.length === 0) continue;

    let score = 0;
    const nonEmpties = row.filter((c) => c !== '').length;

    row.forEach((cell) => {
      const norm = normalizeColumnHeader(cell);
      if (norm && knownAliases.includes(norm)) {
        score += 3;
      } else if (norm && norm.length > 2) {
        score += 0.5;
      }
    });

    if (score > maxScore && nonEmpties >= 2) {
      maxScore = score;
      bestHeaderIndex = i;
    }
  }

  const rawHeaders = rawMatrix[bestHeaderIndex] || [];
  const headers: string[] = rawHeaders.map((h, idx) => h || `Coluna_${idx + 1}`);

  // Trim trailing empty headers
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  const rows: any[] = [];
  for (let i = bestHeaderIndex + 1; i < rawMatrix.length; i++) {
    const rowArr = rawMatrix[i];
    if (!rowArr || rowArr.length === 0) continue;

    const rowObj: Record<string, string> = {};
    let hasData = false;

    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      if (!headerName) continue;

      const val = rowArr[c] !== undefined ? String(rowArr[c]).trim() : '';
      if (val !== '') {
        hasData = true;
      }
      rowObj[headerName] = val;
    }

    if (hasData) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Maps input file headers to target field definitions with optional manual override
 */
function findColumnMappings(
  headers: string[],
  baseType: 'operadores' | 'pausas' | 'nuvidio',
  manualMappings?: Record<string, string>
) {
  const fields = REQUIRED_FIELDS[baseType];
  const mappings: Record<string, string> = {}; // key -> original header
  const missingLabels: string[] = [];
  const usedHeaders = new Set<string>();

  // If manual mappings provided, validate them against headers
  if (manualMappings && typeof manualMappings === 'object') {
    for (const field of fields) {
      const chosenHeader = manualMappings[field.key];
      if (chosenHeader && headers.includes(chosenHeader)) {
        mappings[field.key] = chosenHeader;
        usedHeaders.add(chosenHeader);
      }
    }
  }

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeColumnHeader(h),
  }));

  for (const field of fields) {
    if (mappings[field.key]) continue; // Already mapped manually

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
          (field.key === 'nome' && (hObj.normalized.includes('nome') || hObj.normalized.includes('operador') || hObj.normalized.includes('atendente') || hObj.normalized.includes('colaborador'))) ||
          (field.key === 'email' && hObj.normalized.includes('email')) ||
          (field.key === 'usuario' && (hObj.normalized.includes('intergrall') || hObj.normalized.includes('integral') || hObj.normalized.includes('usuario') || hObj.normalized.includes('user') || hObj.normalized.includes('login') || hObj.normalized.includes('matricula') || hObj.normalized.includes('re'))) ||
          (field.key === 'pausa' && (hObj.normalized.includes('pausa') || hObj.normalized.includes('motivo'))) ||
          (field.key === 'tempo' && (hObj.normalized.includes('tempo') || hObj.normalized.includes('duracao'))) ||
          (field.key === 'supervisor' &&
            (hObj.normalized.includes('supervisor') ||
              hObj.normalized.includes('superv') ||
              hObj.normalized.includes('coord') ||
              hObj.normalized.includes('gestor') ||
              hObj.normalized.includes('lider'))) ||
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

  // Special fallback for Operadores: if email is missing, reuse usuario column or generate
  if (baseType === 'operadores' && !mappings.email && mappings.usuario) {
    mappings.email = mappings.usuario; // Fallback so email won't block
  }

  return {
    valid: missingLabels.length === 0,
    mappings,
    missingLabels,
    columnsFound: headers,
  };
}

/**
 * Download Template Endpoint
 */
router.get('/template/:tipo_base', (req: Request, res: Response) => {
  const baseType = req.params.tipo_base as 'operadores' | 'pausas' | 'nuvidio';
  if (!baseType || !REQUIRED_FIELDS[baseType]) {
    return res.status(400).json({ error: 'Tipo de base inválido' });
  }

  let sampleData: any[] = [];
  let filename = '';

  if (baseType === 'operadores') {
    filename = 'modelo_base_operadores.xlsx';
    sampleData = [
      {
        Nome: 'Tainá Martins',
        'E-mail': 'taina.martins@proativacontactcenter.com.br',
        INTERGRALL: 'taina.martins',
        Produto: 'PINE',
        Supervisor: 'Carlos Souza',
      },
      {
        Nome: 'Maria Silva',
        'E-mail': 'maria.silva@proativacontactcenter.com.br',
        INTERGRALL: 'maria.silva',
        Produto: 'CEDRO',
        Supervisor: 'Ana Paula',
      },
    ];
  } else if (baseType === 'pausas') {
    filename = 'modelo_base_pausas.xlsx';
    sampleData = [
      {
        Data: '11/08/2026',
        INTERGRALL: 'taina.martins',
        Pausa: 'Lanche',
        Início: '10:00:00',
        Fim: '10:15:00',
        Tempo: '00:15:00',
        Produto: 'PINE',
      },
      {
        Data: '11/08/2026',
        INTERGRALL: 'maria.silva',
        Pausa: 'Almoço',
        Início: '12:00:00',
        Fim: '13:00:00',
        Tempo: '01:00:00',
        Produto: 'CEDRO',
      },
    ];
  } else if (baseType === 'nuvidio') {
    filename = 'modelo_base_nuvidio.xlsx';
    sampleData = [
      {
        'Email do atendente': 'taina.martins@proativacontactcenter.com.br',
        'Atendente entrou na chamada (Formatado)': '11/08/2026 19:56',
        'Atendente saiu da chamada (Formatado)': '11/08/2026 19:58',
      },
      {
        'Email do atendente': 'maria.silva@proativacontactcenter.com.br',
        'Atendente entrou na chamada (Formatado)': '11/08/2026 08:30',
        'Atendente saiu da chamada (Formatado)': '11/08/2026 11:05',
      },
    ];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buf);
});

/**
 * Preview endpoint: validates file structure and displays detected columns
 */
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const rawText = req.body.raw_text as string | undefined;
    const baseType = req.body.tipo_base as 'operadores' | 'pausas' | 'nuvidio';
    let manualMappings: Record<string, string> | undefined;

    if (req.body.column_mappings) {
      try {
        manualMappings = typeof req.body.column_mappings === 'string'
          ? JSON.parse(req.body.column_mappings)
          : req.body.column_mappings;
      } catch {
        // ignore parse error
      }
    }

    let fileBuffer: Buffer | null = null;
    let fileName = 'arquivo.xlsx';

    if (file) {
      fileBuffer = file.buffer;
      fileName = file.originalname;
    } else if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
      fileBuffer = Buffer.from(rawText.trim(), 'utf-8');
      fileName = 'texto_colado.tsv';
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'Nenhum arquivo ou texto enviado.' });
    }

    if (!baseType || !REQUIRED_FIELDS[baseType]) {
      return res.status(400).json({ error: 'Tipo de base inválido.' });
    }

    const { headers, rows } = await parseFileRows(fileBuffer, fileName, baseType);

    if (headers.length === 0) {
      return res.status(400).json({ error: 'O conteúdo enviado está vazio ou não possui colunas legíveis.' });
    }

    const validation = findColumnMappings(headers, baseType, manualMappings);

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
      fileName,
      totalRows: rows.length,
      columnsFound: validation.columnsFound,
      missingColumns: validation.missingLabels,
      mappedColumns: validation.mappings,
      sampleRows,
      requiredFields: REQUIRED_FIELDS[baseType].map((f) => ({
        key: f.key,
        label: f.label,
        optional: !!(f as any).optional,
      })),
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return res.status(500).json({ error: `Erro ao analisar dados: ${error.message || error}` });
  }
});

/**
 * Process & Import endpoint: inserts or replaces base records in database
 */
router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const rawText = req.body.raw_text as string | undefined;
    const baseType = req.body.tipo_base as 'operadores' | 'pausas' | 'nuvidio';
    const mode = ((req.body.modo || req.body.mode || 'substituir') as 'substituir' | 'adicionar');
    const modo = mode;

    let manualMappings: Record<string, string> | undefined;
    if (req.body.column_mappings) {
      try {
        manualMappings = typeof req.body.column_mappings === 'string'
          ? JSON.parse(req.body.column_mappings)
          : req.body.column_mappings;
      } catch {
        // ignore parse error
      }
    }

    let fileBuffer: Buffer | null = null;
    let fileName = 'arquivo.xlsx';

    if (file) {
      fileBuffer = file.buffer;
      fileName = file.originalname;
    } else if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
      fileBuffer = Buffer.from(rawText.trim(), 'utf-8');
      fileName = 'texto_colado.tsv';
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'Nenhum arquivo ou texto enviado.' });
    }

    if (!baseType || !REQUIRED_FIELDS[baseType]) {
      return res.status(400).json({ error: 'Tipo de base inválido.' });
    }

    const { headers, rows } = await parseFileRows(fileBuffer, fileName, baseType);
    const validation = findColumnMappings(headers, baseType, manualMappings);

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
        let email = normalizeEmail(row[mappings.email]);
        const usuario = normalizeUsername(row[mappings.usuario]);
        const produto = mappings.produto ? String(row[mappings.produto] || '').trim() : '';
        const supervisor = mappings.supervisor ? String(row[mappings.supervisor] || '').trim() : '';

        // If email was not provided, derive or use fallback
        if (!email && usuario) {
          if (usuario.includes('@')) {
            email = usuario;
          } else {
            email = `${usuario}@proativacontactcenter.com.br`;
          }
        }

        if (!email && !usuario && !nome) return;

        const fingerprint = createFingerprint(email, usuario);

        if (existingFingerprints.has(fingerprint)) {
          const existingOp = newOperadores.find((o) => o.fingerprint === fingerprint);
          if (existingOp) {
            if (produto && (!existingOp.produto || existingOp.produto === 'Sem Produto')) {
              existingOp.produto = produto;
            }
            if (supervisor && (!existingOp.supervisor || existingOp.supervisor === 'Não Informado')) {
              existingOp.supervisor = supervisor;
            }
          }
          skippedCount += 1;
          return;
        }

        existingFingerprints.add(fingerprint);
        importedCount += 1;

        newOperadores.push({
          id: `op-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          nome: nome || usuario || email,
          email: email || `${usuario}@local`,
          usuario: usuario || email.split('@')[0],
          produto: produto || undefined,
          supervisor: supervisor || 'Não Informado',
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
        const inicio = String(row[mappings.inicio] || '').trim();
        const fim = String(row[mappings.fim] || '').trim();

        let data_iso = parseDateToISO(dataRaw);
        if (!data_iso && inicio) {
          data_iso = parseDateToISO(inicio);
        }
        if (!data_iso && fim) {
          data_iso = parseDateToISO(fim);
        }

        const finalData = dataRaw || (data_iso ? `${data_iso.split('-')[2]}/${data_iso.split('-')[1]}/${data_iso.split('-')[0]}` : '');
        const usuario = normalizeUsername(row[mappings.usuario]);
        const pausa = String(row[mappings.pausa] || '').trim();
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
          data: finalData,
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
      nome_arquivo: fileName || (file ? file.originalname : 'texto_colado.tsv'),
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


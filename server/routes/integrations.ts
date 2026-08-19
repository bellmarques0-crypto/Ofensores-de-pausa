import { Router, Request, Response } from 'express';
import {
  getDb,
  saveDatabase,
  Operador,
  Importacao,
  ApiIntegracaoUsuarios,
} from '../db';
import {
  normalizeEmail,
  normalizeUsername,
  createFingerprint,
} from '../utils';

const router = Router();

/**
 * Intelligent helper to extract values from object with case-insensitive and alias fallbacks
 */
function getFieldVal(item: any, mappedKey?: string, fallbackAliases: string[] = []): string {
  if (!item || typeof item !== 'object') return '';
  if (mappedKey && item[mappedKey] !== undefined && item[mappedKey] !== null) {
    return String(item[mappedKey]).trim();
  }
  // Try case-insensitive on mappedKey
  if (mappedKey) {
    const target = mappedKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(item)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
        if (v !== undefined && v !== null) return String(v).trim();
      }
    }
  }
  // Try fallback aliases
  for (const alias of fallbackAliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, v] of Object.entries(item)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
        if (v !== undefined && v !== null) return String(v).trim();
      }
    }
  }
  return '';
}

/**
 * Intelligent helper to extract array of objects from arbitrary JSON response
 */
function extractArrayFromResponse(data: any, jsonPath?: string): { items: any[]; pathUsed: string } {
  if (!data) return { items: [], pathUsed: '' };

  // If already an array
  if (Array.isArray(data)) {
    return { items: data, pathUsed: 'root (array)' };
  }

  // If specific path requested e.g. "data.users" or "results"
  if (jsonPath && jsonPath.trim()) {
    const parts = jsonPath.trim().split('.');
    let current = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (Array.isArray(current)) {
      return { items: current, pathUsed: jsonPath };
    }
  }

  // Common wrapper keys to auto-detect
  const candidateKeys = [
    'data',
    'users',
    'usuarios',
    'operadores',
    'colaboradores',
    'funcionarios',
    'agentes',
    'items',
    'results',
    'records',
    'rows',
    'list',
    'content',
    'elements',
    'value',
  ];

  for (const key of candidateKeys) {
    if (data && typeof data === 'object' && Array.isArray(data[key])) {
      return { items: data[key], pathUsed: key };
    }
  }

  // Check any first-level key that holds an array of objects
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
        return { items: v, pathUsed: k };
      }
    }
  }

  return { items: [], pathUsed: 'none' };
}

/**
 * Auto-suggests column mappings based on detected JSON keys
 */
function suggestMappings(fields: string[]): {
  nome: string;
  usuario: string;
  email?: string;
  produto?: string;
  supervisor?: string;
} {
  const normMap: Record<string, string> = {};
  fields.forEach((f) => {
    const clean = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    normMap[clean] = f;
  });

  const findBest = (aliases: string[]): string => {
    for (const a of aliases) {
      const clean = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normMap[clean]) return normMap[clean];
      // partial substring match
      for (const [k, orig] of Object.entries(normMap)) {
        if (k.includes(clean) || clean.includes(k)) return orig;
      }
    }
    return '';
  };

  const nome = findBest([
    'nome',
    'nomedooperador',
    'name',
    'fullname',
    'nomecompleto',
    'operador',
    'colaborador',
    'atendente',
    'funcionario',
  ]);

  const usuario = findBest([
    'intergrall',
    'integral',
    'usuario',
    'username',
    'login',
    'matricula',
    'user',
    'codigo',
    're',
    'idoperador',
    'usuariopausas',
  ]);

  const email = findBest([
    'email',
    'emaildooperador',
    'mail',
    'correioeletronico',
    'emailatendente',
    'emailcorporativo',
    'emailcontato',
  ]);

  const produto = findBest([
    'produto',
    'product',
    'campanha',
    'fila',
    'skill',
    'servico',
    'operacao',
    'carteira',
    'projeto',
    'segmento',
    'canal',
    'ilha',
    'celula',
  ]);

  const supervisor = findBest([
    'supervisor',
    'supervisora',
    'gestor',
    'gestora',
    'lider',
    'coordenador',
    'responsavel',
    'gerente',
  ]);

  return {
    nome: nome || fields[0] || '',
    usuario: usuario || fields[1] || '',
    email: email || undefined,
    produto: produto || undefined,
    supervisor: supervisor || undefined,
  };
}

/**
 * Builds HTTP Request options (headers, auth, body) from config
 */
function buildFetchOptions(config: Partial<ApiIntegracaoUsuarios>): {
  headers: Record<string, string>;
  method: string;
  body?: string;
} {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // Auth headers
  if (config.auth_tipo === 'bearer' && config.auth_token) {
    headers['Authorization'] = `Bearer ${config.auth_token.trim()}`;
  } else if (config.auth_tipo === 'basic' && (config.basic_user || config.basic_pass)) {
    const credentials = Buffer.from(
      `${config.basic_user || ''}:${config.basic_pass || ''}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (config.auth_tipo === 'api_key' && config.api_key_header && config.api_key_valor) {
    headers[config.api_key_header.trim()] = config.api_key_valor.trim();
  }

  // Custom headers
  if (config.custom_headers) {
    Object.assign(headers, config.custom_headers);
  }

  const method = (config.metodo || 'GET').toUpperCase();
  let body: string | undefined;

  if (method === 'POST') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = config.request_body || JSON.stringify({});
  }

  return { headers, method, body };
}

/**
 * GET /api/integrations/users/config
 * Returns the currently saved User API Integration configuration
 */
router.get('/users/config', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const config = db.api_integracao_usuarios || {
      enabled: false,
      url: '',
      metodo: 'GET',
      auth_tipo: 'none',
      mapeamento: {
        nome: 'nome',
        usuario: 'intergrall',
        email: 'email',
        produto: 'produto',
        supervisor: 'supervisor',
      },
      modo_padrao: 'substituir',
      ultimo_status: 'nunca',
    };

    return res.json({
      config,
      totalOperadoresAtuais: db.operadores.length,
    });
  } catch (error: any) {
    console.error('Error fetching integration config:', error);
    return res.status(500).json({ error: 'Erro ao buscar configuração da integração.' });
  }
});

/**
 * POST /api/integrations/users/config
 * Saves the User API Integration configuration to persistent database
 */
router.post('/users/config', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const bodyConfig = req.body;

    if (!bodyConfig.url || !bodyConfig.url.trim()) {
      return res.status(400).json({ error: 'A URL da API externa é obrigatória.' });
    }

    const updatedConfig: ApiIntegracaoUsuarios = {
      enabled: bodyConfig.enabled !== false,
      url: bodyConfig.url.trim(),
      metodo: (bodyConfig.metodo === 'POST' ? 'POST' : 'GET'),
      auth_tipo: bodyConfig.auth_tipo || 'none',
      auth_token: bodyConfig.auth_token?.trim() || undefined,
      api_key_header: bodyConfig.api_key_header?.trim() || undefined,
      api_key_valor: bodyConfig.api_key_valor?.trim() || undefined,
      basic_user: bodyConfig.basic_user?.trim() || undefined,
      basic_pass: bodyConfig.basic_pass?.trim() || undefined,
      custom_headers: bodyConfig.custom_headers || undefined,
      request_body: bodyConfig.request_body || undefined,
      json_path: bodyConfig.json_path?.trim() || undefined,
      mapeamento: {
        nome: bodyConfig.mapeamento?.nome || 'nome',
        usuario: bodyConfig.mapeamento?.usuario || 'usuario',
        email: bodyConfig.mapeamento?.email || undefined,
        produto: bodyConfig.mapeamento?.produto || undefined,
        supervisor: bodyConfig.mapeamento?.supervisor || undefined,
      },
      modo_padrao: bodyConfig.modo_padrao === 'adicionar' ? 'adicionar' : 'substituir',
      ultima_sincronizacao: db.api_integracao_usuarios?.ultima_sincronizacao,
      ultimo_status: db.api_integracao_usuarios?.ultimo_status || 'nunca',
      ultimo_total_importados: db.api_integracao_usuarios?.ultimo_total_importados,
      ultimo_erro_msg: db.api_integracao_usuarios?.ultimo_erro_msg,
    };

    db.api_integracao_usuarios = updatedConfig;
    saveDatabase();

    return res.json({
      success: true,
      message: 'Configuração da integração com a API salva com sucesso!',
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('Error saving integration config:', error);
    return res.status(500).json({ error: `Erro ao salvar configuração: ${error.message || error}` });
  }
});

/**
 * POST /api/integrations/users/test
 * Connects to external API, retrieves sample data and suggests mappings
 */
router.post('/users/test', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const config: Partial<ApiIntegracaoUsuarios> = req.body;
    const url = config.url?.trim();

    if (!url) {
      return res.status(400).json({ error: 'URL da API externa não informada.' });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'A URL deve começar com http:// ou https://' });
    }

    const { headers, method, body } = buildFetchOptions(config);

    // Call external API with timeout controller (15s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let apiRes: globalThis.Response;
    try {
      apiRes = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const elapsedMs = Date.now() - startTime;
    const contentType = apiRes.headers.get('content-type') || '';

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => '');
      return res.status(400).json({
        success: false,
        status: apiRes.status,
        statusText: apiRes.statusText,
        elapsedMs,
        error: `A API retornou status HTTP ${apiRes.status} (${apiRes.statusText}). Detalhes: ${errorText.substring(0, 300)}`,
      });
    }

    let responseData: any;
    if (contentType.includes('application/json') || contentType.includes('text/json') || contentType.includes('text/plain')) {
      const rawText = await apiRes.text();
      try {
        responseData = JSON.parse(rawText);
      } catch (e: any) {
        return res.status(400).json({
          success: false,
          status: apiRes.status,
          statusText: apiRes.statusText,
          elapsedMs,
          error: `A resposta da API não é um JSON válido. Prévia: ${rawText.substring(0, 200)}`,
        });
      }
    } else {
      responseData = await apiRes.json().catch(async () => {
        const text = await apiRes.text();
        return JSON.parse(text);
      });
    }

    const { items, pathUsed } = extractArrayFromResponse(responseData, config.json_path);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        status: apiRes.status,
        statusText: apiRes.statusText,
        elapsedMs,
        pathUsed,
        error: 'Nenhum array de usuários foi encontrado na resposta JSON. Verifique o "Caminho do Array (JSON Path)" ou a estrutura retornada.',
        rawPreview: typeof responseData === 'object' ? Object.keys(responseData) : typeof responseData,
      });
    }

    // Extract all unique fields across the first 20 records
    const fieldsSet = new Set<string>();
    items.slice(0, 20).forEach((item) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach((k) => fieldsSet.add(k));
      }
    });

    const detectedFields = Array.from(fieldsSet);
    const suggested = suggestMappings(detectedFields);

    return res.json({
      success: true,
      status: apiRes.status,
      statusText: apiRes.statusText,
      elapsedMs,
      totalFound: items.length,
      pathUsed,
      detectedFields,
      suggestedMapping: suggested,
      sampleRecords: items.slice(0, 5),
    });
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error('Error testing external user API:', error);
    let msg = error.message || String(error);
    if (error.name === 'AbortError') {
      msg = 'Tempo limite de 15 segundos excedido ao tentar conectar na API externa.';
    }
    return res.status(500).json({
      success: false,
      elapsedMs,
      error: `Erro ao conectar na API externa: ${msg}`,
    });
  }
});

/**
 * POST /api/integrations/users/sync
 * Performs a live synchronization from the external API into the Operadores database
 */
router.post('/users/sync', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const db = getDb();
    // Allow passing override config in request body, otherwise use saved config
    const config: ApiIntegracaoUsuarios = {
      ...(db.api_integracao_usuarios || {
        enabled: true,
        url: '',
        metodo: 'GET',
        auth_tipo: 'none',
        mapeamento: { nome: 'nome', usuario: 'usuario' },
        modo_padrao: 'substituir',
      }),
      ...(req.body || {}),
    };

    if (!config.url || !config.url.trim()) {
      return res.status(400).json({
        error: 'Nenhuma URL de API configurada. Por favor, configure e salve os parâmetros da API primeiro.',
      });
    }

    const { headers, method, body } = buildFetchOptions(config);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let apiRes: globalThis.Response;
    try {
      apiRes = await fetch(config.url.trim(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => '');
      const errMsg = `Erro HTTP ${apiRes.status} (${apiRes.statusText}): ${errText.substring(0, 200)}`;

      if (db.api_integracao_usuarios) {
        db.api_integracao_usuarios.ultimo_status = 'erro';
        db.api_integracao_usuarios.ultimo_erro_msg = errMsg;
        saveDatabase();
      }

      return res.status(400).json({
        success: false,
        error: errMsg,
      });
    }

    const rawText = await apiRes.text();
    let responseData: any;
    try {
      responseData = JSON.parse(rawText);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'A resposta da API externa não pôde ser interpretada como JSON.',
      });
    }

    const { items, pathUsed } = extractArrayFromResponse(responseData, config.json_path);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum usuário foi retornado pela API externa no caminho indicado.',
      });
    }

    const now = new Date().toISOString();
    const mode = (req.body?.modo || config.modo_padrao || 'substituir') as 'substituir' | 'adicionar';
    const mappings = config.mapeamento || { nome: 'nome', usuario: 'usuario' };

    const existingFingerprints = new Set(
      mode === 'substituir' ? [] : db.operadores.map((o) => o.fingerprint)
    );
    const newOperadores: Operador[] = mode === 'substituir' ? [] : [...db.operadores];

    let importedCount = 0;
    let skippedCount = 0;

    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;

      const rawNome = getFieldVal(item, mappings.nome, ['nome', 'name', 'fullname', 'nomecompleto', 'operador', 'colaborador']);
      const rawUsuario = getFieldVal(item, mappings.usuario, ['intergrall', 'integral', 'usuario', 'username', 'login', 'matricula', 'user', 'codigo', 're']);
      const rawEmail = getFieldVal(item, mappings.email, ['email', 'mail', 'email_nuvidio', 'emailcorporativo']);
      const rawProduto = getFieldVal(item, mappings.produto, ['produto', 'product', 'campanha', 'fila', 'skill', 'operacao', 'carteira']);
      const rawSupervisor = getFieldVal(item, mappings.supervisor, ['supervisor', 'gestor', 'lider', 'coordenador', 'responsavel']);

      const nome = rawNome.trim();
      let email = normalizeEmail(rawEmail);
      const usuario = normalizeUsername(rawUsuario);
      const produto = rawProduto.trim();
      const supervisor = rawSupervisor.trim();

      // Fallback email if missing
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
          if (nome && existingOp.nome !== nome) {
            existingOp.nome = nome;
          }
        }
        skippedCount += 1;
        return;
      }

      existingFingerprints.add(fingerprint);
      importedCount += 1;

      newOperadores.push({
        id: `op-api-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
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

    // Record import history
    const importRecord: Importacao = {
      id: `imp-api-${Date.now()}`,
      tipo_base: 'operadores',
      nome_arquivo: `API Externa: ${config.url.split('?')[0].substring(0, 40)}`,
      quantidade_registros: importedCount,
      data_importacao: now,
      status: 'sucesso',
      modo: mode,
    };
    db.importacoes.unshift(importRecord);

    // Update integration sync state
    if (!db.api_integracao_usuarios) {
      db.api_integracao_usuarios = config;
    }
    db.api_integracao_usuarios.ultima_sincronizacao = now;
    db.api_integracao_usuarios.ultimo_status = 'sucesso';
    db.api_integracao_usuarios.ultimo_total_importados = importedCount;
    db.api_integracao_usuarios.ultimo_erro_msg = undefined;

    saveDatabase();

    const elapsedMs = Date.now() - startTime;

    return res.json({
      success: true,
      message: `Sincronização via API concluída com sucesso! ${importedCount} operadores importados/atualizados.`,
      importedCount,
      skippedCount,
      totalFound: items.length,
      totalOperadoresAtuais: db.operadores.length,
      mode,
      pathUsed,
      timestamp: now,
      elapsedMs,
    });
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error('Error during live API sync:', error);
    const db = getDb();
    if (db.api_integracao_usuarios) {
      db.api_integracao_usuarios.ultimo_status = 'erro';
      db.api_integracao_usuarios.ultimo_erro_msg = error.message || String(error);
      saveDatabase();
    }
    return res.status(500).json({
      success: false,
      elapsedMs,
      error: `Falha na sincronização com a API: ${error.message || error}`,
    });
  }
});

/**
 * POST /api/integrations/users/webhook
 * Ingests user records pushed directly from external systems via HTTP POST
 */
router.post('/users/webhook', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Nenhum payload JSON recebido.' });
    }

    const db = getDb();

    // Check optional authentication token if configured
    const expectedToken = db.api_integracao_usuarios?.auth_token;
    if (expectedToken) {
      const authHeader = req.headers.authorization || '';
      const apiKeyHeader = req.headers['x-api-key'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (token !== expectedToken && apiKeyHeader !== expectedToken) {
        return res.status(401).json({ error: 'Não autorizado. Token de API inválido.' });
      }
    }

    let items: any[] = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (Array.isArray(payload.usuarios)) {
      items = payload.usuarios;
    } else if (Array.isArray(payload.operadores)) {
      items = payload.operadores;
    } else if (Array.isArray(payload.users)) {
      items = payload.users;
    } else if (Array.isArray(payload.data)) {
      items = payload.data;
    } else if (typeof payload === 'object') {
      items = [payload];
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'Nenhum registro de usuário encontrado no payload.' });
    }

    const now = new Date().toISOString();
    const mode = (req.query.mode === 'substituir' ? 'substituir' : 'adicionar');

    const existingFingerprints = new Set(
      mode === 'substituir' ? [] : db.operadores.map((o) => o.fingerprint)
    );
    const newOperadores: Operador[] = mode === 'substituir' ? [] : [...db.operadores];

    let importedCount = 0;

    items.forEach((item, idx) => {
      const nome = getFieldVal(item, undefined, ['nome', 'name', 'fullname', 'nomecompleto', 'operador', 'colaborador']);
      const rawUsuario = getFieldVal(item, undefined, ['intergrall', 'integral', 'usuario', 'username', 'login', 'matricula', 'user', 'codigo', 're']);
      const rawEmail = getFieldVal(item, undefined, ['email', 'mail', 'email_nuvidio', 'emailcorporativo']);
      const rawProduto = getFieldVal(item, undefined, ['produto', 'product', 'campanha', 'fila', 'skill', 'operacao', 'carteira']);
      const rawSupervisor = getFieldVal(item, undefined, ['supervisor', 'gestor', 'lider', 'coordenador', 'responsavel']);

      let email = normalizeEmail(rawEmail);
      const usuario = normalizeUsername(rawUsuario);
      const produto = rawProduto.trim();
      const supervisor = rawSupervisor.trim();

      if (!email && usuario) {
        email = usuario.includes('@') ? usuario : `${usuario}@proativacontactcenter.com.br`;
      }

      if (!email && !usuario && !nome) return;

      const fingerprint = createFingerprint(email, usuario);

      if (existingFingerprints.has(fingerprint)) {
        const existingOp = newOperadores.find((o) => o.fingerprint === fingerprint);
        if (existingOp) {
          if (produto) existingOp.produto = produto;
          if (supervisor) existingOp.supervisor = supervisor;
          if (nome) existingOp.nome = nome;
        }
        return;
      }

      existingFingerprints.add(fingerprint);
      importedCount += 1;

      newOperadores.push({
        id: `op-hook-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
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

    const importRecord: Importacao = {
      id: `imp-hook-${Date.now()}`,
      tipo_base: 'operadores',
      nome_arquivo: 'Webhook / Push API Externa',
      quantidade_registros: importedCount,
      data_importacao: now,
      status: 'sucesso',
      modo: mode,
    };
    db.importacoes.unshift(importRecord);

    saveDatabase();

    return res.json({
      success: true,
      message: `${importedCount} operadores recebidos e sincronizados com sucesso via Webhook!`,
      importedCount,
      totalOperadoresAtuais: db.operadores.length,
      mode,
    });
  } catch (error: any) {
    console.error('Webhook ingestion error:', error);
    return res.status(500).json({ error: `Erro no processamento do webhook: ${error.message || error}` });
  }
});

/**
 * GET /api/integrations/users/sample-payload
 * Returns sample JSON structures for Webhook / REST Push
 */
router.get('/users/sample-payload', (req: Request, res: Response) => {
  return res.json({
    webhook_url: '/api/integrations/users/webhook',
    method: 'POST',
    description: 'Envie um array de objetos JSON para sincronizar usuários automaticamente sem planilha. O campo Intergrall identifica o operador.',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <SEU_TOKEN_OPCIONAL>',
    },
    example_payload: [
      {
        nome: 'Tainá Martins',
        intergrall: 'taina.martins',
        email: 'taina.martins@proativacontactcenter.com.br',
        produto: 'PINE',
        supervisor: 'Carlos Souza',
      },
      {
        nome: 'Maria Silva',
        intergrall: 'maria.silva',
        email: 'maria.silva@proativacontactcenter.com.br',
        produto: 'CEDRO',
        supervisor: 'Ana Paula',
      },
    ],
  });
});

export default router;

import React, { useState, useEffect } from 'react';
import {
  ApiIntegracaoUsuarios,
  ApiTestResult,
  ApiSyncResult,
} from '../types';
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Key,
  Database,
  Code2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';

interface ApiUserIntegrationProps {
  onSyncSuccess?: () => void;
}

export const ApiUserIntegration: React.FC<ApiUserIntegrationProps> = ({ onSyncSuccess }) => {
  const [config, setConfig] = useState<ApiIntegracaoUsuarios>({
    enabled: true,
    url: '',
    metodo: 'GET',
    auth_tipo: 'none',
    auth_token: '',
    api_key_header: 'X-API-Key',
    api_key_valor: '',
    basic_user: '',
    basic_pass: '',
    custom_headers: {},
    request_body: '',
    json_path: '',
    mapeamento: {
      nome: 'nome',
      usuario: 'intergrall',
      email: 'email',
      produto: 'produto',
      supervisor: 'supervisor',
    },
    modo_padrao: 'substituir',
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [syncingApi, setSyncingApi] = useState(false);
  const [syncMode, setSyncMode] = useState<'substituir' | 'adicionar'>('substituir');

  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const [syncResult, setSyncResult] = useState<ApiSyncResult | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showToken, setShowToken] = useState(false);
  const [customHeaderKey, setCustomHeaderKey] = useState('');
  const [customHeaderVal, setCustomHeaderVal] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'webhook'>('config');

  // Load saved config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/integrations/users/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
            mapeamento: {
              ...prev.mapeamento,
              ...(data.config.mapeamento || {}),
            },
          }));
          if (data.config.modo_padrao) {
            setSyncMode(data.config.modo_padrao);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching integration config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config.url.trim()) {
      setFeedback({ type: 'error', text: 'Por favor, informe a URL da API externa.' });
      return;
    }

    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/integrations/users/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, modo_padrao: syncMode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configuração.');
      }

      setFeedback({ type: 'success', text: 'Configuração da API de usuários salva com sucesso!' });
      if (data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao salvar configuração.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.url.trim()) {
      setFeedback({ type: 'error', text: 'Informe a URL da API antes de testar a conexão.' });
      return;
    }

    setTestingApi(true);
    setTestResult(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/integrations/users/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao testar conexão com a API.');
      }

      setTestResult(data);
      // Auto apply suggested mappings if current mappings are empty or default
      if (data.suggestedMapping) {
        setConfig((prev) => ({
          ...prev,
          mapeamento: {
            nome: prev.mapeamento.nome || data.suggestedMapping.nome,
            usuario: prev.mapeamento.usuario || data.suggestedMapping.usuario,
            email: prev.mapeamento.email || data.suggestedMapping.email || 'email',
            produto: prev.mapeamento.produto || data.suggestedMapping.produto || 'produto',
            supervisor: prev.mapeamento.supervisor || data.suggestedMapping.supervisor || 'supervisor',
          },
        }));
      }

      setFeedback({
        type: 'success',
        text: `Conexão bem-sucedida! ${data.totalFound} registros encontrados em ${data.elapsedMs}ms.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao testar conexão.' });
    } finally {
      setTestingApi(false);
    }
  };

  const handleSyncNow = async () => {
    if (!config.url.trim()) {
      setFeedback({ type: 'error', text: 'Informe a URL da API antes de sincronizar.' });
      return;
    }

    setSyncingApi(true);
    setSyncResult(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/integrations/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, modo: syncMode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro na sincronização de usuários.');
      }

      setSyncResult(data);
      setFeedback({
        type: 'success',
        text: `Sincronização realizada! ${data.importedCount} operadores atualizados com sucesso no sistema.`,
      });

      // Update state
      setConfig((prev) => ({
        ...prev,
        ultima_sincronizacao: data.timestamp,
        ultimo_status: 'sucesso',
        ultimo_total_importados: data.importedCount,
        ultimo_erro_msg: undefined,
      }));

      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao sincronizar usuários.' });
      setConfig((prev) => ({
        ...prev,
        ultimo_status: 'erro',
        ultimo_erro_msg: err.message,
      }));
    } finally {
      setSyncingApi(false);
    }
  };

  const handleAddHeader = () => {
    if (!customHeaderKey.trim()) return;
    setConfig((prev) => ({
      ...prev,
      custom_headers: {
        ...(prev.custom_headers || {}),
        [customHeaderKey.trim()]: customHeaderVal.trim(),
      },
    }));
    setCustomHeaderKey('');
    setCustomHeaderVal('');
  };

  const handleRemoveHeader = (key: string) => {
    setConfig((prev) => {
      const newHeaders = { ...(prev.custom_headers || {}) };
      delete newHeaders[key];
      return { ...prev, custom_headers: newHeaders };
    });
  };

  const copyWebhookCurl = () => {
    const webhookUrl = `${window.location.origin}/api/integrations/users/webhook`;
    const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "nome": "Colaborador Exemplo",
      "usuario": "colaborador.login",
      "email": "colaborador@empresa.com.br",
      "produto": "OPERACAO_01",
      "supervisor": "Gestor Exemplo"
    }
  ]'`;
    navigator.clipboard.writeText(curlCommand);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  if (loadingConfig) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-medium">Carregando configurações da API...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">Integração Direta via API (Base de Usuários)</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Sem necessidade de subir planilha
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
                  Conecte o sistema diretamente à API externa do seu ERP, Intergrall ou base de colaboradores para sincronizar dados em tempo real com 1 clique.
                </p>
              </div>
            </div>

            {/* Sync Now Button in Header */}
            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncingApi || !config.url.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {syncingApi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Sincronizar Agora
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Stats Pill Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-300" />
              <span>
                Última sincronização:{' '}
                <strong className="text-white">
                  {config.ultima_sincronizacao
                    ? new Date(config.ultima_sincronizacao).toLocaleString('pt-BR')
                    : 'Nunca executada'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>
                Status:{' '}
                {config.ultimo_status === 'sucesso' ? (
                  <span className="text-emerald-400 font-semibold">● Sucesso</span>
                ) : config.ultimo_status === 'erro' ? (
                  <span className="text-rose-400 font-semibold">● Erro na última tentativa</span>
                ) : (
                  <span className="text-slate-400 font-semibold">● Não sincronizado</span>
                )}
              </span>
            </div>

            {config.ultimo_total_importados !== undefined && (
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-300" />
                <span>
                  Último lote:{' '}
                  <strong className="text-white">{config.ultimo_total_importados} operadores</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('config')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'config'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" /> Buscar de API Externa (Pull)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('webhook')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'webhook'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" /> Receber via Webhook / Push API
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-4 rounded-xl flex items-start gap-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.text}</div>
          </div>
        )}

        {/* TAB 1: PULL FROM EXTERNAL API */}
        {activeSubTab === 'config' && (
          <div className="p-6 space-y-6">
            {/* Step 1: Endpoint & Auth */}
            <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>Configurações do Endpoint Externo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Method */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Método HTTP
                  </label>
                  <select
                    value={config.metodo}
                    onChange={(e) => setConfig({ ...config, metodo: e.target.value as 'GET' | 'POST' })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="GET">GET (Padrão)</option>
                    <option value="POST">POST</option>
                  </select>
                </div>

                {/* URL */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    URL da API Externa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://api.empresa.com.br/v1/usuarios ou https://intergrall.proativa/api/operadores"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Auth Type */}
              <div className="pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipo de Autenticação
                    </label>
                    <select
                      value={config.auth_tipo}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          auth_tipo: e.target.value as 'none' | 'bearer' | 'api_key' | 'basic',
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="none">Nenhuma / Aberta</option>
                      <option value="bearer">Bearer Token (JWT)</option>
                      <option value="api_key">API Key no Header</option>
                      <option value="basic">Basic Auth (Usuário e Senha)</option>
                    </select>
                  </div>

                  {/* Bearer Token */}
                  {config.auth_tipo === 'bearer' && (
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Token de Autenticação (Bearer)
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={config.auth_token || ''}
                          onChange={(e) => setConfig({ ...config, auth_token: e.target.value })}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* API Key */}
                  {config.auth_tipo === 'api_key' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Nome do Header
                        </label>
                        <input
                          type="text"
                          value={config.api_key_header || 'X-API-Key'}
                          onChange={(e) => setConfig({ ...config, api_key_header: e.target.value })}
                          placeholder="X-API-Key, apikey, etc."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Valor da Chave (Secret Key)
                        </label>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={config.api_key_valor || ''}
                            onChange={(e) => setConfig({ ...config, api_key_valor: e.target.value })}
                            placeholder="Chave secreta..."
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Basic Auth */}
                  {config.auth_tipo === 'basic' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Usuário HTTP
                        </label>
                        <input
                          type="text"
                          value={config.basic_user || ''}
                          onChange={(e) => setConfig({ ...config, basic_user: e.target.value })}
                          placeholder="api_user"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Senha HTTP
                        </label>
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={config.basic_pass || ''}
                          onChange={(e) => setConfig({ ...config, basic_pass: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* JSON Path & Additional settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Caminho do Array JSON (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.json_path || ''}
                    onChange={(e) => setConfig({ ...config, json_path: e.target.value })}
                    placeholder="Ex: data, users, colaboradores ou vazio (raiz [])"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                  <span className="text-[11px] text-slate-500">Deixe vazio se a API retornar diretamente uma lista [ ]</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Modo de Sincronização
                  </label>
                  <select
                    value={syncMode}
                    onChange={(e) => setSyncMode(e.target.value as 'substituir' | 'adicionar')}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="substituir">Substituir base de operadores existente</option>
                    <option value="adicionar">Adicionar / Mesclar com existentes</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingApi || !config.url.trim()}
                    className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingApi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Testando Conexão...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Testar e Detectar Campos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Field Mapping (De-Para) */}
            <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Mapeamento de Campos (De-Para dos Dados)</span>
                </div>

                {testResult?.detectedFields && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {testResult.detectedFields.length} campos detectados na resposta
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.mapeamento?.nome || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mapeamento: { ...config.mapeamento, nome: e.target.value },
                      })
                    }
                    placeholder="nome, name, fullname"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-500">Nome do operador</span>
                </div>

                {/* Usuário / Intergrall */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    INTERGRALL (Usuário) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.mapeamento?.usuario || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mapeamento: { ...config.mapeamento, usuario: e.target.value },
                      })
                    }
                    placeholder="intergrall, usuario, login, matricula"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-blue-700 font-medium">Coluna Intergrall (Chave de vínculo)</span>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Nuvidio (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.mapeamento?.email || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mapeamento: { ...config.mapeamento, email: e.target.value },
                      })
                    }
                    placeholder="email, mail, email_nuvidio"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-500">E-mail para cruzamento</span>
                </div>

                {/* Produto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Produto / Operação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.mapeamento?.produto || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mapeamento: { ...config.mapeamento, produto: e.target.value },
                      })
                    }
                    placeholder="produto, campanha, skill"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-500">Segmento ou carteira</span>
                </div>

                {/* Supervisor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supervisor / Gestor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.mapeamento?.supervisor || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mapeamento: { ...config.mapeamento, supervisor: e.target.value },
                      })
                    }
                    placeholder="supervisor, gestor, lider"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-500">Responsável pela equipe</span>
                </div>
              </div>
            </div>

            {/* Step 3: Test Preview Results */}
            {testResult && (
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      Prévia dos Dados Retornados ({testResult.totalFound} registros encontrados)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    HTTP {testResult.status} ({testResult.statusText}) em {testResult.elapsedMs}ms
                  </span>
                </div>

                {/* Preview Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5 border-b border-slate-200">Nome Mapeado</th>
                        <th className="p-2.5 border-b border-slate-200">Usuário Mapeado</th>
                        <th className="p-2.5 border-b border-slate-200">E-mail Mapeado</th>
                        <th className="p-2.5 border-b border-slate-200">Produto</th>
                        <th className="p-2.5 border-b border-slate-200">Supervisor</th>
                        <th className="p-2.5 border-b border-slate-200 text-slate-400">JSON Bruto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {testResult.sampleRecords.map((rec, i) => {
                        const m = config.mapeamento;
                        return (
                          <tr key={i} className="hover:bg-slate-50 font-mono">
                            <td className="p-2.5 font-bold text-slate-900">
                              {String(rec[m.nome] || rec.nome || rec.name || '-')}
                            </td>
                            <td className="p-2.5 text-blue-700 font-bold">
                              {String(rec[m.usuario] || rec.usuario || rec.user || '-')}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {String((m.email && rec[m.email]) || rec.email || '-')}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {String((m.produto && rec[m.produto]) || rec.produto || '-')}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {String((m.supervisor && rec[m.supervisor]) || rec.supervisor || '-')}
                            </td>
                            <td className="p-2.5 text-[10px] text-slate-400 max-w-xs truncate">
                              {JSON.stringify(rec)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig || !config.url.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Salvar Configurações
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncingApi || !config.url.trim()}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {syncingApi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando Usuários...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Executar Sincronização Agora
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: WEBHOOK / PUSH API */}
        {activeSubTab === 'webhook' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Code2 className="w-5 h-5 text-indigo-600" />
                <span>Endpoint de Webhook para Envio Automático</span>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm">
                Se o outro sistema (ERP, automação, agendamento de tarefas) puder enviar dados via HTTP POST, envie o JSON diretamente para o endpoint abaixo sem precisar de ação manual:
              </p>

              {/* Endpoint Box */}
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-xs flex items-center justify-between gap-2 overflow-x-auto">
                <div>
                  <span className="text-emerald-400 font-bold">POST</span>{' '}
                  <span>{window.location.origin}/api/integrations/users/webhook</span>
                </div>
                <button
                  type="button"
                  onClick={copyWebhookCurl}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>

              {/* Sample Payload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Exemplo de Payload JSON (Envio via Body):
                </label>
                <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
{`[
  {
    "nome": "Tainá Martins",
    "usuario": "taina.martins",
    "email": "taina.martins@proativacontactcenter.com.br",
    "produto": "PINE",
    "supervisor": "Carlos Souza"
  },
  {
    "nome": "Maria Silva",
    "usuario": "maria.silva",
    "email": "maria.silva@proativacontactcenter.com.br",
    "produto": "CEDRO",
    "supervisor": "Ana Paula"
  }
]`}
                </pre>
              </div>

              <div className="text-xs text-slate-500 bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                💡 <strong>Dica de Integração:</strong> Os campos obrigatórios mínimos são <code className="font-bold text-blue-800">nome</code> e <code className="font-bold text-blue-800">usuario</code> (INTERGRALL). Se o e-mail não for informado, o sistema deriva automaticamente a partir do usuário.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

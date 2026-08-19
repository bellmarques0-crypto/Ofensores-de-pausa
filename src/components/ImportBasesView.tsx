import React, { useState } from 'react';
import { PreviewData } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Coffee,
  PhoneCall,
  RefreshCw,
  Check,
  X,
  Download,
  Sliders,
  Zap,
} from 'lucide-react';

interface ImportBasesViewProps {
  onImportSuccess: () => void;
  onNavigateToApi?: () => void;
}

type BaseType = 'operadores' | 'pausas' | 'nuvidio';

interface BaseUploadState {
  file: File | null;
  preview: PreviewData | null;
  loadingPreview: boolean;
  error: string | null;
  mode: 'substituir' | 'adicionar';
  manualMappings: Record<string, string>; // fieldKey -> chosenHeader
}

export const ImportBasesView: React.FC<ImportBasesViewProps> = ({
  onImportSuccess,
  onNavigateToApi,
}) => {
  const [bases, setBases] = useState<Record<BaseType, BaseUploadState>>({
    operadores: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir', manualMappings: {} },
    pausas: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir', manualMappings: {} },
    nuvidio: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir', manualMappings: {} },
  });

  const [processingBase, setProcessingBase] = useState<BaseType | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const baseConfigs = [
    {
      type: 'operadores' as BaseType,
      title: '1. BASE DE OPERADORES',
      icon: Users,
      color: 'border-blue-200 bg-blue-50/50 text-blue-700',
      badgeColor: 'bg-blue-100/80 text-blue-800 border border-blue-200',
      requiredCols: ['Nome', 'INTERGRALL', 'E-mail (opcional)', 'Produto (opcional)'],
      description: 'Mapeia colaboradores e suas chaves de integração (INTERGRALL e E-mail).',
    },
    {
      type: 'pausas' as BaseType,
      title: '2. BASE DE PAUSAS',
      icon: Coffee,
      color: 'border-amber-200 bg-amber-50/50 text-amber-700',
      badgeColor: 'bg-amber-100/80 text-amber-800 border border-amber-200',
      requiredCols: ['Data', 'INTERGRALL', 'Pausa', 'Início', 'Fim'],
      description: 'Relatório do sistema de Pausas com horários de início, fim e produto.',
    },
    {
      type: 'nuvidio' as BaseType,
      title: '3. BASE NUVIDIO',
      icon: PhoneCall,
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
      badgeColor: 'bg-emerald-100/80 text-emerald-800 border border-emerald-200',
      requiredCols: ['Email do atendente', 'Entrou na chamada', 'Saiu da chamada'],
      description: 'Extrato de atendimento Nuvidio com entrada e saída dos colaboradores.',
    },
  ];

  const requestPreview = async (type: BaseType, selectedFile: File, mappings?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('tipo_base', type);
    if (mappings && Object.keys(mappings).length > 0) {
      formData.append('column_mappings', JSON.stringify(mappings));
    }

    const res = await fetch('/api/import/preview', {
      method: 'POST',
      body: formData,
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Erro no servidor (${res.status}). Verifique se o arquivo é uma planilha válida.`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao validar colunas do arquivo.');
    }

    return data as PreviewData & {
      requiredFields: Array<{ key: string; label: string; optional?: boolean }>;
    };
  };

  const handleFileSelect = async (type: BaseType, selectedFile: File | null) => {
    if (!selectedFile) return;

    setBases((prev) => ({
      ...prev,
      [type]: { ...prev[type], file: selectedFile, loadingPreview: true, error: null, manualMappings: {} },
    }));

    try {
      const data = await requestPreview(type, selectedFile);

      setBases((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loadingPreview: false,
          preview: data,
          manualMappings: data.mappedColumns || {},
          error: data.valid ? null : `Colunas faltando: ${(data.missingColumns || []).join(', ')}. Selecione abaixo.`,
        },
      }));
    } catch (err: any) {
      setBases((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loadingPreview: false,
          error: err.message || 'Falha ao analisar o arquivo.',
        },
      }));
    }
  };

  const handleMappingChange = async (type: BaseType, fieldKey: string, chosenHeader: string) => {
    const currentState = bases[type];
    if (!currentState.file) return;

    const newMappings = {
      ...currentState.manualMappings,
      [fieldKey]: chosenHeader,
    };

    setBases((prev) => ({
      ...prev,
      [type]: { ...prev[type], manualMappings: newMappings, loadingPreview: true },
    }));

    try {
      const data = await requestPreview(type, currentState.file, newMappings);
      setBases((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loadingPreview: false,
          preview: data,
          error: data.valid ? null : `Colunas faltando: ${(data.missingColumns || []).join(', ')}`,
        },
      }));
    } catch (err: any) {
      setBases((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loadingPreview: false,
          error: err.message || 'Erro ao remapear colunas.',
        },
      }));
    }
  };

  const handleProcessBase = async (type: BaseType) => {
    const baseState = bases[type];
    if (!baseState.file) return;

    setProcessingBase(type);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', baseState.file);
    formData.append('tipo_base', type);
    formData.append('modo', baseState.mode);
    if (Object.keys(baseState.manualMappings).length > 0) {
      formData.append('column_mappings', JSON.stringify(baseState.manualMappings));
    }

    try {
      const res = await fetch('/api/import/process', {
        method: 'POST',
        body: formData,
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Erro ao importar (${res.status}). O servidor não retornou uma resposta válida.`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar base.');
      }

      setStatusMessage({
        type: 'success',
        text: `${data.message} (${data.importedCount} registros importados, ${data.skippedCount} duplicados ignorados).`,
      });

      // Reset base file state after success
      setBases((prev) => ({
        ...prev,
        [type]: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir', manualMappings: {} },
      }));

      onImportSuccess();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao importar base.',
      });
    } finally {
      setProcessingBase(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-blue-900 text-white rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-300" />
            Importação e Validação de Bases
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-3xl">
            Suba arquivos .xlsx, .xls ou .csv. O sistema reconhece os cabeçalhos automaticamente e permite remapear colunas caso necessário.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onNavigateToApi && (
            <button
              type="button"
              onClick={onNavigateToApi}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4" />
              Sincronizar Operadores via API
            </button>
          )}
          <div className="text-xs bg-blue-800/80 border border-blue-700/80 px-3 py-2 rounded-lg text-blue-200 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Suporta Excel e CSV
          </div>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 Upload Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {baseConfigs.map((config) => {
          const Icon = config.icon;
          const state = bases[config.type];
          const isProcessing = processingBase === config.type;

          return (
            <div
              key={config.type}
              className={`bg-white rounded-xl border-2 p-5 shadow-xs flex flex-col justify-between ${
                state.preview?.valid
                  ? 'border-emerald-300 bg-emerald-50/10'
                  : state.error
                  ? 'border-rose-300 bg-rose-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Title Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{config.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3">{config.description}</p>

                {/* Download Template Link & API Alternative */}
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                  <a
                    href={`/api/import/template/${config.type}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar modelo (.xlsx)
                  </a>

                  {config.type === 'operadores' && onNavigateToApi && (
                    <button
                      type="button"
                      onClick={onNavigateToApi}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Buscar via API (Sem Planilha)
                    </button>
                  )}
                </div>

                {/* Required Columns Pill List */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider mb-1.5">
                    Campos Esperados:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.requiredCols.map((col) => (
                      <span
                        key={col}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${config.badgeColor}`}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dropzone File Selector */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecionar Planilha
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-white">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) =>
                        handleFileSelect(config.type, e.target.files?.[0] || null)
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {state.file ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate px-2">
                          {state.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(state.file.size / 1024).toFixed(1)} KB • Clique para alterar
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-blue-600">
                          Clique para selecionar arquivo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Arquivos .xlsx, .xls ou .csv
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loading Preview Spinner */}
                {state.loadingPreview && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    Analisando estrutura da planilha...
                  </div>
                )}

                {/* Column Validation & Manual Mapping */}
                {state.preview && !state.loadingPreview && (
                  <div className="space-y-3 mb-4">
                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        state.preview.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1">
                        {state.preview.valid ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Planilha pronta ({state.preview.totalRows} linhas)</span>
                          </>
                        ) : (
                          <>
                            <Sliders className="w-4 h-4 text-amber-600" />
                            <span>Mapeie os campos abaixo:</span>
                          </>
                        )}
                      </div>

                      {state.preview.missingColumns && state.preview.missingColumns.length > 0 && (
                        <p className="text-[11px] text-amber-800 font-medium mt-1">
                          Escolha no menu suspenso a coluna correspondente a cada campo faltante.
                        </p>
                      )}
                    </div>

                    {/* Manual Column Remapping Selectors */}
                    {(state.preview as any).requiredFields && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Mapeamento de Colunas:
                        </span>
                        {((state.preview as any).requiredFields as Array<{ key: string; label: string; optional?: boolean }>).map(
                          (field) => {
                            const currentMatch = state.manualMappings[field.key] || '';
                            const isMissing = !currentMatch && !field.optional;

                            return (
                              <div key={field.key} className="flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-slate-600 flex items-center justify-between">
                                  <span>
                                    {field.label} {field.optional && <span className="text-slate-400 font-normal">(opcional)</span>}:
                                  </span>
                                  {currentMatch ? (
                                    <span className="text-[10px] text-emerald-600 font-bold">✓ Mapeado</span>
                                  ) : isMissing ? (
                                    <span className="text-[10px] text-rose-600 font-bold">⚠️ Selecione</span>
                                  ) : null}
                                </label>
                                <select
                                  value={currentMatch}
                                  onChange={(e) => handleMappingChange(config.type, field.key, e.target.value)}
                                  className={`text-xs p-1.5 rounded-md border font-mono bg-white cursor-pointer ${
                                    isMissing ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <option value="">-- Escolha uma coluna --</option>
                                  {state.preview?.columnsFound.map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* Mode Selector */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Modo de Importação:
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                          <input
                            type="radio"
                            name={`mode-${config.type}`}
                            value="substituir"
                            checked={state.mode === 'substituir'}
                            onChange={() =>
                              setBases((prev) => ({
                                ...prev,
                                [config.type]: { ...prev[config.type], mode: 'substituir' },
                              }))
                            }
                            className="text-blue-600"
                          />
                          Substituir base
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                          <input
                            type="radio"
                            name={`mode-${config.type}`}
                            value="adicionar"
                            checked={state.mode === 'adicionar'}
                            onChange={() =>
                              setBases((prev) => ({
                                ...prev,
                                [config.type]: { ...prev[config.type], mode: 'adicionar' },
                              }))
                            }
                            className="text-blue-600"
                          />
                          Adicionar à existente
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {state.error && !state.loadingPreview && (
                  <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}
              </div>

              {/* Action Process Button */}
              <button
                onClick={() => handleProcessBase(config.type)}
                disabled={!state.file || !state.preview?.valid || isProcessing}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !state.file || !state.preview?.valid || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importando Base...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Processar {config.title.split('-')[0].replace(/^\d+\.\s*/, '')}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

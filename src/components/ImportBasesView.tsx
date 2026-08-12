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
} from 'lucide-react';

interface ImportBasesViewProps {
  onImportSuccess: () => void;
}

type BaseType = 'operadores' | 'pausas' | 'nuvidio';

interface BaseUploadState {
  file: File | null;
  preview: PreviewData | null;
  loadingPreview: boolean;
  error: string | null;
  mode: 'substituir' | 'adicionar';
}

export const ImportBasesView: React.FC<ImportBasesViewProps> = ({ onImportSuccess }) => {
  const [bases, setBases] = useState<Record<BaseType, BaseUploadState>>({
    operadores: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir' },
    pausas: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir' },
    nuvidio: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir' },
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
      requiredCols: ['nome', 'email', 'INTERGRALL'],
      description: 'Chaves de relacionamento: E-mail (Nuvidio) e INTERGRALL (Pausas).',
    },
    {
      type: 'pausas' as BaseType,
      title: '2. BASE DE PAUSAS',
      icon: Coffee,
      color: 'border-amber-200 bg-amber-50/50 text-amber-700',
      badgeColor: 'bg-amber-100/80 text-amber-800 border border-amber-200',
      requiredCols: ['data', 'INTERGRALL', 'pausa', 'inicio', 'fim'],
      description: 'Contém a definição do PRODUTO e tempos de pausas dos operadores.',
    },
    {
      type: 'nuvidio' as BaseType,
      title: '3. BASE NUVIDIO',
      icon: PhoneCall,
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
      badgeColor: 'bg-emerald-100/80 text-emerald-800 border border-emerald-200',
      requiredCols: [
        'Email do atendente',
        'Atendente entrou na chamada (Formatado)',
        'Atendente saiu da chamada (Formatado)',
      ],
      description: 'Calcula o tempo de Nuvidio exclusivamente por (Saída - Entrada).',
    },
  ];

  const handleFileSelect = async (type: BaseType, selectedFile: File | null) => {
    if (!selectedFile) return;

    setBases((prev) => ({
      ...prev,
      [type]: { ...prev[type], file: selectedFile, loadingPreview: true, error: null },
    }));

    // Fetch Preview & Column Validation
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('tipo_base', type);

    try {
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

      setBases((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loadingPreview: false,
          preview: data as PreviewData,
          error: data.valid ? null : `Colunas faltando: ${data.missingColumns.join(', ')}`,
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

  const handleProcessBase = async (type: BaseType) => {
    const baseState = bases[type];
    if (!baseState.file) return;

    setProcessingBase(type);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', baseState.file);
    formData.append('tipo_base', type);
    formData.append('modo', baseState.mode);

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
        [type]: { file: null, preview: null, loadingPreview: false, error: null, mode: 'substituir' },
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
            Importe os arquivos Excel (.xlsx, .xls) ou CSV. O sistema valida automaticamente o nome das
            colunas exigidas, permitindo pequenas variações de acentos e maiúsculas.
          </p>
        </div>
        <div className="text-xs bg-blue-800/80 border border-blue-700/80 px-3 py-2 rounded-lg text-blue-200 shrink-0">
          ✨ Aceita .xlsx, .xls e .csv
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

                <p className="text-xs text-slate-500 mb-4">{config.description}</p>

                {/* Required Columns Pill List */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider mb-1.5">
                    Colunas Obrigatórias:
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
                    Selecionar Arquivo
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
                          Clique aqui para escolher o arquivo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Formatos .xlsx, .xls ou .csv
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loading Preview Spinner */}
                {state.loadingPreview && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    Validando colunas do arquivo...
                  </div>
                )}

                {/* Column Validation Results */}
                {state.preview && !state.loadingPreview && (
                  <div className="space-y-3 mb-4">
                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        state.preview.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1">
                        {state.preview.valid ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Colunas Validadas ({state.preview.totalRows} linhas encontradas)</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-rose-600" />
                            <span>Colunas Faltantes Detectadas!</span>
                          </>
                        )}
                      </div>

                      {!state.preview.valid && (
                        <p className="text-[11px] text-rose-700 font-medium">
                          Faltando: {state.preview.missingColumns.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Mode Selector */}
                    {state.preview.valid && (
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
                    )}
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
                    Processando...
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

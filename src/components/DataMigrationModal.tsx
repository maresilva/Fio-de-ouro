import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Info,
} from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import {
  generateOperationalExport,
  downloadExportFile,
  analyzeImportPayload,
  executeOperationalImport,
  ImportAnalysis,
  ExportOperationalPayload,
} from '../services/dataMigration';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isGestor } = useAuth();
  const {
    footballBets,
    dailyClosings,
    footballPrizes,
    clients,
    addToast,
    // Setters or context methods
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedFileText, setSelectedFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, 'keep_existing' | 'overwrite_with_incoming'>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const payload = generateOperationalExport(currentUser || undefined);
      downloadExportFile(payload);
      addToast(
        'success',
        'Exportação Concluída',
        `Arquivo de backup gerado com ${payload.counts.footballBets} apostas e ${payload.counts.footballClosings} fechamentos.`
      );
    } catch {
      addToast('error', 'Falha na Exportação', 'Não foi possível gerar o arquivo de exportação.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setSelectedFileText(text);

      const result = analyzeImportPayload(text, {
        bets: footballBets,
        closings: dailyClosings,
        prizes: footballPrizes,
        clients,
      });

      setAnalysis(result);

      // Preenche resoluções padrão para conflitos
      if (result.conflicts.length > 0) {
        const initialResolutions: Record<string, 'keep_existing' | 'overwrite_with_incoming'> = {};
        for (const conf of result.conflicts) {
          initialResolutions[conf.id] = 'keep_existing';
        }
        setResolutions(initialResolutions);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!analysis || !analysis.isValid || !selectedFileText) return;
    setIsProcessing(true);

    try {
      const payload: ExportOperationalPayload = JSON.parse(selectedFileText);
      const result = executeOperationalImport(
        payload,
        {
          bets: footballBets,
          closings: dailyClosings,
          prizes: footballPrizes,
          clients,
        },
        resolutions
      );

      // Atualiza o localStorage com os dados unificados
      localStorage.setItem('erp_football_bets', JSON.stringify(result.updatedBets));
      localStorage.setItem('erp_football_closings', JSON.stringify(result.updatedClosings));
      localStorage.setItem('erp_football_prizes', JSON.stringify(result.updatedPrizes));
      localStorage.setItem('erp_loterica_clients', JSON.stringify(result.updatedClients));

      addToast(
        'success',
        'Importação Realizada com Sucesso',
        `${result.importedCount} novos registros adicionados e ${result.skippedCount} duplicidades preservadas.`
      );

      // Recarrega o estado atualizado
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch {
      addToast('error', 'Erro na Importação', 'Ocorreu um erro ao gravar os dados importados.');
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Migração e Preservação de Lançamentos"
      subtitle="Backup seguro dos dados operacionais do navegador e conciliação de registros"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-4 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar Dados Operacionais</span>
          </button>

          {isGestor && (
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`pb-2.5 px-4 text-xs font-bold transition-colors flex items-center space-x-2 border-b-2 ${
                activeTab === 'import'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Importar & Conciliar (Gestor)</span>
            </button>
          )}
        </div>

        {/* Tab 1: Exportar */}
        {activeTab === 'export' && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-900 font-semibold mb-0.5">
                  Garantia de Preservação e Privacidade
                </strong>
                Este procedimento salva todos os clientes, apostas, fechamentos e registros operacionais
                armazenados neste navegador em um arquivo JSON auditável.
                <span className="block mt-1 font-medium text-emerald-800">
                  Nenhuma senha, token ou credencial é incluída no arquivo.
                </span>
              </div>
            </div>

            {/* Inventory Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Inventário Local a ser Exportado
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Apostas</span>
                  <div className="text-base font-bold font-mono text-slate-900">{footballBets.length}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Fechamentos</span>
                  <div className="text-base font-bold font-mono text-slate-900">{dailyClosings.length}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Prêmios</span>
                  <div className="text-base font-bold font-mono text-slate-900">{footballPrizes.length}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Clientes</span>
                  <div className="text-base font-bold font-mono text-slate-900">{clients.length}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleExport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 flex items-center space-x-2 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo de Backup Operacional (JSON)</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Importar & Conciliar (Gestores) */}
        {activeTab === 'import' && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-900 font-semibold mb-0.5">
                  Área Restrita aos Gestores do Fio de Ouro
                </strong>
                Permite carregar arquivos exportados de outros dispositivos da equipe. O sistema
                analisa previamente duplicidades e possíveis divergências antes de gravar qualquer dado.
              </div>
            </div>

            {/* File Input */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="operational-file-input"
              />
              <label htmlFor="operational-file-input" className="cursor-pointer block space-y-1.5">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800">
                  {fileName ? fileName : 'Clique para selecionar o arquivo JSON exportado'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Formatos aceitos: fio-de-ouro-export-*.json
                </div>
              </label>
            </div>

            {/* Error Message */}
            {analysis && !analysis.isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{analysis.error}</span>
              </div>
            )}

            {/* Pre-Import Preview & Analysis */}
            {analysis && analysis.isValid && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Prévia da Conciliação
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Exportado por: <strong>{analysis.exportedBy}</strong> em{' '}
                    {new Date(analysis.exportedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Totals & Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total de Apostas</span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                      R$ {analysis.totals.betsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {analysis.counts.incoming.bets} no arquivo ({analysis.counts.newRecords.bets} novas)
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Recebido</span>
                    <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                      R$ {analysis.totals.receivedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400">Recebimentos confirmados</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Apurado Fechamentos</span>
                    <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
                      R$ {analysis.totals.apuradoAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400">{analysis.counts.incoming.closings} dias</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Descarrego</span>
                    <div className="text-base font-bold font-mono text-purple-700 mt-0.5">
                      R$ {analysis.totals.descarregoAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400">Repasses descarrego</span>
                  </div>
                </div>

                {/* Duplicates Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      <strong>{analysis.counts.duplicates.total} registros idênticos</strong> já existem no sistema e serão
                      preservados sem duplicação (idempotência).
                    </span>
                  </div>
                  <span className="font-bold font-mono text-blue-800">
                    +{analysis.counts.newRecords.total} novos
                  </span>
                </div>

                {/* Conflicts Section */}
                {analysis.conflicts.length > 0 && (
                  <div className="space-y-2 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                    <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{analysis.conflicts.length} Conflito(s) de Dados Detectado(s)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Existem registros com valores divergentes entre este navegador e o arquivo importado. Selecione qual versão deseja preservar:
                    </p>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {analysis.conflicts.map(conf => (
                        <div
                          key={conf.id}
                          className="p-2.5 bg-white border border-amber-200 rounded-lg text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{conf.key}</span>
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                              {conf.reason}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <label className="flex items-start space-x-2 p-1.5 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name={`conflict-${conf.id}`}
                                checked={resolutions[conf.id] === 'keep_existing'}
                                onChange={() =>
                                  setResolutions(prev => ({ ...prev, [conf.id]: 'keep_existing' }))
                                }
                                className="mt-0.5 text-emerald-600"
                              />
                              <div>
                                <span className="font-semibold block text-slate-700">Manter Atual:</span>
                                <span className="text-slate-500 font-mono">{conf.existingSummary}</span>
                              </div>
                            </label>

                            <label className="flex items-start space-x-2 p-1.5 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name={`conflict-${conf.id}`}
                                checked={resolutions[conf.id] === 'overwrite_with_incoming'}
                                onChange={() =>
                                  setResolutions(prev => ({ ...prev, [conf.id]: 'overwrite_with_incoming' }))
                                }
                                className="mt-0.5 text-emerald-600"
                              />
                              <div>
                                <span className="font-semibold block text-slate-700">Usar do Arquivo:</span>
                                <span className="text-slate-500 font-mono">{conf.incomingSummary}</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import Confirmation Action */}
                <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteImport}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm flex items-center space-x-1.5 active:scale-95 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-4 h-4" />
                        <span>Efetivar Importação & Conciliar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

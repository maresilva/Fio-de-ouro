import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Lock,
  User,
  Clock,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const Audit: React.FC = () => {
  const { auditLogs } = useApp();
  const { currentUser, canAccessAudit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  // Selected Log for Inspection
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  if (!canAccessAudit) {
    return (
      <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center max-w-lg mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-amber-900">Acesso Restrito à Trilha de Auditoria</h2>
        <p className="text-xs text-amber-700 mt-1 mb-4">
          Apenas perfis autorizados (Gestor, Auditor ou Financeiro) podem inspecionar logs imutáveis.
        </p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterUser !== 'all' && log.userId !== filterUser) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchRef = log.reference.toLowerCase().includes(term);
      const matchDetails = log.details.toLowerCase().includes(term);
      const matchEntity = log.entity.toLowerCase().includes(term);
      const matchUser = log.userName.toLowerCase().includes(term);
      if (!matchRef && !matchDetails && !matchEntity && !matchUser) return false;
    }
    return true;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'FECHAMENTO_APROVADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ESTORNO_MOVIMENTO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'AJUSTE_FECHAMENTO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SANGRIA':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REFORCO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FECHAMENTO_ENVIADO':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Conformidade & Imutabilidade
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
            <span>Trilha de Auditoria</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico imutável de aberturas, fechamentos, sangrias, ajustes, estornos e baixas financeiras.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-2 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Exclusão física de registros confirmados é terminantemente vedada.</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por referência, detalhe ou operador..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Todas as Ações</option>
            <option value="ABERTURA_TURNO">Abertura de Turno</option>
            <option value="FECHAMENTO_ENVIADO">Fechamento Enviado</option>
            <option value="FECHAMENTO_APROVADO">Fechamento Aprovado</option>
            <option value="AJUSTE_FECHAMENTO">Ajuste de Fechamento</option>
            <option value="ESTORNO_MOVIMENTO">Estorno de Movimento</option>
            <option value="SANGRIA">Sangria</option>
            <option value="REFORCO">Reforço de Troco</option>
            <option value="TRANSFERENCIA_TESOURARIA">Transferência Tesouraria</option>
            <option value="PREMIO_PAGO">Prêmio Pago</option>
            <option value="FINANCEIRO_BAIXA">Baixa Financeira</option>
          </select>
        </div>
      </div>

      {/* Tabela de Trilha de Auditoria */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade Afetada</th>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3">Usuário Responsável</th>
                <th className="px-4 py-3">Resumo dos Detalhes</th>
                <th className="px-4 py-3 text-center">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhum registro de auditoria corresponde aos critérios de pesquisa.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border whitespace-nowrap ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {log.entity}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.reference}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{log.userName}</span>
                      <span className="block text-[10px] text-slate-400 uppercase">
                        Perfil: {log.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center space-x-1 mx-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhe do Evento com Diff Anterior e Posterior */}
      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="Detalhe do Registro de Auditoria"
        subtitle={`ID: ${selectedLog?.id} • Timestamp: ${formatDateTime(selectedLog?.timestamp)}`}
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Ação:</span>
                <div className="font-bold text-slate-800">{selectedLog.action}</div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Autor:</span>
                <div className="font-bold text-slate-800">
                  {selectedLog.userName} ({selectedLog.userRole})
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Entidade:</span>
                <div className="font-mono text-slate-800">{selectedLog.entity}</div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Referência:</span>
                <div className="font-semibold text-slate-800">{selectedLog.reference}</div>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Descrição Detalhada do Evento
              </span>
              <p className="text-xs text-slate-800 p-3 bg-white border border-slate-200 rounded-xl leading-relaxed">
                {selectedLog.details}
              </p>
            </div>

            {/* Diff Antes & Depois */}
            {(selectedLog.previousState || selectedLog.newState) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Estado Anterior
                  </span>
                  <pre className="text-[11px] font-mono bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto max-h-48">
                    {selectedLog.previousState
                      ? JSON.stringify(selectedLog.previousState, null, 2)
                      : 'N/A (Criação de Registro)'}
                  </pre>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                    Estado Posterior (Gravado)
                  </span>
                  <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto max-h-48">
                    {selectedLog.newState
                      ? JSON.stringify(selectedLog.newState, null, 2)
                      : 'N/A'}
                  </pre>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Fechar Inspecção
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

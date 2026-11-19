import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { CashShift, CashMovement } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDateTime } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Clock,
  Layers,
  FileText,
  User,
  ShieldCheck,
  AlertCircle,
  Banknote,
  Coins,
} from 'lucide-react';

export const CashReview: React.FC = () => {
  const { currentUser, canReviewShifts } = useAuth();
  const {
    shifts,
    approveShiftClosing,
    adjustShiftClosing,
    reverseCashMovement,
    addToast,
  } = useApp();

  const pendingShifts = shifts.filter(s => s.status === 'em_revisao');
  const [selectedShift, setSelectedShift] = useState<CashShift | null>(
    pendingShifts.length > 0 ? pendingShifts[0] : null
  );

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmountStr, setAdjustAmountStr] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedMovToReverse, setSelectedMovToReverse] = useState<CashMovement | null>(null);
  const [reversalNotes, setReversalNotes] = useState('');

  const currentShift = selectedShift || (pendingShifts.length > 0 ? pendingShifts[0] : null);

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;

    const ok = approveShiftClosing(currentShift.id, approvalNotes);
    if (ok) {
      setShowApprovalModal(false);
      setApprovalNotes('');
      // select next pending shift if any
      const remaining = pendingShifts.filter(s => s.id !== currentShift.id);
      setSelectedShift(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    const amount = parseBRL(adjustAmountStr);
    if (!adjustNotes.trim()) {
      addToast('error', 'Justificativa Obrigatória', 'Informe a razão do ajuste gerencial.');
      return;
    }

    const ok = adjustShiftClosing(currentShift.id, amount, adjustNotes);
    if (ok) {
      setShowAdjustModal(false);
      setAdjustAmountStr('');
      setAdjustNotes('');
    }
  };

  const handleReverseMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !selectedMovToReverse) return;
    if (!reversalNotes.trim()) {
      addToast('error', 'Justificativa Obrigatória', 'Informe o motivo do estorno.');
      return;
    }

    const ok = reverseCashMovement(currentShift.id, selectedMovToReverse.id, reversalNotes);
    if (ok) {
      setShowReversalModal(false);
      setSelectedMovToReverse(null);
      setReversalNotes('');
    }
  };

  if (!canReviewShifts) {
    return (
      <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center max-w-lg mx-auto mt-12">
        <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-amber-900">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-amber-700 mt-1 mb-4">
          Apenas usuários com perfil de <strong>Gestor</strong> possuem alçada para homologar, ajustar e consolidar fechamentos de caixa.
        </p>
        <span className="text-[11px] text-slate-500">
          Dica: Você pode alternar o usuário no topo da tela para <strong>Carlos Alberto Silva (Gestor)</strong> para testar esta funcionalidade.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Alçada Gerencial
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <CheckCheck className="w-7 h-7 text-amber-600" />
            <span>Aprovação de Fechamentos ({pendingShifts.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analise contagens físicas, julgue justificativas de quebra/sobra e consolide os saldos da tesouraria.
          </p>
        </div>
      </div>

      {pendingShifts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Fila Limpa! Nenhum Fechamento Pendente</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Todos os turnos de caixa já foram devidamente homologados ou não há caixas aguardando revisão no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fila de Fechamentos (Left Col) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-3">
              <Layers className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fila de Fechamentos em Revisão
              </h3>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {pendingShifts.map(s => {
                const isSelected = currentShift?.id === s.id;
                const diff = s.closing?.cashDiff || 0;
                const hasDivergence = diff !== 0;

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShift(s)}
                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{s.drawerName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          hasDivergence ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasDivergence ? 'Com Divergência' : 'Exato'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
                      <span>Operador:</span>
                      <span className="font-semibold text-slate-800">{s.operatorName}</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-600 flex items-center justify-between">
                      <span>Diferença:</span>
                      <span
                        className={`font-mono font-bold ${
                          diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {formatBRL(diff)}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      Fechado às {formatDateTime(s.closedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes do Fechamento Selecionado (Right 2 Cols) */}
          {currentShift && currentShift.closing && (
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-xs font-mono text-slate-400">ID Turno: {currentShift.id}</span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {currentShift.drawerName} • {currentShift.operatorName}
                    </h2>
                    <span className="text-xs text-slate-500 capitalize">Turno {currentShift.period}</span>
                  </div>

                  {/* Action Buttons: Aprovar, Ajustar */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setAdjustAmountStr(Math.abs(currentShift.closing?.cashDiff || 0).toFixed(2));
                        setShowAdjustModal(true);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                      <span>Registrar Ajuste</span>
                    </button>

                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-700/20 flex items-center space-x-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprovar Fechamento</span>
                    </button>
                  </div>
                </div>

                {/* Values comparison row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Saldo Esperado em Caixa</span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {formatBRL(currentShift.closing.expectedCash)}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Contagem Física Declarada</span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {formatBRL(currentShift.closing.physicalCashTotal)}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      currentShift.closing.cashDiff !== 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        currentShift.closing.cashDiff !== 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      Diferença Apurada
                    </span>
                    <div
                      className={`text-xl font-black font-mono mt-1 ${
                        currentShift.closing.cashDiff < 0
                          ? 'text-red-700'
                          : currentShift.closing.cashDiff > 0
                          ? 'text-blue-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {currentShift.closing.cashDiff > 0 ? '+' : ''}
                      {formatBRL(currentShift.closing.cashDiff)}
                    </div>
                  </div>
                </div>

                {/* Justificativa do Operador */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold uppercase">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Justificativa Fornecida pelo Operador:</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200">
                    "{currentShift.closing.justification || 'Nenhuma divergência apurada. Fechamento normal.'}"
                  </p>
                </div>
              </div>

              {/* Contagem física detalhada por denominação */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Conferência da Contagem Física por Cédula e Moeda
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                  {Object.entries(currentShift.closing.denominations).map(([denomKey, count]) => {
                    if (count === 0) return null;
                    return (
                      <div
                        key={denomKey}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center"
                      >
                        <div className="text-[10px] uppercase font-bold text-slate-500">{denomKey}</div>
                        <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{count} un</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Movimentos do Turno com opção de Estorno pelo Gestor */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Movimentações do Turno ({currentShift.movements.length})
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Gestor pode estornar movimento suspeito antes da homologação
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Horário</th>
                        <th className="px-4 py-2.5">Tipo</th>
                        <th className="px-4 py-2.5">Categoria</th>
                        <th className="px-4 py-2.5">Meio</th>
                        <th className="px-4 py-2.5">Referência</th>
                        <th className="px-4 py-2.5 text-right">Valor</th>
                        <th className="px-4 py-2.5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentShift.movements.map(mov => (
                        <tr
                          key={mov.id}
                          className={`hover:bg-slate-50/70 ${mov.isReversed ? 'opacity-40 line-through' : ''}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-slate-500">
                            {formatDateTime(mov.timestamp)}
                          </td>
                          <td className="px-4 py-2.5 uppercase font-bold text-[10px] text-slate-700">
                            {mov.type}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{mov.category}</td>
                          <td className="px-4 py-2.5 uppercase text-[10px]">{mov.method}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                            {mov.reference}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatBRL(mov.amount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {!mov.isReversed && mov.type !== 'estorno' ? (
                              <button
                                onClick={() => {
                                  setSelectedMovToReverse(mov);
                                  setShowReversalModal(true);
                                }}
                                className="px-2 py-0.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold"
                              >
                                Estornar
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Estornado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Aprovação */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Homologar e Aprovar Fechamento"
        subtitle={`${currentShift?.drawerName} • Operador: ${currentShift?.operatorName}`}
      >
        <form onSubmit={handleApprove} className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold">Efeitos da Aprovação:</div>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-900">
              <li>O terminal será liberado para novos turnos.</li>
              <li>Os saldos de sangrias e movimentações serão consolidados na tesouraria.</li>
              <li>O status do turno se tornará definitivo (Aprovado).</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Parecer / Despacho do Gestor (Opcional)
            </label>
            <textarea
              rows={3}
              value={approvalNotes}
              onChange={e => setApprovalNotes(e.target.value)}
              placeholder="Ex: Fechamento verificado, divergência de R$ 20,00 aceita como quebra técnica tolerada..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowApprovalModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
            >
              Confirmar Aprovação
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Ajuste Gerencial */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Registrar Ajuste Gerencial de Fechamento"
        subtitle="Criação de lançamento de ajuste sem apagar o histórico do movimento original"
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Valor do Ajuste (R$) *
            </label>
            <input
              type="text"
              required
              value={adjustAmountStr}
              onChange={e => setAdjustAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Justificativa do Ajuste *
            </label>
            <textarea
              required
              rows={3}
              value={adjustNotes}
              onChange={e => setAdjustNotes(e.target.value)}
              placeholder="Explique o motivo do ajuste gerencial (ex: acerto de sobra apurada em bilhete de loteria cancelado fora do sistema)..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm"
            >
              Gravar Ajuste
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Estorno de Movimento */}
      <Modal
        isOpen={showReversalModal}
        onClose={() => setShowReversalModal(false)}
        title="Estornar Movimento por Espelho"
        subtitle="Preserva autoria original gerando lançamento de estorno"
      >
        {selectedMovToReverse && (
          <form onSubmit={handleReverseMovement} className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
              <div>
                <strong>Movimento:</strong> {selectedMovToReverse.category}
              </div>
              <div>
                <strong>Valor:</strong> {formatBRL(selectedMovToReverse.amount)}
              </div>
              <div>
                <strong>Autor original:</strong> {selectedMovToReverse.userName}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Motivo do Estorno *
              </label>
              <textarea
                required
                rows={3}
                value={reversalNotes}
                onChange={e => setReversalNotes(e.target.value)}
                placeholder="Motivo formal para estorno na trilha de auditoria..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowReversalModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Confirmar Estorno
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

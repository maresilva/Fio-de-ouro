import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { TreasuryAccount, ReconciliationItem } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDateTime, formatDate } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  Landmark,
  Lock,
  Coins,
  Building,
  Truck,
  ArrowRightLeft,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  FileText,
  Search,
} from 'lucide-react';

export const Treasury: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    accounts,
    treasuryTransactions,
    reconciliations,
    transferTreasury,
    depositTreasury,
    confirmReconciliationItem,
    addToast,
  } = useApp();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'extrato' | 'conciliacao'>('extrato');

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState(accounts[0]?.id || '');
  const [transferDestId, setTransferDestId] = useState(accounts[1]?.id || '');
  const [transferAmountStr, setTransferAmountStr] = useState('');
  const [transferCategory, setTransferCategory] = useState('Transferência Interna');
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositSourceId, setDepositSourceId] = useState('acc-cofre');
  const [depositDestId, setDepositDestId] = useState('acc-transito');
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositRef, setDepositRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  // Filter transactions for selected account
  const accountTransactions = treasuryTransactions.filter(
    tx => tx.sourceAccountId === selectedAccount?.id || tx.destAccountId === selectedAccount?.id
  );

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferSourceId === transferDestId) {
      addToast('error', 'Contas Iguais', 'A conta de origem e destino não podem ser as mesmas.');
      return;
    }
    const amt = parseBRL(transferAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor maior que zero.');
      return;
    }

    const ok = transferTreasury({
      sourceAccountId: transferSourceId,
      destAccountId: transferDestId,
      amount: amt,
      category: transferCategory,
      reference: transferRef || `Transf. #${Date.now().toString().slice(-5)}`,
      notes: transferNotes,
    });

    if (ok) {
      setShowTransferModal(false);
      setTransferAmountStr('');
      setTransferRef('');
      setTransferNotes('');
    }
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseBRL(depositAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor maior que zero.');
      return;
    }

    const ok = depositTreasury({
      sourceAccountId: depositSourceId,
      destAccountId: depositDestId,
      amount: amt,
      reference: depositRef || `Remessa Carro-Forte Malote #${Date.now().toString().slice(-4)}`,
      notes: depositNotes,
    });

    if (ok) {
      setShowDepositModal(false);
      setDepositAmountStr('');
      setDepositRef('');
      setDepositNotes('');
    }
  };

  const getAccountIcon = (type: TreasuryAccount['type']) => {
    switch (type) {
      case 'cofre':
        return <Lock className="w-5 h-5 text-amber-600" />;
      case 'gaveta':
        return <Coins className="w-5 h-5 text-emerald-600" />;
      case 'banco':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'transito':
        return <Truck className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Gestão de Ativos & Numerário
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <Landmark className="w-7 h-7 text-emerald-600" />
            <span>Tesouraria & Cofre Central</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saldos em tempo real, cofre blindado, depósitos bancários e conciliação de valores em trânsito.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            <span>Nova Transferência</span>
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-700/20 flex items-center space-x-1.5 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Registrar Depósito</span>
          </button>
        </div>
      </div>

      {/* Painel de Saldos por Conta (Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map(acc => {
          const isSelected = selectedAccountId === acc.id;

          return (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-slate-100">{getAccountIcon(acc.type)}</div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {acc.code}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-xs font-bold text-slate-700">{acc.name}</div>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
                  {formatBRL(acc.balance)}
                </div>
                {acc.bankInfo && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate" title={acc.bankInfo}>
                    {acc.bankInfo}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs: Extrato da Conta vs Painel de Conciliação */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('extrato')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'extrato'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Extrato de Movimentos: {selectedAccount.name}</span>
        </button>
        <button
          onClick={() => setActiveTab('conciliacao')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'conciliacao'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Painel de Conciliação Bancária & Trânsito ({reconciliations.length})</span>
        </button>
      </div>

      {/* Extrato Tab */}
      {activeTab === 'extrato' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Extrato Detalhado de {selectedAccount.name}
              </h3>
              <p className="text-[11px] text-slate-500">
                Saldo Atual Disponível: <strong className="font-mono text-slate-800">{formatBRL(selectedAccount.balance)}</strong>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma transação de tesouraria registrada diretamente para esta conta ainda.
                    </td>
                  </tr>
                ) : (
                  accountTransactions.map(tx => {
                    const isCredit = tx.destAccountId === selectedAccount.id;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {formatDateTime(tx.timestamp)}
                        </td>
                        <td className="px-4 py-3 capitalize font-bold text-slate-700">
                          {tx.type}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{tx.sourceAccountName}</td>
                        <td className="px-4 py-3 text-slate-600">{tx.destAccountName}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{tx.userName}</td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-bold ${
                            isCredit ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isCredit ? '+' : '-'} {formatBRL(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Painel de Conciliação Tab */}
      {activeTab === 'conciliacao' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Conciliação de Totais Operacionais, Fechamentos e Extratos Bancários
              </h3>
              <p className="text-xs text-slate-500">
                Confronto contínuo entre registros das lotéricas, faturamento Caixa e compensação de malotes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Origem do Registro</th>
                  <th className="px-4 py-3">Descrição / Lote</th>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3 text-right">Valor Operacional</th>
                  <th className="px-4 py-3 text-right">Valor Bancário</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliations.map(rec => {
                  const isConciliado = rec.status === 'conciliado';
                  const isDivergente = rec.status === 'divergente';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-slate-500">{formatDate(rec.date)}</td>
                      <td className="px-4 py-3 capitalize font-bold text-slate-700">
                        {rec.source.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {rec.description}
                        {rec.notes && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Nota: {rec.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{rec.reference}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(rec.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatBRL(rec.expectedAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isConciliado
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDivergente
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isConciliado ? (
                          <button
                            onClick={() => confirmReconciliationItem(rec.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Confirmar Liquidação
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ok</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Transferência */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Nova Transferência entre Contas Internas"
        subtitle="Movimentação com débito na origem e crédito no destino em transação única"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Conta Origem</label>
              <select
                value={transferSourceId}
                onChange={e => setTransferSourceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatBRL(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Conta Destino</label>
              <select
                value={transferDestId}
                onChange={e => setTransferDestId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor (R$) *</label>
            <input
              type="text"
              required
              value={transferAmountStr}
              onChange={e => setTransferAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referência / Documento</label>
            <input
              type="text"
              value={transferRef}
              onChange={e => setTransferRef(e.target.value)}
              placeholder="Ex: Malote #002 / Transferência de Troco"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações</label>
            <textarea
              rows={2}
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Executar Transferência
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Depósito Bancário / Envio para Trânsito */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Registrar Depósito Bancário / Remessa Carro-Forte"
        subtitle="Envio de numerário do cofre para depósito em conta da Caixa ou Valores em Trânsito"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Origem do Dinheiro</label>
              <select
                value={depositSourceId}
                onChange={e => setDepositSourceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="acc-cofre">Cofre Central Blindado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destino do Depósito</label>
              <select
                value={depositDestId}
                onChange={e => setDepositDestId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="acc-transito">Valores em Trânsito (Carro-Forte Brinks)</option>
                <option value="acc-cef">Caixa Econômica Federal (Operacional Direto)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor do Depósito (R$) *</label>
            <input
              type="text"
              required
              value={depositAmountStr}
              onChange={e => setDepositAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Guia de Malote / Lacre de Segurança *
            </label>
            <input
              type="text"
              required
              value={depositRef}
              onChange={e => setDepositRef(e.target.value)}
              placeholder="Ex: Lacre Malote #89421 - Coleta Brinks 19/11"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowDepositModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              Registrar Depósito
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

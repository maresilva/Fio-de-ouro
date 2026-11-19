import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { FinancialRecord, FinanceType } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDate } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  PieChart,
  Plus,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  UserCheck,
} from 'lucide-react';

export const Finance: React.FC = () => {
  const { financeRecords, accounts, addFinancialRecord, payFinancialRecord, addToast } = useApp();
  const { currentUser, canAccessFinance } = useAuth();

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompetency, setFilterCompetency] = useState('11/2026');

  // Modals state
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [recordType, setRecordType] = useState<FinanceType>('despesa_operacional');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [competency, setCompetency] = useState('11/2026');
  const [dueDate, setDueDate] = useState('2026-11-25');
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');

  // Baixa Modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRecordToPay, setSelectedRecordToPay] = useState<FinancialRecord | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || 'acc-cef');
  const [payNotes, setPayNotes] = useState('');

  // Partner Withdrawal Modal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [partnerAmountStr, setPartnerAmountStr] = useState('');
  const [partnerAccountId, setPartnerAccountId] = useState('acc-cef');
  const [partnerDescription, setPartnerDescription] = useState('Retirada de Pró-labore Sócios');

  const filteredRecords = financeRecords.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCompetency !== 'all' && r.competency !== filterCompetency) return false;
    return true;
  });

  // Calculate Operational Metrics
  const totalReceitas = financeRecords
    .filter(r => r.type === 'receita_propria' || r.type === 'comissao_loterica')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalDespesas = financeRecords
    .filter(r => r.type === 'despesa_operacional' || r.type === 'obrigacao_pagar')
    .reduce((acc, r) => acc + r.amount, 0);

  const totalRetiradaSocios = financeRecords
    .filter(r => r.type === 'retirada_socios')
    .reduce((acc, r) => acc + r.amount, 0);

  const resultadoOperacional = totalReceitas - totalDespesas;

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseBRL(amountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor maior que zero.');
      return;
    }

    addFinancialRecord({
      type: recordType,
      category: category || (recordType === 'comissao_loterica' ? 'Comissões CEF' : 'Despesas Gerais'),
      description,
      competency,
      dueDate,
      amount: amt,
      notes,
    });

    setShowNewRecordModal(false);
    setDescription('');
    setAmountStr('');
    setNotes('');
  };

  const handleOpenPay = (rec: FinancialRecord) => {
    setSelectedRecordToPay(rec);
    setPayAmountStr((rec.amount - rec.paidAmount).toFixed(2));
    setShowPayModal(true);
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordToPay) return;
    const amt = parseBRL(payAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor válido de pagamento.');
      return;
    }

    const ok = payFinancialRecord({
      recordId: selectedRecordToPay.id,
      amountToPay: amt,
      paidFromAccountId: payAccountId,
      notes: payNotes,
    });

    if (ok) {
      setShowPayModal(false);
      setSelectedRecordToPay(null);
      setPayAmountStr('');
      setPayNotes('');
    }
  };

  const handlePartnerWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseBRL(partnerAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe o valor da retirada.');
      return;
    }

    const newRec = addFinancialRecord({
      type: 'retirada_socios',
      category: 'Distribuição de Lucros / Sócios',
      description: partnerDescription,
      competency: '11/2026',
      dueDate: new Date().toISOString().split('T')[0],
      amount: amt,
      notes: 'Retirada classificada separadamente do resultado operacional conforme exigência gerencial',
    });

    payFinancialRecord({
      recordId: newRec.id,
      amountToPay: amt,
      paidFromAccountId: partnerAccountId,
      notes: 'Liquidação imediata de pró-labore de sócios',
    });

    setShowWithdrawalModal(false);
    setPartnerAmountStr('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Controladoria & Obrigações
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <PieChart className="w-7 h-7 text-blue-600" />
            <span>Financeiro & Gestão de Contas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comissões de loterias, contas a pagar, resultado operacional e segregação de retiradas de sócios.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>Retirada de Sócios</span>
          </button>
          <button
            onClick={() => setShowNewRecordModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-700/20 flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* DRE Flash Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Receitas & Comissões</span>
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-900 mt-1">
            {formatBRL(totalReceitas)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Comissões Caixa + Jogos</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-red-700">Despesas & Obrigações</span>
            <ArrowUpCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-900 mt-1">
            {formatBRL(totalDespesas)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Aluguel, segurança, links, luz</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-700">Resultado Operacional</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-blue-900 mt-1">
            {formatBRL(resultadoOperacional)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Margem da lotérica no período</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-purple-200 bg-purple-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-800">Retirada de Sócios</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-purple-950 mt-1">
            {formatBRL(totalRetiradaSocios)}
          </div>
          <p className="text-[10px] text-purple-700 mt-0.5">Segregado do resultado operacional</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filtros:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCompetency}
            onChange={e => setFilterCompetency(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold"
          >
            <option value="all">Todas Competências</option>
            <option value="11/2026">11/2026</option>
            <option value="10/2026">10/2026</option>
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Todos os Tipos</option>
            <option value="comissao_loterica">Comissões Lotéricas</option>
            <option value="despesa_operacional">Despesas Operacionais</option>
            <option value="obrigacao_pagar">Obrigações a Pagar</option>
            <option value="retirada_socios">Retirada de Sócios</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="parcial">Parcial</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoria / Descrição</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-right">Valor Pago</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Nenhum lançamento financeiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => {
                  const isPaid = rec.status === 'pago';
                  const isReceita = rec.type === 'comissao_loterica' || rec.type === 'receita_propria';
                  const isRetirada = rec.type === 'retirada_socios';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isReceita
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRetirada
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rec.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{rec.description}</div>
                        <div className="text-[10px] text-slate-400">{rec.category}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{rec.competency}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{formatDate(rec.dueDate)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(rec.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatBRL(rec.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'parcial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => handleOpenPay(rec)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Baixar
                          </button>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-bold flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Liquidado</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      <Modal
        isOpen={showNewRecordModal}
        onClose={() => setShowNewRecordModal(false)}
        title="Novo Lançamento Financeiro"
        subtitle="Cadastro de comissões, despesas operacionais ou obrigações"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tipo de Registro
            </label>
            <select
              value={recordType}
              onChange={e => setRecordType(e.target.value as FinanceType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="despesa_operacional">Despesa Operacional</option>
              <option value="obrigacao_pagar">Obrigação a Pagar (Fornecedor / Concessionária)</option>
              <option value="comissao_loterica">Comissão Caixa Econômica / Loterias</option>
              <option value="receita_propria">Receita Própria</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Descrição do Lançamento *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Aluguel da Loja / Conta de Energia CPFL"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Competência (MM/AAAA)
              </label>
              <input
                type="text"
                required
                value={competency}
                onChange={e => setCompetency(e.target.value)}
                placeholder="11/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Valor Total (R$) *
            </label>
            <input
              type="text"
              required
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowNewRecordModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Baixar Obrigação */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Baixar Obrigação Financeira"
        subtitle="Registro de liquidação com débito em conta bancária ou cofre"
      >
        {selectedRecordToPay && (
          <form onSubmit={handleConfirmPay} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="font-bold text-slate-900">{selectedRecordToPay.description}</div>
              <div className="text-slate-500">
                Valor Total: {formatBRL(selectedRecordToPay.amount)} | Já Pago:{' '}
                {formatBRL(selectedRecordToPay.paidAmount)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Conta de Saída (Origem dos Fundos)
              </label>
              <select
                value={payAccountId}
                onChange={e => setPayAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Saldo: {formatBRL(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Valor a Baixar (R$) *
              </label>
              <input
                type="text"
                required
                value={payAmountStr}
                onChange={e => setPayAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Confirmar Baixa
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Retirada de Sócios */}
      <Modal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        title="Registrar Retirada de Sócios / Pró-labore"
        subtitle="Classificada separadamente do resultado operacional da lotérica"
      >
        <form onSubmit={handlePartnerWithdrawal} className="space-y-4">
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950">
            <strong>Segregação Gerencial:</strong> Esta retirada não entra no cálculo de despesas operacionais da lotérica, garantindo fidedignidade à DRE operacional.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Descrição da Retirada
            </label>
            <input
              type="text"
              required
              value={partnerDescription}
              onChange={e => setPartnerDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Conta de Origem
            </label>
            <select
              value={partnerAccountId}
              onChange={e => setPartnerAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} (Saldo: {formatBRL(a.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Valor da Retirada (R$) *
            </label>
            <input
              type="text"
              required
              value={partnerAmountStr}
              onChange={e => setPartnerAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowWithdrawalModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl"
            >
              Confirmar Retirada
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

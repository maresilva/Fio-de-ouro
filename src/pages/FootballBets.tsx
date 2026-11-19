import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { FootballBet, FootballPrize } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import {
  getOperationalToday,
  getOperationalYesterday,
  getOperationalMonthStart,
  formatDateBR,
  formatDateTime,
} from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  Plus,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User,
  UserPlus,
  DollarSign,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Layers,
  FileCheck,
} from 'lucide-react';

export const FootballBets: React.FC = () => {
  const { currentUser, canCreateBet, canReceiveBet, canRegisterPrize } = useAuth();
  const {
    footballBets,
    footballPrizes,
    clients,
    addFootballBet,
    markBetAsPaid,
    addFootballPrize,
    addClient,
    addToast,
  } = useApp();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'bets' | 'prizes'>('bets');

  // Filters
  const [filterStartDate, setFilterStartDate] = useState(getOperationalMonthStart());
  const [filterEndDate, setFilterEndDate] = useState(getOperationalToday());
  const [filterClientSearch, setFilterClientSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pago' | 'nao_pago'>('all');

  // Modal State - Registrar Aposta
  const [showBetModal, setShowBetModal] = useState(false);
  const [betDate, setBetDate] = useState(getOperationalToday());
  const [selectedClientId, setSelectedClientId] = useState('');
  const [betAmountStr, setBetAmountStr] = useState('');
  const [betPaymentStatus, setBetPaymentStatus] = useState<'pago' | 'nao_pago'>('pago');
  const [betReceivedAt, setBetReceivedAt] = useState(getOperationalToday());
  const [betNotes, setBetNotes] = useState('');

  // Inline Client Creation inside Bet Modal
  const [isCreatingClientInline, setIsCreatingClientInline] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRef, setNewClientRef] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');

  // Modal State - Marcar Como Pago (Baixa de Aposta Pendente)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedBetToPay, setSelectedBetToPay] = useState<FootballBet | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState(getOperationalToday());
  const [isSubmittingBaixa, setIsSubmittingBaixa] = useState(false);

  // Modal State - Registrar Pagamento de Prêmio
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeClientId, setPrizeClientId] = useState('');
  const [prizeBetId, setPrizeBetId] = useState('');
  const [prizeAmountStr, setPrizeAmountStr] = useState('');
  const [prizePaidAt, setPrizePaidAt] = useState(getOperationalToday());
  const [prizeNotes, setPrizeNotes] = useState('');

  // Shortcuts
  const handleShortcutToday = () => {
    const today = getOperationalToday();
    setFilterStartDate(today);
    setFilterEndDate(today);
  };

  const handleShortcutYesterday = () => {
    const yest = getOperationalYesterday();
    setFilterStartDate(yest);
    setFilterEndDate(yest);
  };

  const handleShortcutMonth = () => {
    setFilterStartDate(getOperationalMonthStart());
    setFilterEndDate(getOperationalToday());
  };

  const handleShortcutAll = () => {
    setFilterStartDate('2020-01-01');
    setFilterEndDate('2099-12-31');
  };

  // Filtered bets
  const filteredBets = footballBets.filter(b => {
    if (b.isCancelled) return false;
    if (b.date < filterStartDate || b.date > filterEndDate) return false;
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterClientSearch.trim()) {
      const q = filterClientSearch.toLowerCase();
      const matchName = b.clientName.toLowerCase().includes(q);
      const clientObj = clients.find(c => c.id === b.clientId);
      const matchRef = clientObj?.referenceCode?.toLowerCase().includes(q) || false;
      if (!matchName && !matchRef) return false;
    }
    return true;
  });

  // Filtered prizes
  const filteredPrizes = footballPrizes.filter(p => {
    if (p.paidAt < filterStartDate || p.paidAt > filterEndDate) return false;
    if (filterClientSearch.trim()) {
      const q = filterClientSearch.toLowerCase();
      const matchName = p.clientName.toLowerCase().includes(q);
      if (!matchName) return false;
    }
    return true;
  });

  // Summary counters for current filter
  const totalApostadoFilter = filteredBets.reduce((a, b) => a + b.amount, 0);
  const totalPagoFilter = filteredBets
    .filter(b => b.status === 'pago')
    .reduce((a, b) => a + b.amount, 0);
  const totalAbertoFilter = filteredBets
    .filter(b => b.status === 'nao_pago')
    .reduce((a, b) => a + b.amount, 0);
  const totalPremiosFilter = filteredPrizes.reduce((a, b) => a + b.amount, 0);

  // Submit: Registrar Nova Aposta
  const handleSaveBet = (e: React.FormEvent) => {
    e.preventDefault();

    let finalClientId = selectedClientId;

    if (isCreatingClientInline) {
      if (!newClientName.trim()) {
        addToast('error', 'Nome Obrigatório', 'Informe o nome do novo cliente.');
        return;
      }
      const created = addClient(
        newClientName.trim(),
        newClientPhone.trim() || undefined,
        newClientCpf.trim() || undefined,
        newClientRef.trim() || undefined
      );
      finalClientId = created.id;
    }

    if (!finalClientId) {
      addToast('error', 'Cliente Obrigatório', 'Selecione ou cadastre o cliente da aposta.');
      return;
    }

    const amt = parseBRL(betAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'O valor da aposta deve ser maior que zero.');
      return;
    }

    if (betPaymentStatus === 'pago' && betReceivedAt < betDate) {
      addToast(
        'error',
        'Data Inconsistente',
        'A data do recebimento deve ser igual ou posterior à data da aposta.'
      );
      return;
    }

    const res = addFootballBet({
      date: betDate,
      clientId: finalClientId,
      amount: amt,
      status: betPaymentStatus,
      receivedAt: betPaymentStatus === 'pago' ? betReceivedAt : undefined,
      notes: betNotes,
    });

    if (res.success) {
      setShowBetModal(false);
      setBetAmountStr('');
      setBetNotes('');
      setIsCreatingClientInline(false);
      setNewClientName('');
      setNewClientRef('');
      setNewClientPhone('');
      setNewClientCpf('');
    }
  };

  // Open Baixa Modal for pending bet
  const handleOpenMarkPaid = (bet: FootballBet) => {
    setSelectedBetToPay(bet);
    const today = getOperationalToday();
    // Default to today, but if today is earlier than bet date, use bet date
    const initialDate = today >= bet.date ? today : bet.date;
    setMarkPaidDate(initialDate);
    setShowMarkPaidModal(true);
  };

  // Submit Baixa (com proteção contra duplo clique/simultaneidade)
  const handleConfirmMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBetToPay || isSubmittingBaixa) return;

    if (markPaidDate < selectedBetToPay.date) {
      addToast(
        'error',
        'Data Inválida',
        'A data do recebimento deve ser igual ou posterior à data da aposta.'
      );
      return;
    }

    setIsSubmittingBaixa(true);
    try {
      const res = markBetAsPaid({
        betId: selectedBetToPay.id,
        receivedAt: markPaidDate,
      });

      if (res.success) {
        setShowMarkPaidModal(false);
        setSelectedBetToPay(null);
      }
    } finally {
      setIsSubmittingBaixa(false);
    }
  };

  // Submit: Registrar Pagamento de Prêmio
  const handleSavePrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeClientId) {
      addToast('error', 'Cliente Obrigatório', 'Selecione o cliente do prêmio.');
      return;
    }

    const amt = parseBRL(prizeAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor de prêmio maior que zero.');
      return;
    }

    const res = addFootballPrize({
      clientId: prizeClientId,
      amount: amt,
      paidAt: prizePaidAt,
      betId: prizeBetId.trim() || undefined,
      notes: prizeNotes,
    });

    if (res.success) {
      setShowPrizeModal(false);
      setPrizeAmountStr('');
      setPrizeNotes('');
      setPrizeBetId('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Operações de Futebol
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Gestão de Apostas & Prêmios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lançamento de apostas, controle de pagamentos a receber e histórico de prêmios pagos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setBetDate(getOperationalToday());
              setBetReceivedAt(getOperationalToday());
              setShowBetModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Aposta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrizePaidAt(getOperationalToday());
              setShowPrizeModal(true);
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Registrar Prêmio</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for filtered period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">
            Total Apostado no Filtro
          </span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {formatBRL(totalApostadoFilter)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{filteredBets.length} aposta(s)</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700">
            Apostas Pagas
          </span>
          <div className="text-xl font-black font-mono text-emerald-700 mt-1">
            {formatBRL(totalPagoFilter)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Recebidas no caixa</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700">
            Em Aberto (Pendentes)
          </span>
          <div className="text-xl font-black font-mono text-amber-800 mt-1">
            {formatBRL(totalAbertoFilter)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">A receber dos clientes</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-teal-700">
            Prêmios Efetivamente Pagos
          </span>
          <div className="text-xl font-black font-mono text-teal-800 mt-1">
            {formatBRL(totalPremiosFilter)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{filteredPrizes.length} prêmio(s)</p>
        </div>
      </div>

      {/* Navigation Tabs (Apostas vs Prêmios) */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bets')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'bets'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lista de Apostas ({filteredBets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prizes')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'prizes'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Prêmios Pagos aos Clientes ({filteredPrizes.length})</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-bold text-slate-600">De:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            />
            <span className="font-bold text-slate-600">Até:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            />
          </div>

          {/* Client Search */}
          <div className="flex items-center space-x-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={filterClientSearch}
              onChange={e => setFilterClientSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none w-full"
            />
          </div>

          {/* Status filter (only for bets tab) */}
          {activeTab === 'bets' && (
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 font-bold">Situação:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="all">Todas as Situações</option>
                <option value="pago">Pago</option>
                <option value="nao_pago">Não pago (Pendente)</option>
              </select>
            </div>
          )}
        </div>

        {/* Period Shortcuts */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleShortcutToday}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleShortcutYesterday}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
          >
            Ontem
          </button>
          <button
            type="button"
            onClick={handleShortcutMonth}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
          >
            Este mês
          </button>
          <button
            type="button"
            onClick={handleShortcutAll}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
          >
            Todos
          </button>
        </div>
      </div>

      {/* TAB 1: LISTA DE APOSTAS */}
      {activeTab === 'bets' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filteredBets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Nenhuma aposta encontrada com os filtros selecionados.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Ajuste os filtros de data e situação ou registre uma nova aposta.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Data da Aposta</th>
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                      <th className="px-5 py-3 text-center">Situação do Pagamento</th>
                      <th className="px-5 py-3">Data do Recebimento</th>
                      <th className="px-5 py-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBets.map(bet => {
                      const isPaid = bet.status === 'pago';
                      const clientObj = clients.find(c => c.id === bet.clientId);

                      return (
                        <tr key={bet.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {formatDateBR(bet.date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-slate-900">{bet.clientName}</span>
                              {clientObj?.referenceCode && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                                  {clientObj.referenceCode}
                                </span>
                              )}
                            </div>
                            {bet.notes && (
                              <span className="block text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {bet.notes}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                            {formatBRL(bet.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800 font-extrabold'
                              }`}
                            >
                              {isPaid ? 'Pago' : 'Não pago'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">
                            {isPaid && bet.receivedAt ? (
                              <div className="text-xs">
                                <span className="font-bold text-slate-900 font-mono">
                                  {formatDateBR(bet.receivedAt)}
                                </span>
                                {bet.receivedBy && (
                                  <span className="block text-[10px] text-slate-400">
                                    Por: {bet.receivedBy}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pendente</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => handleOpenMarkPaid(bet)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1 mx-auto"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Marcar como pago</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Quitado</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="sm:hidden p-3 space-y-3">
                {filteredBets.map(bet => {
                  const isPaid = bet.status === 'pago';
                  const clientObj = clients.find(c => c.id === bet.clientId);

                  return (
                    <div
                      key={bet.id}
                      className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block">
                            {bet.clientName}
                          </span>
                          {clientObj?.referenceCode && (
                            <span className="text-[9px] text-slate-500">
                              {clientObj.referenceCode}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Pago' : 'Não pago'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono">
                        <span className="text-slate-500">Data: {formatDateBR(bet.date)}</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatBRL(bet.amount)}
                        </span>
                      </div>

                      {isPaid && bet.receivedAt && (
                        <div className="text-[11px] text-slate-500">
                          Recebido em: <strong>{formatDateBR(bet.receivedAt)}</strong> (
                          {bet.receivedBy})
                        </div>
                      )}

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => handleOpenMarkPaid(bet)}
                          className="w-full mt-2 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar como pago</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PRÊMIOS DE CLIENTES */}
      {activeTab === 'prizes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filteredPrizes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Nenhum pagamento de prêmio encontrado no período.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Clique no botão "Registrar Prêmio" para adicionar um pagamento a cliente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Data do Pagamento</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3 text-right">Valor Efetivamente Pago</th>
                    <th className="px-5 py-3">Aposta Vinculada</th>
                    <th className="px-5 py-3">Registrado Por</th>
                    <th className="px-5 py-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPrizes.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {formatDateBR(p.paidAt)}
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-900">
                        {p.clientName}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-teal-800 text-sm">
                        {formatBRL(p.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                        {p.betId ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {p.betId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não vinculada</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{p.registeredBy}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar Nova Aposta */}
      <Modal
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        title="Registrar Aposta de Futebol"
        subtitle="Informe a data, cliente, valor e situação do recebimento"
      >
        <form onSubmit={handleSaveBet} className="space-y-4">
          {/* Data da Aposta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data da Aposta *
            </label>
            <input
              type="date"
              required
              value={betDate}
              onChange={e => {
                setBetDate(e.target.value);
                // Adjust receivedAt if earlier
                if (betReceivedAt < e.target.value) {
                  setBetReceivedAt(e.target.value);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Cliente (Select ou Inline Creation) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cliente *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingClientInline(!isCreatingClientInline)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingClientInline ? 'Selecionar Existente' : '+ Novo Cliente'}</span>
              </button>
            </div>

            {isCreatingClientInline ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente *"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Referência / Bairro (ex: Centro)"
                    value={newClientRef}
                    onChange={e => setNewClientRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Telefone (opcional)"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            ) : (
              <select
                required
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.referenceCode ? `(${c.referenceCode})` : c.cpf ? `(${c.cpf})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Valor da Aposta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Valor da Aposta (R$) *
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={betAmountStr}
              onChange={e => setBetAmountStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
            />
          </div>

          {/* Situação do Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Situação do Pagamento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBetPaymentStatus('pago')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  betPaymentStatus === 'pago'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pago
              </button>

              <button
                type="button"
                onClick={() => setBetPaymentStatus('nao_pago')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  betPaymentStatus === 'nao_pago'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Não pago
              </button>
            </div>
          </div>

          {/* Data do Recebimento (condicional quando Pago) */}
          {betPaymentStatus === 'pago' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-emerald-900 uppercase">
                Data do Recebimento *
              </label>
              <input
                type="date"
                required
                min={betDate} // Validação: igual ou posterior à data da aposta
                value={betReceivedAt}
                onChange={e => setBetReceivedAt(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold"
              />
              <span className="text-[10px] text-emerald-700 block">
                Deve ser igual ou posterior à data da aposta ({formatDateBR(betDate)}).
              </span>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Jogo Flamengo x Palmeiras / Bilhete #1094"
              value={betNotes}
              onChange={e => setBetNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowBetModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
            >
              Salvar Aposta
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Marcar Aposta como Paga (Baixa) */}
      <Modal
        isOpen={showMarkPaidModal}
        onClose={() => {
          if (!isSubmittingBaixa) {
            setShowMarkPaidModal(false);
            setSelectedBetToPay(null);
          }
        }}
        title="Confirmar Recebimento da Aposta"
        subtitle="Registra a data do recebimento e usuário responsável na aposta original"
      >
        {selectedBetToPay && (
          <form onSubmit={handleConfirmMarkPaid} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                <strong>Cliente:</strong> {selectedBetToPay.clientName}
              </div>
              <div>
                <strong>Data da Aposta:</strong> {formatDateBR(selectedBetToPay.date)}
              </div>
              <div>
                <strong>Valor a Receber:</strong>{' '}
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {formatBRL(selectedBetToPay.amount)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Data do Recebimento *
              </label>
              <input
                type="date"
                required
                min={selectedBetToPay.date} // Validação no frontend e backend
                value={markPaidDate}
                onChange={e => setMarkPaidDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                A data deve ser igual ou posterior à data da aposta ({formatDateBR(selectedBetToPay.date)}).
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
              Ao confirmar, a aposta passa para a situação <strong>"Pago"</strong>. O valor entrará nos
              recebimentos de conferência na data <strong>{formatDateBR(markPaidDate)}</strong>, mantendo
              o histórico da aposta na data original.
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                disabled={isSubmittingBaixa}
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setSelectedBetToPay(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingBaixa}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingBaixa ? 'Gravando...' : 'Confirmar Recebimento'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Registrar Pagamento de Prêmio de Futebol */}
      <Modal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        title="Registrar Pagamento de Prêmio"
        subtitle="Pagamento efetivo de prêmio de futebol ao cliente ganhador"
      >
        <form onSubmit={handleSavePrize} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cliente Ganhador *
            </label>
            <select
              required
              value={prizeClientId}
              onChange={e => setPrizeClientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.referenceCode ? `(${c.referenceCode})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Aposta de Origem Vinculada (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: fbet-1092 ou código do bilhete"
              value={prizeBetId}
              onChange={e => setPrizeBetId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Valor Efetivamente Pago (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={prizeAmountStr}
                onChange={e => setPrizeAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Data do Pagamento Efetivo *
              </label>
              <input
                type="date"
                required
                value={prizePaidAt}
                onChange={e => setPrizePaidAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Prêmio rodada 34 acertador placar"
              value={prizeNotes}
              onChange={e => setPrizeNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950">
            Este valor alimentará o relatório do cliente como prêmio recebido no período filtrado. Conforme a regra de negócio, a fórmula do fechamento continua estritamente "Apurado − Descarrego".
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPrizeModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-sm"
            >
              Salvar Pagamento de Prêmio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

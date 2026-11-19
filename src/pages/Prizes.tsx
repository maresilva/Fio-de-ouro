import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PrizeRecord, PaymentMethod } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDateTime, formatDate } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  Trophy,
  Plus,
  Link as LinkIcon,
  Filter,
  CheckCircle2,
  Clock,
  FileCheck,
  Paperclip,
  Search,
  User,
  UserPlus,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const Prizes: React.FC = () => {
  const { prizes, registerPrize, settlePrize, payPrizeToClient, clients, addClient, accounts, addToast } = useApp();
  const { currentUser } = useAuth();

  // Filters
  const [filterGame, setFilterGame] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterSettlementStatus, setFilterSettlementStatus] = useState('all');
  const [filterClientPaymentStatus, setFilterClientPaymentStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state - Register
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [gameType, setGameType] = useState('Mega-Sena');
  const [contestNumber, setContestNumber] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  const [accountUsed, setAccountUsed] = useState('Cofre Central Blindado');
  const [receiptName, setReceiptName] = useState('');

  // Client linkage & payment status
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [clientPaymentStatus, setClientPaymentStatus] = useState<'pago' | 'pendente'>('pago');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [paidAtDate, setPaidAtDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  // Modals state - Settle with CEF
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedPrizeToSettle, setSelectedPrizeToSettle] = useState<PrizeRecord | null>(null);
  const [settlementRef, setSettlementRef] = useState('');

  // Modals state - Pay Pending Prize to Client
  const [showPayToClientModal, setShowPayToClientModal] = useState(false);
  const [selectedPrizeToPay, setSelectedPrizeToPay] = useState<PrizeRecord | null>(null);
  const [payToClientAmountStr, setPayToClientAmountStr] = useState('');
  const [payToClientDate, setPayToClientDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [payToClientMethod, setPayToClientMethod] = useState<PaymentMethod>('dinheiro');
  const [payToClientAccount, setPayToClientAccount] = useState('Cofre Central Blindado');

  const filteredPrizes = prizes.filter(p => {
    if (filterGame !== 'all' && p.gameType !== filterGame) return false;
    if (filterMethod !== 'all' && p.method !== filterMethod) return false;
    if (filterSettlementStatus !== 'all' && p.settlementStatus !== filterSettlementStatus) return false;
    if (filterClientPaymentStatus !== 'all') {
      const pStatus = p.paymentStatus || 'pago';
      if (pStatus !== filterClientPaymentStatus) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTicket = p.ticketNumber.toLowerCase().includes(term);
      const matchContest = p.contestNumber.toLowerCase().includes(term);
      const matchGame = p.gameType.toLowerCase().includes(term);
      const matchClient = p.clientName?.toLowerCase().includes(term);
      if (!matchTicket && !matchContest && !matchGame && !matchClient) return false;
    }
    return true;
  });

  const totalPaid = prizes
    .filter(p => (p.paymentStatus || 'pago') === 'pago')
    .reduce((acc, p) => acc + (p.paidAmount ?? p.amount), 0);
  const totalSettled = prizes
    .filter(p => p.settlementStatus === 'ressarcido_caixa')
    .reduce((acc, p) => acc + p.amount, 0);
  const totalPendingSettlement = totalPaid - totalSettled;
  const countPendingClientPayment = prizes.filter(p => p.paymentStatus === 'pendente').length;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseBRL(amountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor válido de prêmio.');
      return;
    }
    if (!contestNumber || !ticketNumber) {
      addToast('error', 'Dados Obrigatórios', 'Informe o concurso e o número do bilhete.');
      return;
    }

    let finalClientId: string | undefined = undefined;
    let finalClientName: string | undefined = undefined;

    if (isCreatingNewClient) {
      if (!newClientName.trim()) {
        addToast('error', 'Nome Obrigatório', 'Informe o nome do novo cliente.');
        return;
      }
      const created = addClient(newClientName.trim(), undefined, newClientPhone.trim() || undefined);
      finalClientId = created.id;
      finalClientName = created.name;
    } else if (selectedClientId) {
      const found = clients.find(c => c.id === selectedClientId);
      if (found) {
        finalClientId = found.id;
        finalClientName = found.name;
      }
    }

    const isPaid = clientPaymentStatus === 'pago';
    const effectivePaidAmount = isPaid ? (paidAmountStr ? parseBRL(paidAmountStr) : amt) : 0;
    const effectivePaidAt = isPaid ? new Date(paidAtDate).toISOString() : '';

    registerPrize({
      gameType,
      contestNumber,
      ticketNumber,
      amount: amt,
      paidAmount: effectivePaidAmount,
      method,
      accountUsed,
      receiptName: receiptName || `Comprovante_${gameType}_${contestNumber}.pdf`,
      clientId: finalClientId,
      clientName: finalClientName,
      paymentStatus: clientPaymentStatus,
      paidAt: effectivePaidAt,
    });

    setShowRegisterModal(false);
    setContestNumber('');
    setTicketNumber('');
    setAmountStr('');
    setReceiptName('');
    setSelectedClientId('');
    setIsCreatingNewClient(false);
    setNewClientName('');
    setNewClientPhone('');
    setClientPaymentStatus('pago');
    setPaidAmountStr('');
  };

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrizeToSettle) return;
    if (!settlementRef.trim()) {
      addToast('error', 'Referência Obrigatória', 'Informe o protocolo de ressarcimento Caixa.');
      return;
    }

    settlePrize(selectedPrizeToSettle.id, settlementRef);
    setShowSettleModal(false);
    setSelectedPrizeToSettle(null);
    setSettlementRef('');
  };

  const handleOpenPayToClient = (prize: PrizeRecord) => {
    setSelectedPrizeToPay(prize);
    setPayToClientAmountStr(prize.amount.toFixed(2).replace('.', ','));
    setPayToClientDate(new Date().toISOString().slice(0, 16));
    setPayToClientMethod(prize.method || 'dinheiro');
    setPayToClientAccount(prize.accountUsed || 'Cofre Central Blindado');
    setShowPayToClientModal(true);
  };

  const handleConfirmPayToClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrizeToPay) return;
    const amt = parseBRL(payToClientAmountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe o valor efetivamente pago ao cliente.');
      return;
    }

    payPrizeToClient(selectedPrizeToPay.id, {
      paidAmount: amt,
      paidAt: new Date(payToClientDate).toISOString(),
      method: payToClientMethod,
      accountUsed: payToClientAccount,
    });

    setShowPayToClientModal(false);
    setSelectedPrizeToPay(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Balcão de Loterias
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <Trophy className="w-7 h-7 text-teal-600" />
            <span>Gestão de Prêmios & Clientes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de bilhetes premiados, controle de pagamento efetivo ao cliente e ressarcimento Caixa.
          </p>
        </div>

        <button
          onClick={() => {
            setShowRegisterModal(true);
            setPaidAtDate(new Date().toISOString().slice(0, 16));
          }}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-700/20 flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Pagamento de Prêmio</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Efetivamente Pago</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            {formatBRL(totalPaid)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {prizes.filter(p => (p.paymentStatus || 'pago') === 'pago').length} bilhete(s) pagos
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700">Aguardando Pagamento ao Cliente</span>
          <div className="text-2xl font-extrabold font-mono text-amber-800 mt-1">
            {countPendingClientPayment}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Bilhetes premiados pendentes de liberação</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-600">Aguardando Ressarcimento CEF</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            {formatBRL(totalPendingSettlement)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Valores adiantados pela lotérica ao cliente</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Ressarcido e Liquidado</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-900 mt-1">
            {formatBRL(totalSettled)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Compensado na conta operacional CEF</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por bilhete, concurso ou cliente..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterGame}
            onChange={e => setFilterGame(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Todas Modalidades</option>
            <option value="Mega-Sena">Mega-Sena</option>
            <option value="Lotofácil">Lotofácil</option>
            <option value="Quina">Quina</option>
            <option value="Dia de Sorte">Dia de Sorte</option>
            <option value="Federal">Loteria Federal</option>
          </select>

          <select
            value={filterClientPaymentStatus}
            onChange={e => setFilterClientPaymentStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Pagamento Cliente: Todos</option>
            <option value="pago">Pago ao Cliente</option>
            <option value="pendente">Pendente ao Cliente</option>
          </select>

          <select
            value={filterSettlementStatus}
            onChange={e => setFilterSettlementStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">Acerto CEF: Todos</option>
            <option value="pendente">Pendente de Acerto CEF</option>
            <option value="ressarcido_caixa">Ressarcido Caixa</option>
          </select>
        </div>
      </div>

      {/* Tabela de Prêmios */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Jogo / Concurso</th>
                <th className="px-4 py-3">Nº Bilhete</th>
                <th className="px-4 py-3 text-right">Valor do Prêmio</th>
                <th className="px-4 py-3 text-right">Valor Efetivamente Pago</th>
                <th className="px-4 py-3 text-center">Status Pagamento Cliente</th>
                <th className="px-4 py-3 text-center">Ressarcimento CEF</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrizes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhum prêmio encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredPrizes.map(p => {
                  const isSettled = p.settlementStatus === 'ressarcido_caixa';
                  const isPaidToClient = (p.paymentStatus || 'pago') === 'pago';
                  const effectivePaidAmt = isPaidToClient ? (p.paidAmount ?? p.amount) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {p.paidAt ? formatDateTime(p.paidAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {p.clientName ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">{p.clientName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Cliente Avulso</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {p.gameType} <span className="text-slate-400 font-normal">#{p.contestNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{p.ticketNumber}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                        {formatBRL(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-teal-800 text-sm">
                        {isPaidToClient ? formatBRL(effectivePaidAmt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaidToClient
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 font-black'
                          }`}
                        >
                          {isPaidToClient ? 'Pago' : 'Pendente'}
                        </span>
                        {isPaidToClient && p.paidAt && (
                          <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                            {formatDate(p.paidAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSettled ? 'Ressarcido' : 'Pendente CEF'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {!isPaidToClient && (
                            <button
                              onClick={() => handleOpenPayToClient(p)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center space-x-1"
                              title="Efetivar Pagamento ao Cliente"
                            >
                              <DollarSign className="w-3 h-3 text-emerald-200" />
                              <span>Pagar Cliente</span>
                            </button>
                          )}

                          {!isSettled ? (
                            <button
                              onClick={() => {
                                setSelectedPrizeToSettle(p);
                                setShowSettleModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold flex items-center space-x-1"
                              title="Vincular Acerto com Caixa Econômica Federal"
                            >
                              <LinkIcon className="w-3 h-3 text-amber-300" />
                              <span>Acerto CEF</span>
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center space-x-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Liquidado</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pagamento de Prêmio */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Registrar Pagamento de Prêmio"
        subtitle="Vínculo de cliente, valor apurado, status do pagamento e comprovante"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Seção Cliente */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Cliente Ganhador</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="text-xs font-bold text-teal-700 hover:underline flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingNewClient ? 'Selecionar Existente' : '+ Novo Cliente'}</span>
              </button>
            </div>

            {isCreatingNewClient ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do cliente *"
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Telefone / Celular (opcional)"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">Cliente Avulso (Não identificado)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.cpf ? `(${c.cpf})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Dados do Jogo e Bilhete */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Modalidade / Jogo *
              </label>
              <select
                value={gameType}
                onChange={e => setGameType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="Mega-Sena">Mega-Sena</option>
                <option value="Lotofácil">Lotofácil</option>
                <option value="Quina">Quina</option>
                <option value="Lotomania">Lotomania</option>
                <option value="Dia de Sorte">Dia de Sorte</option>
                <option value="Timemania">Timemania</option>
                <option value="+Milionária">+Milionária</option>
                <option value="Federal">Loteria Federal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Concurso Nº *
              </label>
              <input
                type="text"
                required
                value={contestNumber}
                onChange={e => setContestNumber(e.target.value)}
                placeholder="Ex: 3195"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Número do Bilhete Premiado / Autenticação *
            </label>
            <input
              type="text"
              required
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              placeholder="Ex: 0948-2819-0012-33"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          {/* Valor do Prêmio & Status de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Valor do Prêmio (R$) *
              </label>
              <input
                type="text"
                required
                value={amountStr}
                onChange={e => {
                  setAmountStr(e.target.value);
                  if (!paidAmountStr) setPaidAmountStr(e.target.value);
                }}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Pagamento ao Cliente *
              </label>
              <select
                value={clientPaymentStatus}
                onChange={e => setClientPaymentStatus(e.target.value as 'pago' | 'pendente')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="pago">Pago ao Cliente</option>
                <option value="pendente">Pendente de Pagamento</option>
              </select>
            </div>
          </div>

          {/* Se status for PAGO: Data do pagamento e Valor efetivamente pago */}
          {clientPaymentStatus === 'pago' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                    Valor Efetivamente Pago (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={paidAmountStr}
                    onChange={e => setPaidAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold font-mono text-emerald-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                    Data do Pagamento Efetivo *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={paidAtDate}
                    onChange={e => setPaidAtDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                    Meio de Pagamento
                  </label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold uppercase"
                  >
                    <option value="dinheiro">Dinheiro (Espécie)</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">
                    Origem dos Recursos
                  </label>
                  <select
                    value={accountUsed}
                    onChange={e => setAccountUsed(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Cofre Central Blindado">Cofre Central Blindado</option>
                    <option value="Banco do Brasil (PIX)">Banco do Brasil (PIX)</option>
                    {accounts
                      .filter(a => a.type === 'gaveta')
                      .map(a => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Comprovante / Canhoto Digitalizado
            </label>
            <input
              type="text"
              value={receiptName}
              onChange={e => setReceiptName(e.target.value)}
              placeholder="Ex: Comprovante_Lotofacil_3195_Autenticado.pdf"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
            >
              Salvar Registro de Prêmio
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Efetivar Pagamento Pendente ao Cliente */}
      <Modal
        isOpen={showPayToClientModal}
        onClose={() => setShowPayToClientModal(false)}
        title="Efetivar Pagamento ao Cliente"
        subtitle="Confirme o valor efetivamente pago e a data da transação"
      >
        {selectedPrizeToPay && (
          <form onSubmit={handleConfirmPayToClient} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                <strong>Cliente:</strong> {selectedPrizeToPay.clientName || 'Cliente Avulso'}
              </div>
              <div>
                <strong>Jogo:</strong> {selectedPrizeToPay.gameType} #{selectedPrizeToPay.contestNumber}
              </div>
              <div>
                <strong>Bilhete:</strong> {selectedPrizeToPay.ticketNumber}
              </div>
              <div>
                <strong>Valor do Bilhete Premiado:</strong>{' '}
                <span className="font-bold text-teal-800 font-mono">
                  {formatBRL(selectedPrizeToPay.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Valor Efetivamente Pago (R$) *
                </label>
                <input
                  type="text"
                  required
                  value={payToClientAmountStr}
                  onChange={e => setPayToClientAmountStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={payToClientDate}
                  onChange={e => setPayToClientDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Meio de Pagamento
                </label>
                <select
                  value={payToClientMethod}
                  onChange={e => setPayToClientMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase"
                >
                  <option value="dinheiro">Dinheiro (Espécie)</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Origem dos Recursos
                </label>
                <select
                  value={payToClientAccount}
                  onChange={e => setPayToClientAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Cofre Central Blindado">Cofre Central Blindado</option>
                  <option value="Banco do Brasil (PIX)">Banco do Brasil (PIX)</option>
                  {accounts
                    .filter(a => a.type === 'gaveta')
                    .map(a => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
              O prêmio passará a ser computado no total recebido em prêmios pelo cliente no Dashboard com base na data do pagamento informada acima.
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowPayToClientModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Confirmar Pagamento Efetivo
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Vincular Acerto Caixa Econômica Federal */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Vincular Acerto / Ressarcimento CEF"
        subtitle="Vincula o ressarcimento da Caixa sem duplicar o pagamento financeiro original"
      >
        {selectedPrizeToSettle && (
          <form onSubmit={handleSettle} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                <strong>Jogo:</strong> {selectedPrizeToSettle.gameType} #{selectedPrizeToSettle.contestNumber}
              </div>
              <div>
                <strong>Bilhete:</strong> {selectedPrizeToSettle.ticketNumber}
              </div>
              <div>
                <strong>Valor a ser ressarcido pela CEF:</strong>{' '}
                <span className="font-bold text-teal-800 font-mono">
                  {formatBRL(selectedPrizeToSettle.amount)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Protocolo / Guia de Ressarcimento Caixa *
              </label>
              <input
                type="text"
                required
                value={settlementRef}
                onChange={e => setSettlementRef(e.target.value)}
                placeholder="Ex: CEF-RESSARC-20261119-0091"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
              Ao vincular, o sistema marca o bilhete como ressarcido pela Caixa Econômica sem gerar duplicidade de pagamento no extrato financeiro.
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Confirmar Vínculo de Acerto
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

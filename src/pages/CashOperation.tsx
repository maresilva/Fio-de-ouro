import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PaymentMethod, CashMovement, ENTRY_CATEGORIES } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDateTime, formatTime } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Trophy,
  ShieldAlert,
  Coins,
  RefreshCw,
  CheckCircle2,
  Lock,
  Clock,
  RotateCcw,
  FileText,
  AlertCircle,
  Plus,
  User,
  UserPlus,
  Edit2,
  Search,
} from 'lucide-react';

export const CashOperation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    shifts,
    accounts,
    clients,
    addClient,
    addCashMovement,
    updateCashMovement,
    reverseCashMovement,
    registerPrize,
    addToast,
  } = useApp();

  const shift = shifts.find(s => s.id === id);
  const cofre = accounts.find(a => a.type === 'cofre');

  // Modals state
  const [modalType, setModalType] = useState<
    'entrada' | 'saida' | 'premio' | 'sangria' | 'reforco' | 'estorno' | 'editar' | null
  >(null);

  // Form states
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  const [category, setCategory] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Cliente e Status Pagamento (específico de Entrada)
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pago' | 'nao_pago' | ''>('');
  const [isNewClientMode, setIsNewClientMode] = useState(false);
  const [newClientNameInput, setNewClientNameInput] = useState('');

  // Prize specific states
  const [gameType, setGameType] = useState('Lotofácil');
  const [contestNumber, setContestNumber] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [receiptName, setReceiptName] = useState('');

  // Estorno specific state
  const [selectedMovementToReverse, setSelectedMovementToReverse] = useState<CashMovement | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Edit specific state
  const [selectedMovementToEdit, setSelectedMovementToEdit] = useState<CashMovement | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pago' | 'nao_pago'>('pago');
  const [editNotes, setEditNotes] = useState('');
  const [isEditNewClientMode, setIsEditNewClientMode] = useState(false);
  const [editNewClientInput, setEditNewClientInput] = useState('');

  if (!shift) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Turno de Caixa Não Encontrado</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          O turno solicitado não existe ou já foi arquivado.
        </p>
        <Link
          to="/cash"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-block"
        >
          Voltar para Lista de Caixas
        </Link>
      </div>
    );
  }

  // Calculate live expected cash in drawer
  // IMPORTANTE: apenas entradas marcadas como 'pago' entram no saldo do caixa!
  const nonReversed = shift.movements.filter(m => !m.isReversed);
  const totalEntradasDinheiro = nonReversed
    .filter(m => m.type === 'entrada' && m.method === 'dinheiro' && m.paymentStatus !== 'nao_pago')
    .reduce((a, b) => a + b.amount, 0);
  const totalSaidasDinheiro = nonReversed
    .filter(m => (m.type === 'saida' || m.type === 'premio') && m.method === 'dinheiro')
    .reduce((a, b) => a + b.amount, 0);
  const totalSangrias = nonReversed
    .filter(m => m.type === 'sangria')
    .reduce((a, b) => a + b.amount, 0);
  const totalReforcos = nonReversed
    .filter(m => m.type === 'reforco')
    .reduce((a, b) => a + b.amount, 0);

  const currentExpectedCash =
    shift.initialCash +
    totalEntradasDinheiro +
    totalReforcos -
    totalSaidasDinheiro -
    totalSangrias;

  const resetForm = () => {
    setAmountStr('');
    setMethod('dinheiro');
    setCategory('');
    setReference('');
    setNotes('');
    setSelectedClientId('');
    setSelectedClientName('');
    setPaymentStatus('');
    setIsNewClientMode(false);
    setNewClientNameInput('');
    setGameType('Lotofácil');
    setContestNumber('');
    setTicketNumber('');
    setReceiptName('');
    setSelectedMovementToReverse(null);
    setReversalReason('');
    setSelectedMovementToEdit(null);
    setIsEditNewClientMode(false);
    setEditNewClientInput('');
    setModalType(null);
  };

  const handleOpenMovement = (type: 'entrada' | 'saida' | 'sangria' | 'reforco' | 'premio') => {
    resetForm();
    setModalType(type);
    if (type === 'sangria') {
      setCategory('Sangria de Segurança para Cofre');
      setReference(`SNG-${shift.drawerName.substring(0, 3)}-${Date.now().toString().slice(-4)}`);
    } else if (type === 'reforco') {
      setCategory('Reforço de Troco / Moedas');
      setReference(`REF-${shift.drawerName.substring(0, 3)}-${Date.now().toString().slice(-4)}`);
    }
  };

  const handleQuickCreateClient = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newClientNameInput.trim()) {
      addToast('error', 'Nome Obrigatório', 'Informe o nome do cliente.');
      return;
    }
    const created = addClient(newClientNameInput.trim());
    setSelectedClientId(created.id);
    setSelectedClientName(created.name);
    setIsNewClientMode(false);
    setNewClientNameInput('');
  };

  const handleQuickCreateEditClient = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editNewClientInput.trim()) {
      addToast('error', 'Nome Obrigatório', 'Informe o nome do cliente.');
      return;
    }
    const created = addClient(editNewClientInput.trim());
    setEditClientId(created.id);
    setEditClientName(created.name);
    setIsEditNewClientMode(false);
    setEditNewClientInput('');
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseBRL(amountStr);
    if (amount <= 0) {
      addToast('error', 'Valor Obrigatório', 'Informe um valor maior que zero.');
      return;
    }

    if (modalType === 'sangria') {
      if (amount > currentExpectedCash) {
        addToast('error', 'Saldo Insuficiente na Gaveta', `A gaveta possui apenas ${formatBRL(currentExpectedCash)} em dinheiro.`);
        return;
      }
      addCashMovement({
        shiftId: shift.id,
        type: 'sangria',
        category: 'Sangria de Segurança para Cofre',
        method: 'dinheiro',
        amount,
        reference: reference || `Sangria Protocolo #${Date.now().toString().slice(-5)}`,
        notes,
      });
      resetForm();
      return;
    }

    if (modalType === 'reforco') {
      if (cofre && amount > cofre.balance) {
        addToast('error', 'Saldo Insuficiente no Cofre', `O cofre possui apenas ${formatBRL(cofre.balance)}.`);
        return;
      }
      addCashMovement({
        shiftId: shift.id,
        type: 'reforco',
        category: 'Reforço de Troco',
        method: 'dinheiro',
        amount,
        reference: reference || `Reforço Troco #${Date.now().toString().slice(-5)}`,
        notes,
      });
      resetForm();
      return;
    }

    if (modalType === 'premio') {
      if (!contestNumber || !ticketNumber) {
        addToast('error', 'Dados Incompletos', 'Informe o concurso e o número do bilhete.');
        return;
      }
      registerPrize({
        shiftId: shift.id,
        gameType,
        contestNumber,
        ticketNumber,
        amount,
        method,
        accountUsed: shift.drawerName,
        receiptName: receiptName || `Comprovante_${gameType}_${contestNumber}.pdf`,
        clientId: selectedClientId || undefined,
        clientName: selectedClientName || undefined,
        paymentStatus: 'pago',
        paidAmount: amount,
      });
      resetForm();
      return;
    }

    if (modalType === 'entrada') {
      if (!category) {
        addToast('error', 'Categoria Obrigatória', 'Selecione uma categoria de entrada.');
        return;
      }
      if (!selectedClientId) {
        addToast('error', 'Cliente Obrigatório', 'Selecione ou cadastre o cliente da aposta.');
        return;
      }
      if (!paymentStatus) {
        addToast('error', 'Status do Pagamento Obrigatório', 'Escolha entre "Pago" e "Não pago".');
        return;
      }

      addCashMovement({
        shiftId: shift.id,
        type: 'entrada',
        category,
        method,
        amount,
        reference: reference || `${category} - ${selectedClientName || 'Aposta'}`,
        notes,
        clientId: selectedClientId,
        clientName: selectedClientName,
        paymentStatus: paymentStatus as 'pago' | 'nao_pago',
      });
      resetForm();
      return;
    }

    if (modalType === 'saida') {
      if (!category) {
        addToast('error', 'Categoria Obrigatória', 'Selecione ou digite uma categoria para o lançamento.');
        return;
      }

      if (method === 'dinheiro' && amount > currentExpectedCash) {
        if (!window.confirm(`Atenção: A saída de ${formatBRL(amount)} é maior que o saldo em dinheiro da gaveta (${formatBRL(currentExpectedCash)}). Deseja continuar?`)) {
          return;
        }
      }

      addCashMovement({
        shiftId: shift.id,
        type: 'saida',
        category,
        method,
        amount,
        reference: reference || `${category} - ${formatTime(new Date().toISOString())}`,
        notes,
      });
      resetForm();
    }
  };

  const handleOpenEditModal = (mov: CashMovement) => {
    setSelectedMovementToEdit(mov);
    setEditCategory(mov.category);
    setEditClientId(mov.clientId || '');
    setEditClientName(mov.clientName || '');
    setEditPaymentStatus(mov.paymentStatus || 'pago');
    setEditNotes(mov.notes || '');
    setIsEditNewClientMode(false);
    setEditNewClientInput('');
    setModalType('editar');
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementToEdit) return;

    if (!editCategory) {
      addToast('error', 'Categoria Obrigatória', 'Informe a categoria.');
      return;
    }

    updateCashMovement(shift.id, selectedMovementToEdit.id, {
      category: editCategory,
      clientId: editClientId || undefined,
      clientName: editClientName || undefined,
      paymentStatus: editPaymentStatus,
      notes: editNotes,
    });

    resetForm();
  };

  const handleOpenReverseModal = (mov: CashMovement) => {
    setSelectedMovementToReverse(mov);
    setReversalReason('');
    setModalType('estorno');
  };

  const handleConfirmReverse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementToReverse) return;
    if (!reversalReason.trim()) {
      addToast('error', 'Justificativa Obrigatória', 'Informe o motivo do estorno do lançamento.');
      return;
    }

    reverseCashMovement(shift.id, selectedMovementToReverse.id, reversalReason);
    resetForm();
  };

  const isShiftOpen = shift.status === 'aberto';

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Turno */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isShiftOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {shift.status === 'aberto' ? 'Turno Aberto / Em Atendimento' : 'Turno em Revisão'}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium capitalize">Turno {shift.period}</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            {shift.drawerName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
            <span>
              Operador: <strong className="text-slate-900">{shift.operatorName}</strong>
            </span>
            <span>•</span>
            <span>
              Abertura: <strong className="text-slate-900 font-mono">{formatDateTime(shift.openedAt)}</strong>
            </span>
            <span>•</span>
            <span>
              Fundo Inicial: <strong className="text-slate-900 font-mono">{formatBRL(shift.initialCash)}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Balance & Closing Trigger */}
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Saldo Dinheiro na Gaveta (Apenas Pagos)
            </span>
            <div className="text-2xl font-black font-mono text-emerald-900">
              {formatBRL(currentExpectedCash)}
            </div>
          </div>

          {isShiftOpen ? (
            <Link
              to={`/cash/${shift.id}/close`}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Ir para Fechamento</span>
            </Link>
          ) : (
            <div className="px-4 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
              Turno Encerrado para Revisão
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Bar */}
      {isShiftOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Botão Nova Entrada */}
          <button
            onClick={() => handleOpenMovement('entrada')}
            className="p-3.5 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-500 rounded-xl shadow-sm text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">+ Nova Entrada</div>
            <div className="text-[10px] text-slate-500">Apostas, horários, clientes</div>
          </button>

          {/* Botão Nova Saída */}
          <button
            onClick={() => handleOpenMovement('saida')}
            className="p-3.5 bg-white hover:bg-red-50/50 border border-slate-200 hover:border-red-500 rounded-xl shadow-sm text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">- Nova Saída</div>
            <div className="text-[10px] text-slate-500">Benefícios, saques, despesas</div>
          </button>

          {/* Botão Registrar Prêmio */}
          <button
            onClick={() => handleOpenMovement('premio')}
            className="p-3.5 bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-500 rounded-xl shadow-sm text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Registrar Prêmio</div>
            <div className="text-[10px] text-slate-500">Mega, Quina, Lotofácil</div>
          </button>

          {/* Botão Sangria */}
          <button
            onClick={() => handleOpenMovement('sangria')}
            className="p-3.5 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-500 rounded-xl shadow-sm text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Sangria para Cofre</div>
            <div className="text-[10px] text-slate-500">Gaveta ➔ Cofre Central</div>
          </button>

          {/* Botão Reforço de Troco */}
          <button
            onClick={() => handleOpenMovement('reforco')}
            className="p-3.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-500 rounded-xl shadow-sm text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Reforço de Troco</div>
            <div className="text-[10px] text-slate-500">Cofre ➔ Gaveta</div>
          </button>
        </div>
      )}

      {/* Movement List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Lançamentos do Turno ({shift.movements.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Apostas não pagas não somam no caixa até a atualização para Pago
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoria / Descrição</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-center">Status Pagto</th>
                <th className="px-4 py-3">Meio</th>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shift.movements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhum movimento registrado neste turno ainda.
                  </td>
                </tr>
              ) : (
                shift.movements.map(mov => {
                  const isReversed = mov.isReversed;
                  const isEstorno = mov.type === 'estorno';

                  let badgeColor = 'bg-slate-100 text-slate-800';
                  if (mov.type === 'entrada') badgeColor = 'bg-emerald-100 text-emerald-800';
                  if (mov.type === 'saida') badgeColor = 'bg-red-100 text-red-800';
                  if (mov.type === 'premio') badgeColor = 'bg-teal-100 text-teal-800';
                  if (mov.type === 'sangria') badgeColor = 'bg-amber-100 text-amber-800';
                  if (mov.type === 'reforco') badgeColor = 'bg-blue-100 text-blue-800';
                  if (isEstorno) badgeColor = 'bg-purple-100 text-purple-800';

                  const isUnpaid = mov.type === 'entrada' && mov.paymentStatus === 'nao_pago';

                  return (
                    <tr
                      key={mov.id}
                      className={`hover:bg-slate-50/70 ${isReversed ? 'opacity-40 line-through bg-slate-50/30' : ''} ${isUnpaid ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-slate-500">{formatTime(mov.timestamp)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeColor}`}>
                          {mov.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {mov.category}
                        {mov.notes && (
                          <span className="block text-[10px] text-slate-400 font-normal no-underline">
                            Obs: {mov.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mov.clientName ? (
                          <span className="inline-flex items-center space-x-1 text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{mov.clientName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mov.type === 'entrada' ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              mov.paymentStatus === 'nao_pago'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {mov.paymentStatus === 'nao_pago' ? 'Não pago' : 'Pago'}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-600">
                        {mov.method}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {mov.reference}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          mov.type === 'entrada' || mov.type === 'reforco'
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }`}
                      >
                        {mov.type === 'entrada' || mov.type === 'reforco' ? '+' : '-'} {formatBRL(mov.amount)}
                        {isUnpaid && (
                          <span className="block text-[9px] font-normal text-amber-700 no-underline">
                            (Ainda não computado)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center no-underline whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {!isReversed && !isEstorno && (
                            <button
                              onClick={() => handleOpenEditModal(mov)}
                              title="Editar Lançamento / Atualizar Pagamento"
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isReversed ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              Estornado
                            </span>
                          ) : isEstorno ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                              Espelho
                            </span>
                          ) : isShiftOpen ? (
                            <button
                              onClick={() => handleOpenReverseModal(mov)}
                              title="Estornar movimento"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Bloqueado</span>
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

      {/* Movement Modal (Entrada, Saída, Sangria, Reforço, Prêmio) */}
      <Modal
        isOpen={
          modalType === 'entrada' ||
          modalType === 'saida' ||
          modalType === 'sangria' ||
          modalType === 'reforco' ||
          modalType === 'premio'
        }
        onClose={resetForm}
        title={
          modalType === 'entrada'
            ? 'Registrar Nova Entrada'
            : modalType === 'saida'
            ? 'Registrar Nova Saída'
            : modalType === 'sangria'
            ? 'Realizar Sangria para o Cofre'
            : modalType === 'reforco'
            ? 'Solicitar Reforço de Troco'
            : 'Registrar Pagamento de Prêmio'
        }
        subtitle={`${shift.drawerName} • Operador: ${shift.operatorName}`}
      >
        <form onSubmit={handleSaveMovement} className="space-y-4">
          {/* Categoria da Entrada (Exigida e estritamente com as 8 opções) */}
          {modalType === 'entrada' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoria da Entrada *
              </label>
              <select
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione uma categoria...</option>
                {ENTRY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nome do Cliente (Obrigatório para Entrada) */}
          {modalType === 'entrada' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nome do Cliente *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewClientMode(!isNewClientMode)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isNewClientMode ? 'Selecionar Existente' : 'Cadastrar Novo Cliente'}</span>
                </button>
              </div>

              {isNewClientMode ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newClientNameInput}
                    onChange={e => setNewClientNameInput(e.target.value)}
                    placeholder="Nome completo do novo cliente..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateClient}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    required
                    value={selectedClientId}
                    onChange={e => {
                      const cId = e.target.value;
                      setSelectedClientId(cId);
                      const c = clients.find(client => client.id === cId);
                      setSelectedClientName(c?.name || '');
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Status do Pagamento (Obrigatório para Entrada: "Pago" e "Não pago") */}
          {modalType === 'entrada' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status do Pagamento *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('pago')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                    paymentStatus === 'pago'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pago</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('nao_pago')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                    paymentStatus === 'nao_pago'
                      ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Não pago</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Apostas com status "Não pago" entram nas estatísticas do cliente, mas não entram no saldo do caixa até a quitação.
              </p>
            </div>
          )}

          {/* Valor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Valor (R$) *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Meio de Pagamento (para entrada, saida, premio) */}
          {(modalType === 'entrada' || modalType === 'saida' || modalType === 'premio') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Meio de Pagamento
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(['dinheiro', 'pix', 'debito', 'credito', 'convenio'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold uppercase transition-all ${
                      method === m
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modalType === 'saida' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoria da Saída *
              </label>
              <select
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione uma categoria...</option>
                <option value="Pagamento de Benefício Social (Bolsa Família / PIS)">
                  Pagamento de Benefício Social (Bolsa Família / PIS)
                </option>
                <option value="Saque Caixa Fácil / Beneficiário INSS">Saque Caixa Fácil / Beneficiário INSS</option>
                <option value="Despesas de Balcão (Material / Limpeza)">Despesas de Balcão (Material / Limpeza)</option>
                <option value="Outras Saídas Operacionais">Outras Saídas Operacionais</option>
              </select>
            </div>
          )}

          {/* Prêmio Details */}
          {modalType === 'premio' && (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Modalidade / Jogo
                  </label>
                  <select
                    value={gameType}
                    onChange={e => setGameType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Mega-Sena">Mega-Sena</option>
                    <option value="Lotofácil">Lotofácil</option>
                    <option value="Quina">Quina</option>
                    <option value="Lotomania">Lotomania</option>
                    <option value="Timemania">Timemania</option>
                    <option value="Dia de Sorte">Dia de Sorte</option>
                    <option value="Mais Milionária">+Milionária</option>
                    <option value="Federal">Federal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Concurso Nº
                  </label>
                  <input
                    type="text"
                    required
                    value={contestNumber}
                    onChange={e => setContestNumber(e.target.value)}
                    placeholder="Ex: 3195"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Cliente Beneficiário (Opcional)
                </label>
                <select
                  value={selectedClientId}
                  onChange={e => {
                    const cId = e.target.value;
                    setSelectedClientId(cId);
                    const c = clients.find(client => client.id === cId);
                    setSelectedClientName(c?.name || '');
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Selecione o cliente (se identificado)...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Número do Bilhete / Código de Barras
                </label>
                <input
                  type="text"
                  required
                  value={ticketNumber}
                  onChange={e => setTicketNumber(e.target.value)}
                  placeholder="Ex: 0948-2819-0012-33"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Comprovante Digital (Simulação de Anexo)
                </label>
                <input
                  type="text"
                  value={receiptName}
                  onChange={e => setReceiptName(e.target.value)}
                  placeholder="Ex: comprovante_autenticado_3195.pdf"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Sangria / Reforço Explanation & Context */}
          {modalType === 'sangria' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Transação Única em Tempo Real</span>
              </div>
              <p>
                O valor informado sairá da gaveta <strong>{shift.drawerName}</strong> e entrará
                imediatamente no <strong>Cofre Central Blindado</strong> sem risco de duplicidade.
              </p>
            </div>
          )}

          {modalType === 'reforco' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-blue-700" />
                <span>Transação Única em Tempo Real</span>
              </div>
              <p>
                O valor informado sairá do <strong>Cofre Central Blindado</strong> (saldo:{' '}
                {formatBRL(cofre?.balance)}) e entrará diretamente na gaveta{' '}
                <strong>{shift.drawerName}</strong>.
              </p>
            </div>
          )}

          {/* Referência */}
          {modalType !== 'premio' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Referência / Identificador
              </label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Ex: Bilhete #1042 / Aposta Avulsa"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Informações para auditoria contábil..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
            >
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Lançamento (sem duplicar entrada) */}
      <Modal
        isOpen={modalType === 'editar'}
        onClose={resetForm}
        title="Editar Lançamento"
        subtitle="Atualize status de pagamento ou complete dados ausentes sem criar outra entrada"
      >
        {selectedMovementToEdit && (
          <form onSubmit={handleConfirmEdit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Tipo:</strong> <span className="uppercase font-bold">{selectedMovementToEdit.type}</span> |{' '}
                <strong>Valor:</strong> {formatBRL(selectedMovementToEdit.amount)} ({selectedMovementToEdit.method})
              </div>
              <div className="text-slate-500 font-mono">
                Criado em: {formatDateTime(selectedMovementToEdit.timestamp)} por {selectedMovementToEdit.userName}
              </div>
            </div>

            {/* Status do Pagamento (Atualizável de Não pago para Pago) */}
            {selectedMovementToEdit.type === 'entrada' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status do Pagamento *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditPaymentStatus('pago')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      editPaymentStatus === 'pago'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pago</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPaymentStatus('nao_pago')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      editPaymentStatus === 'nao_pago'
                        ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Não pago</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ao alterar para "Pago", o valor entra automaticamente no caixa sem gerar duplicidade.
                </p>
              </div>
            )}

            {/* Cliente */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vincular / Alterar Cliente</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditNewClientMode(!isEditNewClientMode)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {isEditNewClientMode ? 'Lista Existente' : '+ Novo Cliente'}
                </button>
              </div>

              {isEditNewClientMode ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editNewClientInput}
                    onChange={e => setEditNewClientInput(e.target.value)}
                    placeholder="Nome do cliente..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateEditClient}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <select
                  value={editClientId}
                  onChange={e => {
                    const cId = e.target.value;
                    setEditClientId(cId);
                    const c = clients.find(client => client.id === cId);
                    setEditClientName(c?.name || '');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                >
                  <option value="">Nenhum cliente vinculado</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {/* Se a categoria atual for legada e não estiver nas novas opções, exibi-la para preservação */}
                {!ENTRY_CATEGORIES.includes(editCategory as any) && (
                  <option value={editCategory}>{editCategory} (Original / Histórico)</option>
                )}
                {ENTRY_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Observações
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Estorno com Preservação de Histórico */}
      <Modal
        isOpen={modalType === 'estorno'}
        onClose={resetForm}
        title="Estornar Movimento de Caixa"
        subtitle="Geração de lançamento espelho preservando autoria e histórico"
      >
        {selectedMovementToReverse && (
          <form onSubmit={handleConfirmReverse} className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5">
              <div className="font-bold">Lançamento a ser estornado:</div>
              <div>
                <strong>Categoria:</strong> {selectedMovementToReverse.category}
              </div>
              <div>
                <strong>Valor:</strong> {formatBRL(selectedMovementToReverse.amount)} (
                {selectedMovementToReverse.method})
              </div>
              <div>
                <strong>Referência:</strong> {selectedMovementToReverse.reference}
              </div>
              <div>
                <strong>Autor original:</strong> {selectedMovementToReverse.userName} às{' '}
                {formatTime(selectedMovementToReverse.timestamp)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Justificativa Obrigatória do Estorno *
              </label>
              <textarea
                required
                rows={3}
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="Explique o motivo do estorno (ex: erro de digitação de valor, cliente cancelou aposta antes da impressão)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
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

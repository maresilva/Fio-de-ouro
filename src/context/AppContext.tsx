import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Client,
  Drawer,
  CashShift,
  CashMovement,
  ShiftPeriod,
  ShiftClosingData,
  TreasuryAccount,
  TreasuryTransaction,
  ReconciliationItem,
  PrizeRecord,
  FinancialRecord,
  PayrollRecord,
  AuditLog,
  PaymentMethod,
  FinanceType,
  FootballBet,
  FootballPrize,
  DailyClosing,
  ClosingCorrection,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CLIENTS,
  INITIAL_DRAWERS,
  INITIAL_ACCOUNTS,
  INITIAL_SHIFTS,
  INITIAL_PRIZES,
  INITIAL_FINANCE,
  INITIAL_PAYROLL,
  INITIAL_RECONCILIATION,
  INITIAL_AUDIT_LOGS,
  INITIAL_FOOTBALL_BETS,
  INITIAL_FOOTBALL_CLOSINGS,
  INITIAL_FOOTBALL_PRIZES,
} from '../mock/initialData';
import { toCents, fromCents } from '../utils/currency';
import { useAuth } from './AuthContext';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  clients: Client[];
  addClient: (name: string, phone?: string, cpf?: string, referenceCode?: string, notes?: string) => Client;
  drawers: Drawer[];
  shifts: CashShift[];
  accounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  reconciliations: ReconciliationItem[];
  prizes: PrizeRecord[];
  financeRecords: FinancialRecord[];
  payrollRecords: PayrollRecord[];
  auditLogs: AuditLog[];
  toasts: ToastNotification[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;

  // Painel de Futebol (Novas Entidades)
  footballBets: FootballBet[];
  dailyClosings: DailyClosing[];
  footballPrizes: FootballPrize[];

  addFootballBet: (params: {
    date: string;
    clientId: string;
    amount: number;
    status: 'pago' | 'nao_pago';
    receivedAt?: string;
    notes?: string;
  }) => { success: boolean; bet?: FootballBet; error?: string };

  markBetAsPaid: (params: {
    betId: string;
    receivedAt: string;
  }) => { success: boolean; error?: string };

  addFootballPrize: (params: {
    clientId: string;
    amount: number;
    paidAt: string;
    betId?: string;
    notes?: string;
  }) => { success: boolean; prize?: FootballPrize; error?: string };

  saveDailyClosing: (params: {
    date: string;
    apurado: number;
    descarrego: number;
    notes?: string;
  }) => { success: boolean; closing?: DailyClosing; error?: string; existingClosing?: DailyClosing };

  correctDailyClosing: (params: {
    closingId: string;
    newApurado: number;
    newDescarrego: number;
    reason: string;
    newNotes?: string;
  }) => { success: boolean; error?: string };

  getConferenceRecebimentos: (date: string) => number;

  // Turnos & Caixas
  openShift: (params: {
    drawerId: string;
    operatorId: string;
    period: ShiftPeriod;
    initialCash: number;
    sourceAccountId?: string;
  }) => string | null;

  addCashMovement: (params: {
    shiftId: string;
    type: 'entrada' | 'saida' | 'premio' | 'sangria' | 'reforco';
    category: string;
    method: PaymentMethod;
    amount: number;
    reference: string;
    notes?: string;
    receiptUrl?: string;
    clientId?: string;
    clientName?: string;
    paymentStatus?: 'pago' | 'nao_pago';
  }) => CashMovement | null;

  updateCashMovement: (
    shiftId: string,
    movementId: string,
    updates: Partial<CashMovement>
  ) => boolean;

  reverseCashMovement: (shiftId: string, movementId: string, reason: string) => boolean;

  submitShiftClosing: (shiftId: string, closingData: ShiftClosingData) => boolean;

  approveShiftClosing: (shiftId: string, notes?: string) => boolean;

  adjustShiftClosing: (shiftId: string, adjustmentAmount: number, notes: string) => boolean;

  // Tesouraria
  transferTreasury: (params: {
    sourceAccountId: string;
    destAccountId: string;
    amount: number;
    category: string;
    reference: string;
    notes?: string;
  }) => boolean;

  depositTreasury: (params: {
    sourceAccountId: string;
    destAccountId: string;
    amount: number;
    reference: string;
    notes?: string;
  }) => boolean;

  confirmReconciliationItem: (itemId: string, notes?: string) => boolean;

  // Prêmios
  registerPrize: (params: {
    shiftId?: string;
    gameType: string;
    contestNumber: string;
    ticketNumber: string;
    amount: number;
    method: PaymentMethod;
    accountUsed: string;
    receiptName?: string;
    clientId?: string;
    clientName?: string;
    paymentStatus?: 'pago' | 'pendente';
    paidAmount?: number;
    paidAt?: string;
  }) => PrizeRecord | null;

  payPrizeToClient: (
    prizeId: string,
    params: {
      paidAmount: number;
      paidAt: string;
      method?: PaymentMethod;
      accountUsed?: string;
    }
  ) => boolean;

  settlePrize: (prizeId: string, settlementRef: string) => boolean;

  // Financeiro
  addFinancialRecord: (params: {
    type: FinanceType;
    category: string;
    description: string;
    competency: string;
    dueDate: string;
    amount: number;
    notes?: string;
  }) => FinancialRecord;

  payFinancialRecord: (params: {
    recordId: string;
    amountToPay: number;
    paidFromAccountId: string;
    notes?: string;
  }) => boolean;

  // Salários
  addPayrollRecord: (params: {
    employeeName: string;
    role: string;
    type: 'salario_base' | 'adiantamento' | 'comissao_vendas' | 'vale_transporte' | 'desconto';
    competency: string;
    amount: number;
  }) => PayrollRecord;

  payPayrollRecord: (payrollId: string, paidFromAccountId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// LocalStorage Keys
const KEYS = {
  // Histórico e registros da lotérica preservados
  CLIENTS: 'erp_loterica_clients',
  DRAWERS: 'erp_loterica_drawers',
  SHIFTS: 'erp_loterica_shifts',
  ACCOUNTS: 'erp_loterica_accounts',
  TRANSACTIONS: 'erp_loterica_transactions',
  RECONCILIATION: 'erp_loterica_reconciliations',
  PRIZES: 'erp_loterica_prizes',
  FINANCE: 'erp_loterica_finance',
  PAYROLL: 'erp_loterica_payroll',
  AUDIT: 'erp_loterica_audit',

  // Painel de Futebol
  FOOTBALL_BETS: 'erp_football_bets',
  FOOTBALL_CLOSINGS: 'erp_football_closings',
  FOOTBALL_PRIZES: 'erp_football_prizes',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [clients, setClients] = useState<Client[]>(() => loadStored(KEYS.CLIENTS, INITIAL_CLIENTS));
  const [drawers, setDrawers] = useState<Drawer[]>(() => loadStored(KEYS.DRAWERS, INITIAL_DRAWERS));
  const [shifts, setShifts] = useState<CashShift[]>(() => loadStored(KEYS.SHIFTS, INITIAL_SHIFTS));
  const [accounts, setAccounts] = useState<TreasuryAccount[]>(() => loadStored(KEYS.ACCOUNTS, INITIAL_ACCOUNTS));
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(() =>
    loadStored(KEYS.TRANSACTIONS, [])
  );
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>(() =>
    loadStored(KEYS.RECONCILIATION, INITIAL_RECONCILIATION)
  );
  const [prizes, setPrizes] = useState<PrizeRecord[]>(() => loadStored(KEYS.PRIZES, INITIAL_PRIZES));
  const [financeRecords, setFinanceRecords] = useState<FinancialRecord[]>(() =>
    loadStored(KEYS.FINANCE, INITIAL_FINANCE)
  );
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() =>
    loadStored(KEYS.PAYROLL, INITIAL_PAYROLL)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStored(KEYS.AUDIT, INITIAL_AUDIT_LOGS));

  // Estado do Painel de Futebol
  const [footballBets, setFootballBets] = useState<FootballBet[]>(() =>
    loadStored(KEYS.FOOTBALL_BETS, INITIAL_FOOTBALL_BETS)
  );
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>(() =>
    loadStored(KEYS.FOOTBALL_CLOSINGS, INITIAL_FOOTBALL_CLOSINGS)
  );
  const [footballPrizes, setFootballPrizes] = useState<FootballPrize[]>(() =>
    loadStored(KEYS.FOOTBALL_PRIZES, INITIAL_FOOTBALL_PRIZES)
  );

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Auto-sync state to localStorage
  useEffect(() => { localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem(KEYS.DRAWERS, JSON.stringify(drawers)); }, [drawers]);
  useEffect(() => { localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(treasuryTransactions)); }, [treasuryTransactions]);
  useEffect(() => { localStorage.setItem(KEYS.RECONCILIATION, JSON.stringify(reconciliations)); }, [reconciliations]);
  useEffect(() => { localStorage.setItem(KEYS.PRIZES, JSON.stringify(prizes)); }, [prizes]);
  useEffect(() => { localStorage.setItem(KEYS.FINANCE, JSON.stringify(financeRecords)); }, [financeRecords]);
  useEffect(() => { localStorage.setItem(KEYS.PAYROLL, JSON.stringify(payrollRecords)); }, [payrollRecords]);
  useEffect(() => { localStorage.setItem(KEYS.AUDIT, JSON.stringify(auditLogs)); }, [auditLogs]);
  // Sync futebol
  useEffect(() => { localStorage.setItem(KEYS.FOOTBALL_BETS, JSON.stringify(footballBets)); }, [footballBets]);
  useEffect(() => { localStorage.setItem(KEYS.FOOTBALL_CLOSINGS, JSON.stringify(dailyClosings)); }, [dailyClosings]);
  useEffect(() => { localStorage.setItem(KEYS.FOOTBALL_PRIZES, JSON.stringify(footballPrizes)); }, [footballPrizes]);

  // Toast Helpers
  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logAudit = (params: {
    action: AuditLog['action'];
    entity: string;
    entityId: string;
    reference: string;
    details: string;
    previousState?: any;
    newState?: any;
  }) => {
    const newLog: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'gestor',
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      reference: params.reference,
      details: params.details,
      previousState: params.previousState,
      newState: params.newState,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const addClient = (
    name: string,
    phone?: string,
    cpf?: string,
    referenceCode?: string,
    notes?: string
  ): Client => {
    const newClient: Client = {
      id: 'cli-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      phone: phone?.trim() || undefined,
      cpf: cpf?.trim() || undefined,
      referenceCode: referenceCode?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setClients(prev => [newClient, ...prev]);
    addToast('success', 'Cliente Cadastrado', `Cliente ${newClient.name} cadastrado com sucesso.`);
    return newClient;
  };

  const resetAllData = () => {
    setClients(INITIAL_CLIENTS);
    setDrawers(INITIAL_DRAWERS);
    setShifts(INITIAL_SHIFTS);
    setAccounts(INITIAL_ACCOUNTS);
    setTreasuryTransactions([]);
    setReconciliations(INITIAL_RECONCILIATION);
    setPrizes(INITIAL_PRIZES);
    setFinanceRecords(INITIAL_FINANCE);
    setPayrollRecords(INITIAL_PAYROLL);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    // Reset Futebol
    setFootballBets(INITIAL_FOOTBALL_BETS);
    setDailyClosings(INITIAL_FOOTBALL_CLOSINGS);
    setFootballPrizes(INITIAL_FOOTBALL_PRIZES);
    addToast('info', 'Dados Restaurados', 'O sistema foi reinicializado com o banco de dados demonstrativo.');
  };

  // ==========================================
  // OPERAÇÕES DO PAINEL DE FUTEBOL
  // ==========================================

  // 1. Registrar Aposta
  const addFootballBet = (params: {
    date: string;
    clientId: string;
    amount: number;
    status: 'pago' | 'nao_pago';
    receivedAt?: string;
    notes?: string;
  }): { success: boolean; bet?: FootballBet; error?: string } => {
    if (!currentUser || !['gestor', 'operador', 'financeiro'].includes(currentUser.role)) {
      addToast('error', 'Sem Permissão', 'Usuário não tem autorização para registrar apostas.');
      return { success: false, error: 'Sem permissão.' };
    }

    if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      addToast('error', 'Data Inválida', 'Informe uma data de aposta válida.');
      return { success: false, error: 'Data da aposta inválida.' };
    }

    if (!params.clientId) {
      addToast('error', 'Cliente Obrigatório', 'Selecione ou cadastre o cliente da aposta.');
      return { success: false, error: 'Cliente obrigatório.' };
    }

    const client = clients.find(c => c.id === params.clientId);
    if (!client) {
      addToast('error', 'Cliente Inválido', 'Cliente não encontrado no sistema.');
      return { success: false, error: 'Cliente não encontrado.' };
    }

    const amountCents = toCents(params.amount);
    if (amountCents <= 0) {
      addToast('error', 'Valor Inválido', 'O valor da aposta deve ser maior que zero.');
      return { success: false, error: 'Valor da aposta deve ser maior que zero.' };
    }

    if (params.status !== 'pago' && params.status !== 'nao_pago') {
      addToast('error', 'Situação Inválida', 'Escolha entre Pago ou Não pago.');
      return { success: false, error: 'Situação de pagamento inválida.' };
    }

    let finalReceivedAt: string | undefined = undefined;
    let finalReceivedBy: string | undefined = undefined;
    let finalReceivedByUserId: string | undefined = undefined;

    if (params.status === 'pago') {
      if (!params.receivedAt) {
        addToast('error', 'Data de Recebimento', 'Informe a data do recebimento.');
        return { success: false, error: 'Data de recebimento obrigatória.' };
      }
      if (params.receivedAt < params.date) {
        addToast('error', 'Data Inconsistente', 'A data do recebimento deve ser igual ou posterior à data da aposta.');
        return { success: false, error: 'Data do recebimento anterior à data da aposta.' };
      }
      finalReceivedAt = params.receivedAt;
      finalReceivedBy = currentUser?.name || 'Operador';
      finalReceivedByUserId = currentUser?.id || 'sys';
    }

    const newBet: FootballBet = {
      id: 'fbet-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: params.date,
      clientId: client.id,
      clientName: client.name,
      amount: fromCents(amountCents),
      amountCents,
      status: params.status,
      receivedAt: finalReceivedAt,
      receivedBy: finalReceivedBy,
      receivedByUserId: finalReceivedByUserId,
      notes: params.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFootballBets(prev => [newBet, ...prev]);

    logAudit({
      action: 'NOVA_APOSTA',
      entity: 'FootballBet',
      entityId: newBet.id,
      reference: `Aposta ${client.name} - R$ ${newBet.amount.toFixed(2)}`,
      details: `Aposta de futebol registrada para ${client.name}. Status: ${params.status}. Valor: R$ ${newBet.amount.toFixed(2)}. Data da aposta: ${newBet.date}.`,
      newState: newBet,
    });

    addToast('success', 'Aposta Registrada', `Aposta de R$ ${newBet.amount.toFixed(2)} para ${client.name} registrada.`);
    return { success: true, bet: newBet };
  };

  // 2. Marcar Aposta como Paga (Baixa) com proteção de clique simultâneo/repetido
  const markBetAsPaid = (params: {
    betId: string;
    receivedAt: string;
  }): { success: boolean; error?: string } => {
    if (!currentUser || !['gestor', 'operador', 'financeiro'].includes(currentUser.role)) {
      addToast('error', 'Sem Permissão', 'Usuário não tem autorização para dar baixa.');
      return { success: false, error: 'Sem permissão.' };
    }

    const targetBet = footballBets.find(b => b.id === params.betId);
    if (!targetBet) {
      addToast('error', 'Aposta Não Encontrada', 'Registro de aposta não localizado.');
      return { success: false, error: 'Aposta não encontrada.' };
    }

    // Proteção atômica de duplicação: somente aposta pendente pode ser baixada
    if (targetBet.status === 'pago') {
      addToast('warning', 'Aposta Já Paga', 'Esta aposta já foi baixada anteriormente.');
      return { success: false, error: 'Aposta já se encontra com status pago.' };
    }

    if (!params.receivedAt) {
      addToast('error', 'Data Obrigatória', 'Informe a data do recebimento.');
      return { success: false, error: 'Data do recebimento é obrigatória.' };
    }

    if (params.receivedAt < targetBet.date) {
      addToast('error', 'Data Inválida', 'A data de recebimento deve ser igual ou posterior à data da aposta.');
      return { success: false, error: 'Data de recebimento não pode ser anterior à data da aposta.' };
    }

    const updatedBet: FootballBet = {
      ...targetBet,
      status: 'pago',
      receivedAt: params.receivedAt,
      receivedBy: currentUser?.name || 'Operador',
      receivedByUserId: currentUser?.id || 'sys',
      updatedAt: new Date().toISOString(),
    };

    setFootballBets(prev => prev.map(b => (b.id === params.betId ? updatedBet : b)));

    logAudit({
      action: 'BAIXA_APOSTA',
      entity: 'FootballBet',
      entityId: targetBet.id,
      reference: `Baixa Aposta ${targetBet.clientName}`,
      details: `Aposta de R$ ${targetBet.amount.toFixed(2)} de ${targetBet.clientName} baixada como Paga por ${currentUser?.name}. Data recebimento: ${params.receivedAt}.`,
      previousState: targetBet,
      newState: updatedBet,
    });

    addToast('success', 'Pagamento Confirmado', `Aposta de R$ ${targetBet.amount.toFixed(2)} marcada como paga com sucesso.`);
    return { success: true };
  };

  // 3. Registrar Pagamento de Prêmio de Futebol
  const addFootballPrize = (params: {
    clientId: string;
    amount: number;
    paidAt: string;
    betId?: string;
    notes?: string;
  }): { success: boolean; prize?: FootballPrize; error?: string } => {
    if (!currentUser || !['gestor', 'operador', 'financeiro'].includes(currentUser.role)) {
      addToast('error', 'Sem Permissão', 'Usuário não tem autorização para registrar prêmios.');
      return { success: false, error: 'Sem permissão.' };
    }

    const client = clients.find(c => c.id === params.clientId);
    if (!client) {
      addToast('error', 'Cliente Inválido', 'Cliente não encontrado.');
      return { success: false, error: 'Cliente não encontrado.' };
    }

    const amountCents = toCents(params.amount);
    if (amountCents <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor de prêmio maior que zero.');
      return { success: false, error: 'Valor deve ser maior que zero.' };
    }

    if (!params.paidAt) {
      addToast('error', 'Data Obrigatória', 'Informe a data do pagamento efetivo do prêmio.');
      return { success: false, error: 'Data do pagamento é obrigatória.' };
    }

    const newPrize: FootballPrize = {
      id: 'fprz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      clientId: client.id,
      clientName: client.name,
      betId: params.betId?.trim() || undefined,
      amount: fromCents(amountCents),
      amountCents,
      paidAt: params.paidAt,
      registeredBy: currentUser?.name || 'Operador',
      registeredByUserId: currentUser?.id || 'sys',
      status: 'pago',
      notes: params.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setFootballPrizes(prev => [newPrize, ...prev]);

    logAudit({
      action: 'PREMIO_PAGO_FUTEBOL',
      entity: 'FootballPrize',
      entityId: newPrize.id,
      reference: `Prêmio ${client.name} - R$ ${newPrize.amount.toFixed(2)}`,
      details: `Pagamento de prêmio de futebol de R$ ${newPrize.amount.toFixed(2)} pago para ${client.name}. Data do pagamento: ${newPrize.paidAt}.`,
      newState: newPrize,
    });

    addToast('success', 'Prêmio Registrado', `Prêmio de R$ ${newPrize.amount.toFixed(2)} pago para ${client.name}.`);
    return { success: true, prize: newPrize };
  };

  // 4. Salvar Fechamento Diário (1 por data)
  const saveDailyClosing = (params: {
    date: string;
    apurado: number;
    descarrego: number;
    notes?: string;
  }): { success: boolean; closing?: DailyClosing; error?: string; existingClosing?: DailyClosing } => {
    if (!currentUser || !['gestor', 'operador', 'financeiro'].includes(currentUser.role)) {
      addToast('error', 'Sem Permissão', 'Usuário não tem autorização para salvar fechamentos.');
      return { success: false, error: 'Sem permissão.' };
    }

    if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      addToast('error', 'Data Inválida', 'Informe uma data válida para o fechamento.');
      return { success: false, error: 'Data inválida.' };
    }

    // Garantir unicidade: apenas 1 fechamento por data
    const existing = dailyClosings.find(c => c.date === params.date);
    if (existing) {
      addToast(
        'warning',
        'Fechamento Já Existente',
        `A data ${params.date} já possui um fechamento salvo. Registro aberto para consulta.`
      );
      return {
        success: false,
        existingClosing: existing,
        error: `A data ${params.date} já possui um fechamento salvo.`,
      };
    }

    const apuradoCents = toCents(params.apurado);
    const descarregoCents = toCents(params.descarrego);

    if (apuradoCents < 0 || descarregoCents < 0) {
      addToast('error', 'Valores Negativos', 'Apurado e descarrego não podem ser negativos.');
      return { success: false, error: 'Valores informados não podem ser negativos.' };
    }

    const totalCents = apuradoCents - descarregoCents;
    const total = fromCents(totalCents);

    const newClosing: DailyClosing = {
      id: 'fcls-' + params.date,
      date: params.date,
      apurado: fromCents(apuradoCents),
      descarrego: fromCents(descarregoCents),
      total,
      apuradoCents,
      descarregoCents,
      totalCents,
      notes: params.notes?.trim() || undefined,
      savedBy: currentUser?.name || 'Operador',
      savedByUserId: currentUser?.id || 'sys',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDailyClosings(prev => {
      const list = [newClosing, ...prev.filter(c => c.date !== params.date)];
      return list.sort((a, b) => b.date.localeCompare(a.date));
    });

    logAudit({
      action: 'NOVO_FECHAMENTO_DIARIO',
      entity: 'DailyClosing',
      entityId: newClosing.id,
      reference: `Fechamento ${newClosing.date}`,
      details: `Fechamento do dia ${newClosing.date} salvo por ${currentUser?.name}. Apurado: R$ ${newClosing.apurado.toFixed(2)}, Descarrego: R$ ${newClosing.descarrego.toFixed(2)}, Total: R$ ${newClosing.total.toFixed(2)}.`,
      newState: newClosing,
    });

    addToast('success', 'Fechamento Salvo', `Fechamento do dia ${newClosing.date} gravado com total de R$ ${newClosing.total.toFixed(2)}.`);
    return { success: true, closing: newClosing };
  };

  // 5. Corrigir Fechamento Diário (Exclusivo Gestor com Histórico)
  const correctDailyClosing = (params: {
    closingId: string;
    newApurado: number;
    newDescarrego: number;
    reason: string;
    newNotes?: string;
  }): { success: boolean; error?: string } => {
    if (currentUser?.role !== 'gestor') {
      addToast('error', 'Ação Não Autorizada', 'Apenas o perfil Gestor tem permissão para corrigir fechamentos.');
      return { success: false, error: 'Apenas gestor pode corrigir fechamentos.' };
    }

    if (!params.reason || !params.reason.trim()) {
      addToast('error', 'Motivo Obrigatório', 'É obrigatório informar a justificativa/motivo da correção.');
      return { success: false, error: 'Motivo obrigatório.' };
    }

    const target = dailyClosings.find(c => c.id === params.closingId);
    if (!target) {
      addToast('error', 'Não Encontrado', 'Fechamento não localizado.');
      return { success: false, error: 'Fechamento não localizado.' };
    }

    const newApuradoCents = toCents(params.newApurado);
    const newDescarregoCents = toCents(params.newDescarrego);
    const newTotalCents = newApuradoCents - newDescarregoCents;

    const correction: ClosingCorrection = {
      id: 'cor-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      reason: params.reason.trim(),
      previousApurado: target.apurado,
      previousDescarrego: target.descarrego,
      previousTotal: target.total,
      newApurado: fromCents(newApuradoCents),
      newDescarrego: fromCents(newDescarregoCents),
      newTotal: fromCents(newTotalCents),
      previousNotes: target.notes,
      newNotes: params.newNotes?.trim() || undefined,
    };

    const updatedClosing: DailyClosing = {
      ...target,
      apurado: fromCents(newApuradoCents),
      descarrego: fromCents(newDescarregoCents),
      total: fromCents(newTotalCents),
      apuradoCents: newApuradoCents,
      descarregoCents: newDescarregoCents,
      totalCents: newTotalCents,
      notes: params.newNotes !== undefined ? params.newNotes.trim() : target.notes,
      updatedAt: new Date().toISOString(),
      correctionHistory: [...(target.correctionHistory || []), correction],
    };

    setDailyClosings(prev => prev.map(c => (c.id === params.closingId ? updatedClosing : c)));

    logAudit({
      action: 'CORRECAO_FECHAMENTO',
      entity: 'DailyClosing',
      entityId: target.id,
      reference: `Correção Fechamento ${target.date}`,
      details: `Fechamento de ${target.date} corrigido por ${currentUser.name}. Motivo: ${params.reason}. Novo Apurado: R$ ${updatedClosing.apurado.toFixed(2)}, Novo Descarrego: R$ ${updatedClosing.descarrego.toFixed(2)}.`,
      previousState: target,
      newState: updatedClosing,
    });

    addToast('success', 'Fechamento Corrigido', `Fechamento do dia ${target.date} atualizado com sucesso.`);
    return { success: true };
  };

  // 6. Indicador de Conferência: Recebimentos Registrados no Dia
  const getConferenceRecebimentos = (date: string): number => {
    if (!date) return 0;
    const targetDate = date.slice(0, 10);
    const totalCents = footballBets
      .filter(b => !b.isCancelled && b.status === 'pago' && b.receivedAt === targetDate)
      .reduce((acc, b) => acc + (b.amountCents || toCents(b.amount)), 0);
    return fromCents(totalCents);
  };

  // 1. Abertura de Caixa
  const openShift = ({
    drawerId,
    operatorId,
    period,
    initialCash,
    sourceAccountId = 'acc-cofre',
  }: {
    drawerId: string;
    operatorId: string;
    period: ShiftPeriod;
    initialCash: number;
    sourceAccountId?: string;
  }): string | null => {
    const drawer = drawers.find(d => d.id === drawerId);
    if (!drawer) {
      addToast('error', 'Erro na Abertura', 'Gaveta não encontrada.');
      return null;
    }
    if (drawer.status !== 'livre') {
      addToast('error', 'Gaveta Bloqueada', `A gaveta ${drawer.name} já possui um turno ${drawer.status}.`);
      return null;
    }

    const newShiftId = 'shift-' + Date.now();
    const opUser = INITIAL_USERS.find(u => u.id === operatorId) || currentUser;
    const operatorName = opUser?.name || 'Operador';

    const newShift: CashShift = {
      id: newShiftId,
      drawerId,
      drawerName: drawer.name,
      operatorId,
      operatorName,
      period,
      openedAt: new Date().toISOString(),
      initialCash,
      status: 'aberto',
      movements: [],
    };

    // Update Drawer
    setDrawers(prev =>
      prev.map(d => (d.id === drawerId ? { ...d, status: 'aberto', currentShiftId: newShiftId } : d))
    );

    // Update Accounts: Deduct initial cash from vault or set drawer balance without duplicating money
    setAccounts(prev => {
      const cofre = prev.find(a => a.id === sourceAccountId);
      const gavetaAcc = prev.find(a => a.name.includes(drawer.code) || a.id.includes(drawer.id));

      return prev.map(a => {
        if (a.id === sourceAccountId && cofre) {
          return { ...a, balance: Math.max(0, a.balance - initialCash) };
        }
        if (gavetaAcc && a.id === gavetaAcc.id) {
          return { ...a, balance: initialCash };
        }
        return a;
      });
    });

    setShifts(prev => [newShift, ...prev]);

    logAudit({
      action: 'ABERTURA_TURNO',
      entity: 'CashShift',
      entityId: newShiftId,
      reference: `Abertura ${drawer.name} (${operatorName})`,
      details: `Turno ${period} aberto com fundo de troco inicial de R$ ${initialCash.toFixed(2)}. Origem: ${sourceAccountId}.`,
      newState: { shiftId: newShiftId, drawerId, operatorId, period, initialCash },
    });

    addToast('success', 'Turno Aberto com Sucesso', `${drawer.name} iniciado para ${operatorName}.`);
    return newShiftId;
  };

  // 2. Movimentação de Caixa
  const addCashMovement = ({
    shiftId,
    type,
    category,
    method,
    amount,
    reference,
    notes,
    receiptUrl,
    clientId,
    clientName,
    paymentStatus,
  }: {
    shiftId: string;
    type: 'entrada' | 'saida' | 'premio' | 'sangria' | 'reforco';
    category: string;
    method: PaymentMethod;
    amount: number;
    reference: string;
    notes?: string;
    receiptUrl?: string;
    clientId?: string;
    clientName?: string;
    paymentStatus?: 'pago' | 'nao_pago';
  }): CashMovement | null => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      addToast('error', 'Erro', 'Turno não encontrado.');
      return null;
    }
    if (shift.status !== 'aberto') {
      addToast('error', 'Turno Fechado', 'Não é possível lançar movimentos em turno encerrado ou em revisão.');
      return null;
    }

    const movId = 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const sourceAcc = type === 'reforco' ? 'Cofre Central Blindado' : shift.drawerName;
    const destAcc = type === 'sangria' ? 'Cofre Central Blindado' : shift.drawerName;

    const newMov: CashMovement = {
      id: movId,
      shiftId,
      timestamp: new Date().toISOString(),
      type,
      category,
      method,
      amount,
      sourceAccount: sourceAcc,
      destAccount: destAcc,
      reference,
      notes,
      receiptUrl,
      userId: currentUser?.id || 'usr',
      userName: currentUser?.name || 'Operador',
      clientId,
      clientName,
      paymentStatus: paymentStatus || (type === 'entrada' ? 'pago' : undefined),
    };

    // Update Shift movements
    setShifts(prev =>
      prev.map(s => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          movements: [newMov, ...s.movements],
        };
      })
    );

    // Update Accounts atomically for Sangria / Reforço or Balances
    if (type === 'sangria') {
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.type === 'cofre') {
            return { ...acc, balance: acc.balance + amount };
          }
          if (acc.name.includes(shift.drawerName) || acc.id.includes(shift.drawerId)) {
            return { ...acc, balance: Math.max(0, acc.balance - amount) };
          }
          return acc;
        })
      );
      logAudit({
        action: 'SANGRIA',
        entity: 'CashMovement',
        entityId: movId,
        reference,
        details: `Sangria de R$ ${amount.toFixed(2)} transferida da gaveta para o Cofre Central.`,
        newState: newMov,
      });
      addToast('success', 'Sangria Realizada', `R$ ${amount.toFixed(2)} transferidos em segurança para o Cofre.`);
    } else if (type === 'reforco') {
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.type === 'cofre') {
            return { ...acc, balance: Math.max(0, acc.balance - amount) };
          }
          if (acc.name.includes(shift.drawerName) || acc.id.includes(shift.drawerId)) {
            return { ...acc, balance: acc.balance + amount };
          }
          return acc;
        })
      );
      logAudit({
        action: 'REFORCO',
        entity: 'CashMovement',
        entityId: movId,
        reference,
        details: `Reforço de troco de R$ ${amount.toFixed(2)} recebido do Cofre Central.`,
        newState: newMov,
      });
      addToast('success', 'Reforço de Troco', `R$ ${amount.toFixed(2)} creditados na gaveta.`);
    } else {
      // Normal Entrada, Saida, Premio
      logAudit({
        action: type === 'premio' ? 'PREMIO_PAGO' : 'MOVIMENTO_CAIXA',
        entity: 'CashMovement',
        entityId: movId,
        reference,
        details: `${type.toUpperCase()}: ${category} no valor de R$ ${amount.toFixed(2)} via ${method}${clientName ? ` (Cliente: ${clientName})` : ''}${paymentStatus ? ` [${paymentStatus === 'pago' ? 'Pago' : 'Não pago'}]` : ''}.`,
        newState: newMov,
      });
      addToast('success', 'Lançamento Registrado', `${category}: R$ ${amount.toFixed(2)}`);
    }

    return newMov;
  };

  // 2.1 Atualização de Movimento (edição sem duplicar entrada)
  const updateCashMovement = (
    shiftId: string,
    movementId: string,
    updates: Partial<CashMovement>
  ): boolean => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;
    const targetMov = shift.movements.find(m => m.id === movementId);
    if (!targetMov) return false;

    setShifts(prev =>
      prev.map(s => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          movements: s.movements.map(m => (m.id === movementId ? { ...m, ...updates } : m)),
        };
      })
    );

    logAudit({
      action: 'MOVIMENTO_CAIXA',
      entity: 'CashMovement',
      entityId: movementId,
      reference: `Atualização: ${targetMov.reference}`,
      details: `Lançamento atualizado sem duplicação.${updates.paymentStatus ? ` Status de pagamento: ${updates.paymentStatus}.` : ''}${updates.clientName ? ` Cliente: ${updates.clientName}.` : ''}`,
      previousState: targetMov,
      newState: { ...targetMov, ...updates },
    });

    addToast('success', 'Lançamento Atualizado', 'As alterações foram salvas com sucesso.');
    return true;
  };

  // 3. Estorno de Movimento (Lançamento Espelho Preservando Histórico)
  const reverseCashMovement = (shiftId: string, movementId: string, reason: string): boolean => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;
    const targetMov = shift.movements.find(m => m.id === movementId);
    if (!targetMov || targetMov.isReversed) {
      addToast('error', 'Estorno Inválido', 'Movimento não localizado ou já estornado.');
      return false;
    }

    const reversalMovId = 'estorno-' + Date.now();
    const reversalMov: CashMovement = {
      id: reversalMovId,
      shiftId,
      timestamp: new Date().toISOString(),
      type: 'estorno',
      category: `Estorno: ${targetMov.category}`,
      method: targetMov.method,
      amount: targetMov.amount,
      sourceAccount: targetMov.destAccount || shift.drawerName,
      destAccount: targetMov.sourceAccount,
      reference: `Estorno ref. ${targetMov.reference}`,
      notes: reason,
      userId: currentUser?.id || 'usr',
      userName: currentUser?.name || 'Operador',
      reversedByMovementId: targetMov.id,
    };

    setShifts(prev =>
      prev.map(s => {
        if (s.id !== shiftId) return s;
        const updatedMovements = s.movements.map(m =>
          m.id === movementId ? { ...m, isReversed: true, reversedByMovementId: reversalMovId, reversalReason: reason } : m
        );
        return {
          ...s,
          movements: [reversalMov, ...updatedMovements],
        };
      })
    );

    // Rollback account effect if Sangria / Reforco
    if (targetMov.type === 'sangria') {
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.type === 'cofre') return { ...acc, balance: acc.balance - targetMov.amount };
          if (acc.name.includes(shift.drawerName)) return { ...acc, balance: acc.balance + targetMov.amount };
          return acc;
        })
      );
    } else if (targetMov.type === 'reforco') {
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.type === 'cofre') return { ...acc, balance: acc.balance + targetMov.amount };
          if (acc.name.includes(shift.drawerName)) return { ...acc, balance: acc.balance - targetMov.amount };
          return acc;
        })
      );
    }

    logAudit({
      action: 'ESTORNO_MOVIMENTO',
      entity: 'CashMovement',
      entityId: targetMov.id,
      reference: `Estorno de ${targetMov.reference}`,
      details: `Movimento estornado por ${currentUser?.name}. Motivo: ${reason}. Gerado espelho ${reversalMovId}.`,
      previousState: targetMov,
      newState: reversalMov,
    });

    addToast('warning', 'Movimento Estornado', `Lançamento espelho gerado para ${targetMov.reference}.`);
    return true;
  };

  // 4. Fechamento de Caixa (Envio para Revisão)
  const submitShiftClosing = (shiftId: string, closingData: ShiftClosingData): boolean => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;

    setShifts(prev =>
      prev.map(s =>
        s.id === shiftId
          ? {
            ...s,
            status: 'em_revisao',
            closedAt: closingData.closedAt,
            closing: closingData,
          }
          : s
      )
    );

    setDrawers(prev =>
      prev.map(d => (d.id === shift.drawerId ? { ...d, status: 'em_revisao' } : d))
    );

    logAudit({
      action: 'FECHAMENTO_ENVIADO',
      entity: 'CashShift',
      entityId: shiftId,
      reference: `Fechamento ${shift.drawerName} - ${shift.operatorName}`,
      details: `Enviado para revisão. Contado Dinheiro: R$ ${closingData.physicalCashTotal.toFixed(
        2
      )}. Esperado: R$ ${closingData.expectedCash.toFixed(2)}. Diferença: R$ ${closingData.cashDiff.toFixed(2)}.`,
      newState: closingData,
    });

    addToast(
      'info',
      'Fechamento Enviado para Revisão',
      `O turno do ${shift.drawerName} está bloqueado e aguarda aprovação do gestor.`
    );
    return true;
  };

  // 5. Aprovação de Fechamento pelo Gestor
  const approveShiftClosing = (shiftId: string, notes?: string): boolean => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;

    setShifts(prev =>
      prev.map(s =>
        s.id === shiftId
          ? {
            ...s,
            status: 'aprovado',
            review: {
              reviewedBy: currentUser?.id || 'gestor',
              reviewerName: currentUser?.name || 'Gestor Geral',
              reviewedAt: new Date().toISOString(),
              status: 'aprovado',
              notes,
            },
          }
          : s
      )
    );

    // Free the drawer
    setDrawers(prev =>
      prev.map(d =>
        d.id === shift.drawerId ? { ...d, status: 'livre', currentShiftId: undefined } : d
      )
    );

    logAudit({
      action: 'FECHAMENTO_APROVADO',
      entity: 'CashShift',
      entityId: shiftId,
      reference: `Aprovação ${shift.drawerName}`,
      details: `Fechamento aprovado por ${currentUser?.name}. Saldo consolidado na tesouraria. Notas: ${notes || 'Nenhuma'}.`,
      newState: { approved: true, notes },
    });

    addToast('success', 'Fechamento Aprovado', `Turno do ${shift.drawerName} consolidado com sucesso.`);
    return true;
  };

  // 6. Registro de Ajuste de Fechamento
  const adjustShiftClosing = (shiftId: string, adjustmentAmount: number, notes: string): boolean => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;

    const adjustmentMovement: CashMovement = {
      id: 'ajuste-' + Date.now(),
      shiftId,
      timestamp: new Date().toISOString(),
      type: 'ajuste',
      category: 'Ajuste Gerencial de Fechamento',
      method: 'dinheiro',
      amount: Math.abs(adjustmentAmount),
      sourceAccount: shift.drawerName,
      reference: `Ajuste Gestor: ${notes}`,
      notes,
      userId: currentUser?.id || 'gestor',
      userName: currentUser?.name || 'Gestor',
    };

    setShifts(prev =>
      prev.map(s => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          movements: [adjustmentMovement, ...s.movements],
          review: {
            reviewedBy: currentUser?.id || 'gestor',
            reviewerName: currentUser?.name || 'Gestor',
            reviewedAt: new Date().toISOString(),
            status: 'ajustado',
            adjustmentValue: adjustmentAmount,
            notes,
          },
        };
      })
    );

    logAudit({
      action: 'AJUSTE_FECHAMENTO',
      entity: 'CashShift',
      entityId: shiftId,
      reference: `Ajuste no Turno ${shift.drawerName}`,
      details: `Ajuste de R$ ${adjustmentAmount.toFixed(2)} registrado por ${currentUser?.name}. Justificativa: ${notes}.`,
      newState: { adjustmentAmount, notes },
    });

    addToast('warning', 'Ajuste Registrado', `Lançamento de ajuste de R$ ${adjustmentAmount.toFixed(2)} gravado.`);
    return true;
  };

  // 7. Tesouraria: Transferência Interna
  const transferTreasury = ({
    sourceAccountId,
    destAccountId,
    amount,
    category,
    reference,
    notes,
  }: {
    sourceAccountId: string;
    destAccountId: string;
    amount: number;
    category: string;
    reference: string;
    notes?: string;
  }): boolean => {
    const src = accounts.find(a => a.id === sourceAccountId);
    const dst = accounts.find(a => a.id === destAccountId);
    if (!src || !dst) {
      addToast('error', 'Erro', 'Contas de origem ou destino inválidas.');
      return false;
    }
    if (src.balance < amount) {
      addToast('error', 'Saldo Insuficiente', `Conta de origem possui saldo de R$ ${src.balance.toFixed(2)}.`);
      return false;
    }

    setAccounts(prev =>
      prev.map(a => {
        if (a.id === sourceAccountId) return { ...a, balance: a.balance - amount };
        if (a.id === destAccountId) return { ...a, balance: a.balance + amount };
        return a;
      })
    );

    const tx: TreasuryTransaction = {
      id: 'tx-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'transferencia',
      sourceAccountId,
      sourceAccountName: src.name,
      destAccountId,
      destAccountName: dst.name,
      amount,
      category,
      reference,
      notes,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Operador',
    };

    setTreasuryTransactions(prev => [tx, ...prev]);

    logAudit({
      action: 'TRANSFERENCIA_TESOURARIA',
      entity: 'TreasuryTransaction',
      entityId: tx.id,
      reference,
      details: `Transferência de R$ ${amount.toFixed(2)} de ${src.name} para ${dst.name}. Categoria: ${category}.`,
      newState: tx,
    });

    addToast('success', 'Transferência Concluída', `R$ ${amount.toFixed(2)} transferidos com sucesso.`);
    return true;
  };

  // 8. Tesouraria: Depósito Bancário / Envio para Trânsito
  const depositTreasury = ({
    sourceAccountId,
    destAccountId,
    amount,
    reference,
    notes,
  }: {
    sourceAccountId: string;
    destAccountId: string;
    amount: number;
    reference: string;
    notes?: string;
  }): boolean => {
    return transferTreasury({
      sourceAccountId,
      destAccountId,
      amount,
      category: 'Depósito Bancário / Remessa Carro-Forte',
      reference,
      notes,
    });
  };

  // 9. Tesouraria: Confirmação de Conciliação / Trânsito
  const confirmReconciliationItem = (itemId: string, notes?: string): boolean => {
    const item = reconciliations.find(r => r.id === itemId);
    if (!item) return false;

    setReconciliations(prev =>
      prev.map(r => (r.id === itemId ? { ...r, status: 'conciliado', notes: notes || r.notes } : r))
    );

    // If it was in transit, credit the CEF account and debit transit account
    if (item.source === 'banco_cef') {
      setAccounts(prev =>
        prev.map(a => {
          if (a.type === 'transito') return { ...a, balance: Math.max(0, a.balance - item.amount) };
          if (a.id === 'acc-cef') return { ...a, balance: a.balance + item.amount };
          return a;
        })
      );
    }

    logAudit({
      action: 'LIQUIDACAO_TRANSITO',
      entity: 'ReconciliationItem',
      entityId: itemId,
      reference: item.reference,
      details: `Item de conciliação ${item.reference} liquidado e conciliado. Valor: R$ ${item.amount.toFixed(2)}.`,
      newState: { status: 'conciliado' },
    });

    addToast('success', 'Item Conciliado', `Liquidação do item ${item.reference} confirmada.`);
    return true;
  };

  // 10. Prêmios: Cadastro com Comprovante
  const registerPrize = ({
    shiftId,
    gameType,
    contestNumber,
    ticketNumber,
    amount,
    method,
    accountUsed,
    receiptName,
    clientId,
    clientName,
    paymentStatus = 'pago',
    paidAmount,
    paidAt,
  }: {
    shiftId?: string;
    gameType: string;
    contestNumber: string;
    ticketNumber: string;
    amount: number;
    method: PaymentMethod;
    accountUsed: string;
    receiptName?: string;
    clientId?: string;
    clientName?: string;
    paymentStatus?: 'pago' | 'pendente';
    paidAmount?: number;
    paidAt?: string;
  }): PrizeRecord | null => {
    const isPaid = paymentStatus === 'pago';
    const effectivePaidAt = isPaid ? (paidAt || new Date().toISOString()) : '';

    const newPrize: PrizeRecord = {
      id: 'prz-' + Date.now(),
      shiftId,
      gameType,
      contestNumber,
      ticketNumber,
      amount,
      method,
      accountUsed,
      paidAt: effectivePaidAt,
      registeredBy: currentUser?.name || 'Operador',
      settlementStatus: 'pendente',
      receiptName: receiptName || `Comprovante_${gameType}_${contestNumber}.pdf`,
      clientId,
      clientName,
      paymentStatus,
      paidAmount: isPaid ? (paidAmount ?? amount) : 0,
    };

    setPrizes(prev => [newPrize, ...prev]);

    // If tied to open shift and already paid, also register movement in shift
    if (shiftId && isPaid) {
      addCashMovement({
        shiftId,
        type: 'premio',
        category: `Prêmio ${gameType} Concurso ${contestNumber}`,
        method,
        amount,
        reference: `Bilhete ${ticketNumber}`,
        notes: `Comprovante: ${newPrize.receiptName}`,
        clientId,
        clientName,
        paymentStatus: 'pago',
      });
    }

    logAudit({
      action: 'PREMIO_PAGO',
      entity: 'PrizeRecord',
      entityId: newPrize.id,
      reference: `${gameType} #${contestNumber}`,
      details: `${isPaid ? 'Pagamento efetuado' : 'Prêmio pendente de pagamento'}: R$ ${amount.toFixed(2)}${clientName ? ` para ${clientName}` : ''}. Bilhete: ${ticketNumber}.`,
      newState: newPrize,
    });

    addToast('success', isPaid ? 'Prêmio Pago e Registrado' : 'Prêmio Registrado como Pendente', `Prêmio de R$ ${amount.toFixed(2)} registrado com sucesso.`);
    return newPrize;
  };

  // 10.1 Efetivar Pagamento de Prêmio ao Cliente
  const payPrizeToClient = (
    prizeId: string,
    params: {
      paidAmount: number;
      paidAt: string;
      method?: PaymentMethod;
      accountUsed?: string;
    }
  ): boolean => {
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) return false;

    const methodToUse = params.method || prize.method;
    const accountToUse = params.accountUsed || prize.accountUsed;

    setPrizes(prev =>
      prev.map(p =>
        p.id === prizeId
          ? {
            ...p,
            paymentStatus: 'pago',
            paidAmount: params.paidAmount,
            paidAt: params.paidAt,
            method: methodToUse,
            accountUsed: accountToUse,
          }
          : p
      )
    );

    logAudit({
      action: 'PREMIO_PAGO',
      entity: 'PrizeRecord',
      entityId: prizeId,
      reference: `${prize.gameType} #${prize.contestNumber}`,
      details: `Pagamento de prêmio de R$ ${params.paidAmount.toFixed(2)} efetivado para o cliente ${prize.clientName || 'não identificado'} em ${params.paidAt}.`,
      newState: { ...prize, paymentStatus: 'pago', paidAmount: params.paidAmount, paidAt: params.paidAt },
    });

    addToast('success', 'Prêmio Pago ao Cliente', `Pagamento de R$ ${params.paidAmount.toFixed(2)} efetivado com sucesso.`);
    return true;
  };

  // 11. Prêmios: Vincular Acerto Caixa Econômica (Sem Duplicar Pagamento)
  const settlePrize = (prizeId: string, settlementRef: string): boolean => {
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) return false;

    setPrizes(prev =>
      prev.map(p =>
        p.id === prizeId
          ? {
            ...p,
            settlementStatus: 'ressarcido_caixa',
            settlementDate: new Date().toISOString(),
            settlementRef,
          }
          : p
      )
    );

    logAudit({
      action: 'ACERTO_PREMIO',
      entity: 'PrizeRecord',
      entityId: prizeId,
      reference: settlementRef,
      details: `Acerto e ressarcimento de prêmio vinculado junto à Caixa. Bilhete ${prize.ticketNumber}. Valor: R$ ${prize.amount.toFixed(
        2
      )}.`,
      newState: { settlementStatus: 'ressarcido_caixa', settlementRef },
    });

    addToast('success', 'Acerto Vinculado', `Ressarcimento CEF registrado com sucesso para o bilhete.`);
    return true;
  };

  // 12. Financeiro: Novo Lançamento
  const addFinancialRecord = ({
    type,
    category,
    description,
    competency,
    dueDate,
    amount,
    notes,
  }: {
    type: FinanceType;
    category: string;
    description: string;
    competency: string;
    dueDate: string;
    amount: number;
    notes?: string;
  }): FinancialRecord => {
    const newRecord: FinancialRecord = {
      id: 'fin-' + Date.now(),
      type,
      category,
      description,
      competency,
      dueDate,
      amount,
      paidAmount: 0,
      status: 'pendente',
      notes,
    };

    setFinanceRecords(prev => [newRecord, ...prev]);

    logAudit({
      action: type === 'retirada_socios' ? 'RETIRADA_SOCIOS' : 'FINANCEIRO_LANCAMENTO',
      entity: 'FinancialRecord',
      entityId: newRecord.id,
      reference: description,
      details: `Lançamento ${type}: ${category} - R$ ${amount.toFixed(2)} (Competência ${competency}).`,
      newState: newRecord,
    });

    addToast('success', 'Lançamento Criado', `${description}: R$ ${amount.toFixed(2)}`);
    return newRecord;
  };

  // 13. Financeiro: Baixar Obrigação vinculada a conta de tesouraria
  const payFinancialRecord = ({
    recordId,
    amountToPay,
    paidFromAccountId,
    notes,
  }: {
    recordId: string;
    amountToPay: number;
    paidFromAccountId: string;
    notes?: string;
  }): boolean => {
    const rec = financeRecords.find(r => r.id === recordId);
    const acc = accounts.find(a => a.id === paidFromAccountId);
    if (!rec || !acc) {
      addToast('error', 'Erro', 'Registro ou conta bancária não encontrada.');
      return false;
    }
    if (acc.balance < amountToPay) {
      addToast('error', 'Saldo Insuficiente', `Conta ${acc.name} não possui saldo suficiente.`);
      return false;
    }

    const newPaidAmount = rec.paidAmount + amountToPay;
    const newStatus = newPaidAmount >= rec.amount ? 'pago' : 'parcial';

    // Deduct from Treasury Account
    setAccounts(prev =>
      prev.map(a => (a.id === paidFromAccountId ? { ...a, balance: a.balance - amountToPay } : a))
    );

    // Update Record
    setFinanceRecords(prev =>
      prev.map(r =>
        r.id === recordId
          ? {
            ...r,
            paidAmount: newPaidAmount,
            status: newStatus,
            paymentDate: new Date().toISOString(),
            paidFromAccountId,
            notes: notes || r.notes,
          }
          : r
      )
    );

    logAudit({
      action: 'FINANCEIRO_BAIXA',
      entity: 'FinancialRecord',
      entityId: recordId,
      reference: rec.description,
      details: `Baixa de R$ ${amountToPay.toFixed(2)} em ${rec.description}. Pago via ${acc.name}. Status: ${newStatus}.`,
      newState: { paidAmount: newPaidAmount, status: newStatus },
    });

    addToast('success', 'Baixa Realizada', `Pagamento de R$ ${amountToPay.toFixed(2)} liquidado.`);
    return true;
  };

  // 14. Salários: Novo Registro e Pagamento
  const addPayrollRecord = ({
    employeeName,
    role,
    type,
    competency,
    amount,
  }: {
    employeeName: string;
    role: string;
    type: PayrollRecord['type'];
    competency: string;
    amount: number;
  }): PayrollRecord => {
    const newPay: PayrollRecord = {
      id: 'pay-' + Date.now(),
      employeeName,
      role,
      type,
      competency,
      amount,
      status: 'pendente',
    };

    setPayrollRecords(prev => [newPay, ...prev]);

    logAudit({
      action: 'FOLHA_PAGAMENTO',
      entity: 'PayrollRecord',
      entityId: newPay.id,
      reference: `Folha: ${employeeName}`,
      details: `Registro de folha (${type}) para ${employeeName} - R$ ${amount.toFixed(2)} (${competency}).`,
      newState: newPay,
    });

    addToast('success', 'Registro de Folha Criado', `${employeeName}: R$ ${amount.toFixed(2)}`);
    return newPay;
  };

  const payPayrollRecord = (payrollId: string, paidFromAccountId: string): boolean => {
    const pay = payrollRecords.find(p => p.id === payrollId);
    const acc = accounts.find(a => a.id === paidFromAccountId);
    if (!pay || !acc) return false;
    if (acc.balance < pay.amount) {
      addToast('error', 'Saldo Insuficiente', `Conta ${acc.name} sem saldo suficiente.`);
      return false;
    }

    setAccounts(prev =>
      prev.map(a => (a.id === paidFromAccountId ? { ...a, balance: a.balance - pay.amount } : a))
    );

    setPayrollRecords(prev =>
      prev.map(p =>
        p.id === payrollId
          ? {
            ...p,
            status: 'pago',
            paymentDate: new Date().toISOString(),
            paidFromAccountId,
          }
          : p
      )
    );

    logAudit({
      action: 'FOLHA_PAGAMENTO',
      entity: 'PayrollRecord',
      entityId: payrollId,
      reference: `Pagamento Salário: ${pay.employeeName}`,
      details: `Pagamento de R$ ${pay.amount.toFixed(2)} efetuado para ${pay.employeeName} via ${acc.name}.`,
      newState: { status: 'pago' },
    });

    addToast('success', 'Salário Pago', `Pagamento de R$ ${pay.amount.toFixed(2)} para ${pay.employeeName} efetuado.`);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        addClient,
        drawers,
        shifts,
        accounts,
        treasuryTransactions,
        reconciliations,
        prizes,
        financeRecords,
        payrollRecords,
        auditLogs,
        toasts,
        addToast,
        removeToast,
        resetAllData,
        // Painel de Futebol
        footballBets,
        dailyClosings,
        footballPrizes,
        addFootballBet,
        markBetAsPaid,
        addFootballPrize,
        saveDailyClosing,
        correctDailyClosing,
        getConferenceRecebimentos,
        openShift,
        addCashMovement,
        updateCashMovement,
        reverseCashMovement,
        submitShiftClosing,
        approveShiftClosing,
        adjustShiftClosing,
        transferTreasury,
        depositTreasury,
        confirmReconciliationItem,
        registerPrize,
        payPrizeToClient,
        settlePrize,
        addFinancialRecord,
        payFinancialRecord,
        addPayrollRecord,
        payPayrollRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

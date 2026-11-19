export type UserRole = 'gestor' | 'operador' | 'financeiro' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  badge?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  cpf?: string;
  referenceCode?: string; // Differentiator for homônimos, e.g. "CLI-001 • Centro"
  notes?: string;
  createdAt: string;
}

// ==========================================
// PAINEL DE FUTEBOL (NOVO ESCOPO OPERACIONAL)
// ==========================================

export interface FootballBet {
  id: string;
  date: string; // YYYY-MM-DD (Data da aposta)
  clientId: string;
  clientName: string;
  amount: number; // in BRL decimal
  amountCents: number; // in integer cents
  status: 'pago' | 'nao_pago'; // Situação do pagamento
  receivedAt?: string; // YYYY-MM-DD (Data do recebimento, >= date)
  receivedBy?: string; // Nome do operador que recebeu
  receivedByUserId?: string;
  notes?: string;
  isCancelled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FootballPrize {
  id: string;
  clientId: string;
  clientName: string;
  betId?: string; // Vínculo com aposta de origem quando conhecida
  amount: number; // Valor efetivamente pago
  amountCents: number;
  paidAt: string; // YYYY-MM-DD (Data do pagamento efetivo)
  registeredBy: string;
  registeredByUserId: string;
  status: 'pago' | 'cancelado';
  notes?: string;
  createdAt: string;
}

export interface ClosingCorrection {
  id: string;
  timestamp: string; // ISO
  userId: string;
  userName: string;
  reason: string; // Motivo obrigatório da correção
  previousApurado: number;
  previousDescarrego: number;
  previousTotal: number;
  newApurado: number;
  newDescarrego: number;
  newTotal: number;
  previousNotes?: string;
  newNotes?: string;
}

export interface DailyClosing {
  id: string;
  date: string; // YYYY-MM-DD (Data de referência única: 1 fechamento por data)
  apurado: number; // Informado manualmente (>= 0)
  descarrego: number; // Informado manualmente (>= 0, aceita 0.00)
  total: number; // Apurado - Descarrego (positivo, negativo ou zero)
  apuradoCents: number;
  descarregoCents: number;
  totalCents: number;
  notes?: string;
  savedBy: string;
  savedByUserId: string;
  createdAt: string;
  updatedAt: string;
  correctionHistory?: ClosingCorrection[];
}

export const ENTRY_CATEGORIES = [
  'Loteria Federal: 19:00h',
  'Loteria | 9:00h',
  'Loteria | 11:00h',
  'Loteria | 12:00h',
  'Loteria | 15:00h',
  'Loteria | 16:00h',
  'Loteria | 17:00h',
  'Loteria | 18:25h',
] as const;

export type EntryCategory = typeof ENTRY_CATEGORIES[number];

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'convenio';

export type ShiftPeriod = 'manha' | 'tarde' | 'noite';

export type ShiftStatus = 'aberto' | 'em_revisao' | 'aprovado' | 'rejeitado';

export interface Drawer {
  id: string;
  name: string;
  code: string;
  status: 'livre' | 'aberto' | 'em_revisao';
  currentShiftId?: string;
}

export interface PhysicalDenominations {
  // Cédulas
  c200: number;
  c100: number;
  c50: number;
  c20: number;
  c10: number;
  c5: number;
  c2: number;
  // Moedas
  m1: number;
  m050: number;
  m025: number;
  m010: number;
  m005: number;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  timestamp: string;
  type: 'entrada' | 'saida' | 'premio' | 'sangria' | 'reforco' | 'estorno' | 'ajuste';
  category: string;
  method: PaymentMethod;
  amount: number;
  sourceAccount: string;
  destAccount?: string;
  reference: string;
  notes?: string;
  receiptUrl?: string;
  userId: string;
  userName: string;
  isReversed?: boolean;
  reversedByMovementId?: string;
  reversalReason?: string;
  // Campos de Cliente e Status de Pagamento
  clientId?: string;
  clientName?: string;
  paymentStatus?: 'pago' | 'nao_pago';
}

export interface ShiftClosingData {
  denominations: PhysicalDenominations;
  physicalCashTotal: number;
  methodTotals: Record<PaymentMethod, number>;
  expectedCash: number;
  expectedByMethod: Record<PaymentMethod, number>;
  cashDiff: number;
  totalDiff: number;
  justification?: string;
  closedAt: string;
}

export interface ShiftReviewData {
  reviewedBy: string;
  reviewerName: string;
  reviewedAt: string;
  status: 'aprovado' | 'ajustado' | 'estornado';
  adjustmentValue?: number;
  notes?: string;
}

export interface CashShift {
  id: string;
  drawerId: string;
  drawerName: string;
  operatorId: string;
  operatorName: string;
  period: ShiftPeriod;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  status: ShiftStatus;
  movements: CashMovement[];
  closing?: ShiftClosingData;
  review?: ShiftReviewData;
}

export type TreasuryAccountType = 'gaveta' | 'cofre' | 'banco' | 'transito';

export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  code: string;
  balance: number;
  bankInfo?: string;
  description?: string;
}

export interface TreasuryTransaction {
  id: string;
  timestamp: string;
  type: 'transferencia' | 'deposito' | 'sangria' | 'reforco' | 'ajuste' | 'recebimento_transito';
  sourceAccountId: string;
  sourceAccountName: string;
  destAccountId: string;
  destAccountName: string;
  amount: number;
  category: string;
  reference: string;
  notes?: string;
  userId: string;
  userName: string;
}

export interface ReconciliationItem {
  id: string;
  date: string;
  source: 'operacional' | 'banco_cef' | 'fechamento_caixa';
  description: string;
  amount: number;
  expectedAmount: number;
  status: 'conciliado' | 'pendente' | 'divergente';
  reference: string;
  notes?: string;
}

export interface PrizeRecord {
  id: string;
  shiftId?: string;
  gameType: string; // Mega-Sena, Lotofácil, Quina, etc.
  contestNumber: string;
  ticketNumber: string;
  amount: number;
  method: PaymentMethod;
  accountUsed: string;
  paidAt: string;
  registeredBy: string;
  settlementStatus: 'pendente' | 'ressarcido_caixa';
  settlementDate?: string;
  settlementRef?: string;
  receiptName?: string;
  // Campos de Cliente e Pagamento Efetivo
  clientId?: string;
  clientName?: string;
  paymentStatus: 'pago' | 'pendente';
  paidAmount?: number;
}

export type FinanceType = 'receita_propria' | 'comissao_loterica' | 'despesa_operacional' | 'obrigacao_pagar' | 'retirada_socios';

export interface FinancialRecord {
  id: string;
  type: FinanceType;
  category: string;
  description: string;
  competency: string; // MM/YYYY
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'pendente' | 'parcial' | 'pago';
  paymentDate?: string;
  paidFromAccountId?: string;
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  employeeName: string;
  role: string;
  type: 'salario_base' | 'adiantamento' | 'comissao_vendas' | 'vale_transporte' | 'desconto';
  competency: string;
  amount: number;
  status: 'pendente' | 'pago';
  paymentDate?: string;
  paidFromAccountId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action:
  | 'CRIACAO'
  | 'ABERTURA_TURNO'
  | 'MOVIMENTO_CAIXA'
  | 'SANGRIA'
  | 'REFORCO'
  | 'FECHAMENTO_ENVIADO'
  | 'FECHAMENTO_APROVADO'
  | 'AJUSTE_FECHAMENTO'
  | 'ESTORNO_MOVIMENTO'
  | 'TRANSFERENCIA_TESOURARIA'
  | 'DEPOSITO_BANCARIO'
  | 'LIQUIDACAO_TRANSITO'
  | 'PREMIO_PAGO'
  | 'ACERTO_PREMIO'
  | 'FINANCEIRO_LANCAMENTO'
  | 'FINANCEIRO_BAIXA'
  | 'RETIRADA_SOCIOS'
  | 'FOLHA_PAGAMENTO'
  | 'NOVA_APOSTA'
  | 'BAIXA_APOSTA'
  | 'PREMIO_PAGO_FUTEBOL'
  | 'NOVO_FECHAMENTO_DIARIO'
  | 'CORRECAO_FECHAMENTO';
  entity: string;
  entityId: string;
  reference: string;
  details: string;
  previousState?: any;
  newState?: any;
}

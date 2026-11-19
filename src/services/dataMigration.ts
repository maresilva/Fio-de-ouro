import {
  Client,
  Drawer,
  CashShift,
  TreasuryAccount,
  TreasuryTransaction,
  ReconciliationItem,
  PrizeRecord,
  FinancialRecord,
  PayrollRecord,
  AuditLog,
  FootballBet,
  FootballPrize,
  DailyClosing,
} from '../types';

export const OPERATIONAL_STORAGE_KEYS = {
  // Painel de Futebol
  FOOTBALL_BETS: 'erp_football_bets',
  FOOTBALL_CLOSINGS: 'erp_football_closings',
  FOOTBALL_PRIZES: 'erp_football_prizes',

  // Histórico Operacional da Lotérica
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
} as const;

/**
 * Chaves estritamente proibidas na exportação (credenciais, senhas e tokens).
 */
export const FORBIDDEN_SECURITY_KEYS = [
  'erp_loterica_current_user',
  'erp_user_passwords',
  'erp_app_users',
  'fio_de_ouro_auth_token',
  'supabase.auth.token',
] as const;

export interface ExportOperationalPayload {
  version: '1.0.0';
  exportedAt: string;
  exportedBy: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  deviceId: string;
  userAgent: string;
  counts: {
    footballBets: number;
    footballClosings: number;
    footballPrizes: number;
    clients: number;
    drawers: number;
    shifts: number;
    accounts: number;
    transactions: number;
    reconciliations: number;
    legacyPrizes: number;
    financeRecords: number;
    payrollRecords: number;
    auditLogs: number;
  };
  totals: {
    totalBetsAmount: number;
    totalReceivedAmount: number;
    totalPrizesAmount: number;
    totalApuradoAmount: number;
    totalDescarregoAmount: number;
  };
  data: {
    football: {
      bets: FootballBet[];
      closings: DailyClosing[];
      prizes: FootballPrize[];
    };
    lottery: {
      clients: Client[];
      drawers: Drawer[];
      shifts: CashShift[];
      accounts: TreasuryAccount[];
      transactions: TreasuryTransaction[];
      reconciliations: ReconciliationItem[];
      prizes: PrizeRecord[];
      financeRecords: FinancialRecord[];
      payrollRecords: PayrollRecord[];
      auditLogs: AuditLog[];
    };
  };
}

export interface ImportConflict {
  id: string;
  entity: 'Aposta' | 'Fechamento' | 'Cliente' | 'Prêmio';
  key: string;
  existingSummary: string;
  incomingSummary: string;
  reason: string;
}

export interface ImportAnalysis {
  isValid: boolean;
  version: string;
  exportedAt: string;
  exportedBy: string;
  deviceId: string;
  error?: string;
  counts: {
    incoming: {
      bets: number;
      closings: number;
      prizes: number;
      clients: number;
      others: number;
      total: number;
    };
    duplicates: {
      bets: number;
      closings: number;
      prizes: number;
      clients: number;
      total: number;
    };
    newRecords: {
      bets: number;
      closings: number;
      prizes: number;
      clients: number;
      total: number;
    };
  };
  totals: {
    betsAmount: number;
    receivedAmount: number;
    prizesAmount: number;
    apuradoAmount: number;
    descarregoAmount: number;
  };
  conflicts: ImportConflict[];
}

function getOrCreateDeviceId(): string {
  const KEY = 'fio_de_ouro_device_id';
  let deviceId = localStorage.getItem(KEY);
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem(KEY, deviceId);
  }
  return deviceId;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Coleta todos os dados operacionais do navegador atual e gera o payload
 * seguro de exportação, excluindo sumariamente qualquer credencial.
 */
export function generateOperationalExport(currentUser?: {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}): ExportOperationalPayload {
  const bets: FootballBet[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.FOOTBALL_BETS, []);
  const closings: DailyClosing[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.FOOTBALL_CLOSINGS, []);
  const prizes: FootballPrize[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.FOOTBALL_PRIZES, []);

  const clients: Client[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.CLIENTS, []);
  const drawers: Drawer[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.DRAWERS, []);
  const shifts: CashShift[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.SHIFTS, []);
  const accounts: TreasuryAccount[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.ACCOUNTS, []);
  const transactions: TreasuryTransaction[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.TRANSACTIONS, []);
  const reconciliations: ReconciliationItem[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.RECONCILIATION, []);
  const legacyPrizes: PrizeRecord[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.PRIZES, []);
  const financeRecords: FinancialRecord[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.FINANCE, []);
  const payrollRecords: PayrollRecord[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.PAYROLL, []);
  const auditLogs: AuditLog[] = loadFromStorage(OPERATIONAL_STORAGE_KEYS.AUDIT, []);

  const totalBetsAmount = bets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalReceivedAmount = bets
    .filter(b => b.status === 'pago')
    .reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalPrizesAmount = prizes.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalApuradoAmount = closings.reduce((acc, c) => acc + (c.apurado || 0), 0);
  const totalDescarregoAmount = closings.reduce((acc, c) => acc + (c.descarrego || 0), 0);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: {
      id: currentUser?.id,
      name: currentUser?.name || 'Operador',
      email: currentUser?.email,
      role: currentUser?.role,
    },
    deviceId: getOrCreateDeviceId(),
    userAgent: navigator.userAgent || 'Desconhecido',
    counts: {
      footballBets: bets.length,
      footballClosings: closings.length,
      footballPrizes: prizes.length,
      clients: clients.length,
      drawers: drawers.length,
      shifts: shifts.length,
      accounts: accounts.length,
      transactions: transactions.length,
      reconciliations: reconciliations.length,
      legacyPrizes: legacyPrizes.length,
      financeRecords: financeRecords.length,
      payrollRecords: payrollRecords.length,
      auditLogs: auditLogs.length,
    },
    totals: {
      totalBetsAmount,
      totalReceivedAmount,
      totalPrizesAmount,
      totalApuradoAmount,
      totalDescarregoAmount,
    },
    data: {
      football: {
        bets,
        closings,
        prizes,
      },
      lottery: {
        clients,
        drawers,
        shifts,
        accounts,
        transactions,
        reconciliations,
        prizes: legacyPrizes,
        financeRecords,
        payrollRecords,
        auditLogs,
      },
    },
  };
}

/**
 * Dispara o download automático do arquivo JSON no navegador.
 */
export function downloadExportFile(payload: ExportOperationalPayload) {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `fio-de-ouro-export-${payload.deviceId}-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Analisa e valida uma prévia de importação antes de qualquer gravação.
 */
export function analyzeImportPayload(
  rawJson: string,
  currentState: {
    bets: FootballBet[];
    closings: DailyClosing[];
    prizes: FootballPrize[];
    clients: Client[];
  }
): ImportAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      isValid: false,
      version: '',
      exportedAt: '',
      exportedBy: '',
      deviceId: '',
      error: 'O arquivo informado não é um JSON válido.',
      counts: {
        incoming: { bets: 0, closings: 0, prizes: 0, clients: 0, others: 0, total: 0 },
        duplicates: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
        newRecords: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
      },
      totals: { betsAmount: 0, receivedAmount: 0, prizesAmount: 0, apuradoAmount: 0, descarregoAmount: 0 },
      conflicts: [],
    };
  }

  // Validação de segurança: garantir que nenhum campo de senha ou credencial esteja presente
  const rawLower = rawJson.toLowerCase();
  for (const forbidden of FORBIDDEN_SECURITY_KEYS) {
    if (rawLower.includes(`"${forbidden}"`)) {
      return {
        isValid: false,
        version: parsed?.version || '',
        exportedAt: parsed?.exportedAt || '',
        exportedBy: '',
        deviceId: '',
        error: `Arquivo rejeitado: contém chave de segurança ou credencial não permitida (${forbidden}).`,
        counts: {
          incoming: { bets: 0, closings: 0, prizes: 0, clients: 0, others: 0, total: 0 },
          duplicates: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
          newRecords: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
        },
        totals: { betsAmount: 0, receivedAmount: 0, prizesAmount: 0, apuradoAmount: 0, descarregoAmount: 0 },
        conflicts: [],
      };
    }
  }

  if (!parsed.version || !parsed.data || !parsed.data.football) {
    return {
      isValid: false,
      version: parsed?.version || 'desconhecida',
      exportedAt: parsed?.exportedAt || '',
      exportedBy: '',
      deviceId: '',
      error: 'Formato incompatível: o arquivo não possui a estrutura padrão do ERP Fio de Ouro.',
      counts: {
        incoming: { bets: 0, closings: 0, prizes: 0, clients: 0, others: 0, total: 0 },
        duplicates: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
        newRecords: { bets: 0, closings: 0, prizes: 0, clients: 0, total: 0 },
      },
      totals: { betsAmount: 0, receivedAmount: 0, prizesAmount: 0, apuradoAmount: 0, descarregoAmount: 0 },
      conflicts: [],
    };
  }

  const incomingBets: FootballBet[] = parsed.data.football.bets || [];
  const incomingClosings: DailyClosing[] = parsed.data.football.closings || [];
  const incomingPrizes: FootballPrize[] = parsed.data.football.prizes || [];
  const incomingClients: Client[] = parsed.data.lottery?.clients || [];

  const conflicts: ImportConflict[] = [];

  // 1. Análise de Apostas (Duplicidades e Conflitos)
  let betsDuplicates = 0;
  let betsNew = 0;
  for (const bet of incomingBets) {
    const existing = currentState.bets.find(b => b.id === bet.id);
    if (existing) {
      betsDuplicates++;
      // Checa se há divergência de valor ou status
      if (existing.amount !== bet.amount || existing.status !== bet.status) {
        conflicts.push({
          id: bet.id,
          entity: 'Aposta',
          key: `Aposta #${bet.id} (${bet.date})`,
          existingSummary: `R$ ${existing.amount} [${existing.status}]`,
          incomingSummary: `R$ ${bet.amount} [${bet.status}]`,
          reason: 'Aposta com mesmo ID possui valor ou status divergente entre os navegadores.',
        });
      }
    } else {
      betsNew++;
    }
  }

  // 2. Análise de Fechamentos (Duplicidades e Conflitos por data)
  let closingsDuplicates = 0;
  let closingsNew = 0;
  for (const closing of incomingClosings) {
    // Fechamento tem restrição única por data
    const existing = currentState.closings.find(c => c.date === closing.date);
    if (existing) {
      closingsDuplicates++;
      if (existing.apurado !== closing.apurado || existing.descarrego !== closing.descarrego) {
        conflicts.push({
          id: closing.id,
          entity: 'Fechamento',
          key: `Fechamento ${closing.date}`,
          existingSummary: `Apurado: R$ ${existing.apurado} | Descarrego: R$ ${existing.descarrego}`,
          incomingSummary: `Apurado: R$ ${closing.apurado} | Descarrego: R$ ${closing.descarrego}`,
          reason: 'Já existe fechamento para esta data com valores diferentes de apurado ou descarrego.',
        });
      }
    } else {
      closingsNew++;
    }
  }

  // 3. Análise de Prêmios
  let prizesDuplicates = 0;
  let prizesNew = 0;
  for (const prize of incomingPrizes) {
    const existing = currentState.prizes.find(
      p => p.id === prize.id || (p.betId && p.betId === prize.betId)
    );
    if (existing) {
      prizesDuplicates++;
      if (existing.amount !== prize.amount) {
        conflicts.push({
          id: prize.id,
          entity: 'Prêmio',
          key: `Prêmio #${prize.id} (${prize.clientName})`,
          existingSummary: `R$ ${existing.amount} pago em ${existing.paidAt}`,
          incomingSummary: `R$ ${prize.amount} pago em ${prize.paidAt}`,
          reason: 'Prêmio já registrado possui valor divergente no arquivo importado.',
        });
      }
    } else {
      prizesNew++;
    }
  }

  // 4. Análise de Clientes
  let clientsDuplicates = 0;
  let clientsNew = 0;
  for (const client of incomingClients) {
    const existing = currentState.clients.find(c => c.id === client.id);
    if (existing) {
      clientsDuplicates++;
    } else {
      clientsNew++;
    }
  }

  const betsAmount = incomingBets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const receivedAmount = incomingBets
    .filter(b => b.status === 'pago')
    .reduce((acc, b) => acc + (b.amount || 0), 0);
  const prizesAmount = incomingPrizes.reduce((acc, p) => acc + (p.amount || 0), 0);
  const apuradoAmount = incomingClosings.reduce((acc, c) => acc + (c.apurado || 0), 0);
  const descarregoAmount = incomingClosings.reduce((acc, c) => acc + (c.descarrego || 0), 0);

  const totalIncoming = incomingBets.length + incomingClosings.length + incomingPrizes.length + incomingClients.length;
  const totalDuplicates = betsDuplicates + closingsDuplicates + prizesDuplicates + clientsDuplicates;
  const totalNew = betsNew + closingsNew + prizesNew + clientsNew;

  return {
    isValid: true,
    version: parsed.version,
    exportedAt: parsed.exportedAt || 'Desconhecido',
    exportedBy: parsed.exportedBy?.name || parsed.exportedBy?.email || 'Desconhecido',
    deviceId: parsed.deviceId || 'Desconhecido',
    counts: {
      incoming: {
        bets: incomingBets.length,
        closings: incomingClosings.length,
        prizes: incomingPrizes.length,
        clients: incomingClients.length,
        others: 0,
        total: totalIncoming,
      },
      duplicates: {
        bets: betsDuplicates,
        closings: closingsDuplicates,
        prizes: prizesDuplicates,
        clients: clientsDuplicates,
        total: totalDuplicates,
      },
      newRecords: {
        bets: betsNew,
        closings: closingsNew,
        prizes: prizesNew,
        clients: clientsNew,
        total: totalNew,
      },
    },
    totals: {
      betsAmount,
      receivedAmount,
      prizesAmount,
      apuradoAmount,
      descarregoAmount,
    },
    conflicts,
  };
}

/**
 * Executa a importação dos dados analisados de forma idempotente.
 * Se um registro já existir e não houver conflito, mantém o existente evitando duplicações.
 */
export function executeOperationalImport(
  payload: ExportOperationalPayload,
  currentState: {
    bets: FootballBet[];
    closings: DailyClosing[];
    prizes: FootballPrize[];
    clients: Client[];
  },
  conflictResolutions?: Record<string, 'keep_existing' | 'overwrite_with_incoming'>
): {
    updatedBets: FootballBet[];
    updatedClosings: DailyClosing[];
    updatedPrizes: FootballPrize[];
    updatedClients: Client[];
    importedCount: number;
    skippedCount: number;
} {
  const conflictMap = conflictResolutions || {};

  // 1. Clientes
  const incomingClients = payload.data.lottery?.clients || [];
  const clientMap = new Map<string, Client>();
  for (const c of currentState.clients) {
    clientMap.set(c.id, c);
  }
  for (const c of incomingClients) {
    if (!clientMap.has(c.id)) {
      clientMap.set(c.id, c);
    }
  }

  // 2. Fechamentos (Preserva regra de fechamento único por data)
  const incomingClosings = payload.data.football.closings || [];
  const closingDateMap = new Map<string, DailyClosing>();
  for (const c of currentState.closings) {
    closingDateMap.set(c.date, c);
  }
  let importedCount = 0;
  let skippedCount = 0;

  for (const c of incomingClosings) {
    if (!closingDateMap.has(c.date)) {
      closingDateMap.set(c.date, c);
      importedCount++;
    } else {
      const existing = closingDateMap.get(c.date)!;
      const resolution = conflictMap[c.id];
      if (resolution === 'overwrite_with_incoming') {
        closingDateMap.set(c.date, c);
        importedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  // 3. Apostas
  const incomingBets = payload.data.football.bets || [];
  const betMap = new Map<string, FootballBet>();
  for (const b of currentState.bets) {
    betMap.set(b.id, b);
  }
  for (const b of incomingBets) {
    if (!betMap.has(b.id)) {
      betMap.set(b.id, b);
      importedCount++;
    } else {
      const resolution = conflictMap[b.id];
      if (resolution === 'overwrite_with_incoming') {
        betMap.set(b.id, b);
        importedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  // 4. Prêmios (Evita pagamento duplicado do mesmo bilhete)
  const incomingPrizes = payload.data.football.prizes || [];
  const prizeMap = new Map<string, FootballPrize>();
  const prizeByBetMap = new Set<string>();

  for (const p of currentState.prizes) {
    prizeMap.set(p.id, p);
    if (p.betId) prizeByBetMap.add(p.betId);
  }

  for (const p of incomingPrizes) {
    if (prizeMap.has(p.id)) {
      skippedCount++;
      continue;
    }
    // Prevenção contra pagamento duplicado por betId
    if (p.betId && prizeByBetMap.has(p.betId)) {
      skippedCount++;
      continue;
    }
    prizeMap.set(p.id, p);
    if (p.betId) prizeByBetMap.add(p.betId);
    importedCount++;
  }

  // Ordenações consistentes
  const updatedBets = Array.from(betMap.values()).sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  const updatedClosings = Array.from(closingDateMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const updatedPrizes = Array.from(prizeMap.values()).sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );
  const updatedClients = Array.from(clientMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  return {
    updatedBets,
    updatedClosings,
    updatedPrizes,
    updatedClients,
    importedCount,
    skippedCount,
  };
}

/**
 * Sanitiza o navegador removendo exclusivamente credenciais e senhas legadas,
 * mantendo todos os dados operacionais intactos.
 */
export function sanitizeLegacyCredentials(): void {
  for (const key of FORBIDDEN_SECURITY_KEYS) {
    localStorage.removeItem(key);
  }
}

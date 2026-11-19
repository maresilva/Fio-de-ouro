import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import { formatDate } from '../utils/dates';
import {
  Wallet,
  CheckCheck,
  AlertTriangle,
  Landmark,
  Trophy,
  Calendar,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Coins,
  Lock,
  Building,
  Truck,
  ArrowUpRight,
  Clock,
  Award,
  Users,
  Filter,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { shifts, accounts, prizes, financeRecords, reconciliations } = useApp();
  const navigate = useNavigate();

  // Period Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<'hoje' | '7dias' | 'mes' | 'todos' | 'personalizado'>('mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Metrics
  const openShifts = shifts.filter(s => s.status === 'aberto');
  const reviewShifts = shifts.filter(s => s.status === 'em_revisao');
  const shiftsWithDivergence = shifts.filter(
    s => s.status === 'em_revisao' && s.closing && s.closing.cashDiff !== 0
  );

  const totalPrizesPaid = prizes
    .filter(p => (p.paymentStatus || 'pago') === 'pago')
    .reduce((acc, p) => acc + (p.paidAmount ?? p.amount), 0);
  const pendingPrizesSettlement = prizes.filter(p => p.settlementStatus === 'pendente');

  // Saldos por Local
  const cofreAcc = accounts.find(a => a.type === 'cofre');
  const gavetasAcc = accounts.filter(a => a.type === 'gaveta');
  const bancosAcc = accounts.filter(a => a.type === 'banco');
  const transitoAcc = accounts.filter(a => a.type === 'transito');

  const totalGavetasBalance = gavetasAcc.reduce((acc, a) => acc + a.balance, 0);
  const totalBancosBalance = bancosAcc.reduce((acc, a) => acc + a.balance, 0);
  const totalTransitoBalance = transitoAcc.reduce((acc, a) => acc + a.balance, 0);
  const totalGeralDisponivel = (cofreAcc?.balance || 0) + totalGavetasBalance + totalBancosBalance + totalTransitoBalance;

  // Próximos Vencimentos do Financeiro
  const upcomingBills = financeRecords
    .filter(f => f.type === 'despesa_operacional' || f.type === 'obrigacao_pagar')
    .filter(f => f.status !== 'pago')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Helper: check if ISO date falls in the selected period
  const isDateInPeriod = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = new Date();

    if (selectedPeriod === 'todos') return true;

    if (selectedPeriod === 'hoje') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return date >= start && date <= end;
    }

    if (selectedPeriod === '7dias') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return date >= start && date <= end;
    }

    if (selectedPeriod === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return date >= start && date <= end;
    }

    if (selectedPeriod === 'personalizado') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (date < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59');
        if (date > end) return false;
      }
      return true;
    }

    return true;
  };

  // Helper: get human description of selected period
  const getPeriodDescription = (): string => {
    if (selectedPeriod === 'hoje') return 'Hoje';
    if (selectedPeriod === '7dias') return 'Últimos 7 dias';
    if (selectedPeriod === 'mes') return 'Este Mês';
    if (selectedPeriod === 'todos') return 'Todo o período';
    if (selectedPeriod === 'personalizado') {
      return `${customStartDate || 'Início'} até ${customEndDate || 'Hoje'}`;
    }
    return '';
  };

  // Aggregation for "Cliente que mais apostou"
  interface ClientStats {
    clientId: string;
    clientName: string;
    totalApostado: number;
    totalPremiosRecebidos: number;
  }

  const clientStatsMap: Record<string, ClientStats> = {};

  // 1. Sum all bets (entradas) within the selected period, including unpaid bets!
  shifts.forEach(shift => {
    shift.movements.forEach(m => {
      if (m.isReversed) return;
      if (m.type !== 'entrada') return;
      if (!m.clientId) return; // only identified clients
      if (!isDateInPeriod(m.timestamp)) return;

      if (!clientStatsMap[m.clientId]) {
        clientStatsMap[m.clientId] = {
          clientId: m.clientId,
          clientName: m.clientName || 'Cliente ' + m.clientId,
          totalApostado: 0,
          totalPremiosRecebidos: 0,
        };
      }
      clientStatsMap[m.clientId].totalApostado += m.amount;
    });
  });

  // 2. Sum effectively paid prizes for clients in the selected period (filtered by payment date: paidAt)
  prizes.forEach(p => {
    if (!p.clientId) return;
    const isPaid = (p.paymentStatus || 'pago') === 'pago';
    if (!isPaid) return; // only effectively paid prizes count
    if (!p.paidAt) return;
    if (!isDateInPeriod(p.paidAt)) return;

    const effectivePaid = p.paidAmount !== undefined ? p.paidAmount : p.amount;

    if (!clientStatsMap[p.clientId]) {
      clientStatsMap[p.clientId] = {
        clientId: p.clientId,
        clientName: p.clientName || 'Cliente ' + p.clientId,
        totalApostado: 0,
        totalPremiosRecebidos: 0,
      };
    }
    clientStatsMap[p.clientId].totalPremiosRecebidos += effectivePaid;
  });

  // 3. Determine leader(s) based on totalApostado > 0
  const clientsWithBets = Object.values(clientStatsMap).filter(c => c.totalApostado > 0);
  let topClients: ClientStats[] = [];
  let isTie = false;

  if (clientsWithBets.length > 0) {
    const maxApostado = Math.max(...clientsWithBets.map(c => c.totalApostado));
    topClients = clientsWithBets.filter(c => Math.abs(c.totalApostado - maxApostado) < 0.001);
    isTie = topClients.length > 1;
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Top Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Operação em Tempo Real
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5">
            Olá, {currentUser?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão consolidada da operação, saldos de tesouraria, conformidade de caixas e fechamentos.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Link
            to="/cash/open"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all flex items-center space-x-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Abrir Turno</span>
          </Link>
          <Link
            to="/treasury"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
          >
            <Landmark className="w-4 h-4" />
            <span>Tesouraria</span>
          </Link>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase text-slate-700">Filtro de Período do Dashboard:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPeriod('hoje')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedPeriod === 'hoje'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('7dias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedPeriod === '7dias'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('mes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedPeriod === 'mes'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Este Mês
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedPeriod === 'todos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('personalizado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedPeriod === 'personalizado'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Personalizado
          </button>

          {selectedPeriod === 'personalizado' && (
            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid of Key Indicator Cards + "Cliente que mais apostou" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card: Cliente que mais apostou */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-50/60 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between relative overflow-hidden sm:col-span-2 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  Ranking do Período ({getPeriodDescription()})
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Cliente que mais apostou
                </h3>
              </div>
            </div>

            {isTie && (
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full uppercase tracking-wider">
                Empate ({topClients.length})
              </span>
            )}
          </div>

          <div className="mt-4">
            {topClients.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs font-semibold text-slate-500 italic">
                  Nenhuma aposta com cliente identificado neste período
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  As apostas registradas no balcão sem vínculo ou em outros períodos não pontuam aqui.
                </p>
              </div>
            ) : topClients.length === 1 ? (
              <div>
                <div className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <span>{topClients[0].clientName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-amber-200/60">
                  <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/70">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total apostado</span>
                    <span className="text-base font-extrabold font-mono text-slate-900 mt-0.5 block">
                      {formatBRL(topClients[0].totalApostado)}
                    </span>
                    <span className="text-[9px] text-slate-400">Inclui apostas pagas e a prazo</span>
                  </div>

                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total recebido em prêmios</span>
                    <span className="text-base font-extrabold font-mono text-emerald-800 mt-0.5 block">
                      {formatBRL(topClients[0].totalPremiosRecebidos)}
                    </span>
                    <span className="text-[9px] text-emerald-600/80">Pagamentos efetivados no período</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-amber-900">
                  Empate na liderança com {formatBRL(topClients[0].totalApostado)} apostados:
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {topClients.map(c => (
                    <div key={c.clientId} className="p-2.5 bg-white/90 rounded-xl border border-amber-200 text-xs">
                      <div className="font-bold text-slate-900">{c.clientName}</div>
                      <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100">
                        <span className="text-slate-600">
                          Total apostado: <strong className="font-mono text-slate-900">{formatBRL(c.totalApostado)}</strong>
                        </span>
                        <span className="text-emerald-700">
                          Prêmios: <strong className="font-mono">{formatBRL(c.totalPremiosRecebidos)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cartão Caixas Abertos */}
        <Link
          to="/cash"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 flex items-center group-hover:text-emerald-600 transition-colors">
              Ver caixas <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{openShifts.length}</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Caixas Abertos</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {openShifts.length === 1 ? '1 terminal em atendimento' : `${openShifts.length} terminais em atendimento`}
            </p>
          </div>
        </Link>

        {/* Cartão Fechamentos em Revisão */}
        <Link
          to="/cash/review"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-amber-500 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <CheckCheck className="w-5 h-5" />
            </div>
            {reviewShifts.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full animate-pulse">
                Aprovação Pendente
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{reviewShifts.length}</div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Fechamentos em Revisão</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Aguardando parecer e validação do gestor
            </p>
          </div>
        </Link>

        {/* Cartão Prêmios Pagos */}
        <Link
          to="/prizes"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-teal-500 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 flex items-center group-hover:text-teal-600 transition-colors">
              Histórico <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {formatBRL(totalPrizesPaid)}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-1">Prêmios Pagos Efetivos</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pendingPrizesSettlement.length} pendente(s) de ressarcimento CEF
            </p>
          </div>
        </Link>
      </div>

      {/* Main Row: Painel Saldos por Local & Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Saldos por Local (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Painel de Saldos por Local</h3>
                  <p className="text-xs text-slate-500">
                    Posição financeira viva de gavetas, cofre, contas bancárias e valores em trânsito
                  </p>
                </div>
              </div>
              <Link
                to="/treasury"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center space-x-1"
              >
                <span>Abrir Tesouraria</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Total Consolidado */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Saldo Total Disponível Consolidado
                </span>
                <div className="text-2xl font-black font-mono mt-0.5">
                  {formatBRL(totalGeralDisponivel)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  100% Conciliado
                </span>
              </div>
            </div>

            {/* List of Accounts Breakdown */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cofre */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{cofreAcc?.name || 'Cofre Central'}</div>
                    <div className="text-[10px] text-slate-500">Cofre de alta segurança</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-slate-900">
                  {formatBRL(cofreAcc?.balance || 0)}
                </div>
              </div>

              {/* Gavetas */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Gavetas dos Terminais</div>
                    <div className="text-[10px] text-slate-500">{openShifts.length} terminal(is) ativos</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-slate-900">
                  {formatBRL(totalGavetasBalance)}
                </div>
              </div>

              {/* Bancos */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Bancos (CEF & BB)</div>
                    <div className="text-[10px] text-slate-500">Contas operacionais & PIX</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-slate-900">
                  {formatBRL(totalBancosBalance)}
                </div>
              </div>

              {/* Em Trânsito */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Valores em Trânsito</div>
                    <div className="text-[10px] text-slate-500">Carro-forte & Remessas CEF</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-slate-900">
                  {formatBRL(totalTransitoBalance)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Última movimentação registrada no cofre há menos de 1 hora</span>
            <Link to="/audit" className="text-emerald-700 font-semibold hover:underline">
              Ver trilha completa
            </Link>
          </div>
        </div>

        {/* Lista Próximos Vencimentos (1 Column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Próximos Vencimentos</h3>
              </div>
              <Link
                to="/finance"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Ver Todas
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingBills.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma obrigação pendente.</p>
              ) : (
                upcomingBills.map(bill => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50/80 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{bill.description}</div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Vencimento: {formatDate(bill.dueDate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {formatBRL(bill.amount - bill.paidAmount)}
                      </div>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Pendente
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              to="/finance"
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Gerenciar Contas a Pagar & DRE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Fechamentos em Revisão e Divergências - Quick Action Table if any pending */}
      {reviewShifts.length > 0 && (
        <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-amber-950">
                Atenção do Gestor: Fechamentos Aguardando Parecer ({reviewShifts.length})
              </h3>
            </div>
            <Link
              to="/cash/review"
              className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              Ir para Fila de Aprovação
            </Link>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl border border-amber-200/80 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Terminal</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3 text-right">Esperado</th>
                  <th className="px-4 py-3 text-right">Contado</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                  <th className="px-4 py-3">Justificativa</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewShifts.map(s => {
                  const closing = s.closing;
                  const diff = closing?.cashDiff || 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{s.drawerName}</td>
                      <td className="px-4 py-3 text-slate-700">{s.operatorName}</td>
                      <td className="px-4 py-3 capitalize">{s.period}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatBRL(closing?.expectedCash || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(closing?.physicalCashTotal || 0)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatBRL(diff)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={closing?.justification}>
                        {closing?.justification || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to="/cash/review"
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors inline-block"
                        >
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { DailyClosing } from '../types';
import { formatBRL, toCents, fromCents } from '../utils/currency';
import {
  getOperationalToday,
  getOperationalYesterday,
  getOperationalMonthStart,
  formatDateBR,
  formatDateTime,
} from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Award,
  Users,
  Trophy,
  PlusCircle,
  FileText,
  Clock,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

export const FootballOverview: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    dailyClosings,
    footballBets,
    footballPrizes,
    clients,
    getConferenceRecebimentos,
  } = useApp();

  // Period Filter State (defaults to current month)
  const [startDate, setStartDate] = useState(getOperationalMonthStart());
  const [endDate, setEndDate] = useState(getOperationalToday());

  // Modal Consultation for Closing
  const [selectedClosing, setSelectedClosing] = useState<DailyClosing | null>(null);
  const [showClosingDetailsModal, setShowClosingDetailsModal] = useState(false);

  // Shortcut handlers
  const handleFilterToday = () => {
    const today = getOperationalToday();
    setStartDate(today);
    setEndDate(today);
  };

  const handleFilterYesterday = () => {
    const yest = getOperationalYesterday();
    setStartDate(yest);
    setEndDate(yest);
  };

  const handleFilterMonth = () => {
    setStartDate(getOperationalMonthStart());
    setEndDate(getOperationalToday());
  };

  // 1. Filter closings within [startDate, endDate]
  const filteredClosings = dailyClosings
    .filter(c => c.date >= startDate && c.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  // 2. Compute 3 Key Financial Indicators (with exact cent precision)
  const apuradoPeriodoCents = filteredClosings.reduce(
    (acc, c) => acc + (c.apuradoCents ?? toCents(c.apurado)),
    0
  );
  const descarregoPeriodoCents = filteredClosings.reduce(
    (acc, c) => acc + (c.descarregoCents ?? toCents(c.descarrego)),
    0
  );
  const totalPeriodoCents = apuradoPeriodoCents - descarregoPeriodoCents;

  const apuradoPeriodo = fromCents(apuradoPeriodoCents);
  const descarregoPeriodo = fromCents(descarregoPeriodoCents);
  const totalPeriodo = fromCents(totalPeriodoCents);

  // 3. Compute Ranking de Clientes
  // Bets in range by bet.date
  const filteredBets = footballBets.filter(
    b => !b.isCancelled && b.date >= startDate && b.date <= endDate
  );

  // Prizes effectively paid in range by paidAt
  const filteredPrizes = footballPrizes.filter(
    p => p.status === 'pago' && p.paidAt >= startDate && p.paidAt <= endDate
  );

  interface ClientRankingRow {
    clientId: string;
    clientName: string;
    referenceCode?: string;
    countBets: number;
    totalApostadoCents: number;
    totalPagoCents: number;
    totalAbertoCents: number;
    premiosRecebidosCents: number;
  }

  const clientMap: Record<string, ClientRankingRow> = {};

  filteredBets.forEach(b => {
    if (!clientMap[b.clientId]) {
      const clientObj = clients.find(c => c.id === b.clientId);
      clientMap[b.clientId] = {
        clientId: b.clientId,
        clientName: b.clientName,
        referenceCode: clientObj?.referenceCode,
        countBets: 0,
        totalApostadoCents: 0,
        totalPagoCents: 0,
        totalAbertoCents: 0,
        premiosRecebidosCents: 0,
      };
    }
    const cents = b.amountCents ?? toCents(b.amount);
    clientMap[b.clientId].countBets += 1;
    clientMap[b.clientId].totalApostadoCents += cents;
    if (b.status === 'pago') {
      clientMap[b.clientId].totalPagoCents += cents;
    } else {
      clientMap[b.clientId].totalAbertoCents += cents;
    }
  });

  filteredPrizes.forEach(p => {
    if (!clientMap[p.clientId]) {
      const clientObj = clients.find(c => c.id === p.clientId);
      clientMap[p.clientId] = {
        clientId: p.clientId,
        clientName: p.clientName,
        referenceCode: clientObj?.referenceCode,
        countBets: 0,
        totalApostadoCents: 0,
        totalPagoCents: 0,
        totalAbertoCents: 0,
        premiosRecebidosCents: 0,
      };
    }
    const prizeCents = p.amountCents ?? toCents(p.amount);
    clientMap[p.clientId].premiosRecebidosCents += prizeCents;
  });

  const rankingList = Object.values(clientMap).sort(
    (a, b) => b.totalApostadoCents - a.totalApostadoCents
  );

  // Identify top leader(s)
  const maxApostadoCents = rankingList.length > 0 ? rankingList[0].totalApostadoCents : 0;
  const topLeaders =
    maxApostadoCents > 0
      ? rankingList.filter(c => c.totalApostadoCents === maxApostadoCents)
      : [];

  const handleOpenClosingDetails = (closing: DailyClosing) => {
    setSelectedClosing(closing);
    setShowClosingDetailsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Painel de Futebol
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">Operação Central</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Visão Geral Operacional
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe o apurado diário, descarregos, resultado consolidado e ranking de clientes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:space-x-2.5">
          <Link
            to="/apostas"
            className="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5 active:scale-95 text-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Aposta</span>
          </Link>
          <Link
            to="/fechamentos"
            className="min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 text-center"
          >
            <FileText className="w-4 h-4" />
            <span>Novo Fechamento</span>
          </Link>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-bold">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Período:</span>
          </div>
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-none">
            <label className="text-xs text-slate-500 font-medium">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-base sm:text-xs min-h-[42px] w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            />
          </div>
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-none">
            <label className="text-xs text-slate-500 font-medium">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-base sm:text-xs min-h-[42px] w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:space-x-2">
          <button
            type="button"
            onClick={handleFilterToday}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-colors text-center active:scale-95 ${
              startDate === getOperationalToday() && endDate === getOperationalToday()
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleFilterYesterday}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-colors text-center active:scale-95 ${
              startDate === getOperationalYesterday() && endDate === getOperationalYesterday()
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ontem
          </button>
          <button
            type="button"
            onClick={handleFilterMonth}
            className={`min-h-[40px] px-3 py-2 text-xs font-bold rounded-xl transition-colors text-center active:scale-95 ${
              startDate === getOperationalMonthStart() && endDate === getOperationalToday()
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Este mês
          </button>
        </div>
      </div>

      {/* Three Financial Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Apurado do período */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Apurado do Período
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {formatBRL(apuradoPeriodo)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Soma do apurado dos fechamentos salvos no período ({filteredClosings.length} dia(s))
          </p>
        </div>

        {/* Descarrego do período */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Descarrego do Período
            </span>
            <div className="text-2xl font-black font-mono text-slate-700 mt-1">
              {formatBRL(descarregoPeriodo)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Soma do descarrego informado nos fechamentos
          </p>
        </div>

        {/* Total do período (DESTAQUE MÁXIMO) */}
        <div
          className={`rounded-2xl p-5 border shadow-md flex flex-col justify-between transition-all ${
            totalPeriodo > 0
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500'
              : totalPeriodo < 0
              ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-500'
              : 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Total do Período
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20">
                {totalPeriodo > 0 ? 'Positivo' : totalPeriodo < 0 ? 'Negativo' : 'Zerado'}
              </span>
            </div>
            <div className="text-3xl font-black font-mono mt-1 text-white">
              {formatBRL(totalPeriodo)}
            </div>
          </div>
          <p className="text-[11px] text-white/80 mt-2">
            Fórmula: Apurado do período − Descarrego do período
          </p>
        </div>
      </div>

      {/* Histórico Diário de Fechamentos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Histórico de Fechamentos Salvos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Registros ordenados por data decrescente no intervalo selecionado
            </p>
          </div>
          <Link
            to="/fechamentos"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center space-x-1"
          >
            <span>Gerenciar / Novo Fechamento</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredClosings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-semibold text-slate-500">
              Nenhum fechamento salvo no período
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Altere o filtro de datas ou clique em "Novo Fechamento" para registrar um dia.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3 text-right">Apurado do Dia</th>
                    <th className="px-5 py-3 text-right">Descarrego</th>
                    <th className="px-5 py-3 text-right">Total do Dia</th>
                    <th className="px-5 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClosings.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenClosingDetails(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {formatDateBR(c.date)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-800">
                        {formatBRL(c.apurado)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                        {formatBRL(c.descarrego)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-sm">
                        <span
                          className={
                            c.total > 0
                              ? 'text-emerald-700'
                              : c.total < 0
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }
                        >
                          {formatBRL(c.total)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-200/80 rounded font-bold text-[11px]"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Compacto para Celular) */}
            <div className="sm:hidden p-3 space-y-2.5 divide-y divide-slate-100">
              {filteredClosings.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleOpenClosingDetails(c)}
                  className="pt-2.5 first:pt-0 bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 active:bg-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">
                      {formatDateBR(c.date)}
                    </span>
                    <span
                      className={`text-xs font-black font-mono ${
                        c.total > 0
                          ? 'text-emerald-700'
                          : c.total < 0
                          ? 'text-red-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatBRL(c.total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Apurado:</span>
                      {formatBRL(c.apurado)}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Descarrego:</span>
                      {formatBRL(c.descarrego)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Seção: Ranking de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Ranking de Clientes do Período
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Agrupado por cliente, ordenado pelo maior total apostado (apostas válidas, pagas e pendentes)
            </p>
          </div>

          {topLeaders.length > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold">
              <Award className="w-4 h-4 text-amber-600" />
              <span>
                {topLeaders.length === 1
                  ? `Líder: ${topLeaders[0].clientName}`
                  : `Empate na Liderança (${topLeaders.length} clientes)`}
              </span>
            </div>
          )}
        </div>

        {rankingList.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-semibold text-slate-500 italic">
              Nenhuma aposta com cliente identificado neste período
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Registre apostas de futebol vinculadas a clientes para visualizar o ranking.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3 text-center">Qtd Apostas</th>
                    <th className="px-5 py-3 text-right">Total Apostado</th>
                    <th className="px-5 py-3 text-right">Pago</th>
                    <th className="px-5 py-3 text-right">Em Aberto</th>
                    <th className="px-5 py-3 text-right">Prêmios Recebidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankingList.map((row, idx) => {
                    const isLeader =
                      row.totalApostadoCents > 0 &&
                      row.totalApostadoCents === maxApostadoCents;

                    return (
                      <tr
                        key={row.clientId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isLeader ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            {isLeader && (
                              <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="font-extrabold text-slate-900">
                              {row.clientName}
                            </span>
                            {row.referenceCode && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                                {row.referenceCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                          {row.countBets}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatBRL(fromCents(row.totalApostadoCents))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                          {formatBRL(fromCents(row.totalPagoCents))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-800">
                          {formatBRL(fromCents(row.totalAbertoCents))}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-teal-800">
                          {formatBRL(fromCents(row.premiosRecebidosCents))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Ranking de Clientes) */}
            <div className="sm:hidden p-3 space-y-2.5">
              {rankingList.map((row, idx) => {
                const isLeader =
                  row.totalApostadoCents > 0 &&
                  row.totalApostadoCents === maxApostadoCents;

                return (
                  <div
                    key={row.clientId}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isLeader
                        ? 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border-amber-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {row.clientName}
                          </span>
                          {row.referenceCode && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {row.referenceCode}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Total Apostado
                        </span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {formatBRL(fromCents(row.totalApostadoCents))}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 text-center">
                      <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase block">
                          Pago
                        </span>
                        <span className="text-xs font-extrabold font-mono text-emerald-800">
                          {formatBRL(fromCents(row.totalPagoCents))}
                        </span>
                      </div>

                      <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-amber-700 uppercase block">
                          Em Aberto
                        </span>
                        <span className="text-xs font-extrabold font-mono text-amber-800">
                          {formatBRL(fromCents(row.totalAbertoCents))}
                        </span>
                      </div>

                      <div className="bg-white/80 p-1.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-bold text-teal-700 uppercase block">
                          Prêmios
                        </span>
                        <span className="text-xs font-extrabold font-mono text-teal-800">
                          {formatBRL(fromCents(row.premiosRecebidosCents))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-right">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {row.countBets} aposta(s) registradas
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal: Detalhes do Fechamento Selecionado */}
      <Modal
        isOpen={showClosingDetailsModal}
        onClose={() => setShowClosingDetailsModal(false)}
        title={
          selectedClosing
            ? `Fechamento do Dia ${formatDateBR(selectedClosing.date)}`
            : 'Detalhes do Fechamento'
        }
        subtitle="Consulta de apurado, descarrego, total do dia e recebimentos de conferência"
      >
        {selectedClosing && (
          <div className="space-y-4">
            {/* Cards resumo do fechamento */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Apurado do Dia
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 mt-1 block">
                  {formatBRL(selectedClosing.apurado)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Descarrego
                </span>
                <span className="text-base font-extrabold font-mono text-slate-700 mt-1 block">
                  {formatBRL(selectedClosing.descarrego)}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  selectedClosing.total > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : selectedClosing.total < 0
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block">Total do Dia</span>
                <span className="text-base font-black font-mono mt-1 block">
                  {formatBRL(selectedClosing.total)}
                </span>
              </div>
            </div>

            {/* Valor de Conferência Informativo */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Recebimentos registrados no dia (Conferência):</span>
                </span>
                <span className="font-mono font-extrabold text-blue-900 text-sm">
                  {formatBRL(getConferenceRecebimentos(selectedClosing.date))}
                </span>
              </div>
              <p className="text-[11px] text-blue-700">
                Calculado pela data de recebimento efetivo das apostas. Valor estritamente informativo (não altera o Apurado informado nem o Total do dia).
              </p>
            </div>

            {/* Observações e Metadados */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
              <div>
                <strong>Observações:</strong>{' '}
                {selectedClosing.notes || 'Nenhuma observação informada.'}
              </div>
              <div className="pt-1 text-[11px] text-slate-400">
                Salvo por: <strong>{selectedClosing.savedBy}</strong> em{' '}
                {formatDateTime(selectedClosing.createdAt)}
              </div>
            </div>

            {/* Histórico de Correções do Gestor se houver */}
            {selectedClosing.correctionHistory &&
              selectedClosing.correctionHistory.length > 0 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-amber-950 flex items-center space-x-1">
                    <History className="w-3.5 h-3.5 text-amber-700" />
                    <span>Histórico de Alterações / Correções pelo Gestor:</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedClosing.correctionHistory.map(cor => (
                      <div
                        key={cor.id}
                        className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-slate-600">
                          <span>
                            Por: <strong>{cor.userName}</strong>
                          </span>
                          <span className="font-mono">{formatDateTime(cor.timestamp)}</span>
                        </div>
                        <div className="text-amber-900">
                          <strong>Motivo:</strong> {cor.reason}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Anterior: Apurado {formatBRL(cor.previousApurado)} | Descarrego{' '}
                          {formatBRL(cor.previousDescarrego)} | Total{' '}
                          {formatBRL(cor.previousTotal)}
                        </div>
                        <div className="font-mono text-[10px] font-bold text-slate-800">
                          Novo: Apurado {formatBRL(cor.newApurado)} | Descarrego{' '}
                          {formatBRL(cor.newDescarrego)} | Total {formatBRL(cor.newTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClosingDetailsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

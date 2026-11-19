import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { DailyClosing } from '../types';
import { formatBRL, parseBRL, toCents, fromCents } from '../utils/currency';
import {
  getOperationalToday,
  getOperationalYesterday,
  getOperationalMonthStart,
  formatDateBR,
  formatDateTime,
} from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  FileText,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  History,
  Info,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export const FootballClosings: React.FC = () => {
  const { currentUser, canCreateClosing, canCorrectClosing } = useAuth();
  const {
    dailyClosings,
    saveDailyClosing,
    correctDailyClosing,
    getConferenceRecebimentos,
    addToast,
  } = useApp();

  // Filters
  const [filterStartDate, setFilterStartDate] = useState(getOperationalMonthStart());
  const [filterEndDate, setFilterEndDate] = useState(getOperationalToday());

  // Modal State - Novo Fechamento
  const [showNewModal, setShowNewModal] = useState(false);
  const [closingDate, setClosingDate] = useState(getOperationalToday());
  const [closingApuradoStr, setClosingApuradoStr] = useState('');
  const [closingDescarregoStr, setClosingDescarregoStr] = useState('0,00');
  const [closingNotes, setClosingNotes] = useState('');

  // Modal State - Consultar Fechamento
  const [selectedClosing, setSelectedClosing] = useState<DailyClosing | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modal State - Corrigir Fechamento (Gestor)
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [closingToCorrect, setClosingToCorrect] = useState<DailyClosing | null>(null);
  const [correctApuradoStr, setCorrectApuradoStr] = useState('');
  const [correctDescarregoStr, setCorrectDescarregoStr] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correctNotes, setCorrectNotes] = useState('');

  // Check if date already has closing (in real time)
  const existingClosingForDate = dailyClosings.find(c => c.date === closingDate);

  // Live computation of Total for the New Closing form
  const newApuradoNum = parseBRL(closingApuradoStr);
  const newDescarregoNum = parseBRL(closingDescarregoStr);
  const liveNewTotal = fromCents(toCents(newApuradoNum) - toCents(newDescarregoNum));

  // Live conference receipts for the selected closing date
  const conferenceRecebimentosNew = getConferenceRecebimentos(closingDate);

  // Shortcuts
  const handleShortcutToday = () => {
    const t = getOperationalToday();
    setFilterStartDate(t);
    setFilterEndDate(t);
  };

  const handleShortcutYesterday = () => {
    const y = getOperationalYesterday();
    setFilterStartDate(y);
    setFilterEndDate(y);
  };

  const handleShortcutMonth = () => {
    setFilterStartDate(getOperationalMonthStart());
    setFilterEndDate(getOperationalToday());
  };

  const handleShortcutAll = () => {
    setFilterStartDate('2020-01-01');
    setFilterEndDate('2099-12-31');
  };

  // Filtered closings list
  const filteredClosings = dailyClosings
    .filter(c => c.date >= filterStartDate && c.date <= filterEndDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Summary
  const sumApurado = filteredClosings.reduce((a, b) => a + b.apurado, 0);
  const sumDescarrego = filteredClosings.reduce((a, b) => a + b.descarrego, 0);
  const sumTotal = sumApurado - sumDescarrego;

  // Handler: Save New Closing
  const handleSaveClosing = (e: React.FormEvent) => {
    e.preventDefault();

    if (existingClosingForDate) {
      addToast(
        'warning',
        'Data Já Fechada',
        `A data ${formatDateBR(closingDate)} já possui um fechamento salvo. Registro aberto para consulta.`
      );
      setSelectedClosing(existingClosingForDate);
      setShowNewModal(false);
      setShowDetailsModal(true);
      return;
    }

    const apurado = parseBRL(closingApuradoStr);
    const descarrego = parseBRL(closingDescarregoStr);

    if (apurado < 0 || descarrego < 0) {
      addToast('error', 'Valores Inválidos', 'Apurado e descarrego não podem ser negativos.');
      return;
    }

    const res = saveDailyClosing({
      date: closingDate,
      apurado,
      descarrego,
      notes: closingNotes,
    });

    if (res.success) {
      setShowNewModal(false);
      setClosingApuradoStr('');
      setClosingDescarregoStr('0,00');
      setClosingNotes('');
    } else if (res.existingClosing) {
      // Abre registro existente para consulta
      setSelectedClosing(res.existingClosing);
      setShowNewModal(false);
      setShowDetailsModal(true);
    }
  };

  // Handler: Open Correction Modal
  const handleOpenCorrect = (closing: DailyClosing) => {
    if (!canCorrectClosing) {
      addToast('error', 'Ação Não Autorizada', 'Apenas o perfil Gestor pode corrigir fechamentos.');
      return;
    }
    setClosingToCorrect(closing);
    setCorrectApuradoStr(closing.apurado.toFixed(2).replace('.', ','));
    setCorrectDescarregoStr(closing.descarrego.toFixed(2).replace('.', ','));
    setCorrectNotes(closing.notes || '');
    setCorrectReason('');
    setShowCorrectModal(true);
  };

  // Handler: Save Correction
  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingToCorrect) return;

    if (!correctReason.trim()) {
      addToast('error', 'Motivo Obrigatório', 'Informe o motivo da correção para auditoria.');
      return;
    }

    const newAp = parseBRL(correctApuradoStr);
    const newDesc = parseBRL(correctDescarregoStr);

    if (newAp < 0 || newDesc < 0) {
      addToast('error', 'Valores Inválidos', 'Apurado e descarrego não podem ser negativos.');
      return;
    }

    const res = correctDailyClosing({
      closingId: closingToCorrect.id,
      newApurado: newAp,
      newDescarrego: newDesc,
      reason: correctReason.trim(),
      newNotes: correctNotes,
    });

    if (res.success) {
      setShowCorrectModal(false);
      setClosingToCorrect(null);
      setCorrectReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Fechamentos Diários
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Controle de Fechamentos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro diário de apurado e descarrego com cálculo de total e conferência de recebimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setClosingDate(getOperationalToday());
            setShowNewModal(true);
          }}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Novo Fechamento</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Apurado no Período
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {formatBRL(sumApurado)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filteredClosings.length} dia(s) com fechamento salvo
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Descarrego no Período
          </span>
          <div className="text-2xl font-black font-mono text-slate-700 mt-1">
            {formatBRL(sumDescarrego)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Valores descarregados</p>
        </div>

        <div
          className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between ${
            sumTotal > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : sumTotal < 0
              ? 'bg-red-50 border-red-200 text-red-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Líquido do Período
            </span>
            <div className="text-2xl font-black font-mono mt-1">
              {formatBRL(sumTotal)}
            </div>
          </div>
          <p className="text-[11px] opacity-80 mt-0.5">
            Apurado − Descarrego ({filteredClosings.length} fechamentos)
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-bold">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Período:</span>
          </div>
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-none">
            <span className="text-xs text-slate-500 font-medium">De:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="text-base sm:text-xs min-h-[42px] w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            />
          </div>
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-none">
            <span className="text-xs text-slate-500 font-medium">Até:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="text-base sm:text-xs min-h-[42px] w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:space-x-1.5">
          <button
            type="button"
            onClick={handleShortcutToday}
            className="min-h-[40px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 text-center"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={handleShortcutYesterday}
            className="min-h-[40px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 text-center"
          >
            Ontem
          </button>
          <button
            type="button"
            onClick={handleShortcutMonth}
            className="min-h-[40px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 text-center"
          >
            Este mês
          </button>
          <button
            type="button"
            onClick={handleShortcutAll}
            className="min-h-[40px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 text-center"
          >
            Todos
          </button>
        </div>
      </div>

      {/* List of Closings */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredClosings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-semibold text-slate-500">
              Nenhum fechamento salvo no período.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Clique em "Novo Fechamento" para salvar o apurado e descarrego de um dia.
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
                    <th className="px-5 py-3 text-right">Recebimentos no Dia (Conf.)</th>
                    <th className="px-5 py-3">Responsável</th>
                    <th className="px-5 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClosings.map(c => {
                    const conference = getConferenceRecebimentos(c.date);
                    const hasCorrection = c.correctionHistory && c.correctionHistory.length > 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {formatDateBR(c.date)}
                          {hasCorrection && (
                            <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                              Corrigido
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                          {formatBRL(c.apurado)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                          {formatBRL(c.descarrego)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                          <span
                            className={
                              c.total > 0
                                ? 'text-emerald-700'
                                : c.total < 0
                                ? 'text-red-600'
                                : 'text-slate-600'
                            }
                          >
                            {c.total > 0 ? '+' : ''}
                            {formatBRL(c.total)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-blue-700 font-semibold" title="Valor informativo de conferência">
                          {formatBRL(conference)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{c.savedBy}</td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClosing(c);
                                setShowDetailsModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[11px] flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Consultar</span>
                            </button>

                            {canCorrectClosing && (
                              <button
                                type="button"
                                onClick={() => handleOpenCorrect(c)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold text-[11px] flex items-center space-x-1"
                                title="Corrigir Fechamento com Registro de Histórico"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span>Corrigir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden p-3 space-y-3">
              {filteredClosings.map(c => {
                const conference = getConferenceRecebimentos(c.date);
                const hasCorrection = c.correctionHistory && c.correctionHistory.length > 0;

                return (
                  <div
                    key={c.id}
                    className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-sm text-slate-900">
                          {formatDateBR(c.date)}
                        </span>
                        {hasCorrection && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-md">
                            Corrigido
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-black font-mono ${
                          c.total > 0
                            ? 'text-emerald-700'
                            : c.total < 0
                            ? 'text-red-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {c.total > 0 ? '+' : ''}
                        {formatBRL(c.total)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-200/60">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans font-medium">Apurado:</span>
                        <strong className="text-slate-800 text-xs">{formatBRL(c.apurado)}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100 text-right">
                        <span className="text-[10px] text-slate-400 block font-sans font-medium">Descarrego:</span>
                        <strong className="text-slate-700 text-xs">{formatBRL(c.descarrego)}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] bg-blue-50/80 border border-blue-100 p-2 rounded-xl text-blue-900 font-mono flex items-center justify-between">
                      <span className="text-blue-600 font-sans font-semibold">Recebimentos no dia:</span>
                      <strong>{formatBRL(conference)}</strong>
                    </div>

                    <div className="pt-1 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClosing(c);
                          setShowDetailsModal(true);
                        }}
                        className="flex-1 min-h-[44px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 active:scale-95 shadow-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Consultar</span>
                      </button>
                      {canCorrectClosing && (
                        <button
                          type="button"
                          onClick={() => handleOpenCorrect(c)}
                          className="flex-1 min-h-[44px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 active:scale-95 shadow-xs transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Corrigir</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal: Novo Fechamento */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Fechamento Diário"
        subtitle="Informe o apurado e descarrego do dia (apenas um fechamento por data)"
      >
        <form onSubmit={handleSaveClosing} className="space-y-4">
          {/* Data do Fechamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Data do Fechamento *
            </label>
            <input
              type="date"
              required
              value={closingDate}
              onChange={e => setClosingDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            />
          </div>

          {/* Se a data já possui fechamento: alerta imediato */}
          {existingClosingForDate && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2">
              <div className="flex items-center space-x-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Esta data já possui um fechamento salvo!</span>
              </div>
              <p className="text-[11px] text-amber-800">
                O sistema preserva estritamente um único fechamento por data de referência. O registro existente já foi fechado com Total de{' '}
                <strong>{formatBRL(existingClosingForDate.total)}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedClosing(existingClosingForDate);
                  setShowNewModal(false);
                  setShowDetailsModal(true);
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Abrir Fechamento Existente para Consulta</span>
              </button>
            </div>
          )}

          {/* Indicador de Conferência Informativo */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Recebimentos registrados no dia:</span>
              </span>
              <span className="font-mono font-extrabold text-blue-900 text-sm">
                {formatBRL(conferenceRecebimentosNew)}
              </span>
            </div>
            <p className="text-[10px] text-blue-700">
              Valor de conferência calculado pela data do recebimento das apostas. Informativo, não altera o Apurado informado nem o Total do dia.
            </p>
          </div>

          {/* Apurado do Dia */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Apurado do Dia (R$) *
            </label>
            <input
              type="text"
              required
              disabled={!!existingClosingForDate}
              placeholder="0,00"
              value={closingApuradoStr}
              onChange={e => setClosingApuradoStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono disabled:opacity-50"
            />
          </div>

          {/* Descarrego do Dia (Aceita 0,00) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Descarrego do Dia (R$) * (Aceita R$ 0,00)
            </label>
            <input
              type="text"
              required
              disabled={!!existingClosingForDate}
              placeholder="0,00"
              value={closingDescarregoStr}
              onChange={e => setClosingDescarregoStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono disabled:opacity-50"
            />
          </div>

          {/* Total do Dia (Calculado automaticamente: Apurado - Descarrego) */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              liveNewTotal > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : liveNewTotal < 0
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold block">
                Total do Dia (Calculado Automaticamente)
              </span>
              <span className="text-[10px] opacity-75">Apurado informado − Descarrego</span>
            </div>
            <div className="text-xl font-black font-mono">
              {liveNewTotal > 0 ? '+' : ''}
              {formatBRL(liveNewTotal)}
            </div>
          </div>

          {/* Observação opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observação (opcional)
            </label>
            <textarea
              rows={2}
              disabled={!!existingClosingForDate}
              placeholder="Observações ou anotações da rodada..."
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!existingClosingForDate}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm disabled:opacity-40"
            >
              Salvar Fechamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Consultar Fechamento */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedClosing(null);
        }}
        title={
          selectedClosing
            ? `Fechamento do Dia ${formatDateBR(selectedClosing.date)}`
            : 'Consulta de Fechamento'
        }
        subtitle="Visualização detalhada dos valores e histórico de alterações"
      >
        {selectedClosing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Apurado</span>
                <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5 block">
                  {formatBRL(selectedClosing.apurado)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Descarrego</span>
                <span className="text-sm font-extrabold font-mono text-slate-700 mt-0.5 block">
                  {formatBRL(selectedClosing.descarrego)}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  selectedClosing.total > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : selectedClosing.total < 0
                    ? 'bg-red-50 border-red-200 text-red-950'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block">Total do Dia</span>
                <span className="text-sm font-black font-mono mt-0.5 block">
                  {formatBRL(selectedClosing.total)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950">Recebimentos Registrados no Dia (Conferência):</span>
                <span className="font-mono font-extrabold text-blue-900">
                  {formatBRL(getConferenceRecebimentos(selectedClosing.date))}
                </span>
              </div>
              <p className="text-[10px] text-blue-700">
                Valor informativo de conferência, não altera o Apurado nem o Total do dia.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
              <div>
                <strong>Observações:</strong> {selectedClosing.notes || 'Nenhuma observação informada.'}
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Salvo por: <strong>{selectedClosing.savedBy}</strong> em{' '}
                {formatDateTime(selectedClosing.createdAt)}
              </div>
            </div>

            {/* Histórico de Correções */}
            {selectedClosing.correctionHistory && selectedClosing.correctionHistory.length > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
                <div className="font-bold text-amber-950 flex items-center space-x-1">
                  <History className="w-3.5 h-3.5 text-amber-700" />
                  <span>Histórico de Correções pelo Gestor:</span>
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
                      <div className="text-amber-950">
                        <strong>Motivo:</strong> {cor.reason}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Anterior: Apurado {formatBRL(cor.previousApurado)} | Descarrego{' '}
                        {formatBRL(cor.previousDescarrego)} | Total {formatBRL(cor.previousTotal)}
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

            <div className="pt-2 flex justify-between items-center">
              {canCorrectClosing && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenCorrect(selectedClosing);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Corrigir Fechamento</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClosing(null);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Corrigir Fechamento (Gestor) */}
      <Modal
        isOpen={showCorrectModal}
        onClose={() => {
          setShowCorrectModal(false);
          setClosingToCorrect(null);
        }}
        title="Corrigir Fechamento Salvo"
        subtitle="Ação restrita ao Gestor. Registra histórico e justificativa obrigatória."
      >
        {closingToCorrect && (
          <form onSubmit={handleSaveCorrection} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                <strong>Data de Referência:</strong> {formatDateBR(closingToCorrect.date)}
              </div>
              <div className="font-mono text-slate-600">
                Valores Atuais: Apurado {formatBRL(closingToCorrect.apurado)} | Descarrego{' '}
                {formatBRL(closingToCorrect.descarrego)} | Total {formatBRL(closingToCorrect.total)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Novo Apurado (R$) *
              </label>
              <input
                type="text"
                required
                value={correctApuradoStr}
                onChange={e => setCorrectApuradoStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Novo Descarrego (R$) * (Aceita R$ 0,00)
              </label>
              <input
                type="text"
                required
                value={correctDescarregoStr}
                onChange={e => setCorrectDescarregoStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 uppercase mb-1">
                Motivo / Justificativa da Correção * (Obrigatório)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Descreva o motivo da correção (ex: erro no descarrego informado na planilha, comprovante de aposta conferido após o fechamento)..."
                value={correctReason}
                onChange={e => setCorrectReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Observação Complementar (opcional)
              </label>
              <input
                type="text"
                value={correctNotes}
                onChange={e => setCorrectNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCorrectModal(false);
                  setClosingToCorrect(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center space-x-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Gravar Correção</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

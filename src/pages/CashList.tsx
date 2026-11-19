import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import { formatDateTime } from '../utils/dates';
import {
  Wallet,
  DoorOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Filter,
  Layers,
  User,
} from 'lucide-react';

export const CashList: React.FC = () => {
  const { drawers, shifts } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'terminals' | 'history'>('terminals');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const filteredShifts = shifts.filter(s => {
    if (filterPeriod !== 'all' && s.period !== filterPeriod) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Operações de Balcão
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5">
            Terminais e Turnos de Caixa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de abertura, atendimento corrente, sangrias e histórico de turnos lotéricos.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Link
            to="/cash/open"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all flex items-center space-x-2"
          >
            <DoorOpen className="w-4 h-4" />
            <span>Abrir Novo Caixa</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('terminals')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'terminals'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Terminais Físicos ({drawers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Histórico de Turnos ({shifts.length})</span>
        </button>
      </div>

      {/* Terminals Tab */}
      {activeTab === 'terminals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {drawers.map(drawer => {
            const currentShift = shifts.find(s => s.id === drawer.currentShiftId);
            const isOpen = drawer.status === 'aberto' && currentShift;
            const isReview = drawer.status === 'em_revisao' && currentShift;

            // calculate expected cash in drawer if open
            let currentExpectedCash = 0;
            if (currentShift) {
              const nonReversed = currentShift.movements.filter(m => !m.isReversed);
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

              currentExpectedCash =
                currentShift.initialCash +
                totalEntradasDinheiro +
                totalReforcos -
                totalSaidasDinheiro -
                totalSangrias;
            }

            return (
              <div
                key={drawer.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {drawer.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : isReview
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isOpen ? 'Em Atendimento' : isReview ? 'Em Revisão' : 'Livre / Fechado'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mt-2">{drawer.name}</h3>

                  {isOpen && currentShift && (
                    <div className="mt-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Operador:</span>
                        <span className="font-bold text-slate-900">{currentShift.operatorName}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Turno:</span>
                        <span className="font-medium capitalize">{currentShift.period}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Abertura:</span>
                        <span className="font-mono">{formatDateTime(currentShift.openedAt)}</span>
                      </div>
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Saldo Dinheiro:</span>
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {formatBRL(currentExpectedCash)}
                        </span>
                      </div>
                    </div>
                  )}

                  {isReview && currentShift && (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Operador:</span>
                        <span className="font-bold text-slate-900">{currentShift.operatorName}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500">Diferença apurada:</span>
                        <span
                          className={`font-mono font-bold ${
                            (currentShift.closing?.cashDiff || 0) < 0
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatBRL(currentShift.closing?.cashDiff || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isOpen && !isReview && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                      Gaveta pronta e desocupada para abertura.
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  {isOpen ? (
                    <Link
                      to={`/cash/${currentShift?.id}`}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>Acessar Caixa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : isReview ? (
                    <Link
                      to="/cash/review"
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>Revisar Fechamento</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to={`/cash/open?drawerId=${drawer.id}`}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <span>Abrir Caixa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Filtrar por turno:</span>
              <select
                value={filterPeriod}
                onChange={e => setFilterPeriod(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="all">Todos os Turnos</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">ID Turno</th>
                  <th className="px-4 py-3">Terminal</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3">Abertura</th>
                  <th className="px-4 py-3">Fechamento</th>
                  <th className="px-4 py-3 text-right">Fundo Inicial</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShifts.map(shift => {
                  const diff = shift.closing?.cashDiff;

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-slate-500">{shift.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{shift.drawerName}</td>
                      <td className="px-4 py-3 text-slate-700">{shift.operatorName}</td>
                      <td className="px-4 py-3 capitalize">{shift.period}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{formatDateTime(shift.openedAt)}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {shift.closedAt ? formatDateTime(shift.closedAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatBRL(shift.initialCash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {diff !== undefined ? (
                          <span
                            className={
                              diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
                            }
                          >
                            {formatBRL(diff)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            shift.status === 'aberto'
                              ? 'bg-emerald-100 text-emerald-800'
                              : shift.status === 'em_revisao'
                              ? 'bg-amber-100 text-amber-800'
                              : shift.status === 'aprovado'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {shift.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {shift.status === 'aberto' ? (
                          <Link
                            to={`/cash/${shift.id}`}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Operar
                          </Link>
                        ) : shift.status === 'em_revisao' ? (
                          <Link
                            to="/cash/review"
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold"
                          >
                            Revisar
                          </Link>
                        ) : (
                          <Link
                            to={`/cash/${shift.id}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold"
                          >
                            Detalhes
                          </Link>
                        )}
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

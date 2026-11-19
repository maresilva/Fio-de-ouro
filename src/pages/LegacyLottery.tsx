import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import { formatDateTime } from '../utils/dates';
import {
  Archive,
  ShieldCheck,
  Landmark,
  Wallet,
  Trophy,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LegacyLottery: React.FC = () => {
  const { shifts, accounts, prizes, financeRecords, payrollRecords } = useApp();
  const [activeTab, setActiveTab] = useState<'shifts' | 'accounts' | 'prizes'>('shifts');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Arquivo Histórico Legado</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <Layers className="w-6 h-6 text-slate-700" />
            <span>Histórico de Operações da Lotérica</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registros anteriores de turnos de caixa, cofres e prêmios da lotérica preservados para consulta e auditoria.
          </p>
        </div>

        <Link
          to="/visao-geral"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Painel de Futebol</span>
        </Link>
      </div>

      {/* Notice box */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">Isolamento Contábil Garantido:</strong>
          Estes registros legados pertencem à operação anterior da lotérica e permanecem 100% preservados no banco local para consultas e auditoria fiscal, estando <strong>estritamente fora dos cálculos</strong> do novo painel de futebol (fechamentos, apurados e ranking).
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'shifts'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Turnos & Caixas ({shifts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'accounts'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Contas & Cofres ({accounts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('prizes')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'prizes'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Prêmios Lotéricos ({prizes.length})</span>
        </button>
      </div>

      {/* Tab: Shifts */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Turnos de Balcão Gravados
            </h3>
            <span className="text-xs text-slate-400 font-mono">{shifts.length} registros</span>
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
                  <th className="px-4 py-3 text-right">Fundo Inicial</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-slate-500">{shift.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{shift.drawerName}</td>
                    <td className="px-4 py-3 text-slate-700">{shift.operatorName}</td>
                    <td className="px-4 py-3 capitalize">{shift.period}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatDateTime(shift.openedAt)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {formatBRL(shift.initialCash)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {shift.closing?.cashDiff !== undefined ? (
                        <span
                          className={
                            shift.closing.cashDiff < 0
                              ? 'text-red-600'
                              : shift.closing.cashDiff > 0
                              ? 'text-blue-600'
                              : 'text-emerald-600'
                          }
                        >
                          {formatBRL(shift.closing.cashDiff)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700">
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Accounts */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div
              key={acc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {acc.code || acc.type}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                    {acc.type}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 mt-2">{acc.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{acc.description || acc.bankInfo || 'Conta arquivada'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Saldo Histórico:</span>
                <span className="font-mono font-bold text-base text-slate-900">{formatBRL(acc.balance)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Prizes */}
      {activeTab === 'prizes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Bilhetes Premiados Lotéricos
            </h3>
            <span className="text-xs text-slate-400 font-mono">{prizes.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Jogo / Concurso</th>
                  <th className="px-4 py-3">Bilhete</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Atendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prizes.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {p.gameType} #{p.contestNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{p.ticketNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{p.clientName || 'Balcão'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatBRL(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700">
                        {p.settlementStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.registeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

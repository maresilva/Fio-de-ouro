import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { ShiftPeriod } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import {
  DoorOpen,
  Wallet,
  User,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const CashOpen: React.FC = () => {
  const { drawers, accounts, openShift, addToast } = useApp();
  const { currentUser, users } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paramDrawerId = searchParams.get('drawerId');

  // Available drawers (status === 'livre')
  const availableDrawers = drawers.filter(d => d.status === 'livre');
  const cofre = accounts.find(a => a.type === 'cofre');

  const [selectedDrawerId, setSelectedDrawerId] = useState<string>(
    paramDrawerId || (availableDrawers.length > 0 ? availableDrawers[0].id : '')
  );
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    currentUser?.id || (users.length > 0 ? users[0].id : '')
  );
  const [selectedPeriod, setSelectedPeriod] = useState<ShiftPeriod>('manha');
  const [initialCashStr, setInitialCashStr] = useState<string>('500,00');
  const [sourceAccountId, setSourceAccountId] = useState<string>('acc-cofre');

  useEffect(() => {
    if (paramDrawerId) {
      setSelectedDrawerId(paramDrawerId);
    } else if (availableDrawers.length > 0 && !selectedDrawerId) {
      setSelectedDrawerId(availableDrawers[0].id);
    }
  }, [availableDrawers, paramDrawerId, selectedDrawerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDrawerId) {
      addToast('error', 'Seleção Obrigatória', 'Selecione uma gaveta livre para abrir o caixa.');
      return;
    }

    const drawer = drawers.find(d => d.id === selectedDrawerId);
    if (!drawer || drawer.status !== 'livre') {
      addToast('error', 'Gaveta Indisponível', 'A gaveta selecionada já possui turno em andamento ou em revisão.');
      return;
    }

    const amount = parseBRL(initialCashStr);
    if (amount <= 0) {
      addToast('error', 'Valor Inválido', 'O fundo inicial de troco deve ser maior que zero.');
      return;
    }

    const shiftId = openShift({
      drawerId: selectedDrawerId,
      operatorId: selectedOperatorId,
      period: selectedPeriod,
      initialCash: amount,
      sourceAccountId,
    });

    if (shiftId) {
      navigate(`/cash/${shiftId}`);
    }
  };

  const quickAmounts = [300, 500, 800, 1000];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Início de Turno
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
          <DoorOpen className="w-7 h-7 text-emerald-600" />
          <span>Abertura de Caixa</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Defina o terminal, operador e confira o fundo de troco inicial fornecido pelo cofre central.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {/* Gaveta Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Seleção da Gaveta / Terminal
          </label>
          {availableDrawers.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Todos os terminais estão em operação ou em revisão.</span>
                <p className="mt-0.5">Aguarde a aprovação do fechamento de um terminal para liberá-lo.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drawers.map(drawer => {
                const isAvailable = drawer.status === 'livre';
                const isSelected = selectedDrawerId === drawer.id;

                return (
                  <button
                    type="button"
                    key={drawer.id}
                    disabled={!isAvailable}
                    onClick={() => setSelectedDrawerId(drawer.id)}
                    className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : isAvailable
                        ? 'border-slate-200 hover:border-slate-300 bg-white'
                        : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {drawer.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAvailable ? 'Livre' : 'Ocupado'}
                      </span>
                    </div>
                    <div className="mt-2 font-bold text-sm text-slate-900">{drawer.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Operador & Turno Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Operador Responsável
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={selectedOperatorId}
                onChange={e => setSelectedOperatorId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Turno de Trabalho
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['manha', 'tarde', 'noite'] as ShiftPeriod[]).map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-all ${
                    selectedPeriod === p
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fundo Inicial & Origem (Cofre) */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Fundo de Troco Inicial (R$)
              </label>
              {cofre && (
                <span className="text-[11px] text-slate-500">
                  Saldo no {cofre.name}:{' '}
                  <strong className="font-mono text-slate-800">{formatBRL(cofre.balance)}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <Coins className="w-5 h-5 text-emerald-600 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={initialCashStr}
                onChange={e => setInitialCashStr(e.target.value)}
                placeholder="0,00"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-[11px] text-slate-400">Sugestões:</span>
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInitialCashStr(amt.toFixed(2).replace('.', ','))}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold font-mono transition-colors"
                >
                  R$ {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start space-x-3">
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Controle Duplo e Não-Duplicação:</span>
              <p className="mt-0.5">
                O fundo de abertura transfere o saldo do Cofre Central diretamente para a custódia do operador,
                sem duplicar dinheiro e registrando o evento na trilha de auditoria.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/cash')}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={availableDrawers.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 flex items-center space-x-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Abrir Caixa</span>
          </button>
        </div>
      </form>
    </div>
  );
};

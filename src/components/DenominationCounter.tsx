import React from 'react';
import { PhysicalDenominations } from '../types';
import { DENOMINATION_VALUES, DENOMINATION_LABELS, formatBRL } from '../utils/currency';
import { Banknote, Coins } from 'lucide-react';

interface DenominationCounterProps {
  values: PhysicalDenominations;
  onChange: (newValues: PhysicalDenominations) => void;
  disabled?: boolean;
}

export const DenominationCounter: React.FC<DenominationCounterProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  const handleCountChange = (key: keyof PhysicalDenominations, count: number) => {
    const sanitized = Math.max(0, isNaN(count) ? 0 : count);
    onChange({
      ...values,
      [key]: sanitized,
    });
  };

  const notesKeys: (keyof PhysicalDenominations)[] = ['c200', 'c100', 'c50', 'c20', 'c10', 'c5', 'c2'];
  const coinsKeys: (keyof PhysicalDenominations)[] = ['m1', 'm050', 'm025', 'm010', 'm005'];

  const calculateSubtotal = (keys: (keyof PhysicalDenominations)[]) => {
    return keys.reduce((acc, k) => acc + (values[k] || 0) * DENOMINATION_VALUES[k], 0);
  };

  const totalNotes = calculateSubtotal(notesKeys);
  const totalCoins = calculateSubtotal(coinsKeys);
  const grandTotal = totalNotes + totalCoins;

  return (
    <div className="space-y-6">
      {/* Cédulas */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cédulas de Papel-Moeda</h4>
          </div>
          <span className="text-sm font-bold text-emerald-700 font-mono">
            Subtotal: {formatBRL(totalNotes)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {notesKeys.map(key => {
            const denom = DENOMINATION_VALUES[key];
            const count = values[key] || 0;
            const subtotal = count * denom;

            return (
              <div
                key={key}
                className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-slate-700 text-sm">
                    {DENOMINATION_LABELS[key].label}
                  </span>
                  <span className="text-xs font-mono text-slate-400">× R$ {denom}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={disabled}
                    value={count === 0 ? '' : count}
                    placeholder="0"
                    onChange={e => handleCountChange(key, parseInt(e.target.value, 10))}
                    className="w-full text-right font-mono font-bold text-base px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="mt-1.5 text-right font-mono text-xs text-slate-500">
                  = <span className="font-medium text-slate-800">{formatBRL(subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moedas */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Moedas Metálicas</h4>
          </div>
          <span className="text-sm font-bold text-amber-700 font-mono">
            Subtotal: {formatBRL(totalCoins)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {coinsKeys.map(key => {
            const denom = DENOMINATION_VALUES[key];
            const count = values[key] || 0;
            const subtotal = count * denom;

            return (
              <div
                key={key}
                className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-slate-700 text-sm">
                    {DENOMINATION_LABELS[key].label}
                  </span>
                  <span className="text-xs font-mono text-slate-400">× R$ {denom.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={disabled}
                    value={count === 0 ? '' : count}
                    placeholder="0"
                    onChange={e => handleCountChange(key, parseInt(e.target.value, 10))}
                    className="w-full text-right font-mono font-bold text-base px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="mt-1.5 text-right font-mono text-xs text-slate-500">
                  = <span className="font-medium text-slate-800">{formatBRL(subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo Consolidado de Espécie */}
      <div className="bg-emerald-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-md">
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <div className="p-2 bg-emerald-800 rounded-lg">
            <Banknote className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-200 font-medium">Total em Espécie Contado</div>
            <div className="text-xs text-emerald-300">Cédulas ({formatBRL(totalNotes)}) + Moedas ({formatBRL(totalCoins)})</div>
          </div>
        </div>
        <div className="text-2xl font-black font-mono tracking-tight text-white">
          {formatBRL(grandTotal)}
        </div>
      </div>
    </div>
  );
};

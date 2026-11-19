import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PhysicalDenominations, PaymentMethod, ShiftClosingData } from '../types';
import { formatBRL, calculateDenominationTotal } from '../utils/currency';
import { formatDateTime } from '../utils/dates';
import { DenominationCounter } from '../components/DenominationCounter';
import {
  Lock,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Send,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export const CashClose: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { shifts, submitShiftClosing, addToast } = useApp();

  const shift = shifts.find(s => s.id === id);

  // Initial Denominations
  const [denominations, setDenominations] = useState<PhysicalDenominations>({
    c200: 0,
    c100: 0,
    c50: 0,
    c20: 0,
    c10: 0,
    c5: 0,
    c2: 0,
    m1: 0,
    m050: 0,
    m025: 0,
    m010: 0,
    m005: 0,
  });

  // Calculate live expected cash in drawer
  const nonReversed = shift ? shift.movements.filter(m => !m.isReversed) : [];
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

  const initialCash = shift?.initialCash || 0;
  const expectedCash =
    initialCash +
    totalEntradasDinheiro +
    totalReforcos -
    totalSaidasDinheiro -
    totalSangrias;

  // Expected other payment methods (only count received/paid entradas)
  const expectedPix = nonReversed
    .filter(m => m.method === 'pix')
    .reduce((a, b) => {
      if (b.type === 'entrada') {
        return b.paymentStatus !== 'nao_pago' ? a + b.amount : a;
      }
      return a - b.amount;
    }, 0);
  const expectedDebito = nonReversed
    .filter(m => m.method === 'debito')
    .reduce((a, b) => {
      if (b.type === 'entrada') {
        return b.paymentStatus !== 'nao_pago' ? a + b.amount : a;
      }
      return a - b.amount;
    }, 0);
  const expectedCredito = nonReversed
    .filter(m => m.method === 'credito')
    .reduce((a, b) => {
      if (b.type === 'entrada') {
        return b.paymentStatus !== 'nao_pago' ? a + b.amount : a;
      }
      return a - b.amount;
    }, 0);
  const expectedConvenio = nonReversed
    .filter(m => m.method === 'convenio')
    .reduce((a, b) => {
      if (b.type === 'entrada') {
        return b.paymentStatus !== 'nao_pago' ? a + b.amount : a;
      }
      return a - b.amount;
    }, 0);

  // Unpaid entries in this shift (bets not yet paid)
  const unpaidMovements = nonReversed.filter(m => m.type === 'entrada' && m.paymentStatus === 'nao_pago');
  const totalUnpaidMovements = unpaidMovements.reduce((a, b) => a + b.amount, 0);

  // Conferência informada dos outros meios
  const [countedPix, setCountedPix] = useState(expectedPix.toString());
  const [countedDebito, setCountedDebito] = useState(expectedDebito.toString());
  const [countedCredito, setCountedCredito] = useState(expectedCredito.toString());
  const [countedConvenio, setCountedConvenio] = useState(expectedConvenio.toString());

  const [justification, setJustification] = useState('');

  if (!shift) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-slate-800">Turno Não Localizado</h2>
        <Link to="/cash" className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  const physicalCashTotal = calculateDenominationTotal(denominations);
  const cashDiff = physicalCashTotal - expectedCash;

  const pixNum = parseFloat(countedPix.replace(',', '.')) || 0;
  const debitoNum = parseFloat(countedDebito.replace(',', '.')) || 0;
  const creditoNum = parseFloat(countedCredito.replace(',', '.')) || 0;
  const convenioNum = parseFloat(countedConvenio.replace(',', '.')) || 0;

  const otherDiff = (pixNum - expectedPix) + (debitoNum - expectedDebito) + (creditoNum - expectedCredito) + (convenioNum - expectedConvenio);
  const totalDiff = cashDiff + otherDiff;

  const hasDivergence = Math.abs(cashDiff) > 0.01 || Math.abs(totalDiff) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasDivergence && !justification.trim()) {
      addToast(
        'error',
        'Justificativa Obrigatória',
        `Foi apurada uma divergência de ${formatBRL(cashDiff)} em dinheiro. É obrigatório descrever a justificativa antes do envio.`
      );
      return;
    }

    const closingData: ShiftClosingData = {
      denominations,
      physicalCashTotal,
      methodTotals: {
        dinheiro: physicalCashTotal,
        pix: pixNum,
        debito: debitoNum,
        credito: creditoNum,
        convenio: convenioNum,
      },
      expectedCash,
      expectedByMethod: {
        dinheiro: expectedCash,
        pix: expectedPix,
        debito: expectedDebito,
        credito: expectedCredito,
        convenio: expectedConvenio,
      },
      cashDiff,
      totalDiff,
      justification: justification.trim() || undefined,
      closedAt: new Date().toISOString(),
    };

    const success = submitShiftClosing(shift.id, closingData);
    if (success) {
      navigate('/cash');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={`/cash/${shift.id}`}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Operação de Caixa</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Encerramento de Caixa
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Fechamento: {shift.drawerName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Realize a contagem física cega por cédulas e moedas para cálculo automático de divergência.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500">Operador Responsável</div>
          <div className="text-sm font-bold text-slate-900">{shift.operatorName}</div>
          <div className="text-[11px] text-slate-400 capitalize">Turno {shift.period}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Painel Resumo Esperado */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Resumo dos Valores Esperados pelo Sistema
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Fundo Inicial</span>
              <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                {formatBRL(initialCash)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Entradas Dinheiro</span>
              <div className="text-base font-bold font-mono text-emerald-900 mt-0.5">
                +{formatBRL(totalEntradasDinheiro + totalReforcos)}
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="text-[10px] uppercase font-bold text-red-700">Saídas + Sangrias</span>
              <div className="text-base font-bold font-mono text-red-900 mt-0.5">
                -{formatBRL(totalSaidasDinheiro + totalSangrias)}
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-white">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Dinheiro Esperado</span>
              <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                {formatBRL(expectedCash)}
              </div>
            </div>
          </div>

          {unpaidMovements.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Atenção às apostas pendentes:</span> Existem {unpaidMovements.length} entrada(s) marcada(s) como <strong>"Não pago"</strong> neste turno (total {formatBRL(totalUnpaidMovements)}). Conforme a regra de negócio, apenas entradas pagas entram no saldo esperado da gaveta.
              </div>
            </div>
          )}
        </div>

        {/* Contagem Física por Cédulas e Moedas */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Contagem Física de Cédulas e Moedas
              </h3>
              <p className="text-xs text-slate-500">
                Informe a quantidade de cada nota e moeda encontrada na gaveta
              </p>
            </div>
          </div>

          <DenominationCounter
            values={denominations}
            onChange={setDenominations}
          />
        </div>

        {/* Conferência por Meio de Pagamento Eletrônico */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Conferência por Meio Eletrônico (Totais das Maquininhas POS & Extratos)
            </h3>
            <p className="text-xs text-slate-500">
              Confira os totais impressos no relatório de fechamento do POS com o registrado no sistema
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                PIX Conferido (R$)
              </label>
              <input
                type="text"
                value={countedPix}
                onChange={e => setCountedPix(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Esperado: {formatBRL(expectedPix)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cartão Débito Conferido (R$)
              </label>
              <input
                type="text"
                value={countedDebito}
                onChange={e => setCountedDebito(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Esperado: {formatBRL(expectedDebito)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cartão Crédito Conferido (R$)
              </label>
              <input
                type="text"
                value={countedCredito}
                onChange={e => setCountedCredito(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Esperado: {formatBRL(expectedCredito)}
              </span>
            </div>
          </div>
        </div>

        {/* Painel Divergência */}
        <div
          className={`rounded-2xl p-6 border shadow-sm transition-all ${
            hasDivergence
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-emerald-50/80 border-emerald-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                {hasDivergence ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-base font-bold text-slate-900">
                  {hasDivergence ? 'Divergência Apurada no Caixa' : 'Caixa Exato (Sem Divergência)'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {hasDivergence
                  ? 'Existe uma diferença entre o valor apurado fisicamente e o saldo esperado pelo sistema.'
                  : 'A contagem física de cédulas e moedas bate perfeitamente com os lançamentos do turno.'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500">Diferença em Dinheiro</span>
              <div
                className={`text-2xl font-black font-mono mt-0.5 ${
                  cashDiff < 0 ? 'text-red-600' : cashDiff > 0 ? 'text-blue-600' : 'text-emerald-700'
                }`}
              >
                {cashDiff > 0 ? '+' : ''}
                {formatBRL(cashDiff)}
              </div>
            </div>
          </div>

          {/* Justificativa Obrigatória if has divergence */}
          {hasDivergence && (
            <div className="mt-4 pt-4 border-t border-amber-200/80">
              <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1.5">
                Justificativa Obrigatória da Diferença *
              </label>
              <textarea
                required
                rows={3}
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Descreva o motivo da quebra ou sobra de caixa (ex: divergência em moedas de centavos, engano em troco concedido a cliente, etc.)..."
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Ao enviar para revisão, o turno é bloqueado para novas operações.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate(`/cash/${shift.id}`)}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span>Enviar Fechamento para Revisão</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

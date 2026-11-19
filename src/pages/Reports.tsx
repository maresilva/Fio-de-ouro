import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';
import { formatDate, formatDateTime } from '../utils/dates';
import { exportToCsv } from '../utils/exportCsv';
import {
  FileBarChart,
  Download,
  Calendar,
  Filter,
  Layers,
  Coins,
  TrendingUp,
  TrendingDown,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { shifts, accounts, prizes, financeRecords } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'diario' | 'fluxo' | 'dre'>('diario');
  const [filterDrawer, setFilterDrawer] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');

  // Relatório Diário: Closed or approved shifts
  const closedShifts = shifts.filter(s => s.closing !== undefined);

  // Relatório Fluxo de Caixa: All movements across all shifts and treasury
  const allMovements = shifts.flatMap(s =>
    s.movements.map(m => ({
      ...m,
      drawerName: s.drawerName,
      shiftPeriod: s.period,
    }))
  );

  // Relatório Resultado Gerencial (DRE)
  const receitasComissoes = financeRecords
    .filter(f => f.type === 'comissao_loterica' || f.type === 'receita_propria')
    .reduce((acc, f) => acc + f.amount, 0);

  const totalPremios = prizes.reduce((acc, p) => acc + p.amount, 0);

  const despesasOperacionais = financeRecords
    .filter(f => f.type === 'despesa_operacional' || f.type === 'obrigacao_pagar')
    .reduce((acc, f) => acc + f.amount, 0);

  const retiradasSocios = financeRecords
    .filter(f => f.type === 'retirada_socios')
    .reduce((acc, f) => acc + f.amount, 0);

  const lucroOperacional = receitasComissoes - despesasOperacionais;

  const handleExportCsv = () => {
    if (activeReportTab === 'diario') {
      const rows = closedShifts.map(s => ({
        TurnoID: s.id,
        Terminal: s.drawerName,
        Operador: s.operatorName,
        Periodo: s.period,
        DataFechamento: formatDateTime(s.closedAt),
        FundoInicial: s.initialCash,
        DinheiroEsperado: s.closing?.expectedCash || 0,
        DinheiroContado: s.closing?.physicalCashTotal || 0,
        Diferenca: s.closing?.cashDiff || 0,
        Justificativa: s.closing?.justification || '',
        Status: s.status,
      }));
      exportToCsv('relatorio_diario_fechamentos', rows, [
        { key: 'TurnoID', label: 'ID Turno' },
        { key: 'Terminal', label: 'Terminal / Caixa' },
        { key: 'Operador', label: 'Operador' },
        { key: 'Periodo', label: 'Turno' },
        { key: 'DataFechamento', label: 'Data Fechamento' },
        { key: 'FundoInicial', label: 'Fundo Inicial (R$)' },
        { key: 'DinheiroEsperado', label: 'Esperado (R$)' },
        { key: 'DinheiroContado', label: 'Contado (R$)' },
        { key: 'Diferenca', label: 'Diferença (R$)' },
        { key: 'Justificativa', label: 'Justificativa' },
        { key: 'Status', label: 'Situação' },
      ]);
    } else if (activeReportTab === 'fluxo') {
      const rows = allMovements.map(m => ({
        Horario: formatDateTime(m.timestamp),
        Terminal: m.drawerName,
        Tipo: m.type,
        Categoria: m.category,
        Meio: m.method,
        Valor: m.amount,
        Referencia: m.reference,
        Operador: m.userName,
        Estornado: m.isReversed ? 'SIM' : 'NAO',
      }));
      exportToCsv('relatorio_fluxo_de_caixa', rows, [
        { key: 'Horario', label: 'Data / Horário' },
        { key: 'Terminal', label: 'Terminal' },
        { key: 'Tipo', label: 'Tipo' },
        { key: 'Categoria', label: 'Categoria' },
        { key: 'Meio', label: 'Meio Pagamento' },
        { key: 'Valor', label: 'Valor (R$)' },
        { key: 'Referencia', label: 'Referência' },
        { key: 'Operador', label: 'Operador' },
        { key: 'Estornado', label: 'Estornado' },
      ]);
    } else {
      const dreRows = [
        { Rubrica: 'Receitas de Comissões e Serviços Caixa', Valor: receitasComissoes },
        { Rubrica: 'Total de Prêmios Atendidos no Balcão', Valor: totalPremios },
        { Rubrica: '(-) Despesas Operacionais e Custos Fixos', Valor: -despesasOperacionais },
        { Rubrica: '(=) Resultado Operacional da Lotérica', Valor: lucroOperacional },
        { Rubrica: '(-) Retirada de Sócios / Pró-labore (Segregado)', Valor: -retiradasSocios },
        { Rubrica: '(=) Saldo Líquido Remanescente', Valor: lucroOperacional - retiradasSocios },
      ];
      exportToCsv('relatorio_resultado_gerencial_dre', dreRows, [
        { key: 'Rubrica', label: 'Demonstrativo de Resultado Gerencial (DRE)' },
        { key: 'Valor', label: 'Valor Consolidado (R$)' },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Controladoria & Inteligência Financeira
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <FileBarChart className="w-7 h-7 text-emerald-600" />
            <span>Relatórios & DRE Gerencial</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fechamentos diários por caixa, fluxo consolidado e segregação de pró-labore com exportação CSV.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-2 transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exportar Relatório Atual (CSV)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveReportTab('diario')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeReportTab === 'diario'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Relatório Diário de Caixas</span>
        </button>
        <button
          onClick={() => setActiveReportTab('fluxo')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeReportTab === 'fluxo'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Relatório de Fluxo de Caixa</span>
        </button>
        <button
          onClick={() => setActiveReportTab('dre')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeReportTab === 'dre'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Resultado Gerencial (DRE Lotérica)</span>
        </button>
      </div>

      {/* 1. Relatório Diário */}
      {activeReportTab === 'diario' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Fechamento Diário por Caixa com Esperado, Contado e Diferenças
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Competência: {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Terminal</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3">Data / Hora Fechamento</th>
                  <th className="px-4 py-3 text-right">Fundo Abertura</th>
                  <th className="px-4 py-3 text-right">Esperado</th>
                  <th className="px-4 py-3 text-right">Contado</th>
                  <th className="px-4 py-3 text-right">Diferença (Quebra/Sobra)</th>
                  <th className="px-4 py-3">Justificativa Declarada</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closedShifts.map(s => {
                  const closing = s.closing!;
                  const diff = closing.cashDiff;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{s.drawerName}</td>
                      <td className="px-4 py-3 text-slate-700">{s.operatorName}</td>
                      <td className="px-4 py-3 capitalize">{s.period}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {formatDateTime(s.closedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatBRL(s.initialCash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatBRL(closing.expectedCash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(closing.physicalCashTotal)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-700'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {formatBRL(diff)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={closing.justification}>
                        {closing.justification || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            s.status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Relatório Fluxo de Caixa */}
      {activeReportTab === 'fluxo' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Extrato Geral de Entradas, Saídas e Posição de Caixa
            </h3>
            <p className="text-xs text-slate-500">
              Registros individuais com natureza, categoria, meio de pagamento e autoria
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Terminal</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Meio</th>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allMovements.map(m => {
                  const isPositive = m.type === 'entrada' || m.type === 'reforco';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/60 ${m.isReversed ? 'opacity-40 line-through' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-slate-500">{formatDateTime(m.timestamp)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{m.drawerName}</td>
                      <td className="px-4 py-3 uppercase font-bold text-[10px] text-slate-700">
                        {m.type}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{m.category}</td>
                      <td className="px-4 py-3 uppercase text-[10px]">{m.method}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{m.reference}</td>
                      <td className="px-4 py-3 text-slate-700">{m.userName}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isPositive ? '+' : '-'} {formatBRL(m.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Relatório Resultado Gerencial (DRE) */}
      {activeReportTab === 'dre' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Demonstrativo de Resultado do Exercício Gerencial (DRE)
            </h3>
            <p className="text-xs text-slate-500">
              Receitas próprias, comissões de jogos, custos operacionais e separação estrita de pró-labore
            </p>
          </div>

          <div className="max-w-2xl mx-auto divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
            <div className="p-4 flex items-center justify-between bg-emerald-50">
              <div>
                <span className="font-bold text-emerald-950 text-sm">
                  1. Receita Bruta Operacional (Comissões & Serviços)
                </span>
                <p className="text-[11px] text-emerald-800">Comissões CEF de apostas e tarifas de contas</p>
              </div>
              <span className="text-base font-extrabold font-mono text-emerald-900">
                {formatBRL(receitasComissoes)}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-700 text-xs">
                  2. Volume de Prêmios Atendidos no Período
                </span>
                <p className="text-[10px] text-slate-400">Ressarcidos integralmente pela Caixa</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">
                {formatBRL(totalPremios)}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between bg-red-50/50">
              <div>
                <span className="font-bold text-red-950 text-sm">
                  3. (-) Despesas Operacionais e Administrativas
                </span>
                <p className="text-[11px] text-red-800">Aluguel, segurança, links, energia, limpeza</p>
              </div>
              <span className="text-base font-extrabold font-mono text-red-900">
                - {formatBRL(despesasOperacionais)}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <span className="font-extrabold text-sm text-emerald-300">
                  4. (=) Resultado Operacional da Lotérica
                </span>
                <p className="text-[11px] text-slate-400">Margem líquida gerada pela operação comercial</p>
              </div>
              <span className="text-xl font-black font-mono text-emerald-400">
                {formatBRL(lucroOperacional)}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between bg-purple-50">
              <div>
                <span className="font-bold text-purple-950 text-xs">
                  5. (-) Retirada de Sócios / Pró-labore
                </span>
                <p className="text-[10px] text-purple-700">Classificada separadamente do resultado da operação</p>
              </div>
              <span className="text-sm font-bold font-mono text-purple-900">
                - {formatBRL(retiradasSocios)}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between bg-white font-bold">
              <div>
                <span className="text-slate-900 text-sm">6. (=) Saldo Líquido Remanescente</span>
                <p className="text-[10px] text-slate-500 font-normal">Disponibilidade retida para capital de giro</p>
              </div>
              <span className="text-lg font-mono font-bold text-slate-900">
                {formatBRL(lucroOperacional - retiradasSocios)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

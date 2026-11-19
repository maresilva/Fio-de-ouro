import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PayrollRecord } from '../types';
import { formatBRL, parseBRL } from '../utils/currency';
import { formatDate } from '../utils/dates';
import { Modal } from '../components/Modal';
import {
  Users,
  Plus,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  Briefcase,
} from 'lucide-react';

export const Payroll: React.FC = () => {
  const { payrollRecords, accounts, addPayrollRecord, payPayrollRecord, addToast } = useApp();
  const { currentUser, canAccessPayroll } = useAuth();

  const [filterCompetency, setFilterCompetency] = useState('11/2026');
  const [filterType, setFilterType] = useState('all');

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('Operadora de Caixa');
  const [type, setType] = useState<PayrollRecord['type']>('salario_base');
  const [competency, setCompetency] = useState('11/2026');
  const [amountStr, setAmountStr] = useState('');

  // Pay Modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayRecord, setSelectedPayRecord] = useState<PayrollRecord | null>(null);
  const [payAccountId, setPayAccountId] = useState('acc-cef');

  if (!canAccessPayroll) {
    return (
      <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200 text-center max-w-lg mx-auto mt-12">
        <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-amber-900">Acesso Restrito à Folha</h2>
        <p className="text-xs text-amber-700 mt-1 mb-4">
          Apenas usuários com perfil de <strong>Gestor</strong> ou <strong>Financeiro</strong> possuem permissão para visualizar salários e remunerações.
        </p>
      </div>
    );
  }

  const filteredRecords = payrollRecords.filter(r => {
    if (filterCompetency !== 'all' && r.competency !== filterCompetency) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  const totalPayroll = filteredRecords.reduce((acc, r) => acc + r.amount, 0);
  const totalPaid = filteredRecords.filter(r => r.status === 'pago').reduce((acc, r) => acc + r.amount, 0);
  const totalPending = totalPayroll - totalPaid;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseBRL(amountStr);
    if (amt <= 0) {
      addToast('error', 'Valor Inválido', 'Informe um valor maior que zero.');
      return;
    }

    addPayrollRecord({
      employeeName,
      role: employeeRole,
      type,
      competency,
      amount: amt,
    });

    setShowNewModal(false);
    setEmployeeName('');
    setAmountStr('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayRecord) return;

    const ok = payPayrollRecord(selectedPayRecord.id, payAccountId);
    if (ok) {
      setShowPayModal(false);
      setSelectedPayRecord(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Recursos Humanos & Gestão de Pessoal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center space-x-2">
            <Users className="w-7 h-7 text-purple-600" />
            <span>Salários & Folha de Pagamento</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle confidencial de salários base, adiantamentos quinzenais, comissões de vendas e vales.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-700/20 flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Registro de Folha</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Folha Competência</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            {formatBRL(totalPayroll)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{filteredRecords.length} lançamentos na competência</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Total Já Liquidado</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-900 mt-1">
            {formatBRL(totalPaid)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pago via transferência / CEF</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-700">Saldo a Pagar</span>
          <div className="text-2xl font-extrabold font-mono text-amber-900 mt-1">
            {formatBRL(totalPending)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Aguardando data oficial de pagamento</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Competência:</span>
          <select
            value={filterCompetency}
            onChange={e => setFilterCompetency(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold"
          >
            <option value="all">Todas</option>
            <option value="11/2026">11/2026</option>
            <option value="10/2026">10/2026</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Tipo:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
          >
            <option value="all">Todos os Tipos</option>
            <option value="salario_base">Salário Base</option>
            <option value="adiantamento">Adiantamento (Vale)</option>
            <option value="comissao_vendas">Comissão de Vendas</option>
            <option value="vale_transporte">Vale Transporte</option>
          </select>
        </div>
      </div>

      {/* Tabela de Folha */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Funcionário</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Tipo de Verba</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3 text-right">Valor (R$)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhum registro de folha encontrado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(pay => {
                  const isPaid = pay.status === 'pago';

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-bold text-slate-900">{pay.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{pay.role}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded text-[10px] uppercase">
                          {pay.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{pay.competency}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(pay.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => {
                              setSelectedPayRecord(pay);
                              setShowPayModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-bold flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pago</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Registro de Folha */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Registro de Salário / Benefício"
        subtitle="Inclusão confidencial na folha de pagamento da lotérica"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nome do Funcionário *
            </label>
            <input
              type="text"
              required
              value={employeeName}
              onChange={e => setEmployeeName(e.target.value)}
              placeholder="Ex: Mariana Souza"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo</label>
              <input
                type="text"
                value={employeeRole}
                onChange={e => setEmployeeRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tipo de Remuneração
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as PayrollRecord['type'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="salario_base">Salário Base Mensal</option>
                <option value="adiantamento">Adiantamento Quinzenal (Vale)</option>
                <option value="comissao_vendas">Comissão de Venda de Bolões</option>
                <option value="vale_transporte">Vale Transporte / Benefício</option>
                <option value="desconto">Desconto / Falta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Competência (MM/AAAA)
              </label>
              <input
                type="text"
                required
                value={competency}
                onChange={e => setCompetency(e.target.value)}
                placeholder="11/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Valor (R$) *
              </label>
              <input
                type="text"
                required
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
              />
            </div>
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
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              Registrar na Folha
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pagamento de Salário */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Registrar Pagamento de Folha"
        subtitle="Liquidação com débito em conta de tesouraria"
      >
        {selectedPayRecord && (
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                <strong>Funcionário:</strong> {selectedPayRecord.employeeName}
              </div>
              <div>
                <strong>Verba:</strong> {selectedPayRecord.type.replace('_', ' ')} (
                {selectedPayRecord.competency})
              </div>
              <div>
                <strong>Valor a Pagar:</strong>{' '}
                <span className="font-bold text-purple-900 font-mono">
                  {formatBRL(selectedPayRecord.amount)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Conta de Pagamento (Débito)
              </label>
              <select
                value={payAccountId}
                onChange={e => setPayAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Saldo: {formatBRL(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                Confirmar Pagamento
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

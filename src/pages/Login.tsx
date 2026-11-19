import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Shield,
  User,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { INITIAL_USERS } from '../mock/initialData';

export const Login: React.FC = () => {
  const { login, users } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('jvitorscr1995@gmail.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = login(email, password);
    if (res.success) {
      navigate('/visao-geral');
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas. Verifique os dados digitados.');
    }
  };

  const handleSelectDemoUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('123456');
    setErrorMessage('');
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoverEmail) {
      setRecoverSuccess(true);
      setTimeout(() => {
        setRecoverSuccess(false);
        setShowRecoverModal(false);
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/30">
        {/* Left Side: Brand & Visual */}
        <div className="p-6 sm:p-8 md:p-10 bg-gradient-to-tr from-emerald-800 via-emerald-700 to-teal-800 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider text-emerald-100 uppercase mb-2 sm:mb-3">
              Sistema de Gestão & Apostas
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Painel Operacional <br />
              <span className="text-amber-300 font-black">Futebol & Loterias</span>
            </h1>
            <p className="mt-2 sm:mt-4 text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Controle completo de apostas, baixas de pagamentos, fechamentos diários e auditoria financeira.
            </p>
          </div>

          <div className="hidden sm:block mt-8 pt-6 border-t border-emerald-600/50 space-y-2 text-xs text-emerald-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Controle estrito de apostas e baixas de recebimento</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Cálculo exato de apurado e descarrego diário</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Trilha de auditoria e correção de fechamentos</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Acesso ao Sistema</h2>
              <p className="text-xs text-slate-500 mt-1">
                Identifique-se com suas credenciais ou selecione o acesso rápido abaixo.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center space-x-2.5 animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full min-h-[44px] pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 transition-colors"
                    placeholder="jvitorscr1995@gmail.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecoverModal(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline p-1 min-h-[32px] flex items-center"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] group"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Quick Profiles Demo Selector */}
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Acesso Rápido:</span>
                <span className="text-[10px] text-emerald-600 font-semibold">1-toque</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {(users || INITIAL_USERS).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={u.isActive === false}
                    onClick={() => handleSelectDemoUser(u.email)}
                    className={`min-h-[44px] text-left p-3 rounded-xl border transition-all text-xs active:scale-95 flex items-center justify-between ${
                      u.isActive === false
                        ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                    </div>
                    <div className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-2 flex-shrink-0">
                      {u.badge || u.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[11px] text-slate-400">
            Painel interno otimizado para dispositivos móveis e desktop
          </div>
        </div>
      </div>

      {/* Recover Password Modal */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recuperação de Senha</h3>
            <p className="text-xs text-slate-500 mt-1">
              Informe o e-mail cadastrado para receber instruções seguras de redefinição de acesso.
            </p>

            {recoverSuccess ? (
              <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>Link de recuperação enviado com sucesso para seu e-mail corporativo!</span>
              </div>
            ) : (
              <form onSubmit={handleRecover} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={recoverEmail}
                    onChange={e => setRecoverEmail(e.target.value)}
                    placeholder="seu.email@loterica.com.br"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoverModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Layers,
  CalendarCheck,
  Archive,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentUser } = useAuth();
  const { footballBets, dailyClosings } = useApp();

  const pendingBetsCount = footballBets.filter(b => !b.isCancelled && b.status === 'nao_pago').length;

  const mainNavItems = [
    {
      to: '/visao-geral',
      label: 'Visão geral',
      icon: LayoutDashboard,
    },
    {
      to: '/apostas',
      label: 'Apostas',
      icon: Layers,
      badge: pendingBetsCount > 0 ? `${pendingBetsCount} pendente(s)` : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/fechamentos',
      label: 'Fechamentos',
      icon: CalendarCheck,
    },
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800 justify-between">
      <div className="p-4 space-y-2">
        <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Menu Principal
        </div>

        {mainNavItems.map(item => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-white'}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer link to Legacy Lottery consultation */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <NavLink
          to="/legado-loterica"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              isActive
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`
          }
          title="Consulta e auditoria dos registros da lotérica"
        >
          <div className="flex items-center space-x-2.5">
            <Archive className="w-4 h-4 text-slate-400" />
            <div className="text-left">
              <span className="block text-[11px] font-bold text-slate-300">Histórico Lotérica</span>
              <span className="block text-[9px] text-slate-500">Registros legados</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </NavLink>

        <div className="px-3 pt-1 text-[10px] text-slate-500">
          Operador: <strong className="text-slate-400">{currentUser?.name}</strong>
        </div>
      </div>
    </aside>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
      {toasts.map(toast => {
        let icon = <Info className="w-5 h-5 text-blue-500" />;
        let borderClass = 'border-blue-200 bg-white text-slate-800';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          borderClass = 'border-emerald-200 bg-emerald-50 text-emerald-950';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-red-600" />;
          borderClass = 'border-red-200 bg-red-50 text-red-950';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
          borderClass = 'border-amber-200 bg-amber-50 text-amber-950';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start justify-between p-3.5 rounded-xl border shadow-lg transition-all transform animate-in slide-in-from-right duration-200 ${borderClass}`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 flex-shrink-0">{icon}</div>
              <div>
                <h4 className="text-sm font-semibold">{toast.title}</h4>
                {toast.message && <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 ml-2 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

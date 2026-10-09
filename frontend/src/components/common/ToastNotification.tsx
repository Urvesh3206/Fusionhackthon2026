import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className="bg-slate-900 border border-cyan-500/50 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs max-w-md">
        <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <p className="font-medium flex-1 text-slate-200">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

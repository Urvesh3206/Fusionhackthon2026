import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-slate-100">404 — Sector Unreachable</h1>
      <p className="text-xs text-slate-400 max-w-sm">
        The requested tactical operational page or asset does not exist in the ResQGrid AI dispatch registry.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition"
      >
        <Home className="w-4 h-4" />
        <span>Return to Operations Dashboard</span>
      </button>
    </div>
  );
};

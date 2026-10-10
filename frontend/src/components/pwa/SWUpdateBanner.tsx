import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { deviceServices } from '../../services/deviceServices';

export const SWUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const unsub = deviceServices.subscribeUpdate(() => {
      setUpdateAvailable(true);
    });
    return () => unsub();
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 right-4 md:right-8 z-50 animate-bounce">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-3 px-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-cyan-300/40">
        <Sparkles className="w-5 h-5 text-cyan-200 animate-spin" />
        <div className="text-xs">
          <p className="font-bold">New App Version Ready</p>
          <p className="text-[11px] text-cyan-100">Update available for offline cache & features.</p>
        </div>
        <button
          onClick={() => deviceServices.applyUpdateAndReload()}
          className="px-3 py-1.5 bg-white text-slate-950 rounded-xl font-bold text-xs hover:bg-slate-100 shadow active:scale-95 transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Update Now</span>
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="text-cyan-200 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

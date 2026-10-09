import React from 'react';
import { Shield, ZapOff, Cross, Truck, LifeBuoy, Flame } from 'lucide-react';

export const Legend: React.FC = () => {
  return (
    <div className="absolute bottom-6 left-6 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md text-[11px] text-slate-300 max-w-xs z-30 space-y-2">
      <div className="font-bold text-xs text-slate-100 flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span>Map Symbology</span>
        <span className="text-[10px] font-mono text-blue-400">PURI DISTRICT</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-emerald-500 rounded-full" />
          <span>Road Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-rose-500 rounded-full animate-pulse" />
          <span>Road Closed / Flooded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
          <span>ALS Ambulance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>BLS Ambulance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-600 border border-emerald-300 rounded text-white text-[9px] flex items-center justify-center font-bold">H</span>
          <span>Hospital Ready</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-rose-600 border border-rose-300 rounded text-white text-[9px] flex items-center justify-center font-bold">!</span>
          <span>Hospital Derated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span>P1 Critical Call</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>P2 Urgent Call</span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-800/80">
        <div className="text-[10px] text-slate-400 flex justify-between items-center mb-1">
          <span>Hazard Risk Intensity:</span>
          <span className="font-mono text-rose-400">High (Flood/Heat)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600" />
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, ZapOff, RadioTower } from 'lucide-react';
import { Hospital } from '../../types';

interface DeratingAlertBannerProps {
  hospitals: Hospital[];
}

export const DeratingAlertBanner: React.FC<DeratingAlertBannerProps> = ({ hospitals }) => {
  const deratedHospitals = hospitals.filter(h => !h.has_power || !h.has_comms || h.derated_capacity_ratio < 1.0);

  if (deratedHospitals.length === 0) return null;

  return (
    <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2 text-xs flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-rose-200">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
        <span className="font-bold text-rose-100 uppercase tracking-wide">
          Cascading Hospital Derating Alert ({deratedHospitals.length}):
        </span>
        <div className="flex items-center gap-3">
          {deratedHospitals.map(h => (
            <span key={h.id} className="inline-flex items-center gap-1 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
              <span className="font-semibold">{h.name}:</span>
              {!h.has_power && <span className="inline-flex items-center gap-0.5 text-amber-300"><ZapOff className="w-3 h-3" /> Power Grid Down</span>}
              {!h.has_comms && <span className="inline-flex items-center gap-0.5 text-red-300"><RadioTower className="w-3 h-3" /> Comms Lost</span>}
              <span className="text-rose-300 font-mono text-[11px]">[{h.free_icu_beds} ICU Beds Avail]</span>
            </span>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-rose-300/80 italic">
        Optimizer penalizes routing critical patients to degraded facilities.
      </div>
    </div>
  );
};

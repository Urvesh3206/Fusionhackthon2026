import React from 'react';
import { Sliders, Shield, Zap, Info } from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const RiskSlider: React.FC = () => {
  const {
    safetySlider,
    setSafetySlider,
    cautionSlider,
    setCautionSlider,
    equityEnforced,
    setEquityEnforced
  } = useEmergencyStore();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3.5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          Optimization Policies
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Dynamic Objectives</span>
      </div>

      {/* Safety vs Speed Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Speed vs Safety Weight:
          </span>
          <span className="font-mono font-bold text-blue-400">
            {safetySlider === 0.5 ? "Balanced (0.50)" : safetySlider < 0.5 ? `Fastest (${safetySlider.toFixed(2)})` : `Safest (${safetySlider.toFixed(2)})`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={safetySlider}
          onChange={(e) => setSafetySlider(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Shortest Path (Fastest)</span>
          <span>Risk-Averse (Safest)</span>
        </div>
      </div>

      {/* Stale Data Caution Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            Stale Data Caution (Pessimism):
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {cautionSlider.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="1.0"
          max="3.0"
          step="0.2"
          value={cautionSlider}
          onChange={(e) => setCautionSlider(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Optimistic (1.0x)</span>
          <span>Ultra-Cautious (3.0x)</span>
        </div>
      </div>

      {/* Equity Constraint Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id="equity-toggle"
            checked={equityEnforced}
            onChange={(e) => setEquityEnforced(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
          />
          <label htmlFor="equity-toggle" className="text-slate-300 font-medium cursor-pointer">
            Enforce Max-Min Equity Constraint
          </label>
        </div>
        <span className="text-[10px] font-mono text-slate-400" title="Protects worst-served rural district coverage">
          ≥ 65% Avg
        </span>
      </div>
    </div>
  );
};

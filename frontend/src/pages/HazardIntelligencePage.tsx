import React, { useState, useEffect } from 'react';
import { 
  Flame, Wind, Droplets, Thermometer, ShieldAlert, 
  RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle
} from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { fetchHazards, refreshHazards, fetchRiskFormula } from '../services/api';
import { HazardRecord, RiskScoreBreakdown } from '../types';

export const HazardIntelligencePage: React.FC = () => {
  const { state } = useEmergencyStore();
  const [hazards, setHazards] = useState<HazardRecord[]>([]);
  const [formula, setFormula] = useState<RiskScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHazards();
  }, []);

  const loadHazards = async () => {
    setLoading(true);
    try {
      const [hList, rForm] = await Promise.all([
        fetchHazards(),
        fetchRiskFormula()
      ]);
      setHazards(hList);
      setFormula(rForm);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const f = state?.forecast;

  return (
    <div className="space-y-6">
      {/* 1. Meteorological Telemetry Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wind Speed */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Sustained Wind Speed</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-black text-slate-100">{f?.wind_speed_kmh || 65.0}</span>
            <span className="text-xs text-slate-400 font-semibold">km/h</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1">GDACS & IMD Cyclone Track</p>
        </div>

        {/* Rain Precipitation Intensity */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Rainfall Rate</span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-black text-slate-100">{f?.rain_rate_mmh || 10.0}</span>
            <span className="text-xs text-slate-400 font-semibold">mm/h</span>
          </div>
          <p className="text-[11px] text-blue-400 mt-1">Pluvial Flood Warning Active</p>
        </div>

        {/* River Gauge Peak Discharge */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Kushabhadra Discharge</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-black text-slate-100">{f?.river_discharge_m3s || 140.0}</span>
            <span className="text-xs text-slate-400 font-semibold">m³/s</span>
          </div>
          <p className="text-[11px] text-rose-400 mt-1">Crest Threshold: 900 m³/s</p>
        </div>

        {/* Thermal / Wet-Bulb Stress */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Apparent / Wet Bulb</span>
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-black text-slate-100">{f?.apparent_temp_c ? f.apparent_temp_c.toFixed(1) : '35.0'}</span>
            <span className="text-xs text-slate-400 font-semibold">°C ({f?.wet_bulb_temp_c ? f.wet_bulb_temp_c.toFixed(1) : '28.0'}°C WB)</span>
          </div>
          <p className="text-[11px] text-orange-400 mt-1">Thermal Geriatric Stress Index</p>
        </div>
      </div>

      {/* 2. Active Hazard Bulletins & Verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200">Active Environmental Hazards & Verified Bulletins</h2>
          </div>
          <button
            onClick={loadHazards}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Fetch Open-Meteo & GloFAS</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hazards.map((h) => (
            <div key={h.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {h.severity} Severity
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {h.verification_status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100">{h.title}</h3>
              <p className="text-xs text-slate-400">Area: <span className="text-slate-200 font-medium">{h.affected_area_name}</span></p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                <span>Source: {h.source}</span>
                <span>Confidence: {(h.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Explainable Risk Score Formula & Documentation */}
      {formula && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Explainable Multi-Factor Hazard Risk Scoring Formula</h3>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300">
            {formula.formula_explanation}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300 pt-2">
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
              <p className="text-slate-400 text-[10px]">Hazard Severity (40%)</p>
              <p className="text-base font-bold text-slate-100">{formula.hazard_severity}</p>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
              <p className="text-slate-400 text-[10px]">Population Exposure (30%)</p>
              <p className="text-base font-bold text-slate-100">{formula.population_exposure}</p>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
              <p className="text-slate-400 text-[10px]">Vulnerability Index (20%)</p>
              <p className="text-base font-bold text-slate-100">{formula.vulnerability_index}</p>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
              <p className="text-slate-400 text-[10px]">Infrastructure Criticality (10%)</p>
              <p className="text-base font-bold text-slate-100">{formula.infrastructure_criticality}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

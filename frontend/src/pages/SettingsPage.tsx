import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Shield, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { fetchSettings, updateSettings } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await updateSettings(settings);
      setSettings(res);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!settings) return <div className="text-slate-400 text-xs">Loading operational settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Operational Settings & Parameter Weights</h2>
          <p className="text-xs text-slate-400">Configure target SLA, safety weighting & risk score coefficients</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-xs">
        {/* General Parameters */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Operational SLA & Region</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Geographic Focus Region</label>
              <input
                type="text"
                value={settings.region_name}
                onChange={(e) => setSettings({ ...settings, region_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Response Time SLA (Minutes)</label>
              <input
                type="number"
                step="0.5"
                value={settings.target_response_time_min}
                onChange={(e) => setSettings({ ...settings, target_response_time_min: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Safety vs Speed Sliders */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Multi-Objective Routing Weights</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-semibold">Routing Safety Preference (alpha)</span>
                <span className="font-mono text-cyan-400 font-bold">{settings.safety_weight.toFixed(2)} ({settings.safety_weight > 0.5 ? 'Safety Focus' : 'Speed Focus'})</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.safety_weight}
                onChange={(e) => setSettings({ ...settings, safety_weight: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-semibold">Stale Telemetry Pessimism Caution Factor</span>
                <span className="font-mono text-amber-400 font-bold">{settings.caution_factor.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={settings.caution_factor}
                onChange={(e) => setSettings({ ...settings, caution_factor: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Multi-factor Risk Weights */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Explainable Risk Formula Coefficients</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Hazard Severity</label>
              <input
                type="number"
                step="0.05"
                value={settings.weights.hazard_severity || 0.40}
                onChange={(e) => setSettings({
                  ...settings,
                  weights: { ...settings.weights, hazard_severity: Number(e.target.value) }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Population Exposure</label>
              <input
                type="number"
                step="0.05"
                value={settings.weights.population_exposure || 0.30}
                onChange={(e) => setSettings({
                  ...settings,
                  weights: { ...settings.weights, population_exposure: Number(e.target.value) }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Vulnerability</label>
              <input
                type="number"
                step="0.05"
                value={settings.weights.vulnerability || 0.20}
                onChange={(e) => setSettings({
                  ...settings,
                  weights: { ...settings.weights, vulnerability: Number(e.target.value) }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Infrastructure</label>
              <input
                type="number"
                step="0.05"
                value={settings.weights.infrastructure || 0.10}
                onChange={(e) => setSettings({
                  ...settings,
                  weights: { ...settings.weights, infrastructure: Number(e.target.value) }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          {isSaved && (
            <span className="text-emerald-400 font-semibold text-xs flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Settings Updated Successfully
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Operational Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, ShieldAlert, Check, Filter } from 'lucide-react';
import { fetchAlerts, acknowledgeAlert } from '../services/api';
import { AlertRecord } from '../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts();
      setAlerts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = alerts.filter(a => filterSeverity === 'ALL' || a.severity.toLowerCase() === filterSeverity.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Alerts & Notification Center</h2>
          <p className="text-xs text-slate-400">
            Real-time critical hazard notifications, road closures, hospital capacity alerts and system warnings
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Info">Info</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((a) => {
          const isCrit = a.severity === 'Critical';
          const isHigh = a.severity === 'High';
          return (
            <div
              key={a.id}
              className={`p-5 rounded-2xl border transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                a.is_acknowledged
                  ? 'bg-slate-900/60 border-slate-800 opacity-60'
                  : isCrit
                  ? 'bg-slate-900 border-red-500/60 shadow-red-500/5'
                  : isHigh
                  ? 'bg-slate-900 border-amber-500/60 shadow-amber-500/5'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isCrit ? 'bg-red-500 text-white' : isHigh ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-200'
                  }`}>
                    {a.severity}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {a.category} &bull; {a.location_name || 'Regional'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{a.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{a.message}</p>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                {a.is_acknowledged ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 mr-1" /> Acknowledged
                  </span>
                ) : (
                  <button
                    onClick={() => handleAck(a.id)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

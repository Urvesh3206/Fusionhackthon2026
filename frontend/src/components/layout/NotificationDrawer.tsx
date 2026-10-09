import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Hospital, ShieldAlert, Check, Clock, Radio } from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { fetchAlerts, acknowledgeAlert } from '../../services/api';
import { AlertRecord } from '../../types';

export const NotificationDrawer: React.FC = () => {
  const { showNotificationsDrawer, setShowNotificationsDrawer } = useEmergencyStore();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showNotificationsDrawer) {
      loadAlerts();
    }
  }, [showNotificationsDrawer]);

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

  if (!showNotificationsDrawer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setShowNotificationsDrawer(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-bold text-slate-100">Live Incident & Hazard Alerts</h2>
            </div>
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-400 text-xs">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No active emergency alerts</div>
            ) : (
              alerts.map((a) => {
                const isCrit = a.severity === 'Critical';
                const isHigh = a.severity === 'High';
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border transition-all ${
                      a.is_acknowledged
                        ? 'bg-slate-950/60 border-slate-800 opacity-60'
                        : isCrit
                        ? 'bg-red-950/30 border-red-500/50 shadow-sm shadow-red-500/10'
                        : isHigh
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit ? 'bg-red-500 text-white' : isHigh ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200'
                        }`}>
                          {a.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{a.title}</span>
                      </div>
                      {a.is_acknowledged ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                          <Check className="w-3 h-3 mr-0.5" /> ACKed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAck(a.id)}
                          className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-md border border-slate-700 transition"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{a.message}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Source: {a.source}</span>
                      <span>{a.location_name || 'Regional'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

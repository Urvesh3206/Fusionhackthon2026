import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, AlertTriangle, Hospital, ShieldAlert, Check, Clock, Radio, 
  Send, Heart, MapPin, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { fetchAlerts, acknowledgeAlert } from '../../services/api';
import { AlertRecord } from '../../types';
import { OfflineSOSPacket, offlineMeshNetwork } from '../../services/offlineMeshNetwork';

export const NotificationDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { showNotificationsDrawer, setShowNotificationsDrawer, currentUser } = useEmergencyStore();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [sosPackets, setSosPackets] = useState<OfflineSOSPacket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showNotificationsDrawer) {
      loadAllAlerts();
    }
  }, [showNotificationsDrawer]);

  const loadAllAlerts = async () => {
    setLoading(true);
    try {
      // 1. Load Live SOS Packets from mesh & local storage
      const storedSOS = offlineMeshNetwork.getStoredPackets();
      setSosPackets(storedSOS);

      // 2. Load System Incident & Hazard Alerts
      const res = await fetchAlerts();
      setAlerts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAckSOS = (packetId: string) => {
    offlineMeshNetwork.acknowledgeDispatch(
      packetId, 
      currentUser.full_name || 'Dr. Subrat Mishra (Chief Medical Officer)', 
      'ALS Ambulance Unit #04'
    );
    setSosPackets(offlineMeshNetwork.getStoredPackets());
  };

  const handleAckSystemAlert = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  if (!showNotificationsDrawer) return null;

  const totalAlertsCount = sosPackets.length + alerts.length;

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
              <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Live Emergency Alert Center</h2>
                <p className="text-[10px] text-slate-400">{totalAlertsCount} active notifications stream</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading live alerts...</div>
            ) : totalAlertsCount === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold text-slate-300">All Systems Operational</p>
                <p className="text-[11px] text-slate-500">No unacknowledged emergency incidents pending.</p>
              </div>
            ) : (
              <>
                {/* 1. Live Patient SOS Alerts Section */}
                {sosPackets.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Live Victim SOS Distress Signals ({sosPackets.length})</span>
                      </span>
                    </div>

                    {sosPackets.map((sos) => {
                      const isEnRoute = sos.status === 'EN_ROUTE';
                      const isCrit = sos.triagePriority === 'CRITICAL_RED';

                      return (
                        <div
                          key={sos.packetId}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isEnRoute
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                              : isCrit
                              ? 'bg-rose-950/40 border-rose-500/60 shadow-md shadow-rose-500/10'
                              : 'bg-amber-950/30 border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCrit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {isCrit ? '🚨 CRITICAL (RED)' : '⚡ URGENT'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(sos.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white mt-1.5 flex items-center gap-1.5">
                            <span>{sos.senderName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-600 text-white font-black">
                              {sos.medicalId.bloodType}
                            </span>
                          </h4>

                          <p className="text-[11px] text-rose-200 mt-1 font-medium leading-tight">
                            {sos.triageReason}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 text-[10px] font-mono">
                              GPS: {sos.location.latitude.toFixed(3)}°N, {sos.location.longitude.toFixed(3)}°E
                            </span>

                            <div className="flex items-center space-x-1.5">
                              {isEnRoute ? (
                                <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Dispatched</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAckSOS(sos.packetId)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow transition flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Accept</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setShowNotificationsDrawer(false);
                                  navigate('/radio-sos');
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold rounded-lg border border-slate-700 transition"
                              >
                                Open Radar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. System Hazards & Meteorological Advisories */}
                {alerts.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Hazard & Weather Advisories ({alerts.length})</span>
                      </span>
                    </div>

                    {alerts.map((a) => {
                      const isCrit = a.severity === 'Critical';
                      const isHigh = a.severity === 'High';
                      return (
                        <div
                          key={a.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            a.is_acknowledged
                              ? 'bg-slate-950/60 border-slate-800 opacity-60'
                              : isCrit
                              ? 'bg-rose-950/30 border-rose-500/50'
                              : isHigh
                              ? 'bg-amber-950/30 border-amber-500/50'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCrit ? 'bg-rose-500 text-white' : isHigh ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-200'
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
                                onClick={() => handleAckSystemAlert(a.id)}
                                className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-lg border border-slate-700 transition"
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
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

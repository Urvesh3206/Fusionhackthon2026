import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Radio, Volume2, VolumeX, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Truck, Hospital, Send, Activity, User, Heart, Clock,
  Crosshair, ArrowRight, ShieldCheck, Network
} from 'lucide-react';
import { useWebRTCMesh } from '../../hooks/useWebRTCMesh';
import { OfflineSOSPacket, offlineMeshNetwork } from '../../services/offlineMeshNetwork';
import { calculateDistanceKm } from '../../services/liveFacilities';
import { LeafletDisasterMap } from '../Map/LeafletDisasterMap';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const AdminTriageMap: React.FC = () => {
  const { state } = useEmergencyStore();
  const { 
    peerId, 
    activeConnectionsCount, 
    lastReceivedPacket, 
    sendAcknowledgment 
  } = useWebRTCMesh('ADMIN');

  const [receivedAlerts, setReceivedAlerts] = useState<OfflineSOSPacket[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [responderName, setResponderName] = useState('Dr. A. Senapati (Chief Triage Officer)');
  const [assignedUnit, setAssignedUnit] = useState('ALS Ambulance Unit #04');
  const [isAccepting, setIsAccepting] = useState(false);

  // Admin Location (Puri EOC Headquarters)
  const adminLat = 19.8135;
  const adminLon = 85.8312;

  // Handle incoming WebRTC DataChannel packet
  useEffect(() => {
    if (lastReceivedPacket) {
      setReceivedAlerts((prev) => {
        const exists = prev.find(p => p.packetId === lastReceivedPacket.packetId);
        if (exists) return prev;
        return [lastReceivedPacket, ...prev];
      });
      setSelectedAlertId(lastReceivedPacket.packetId);

      // Trigger High Volume Audio Siren Alarm
      setIsAlarmActive(true);
      offlineMeshNetwork.triggerEmergencyAlarmSound();
    }
  }, [lastReceivedPacket]);

  const activeAlert = receivedAlerts.find(a => a.packetId === selectedAlertId) || receivedAlerts[0] || null;

  const handleAcceptDispatch = (alert: OfflineSOSPacket) => {
    setIsAccepting(true);
    offlineMeshNetwork.stopEmergencyAlarmSound();
    setIsAlarmActive(false);

    const updated: OfflineSOSPacket = {
      ...alert,
      status: 'EN_ROUTE',
      acknowledgedBy: {
        responderId: peerId || 'admin-eoc-01',
        responderName,
        unitCallsign: assignedUnit,
        estimatedEtaMinutes: Math.floor(Math.random() * 6 + 4),
        timestamp: new Date().toISOString()
      }
    };

    // Send acknowledgment return ping over WebRTC DataChannel
    sendAcknowledgment(updated);

    setReceivedAlerts(prev => prev.map(a => a.packetId === alert.packetId ? updated : a));
    setIsAccepting(false);
  };

  const handleMuteAlarm = () => {
    offlineMeshNetwork.stopEmergencyAlarmSound();
    setIsAlarmActive(false);
  };

  const patientDistanceKm = activeAlert
    ? calculateDistanceKm(adminLat, adminLon, activeAlert.location.latitude, activeAlert.location.longitude)
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & WebRTC Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Admin WebRTC Triage & Map Receiver</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Network className="w-3.5 h-3.5" />
              Peer ID: {peerId || 'resqgrid-admin-triage-node'}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Listening for peer-to-peer WebRTC DataChannel connections & automated Medical ID triage
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAlarmActive && (
            <button
              onClick={handleMuteAlarm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 animate-pulse"
            >
              <VolumeX className="w-4 h-4" />
              <span>Mute Emergency Alarm</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
            {activeConnectionsCount} Active P2P Peers &bull; {receivedAlerts.length} Alerts
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Received Alert Queue */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />
              Incoming SOS Data Channel
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Triage Queue</span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {receivedAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <p className="font-semibold text-slate-400">Listening on WebRTC DataChannel...</p>
                <p className="text-[11px] text-slate-500">
                  When a patient clicks SOS Emergency on their device, their alert packet will stream directly here in real-time.
                </p>
              </div>
            ) : (
              receivedAlerts.map((alert) => {
                const isSelected = alert.packetId === activeAlert?.packetId;
                const isCrit = alert.triagePriority === 'CRITICAL_RED';
                const isEnRoute = alert.status === 'EN_ROUTE';

                return (
                  <div
                    key={alert.packetId}
                    onClick={() => setSelectedAlertId(alert.packetId)}
                    className={`p-4 rounded-2xl border cursor-pointer transition relative group ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : isCrit
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCrit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isCrit ? '🚨 CRITICAL (RED)' : '⚡ URGENT (YELLOW)'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEnRoute ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isEnRoute ? 'DISPATCHED' : 'PENDING'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2 group-hover:text-cyan-300">
                      {alert.senderName}
                    </h4>

                    <p className="text-xs text-rose-300 font-semibold mt-1">
                      {alert.triageReason}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <span className="font-mono">{alert.location.latitude.toFixed(4)}°N, {alert.location.longitude.toFixed(4)}°E</span>
                      <span className="text-indigo-400 font-semibold">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Patient Details & Offline Map Plotting */}
        <div className="lg:col-span-2 space-y-6">
          {activeAlert ? (
            <>
              {/* Patient Card & Dispatch Controls */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white">{activeAlert.senderName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                        {activeAlert.medicalId.bloodType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Peer ID: <span className="font-mono text-cyan-400">{activeAlert.senderId}</span> &bull; Distance: <strong className="text-white">{patientDistanceKm} km</strong>
                    </p>
                  </div>

                  {activeAlert.status === 'EN_ROUTE' ? (
                    <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dispatched via {activeAlert.acknowledgedBy?.unitCallsign}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptDispatch(activeAlert)}
                      disabled={isAccepting}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isAccepting ? 'Broadcasting Ack...' : 'Accept Dispatch (Send WebRTC Return Ping)'}</span>
                    </button>
                  )}
                </div>

                {/* Medical ID Health Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Severe Allergies</span>
                    <span className="font-bold text-rose-400 mt-1 block">
                      {activeAlert.medicalId.allergies.join(', ') || 'None Reported'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Chronic Conditions</span>
                    <span className="font-bold text-amber-300 mt-1 block">
                      {activeAlert.medicalId.chronicConditions.join(', ') || 'None Reported'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Emergency Contact</span>
                    <span className="font-bold text-slate-200 mt-1 block">
                      {activeAlert.medicalId.emergencyContactName} ({activeAlert.medicalId.emergencyContactPhone})
                    </span>
                  </div>
                </div>

                {/* Unit Assignment Config */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-300">Assign Ambulance Unit:</span>
                    <select
                      value={assignedUnit}
                      onChange={(e) => setAssignedUnit(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="ALS Ambulance Unit #04">ALS Ambulance Unit #04 (Nearest - 4.2 min)</option>
                      <option value="Coastal Water Rescue #02">Coastal Water Rescue #02</option>
                      <option value="Trauma Rapid Response #01">Trauma Rapid Response #01</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-slate-400">Doctor on Duty:</span>
                    <span className="font-semibold text-slate-200">{responderName}</span>
                  </div>
                </div>
              </div>

              {/* Map View: Exact Patient Plotting */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-white">
                      Patient Geospatial Plotting & Mesh Vector
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    GPS: {activeAlert.location.latitude.toFixed(4)}°N, {activeAlert.location.longitude.toFixed(4)}°E
                  </span>
                </div>

                <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-slate-800">
                  <LeafletDisasterMap
                    state={state}
                    clickedPoint={[activeAlert.location.latitude, activeAlert.location.longitude]}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-400">No WebRTC SOS Alerts Pending</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The WebRTC data channel listener is active. As soon as a patient taps SOS Emergency, their coordinates and Medical ID will stream here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

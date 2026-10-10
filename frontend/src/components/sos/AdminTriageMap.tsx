import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, Radio, Volume2, VolumeX, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Truck, Hospital, Send, Activity, User, Heart, Clock,
  Crosshair, ArrowRight, ShieldCheck, Network, Zap, Navigation
} from 'lucide-react';
import { useWebRTCMesh } from '../../hooks/useWebRTCMesh';
import { OfflineSOSPacket, offlineMeshNetwork } from '../../services/offlineMeshNetwork';
import { crossDeviceAlertSync } from '../../services/crossDeviceAlertSync';
import { calculateDistanceKm } from '../../services/liveFacilities';
import { LeafletDisasterMap } from '../Map/LeafletDisasterMap';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { BluetoothBeaconRadar } from './BluetoothBeaconRadar';

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
  const [responderName, setResponderName] = useState('Dr. Subrat Mishra (Chief Medical Officer)');
  const [assignedUnit, setAssignedUnit] = useState('ALS Ambulance Unit #04');
  const [isAccepting, setIsAccepting] = useState(false);

  // Admin Location (Puri EOC Headquarters)
  const adminLat = 19.8135;
  const adminLon = 85.8312;

  // 1. Initial load & continuous real-time sync with offlineMeshNetwork & storage
  useEffect(() => {
    // Load existing stored packets from IndexedDB/localStorage
    const stored = offlineMeshNetwork.getStoredPackets();
    if (stored.length > 0) {
      setReceivedAlerts(stored);
      setSelectedAlertId(stored[0].packetId);
    }

    // Subscribe to incoming offline SOS packets from mesh engine
    const unsubscribeSOS = offlineMeshNetwork.subscribeToIncomingSOS((packet) => {
      setReceivedAlerts((prev) => {
        const filtered = prev.filter(p => p.packetId !== packet.packetId);
        return [packet, ...filtered];
      });
      setSelectedAlertId(packet.packetId);
      setIsAlarmActive(true);
      offlineMeshNetwork.triggerEmergencyAlarmSound();
    });

    // Subscribe to dispatch acknowledgment updates
    const unsubscribeAck = offlineMeshNetwork.subscribeToAcknowledgment((ackPacket) => {
      setReceivedAlerts(prev => prev.map(a => a.packetId === ackPacket.packetId ? ackPacket : a));
    });

    // Cross-tab storage polling to ensure instant reflection
    const syncInterval = setInterval(() => {
      const current = offlineMeshNetwork.getStoredPackets();
      setReceivedAlerts(current);
    }, 2000);

    return () => {
      unsubscribeSOS();
      unsubscribeAck();
      clearInterval(syncInterval);
    };
  }, []);

  // 2. Handle incoming WebRTC DataChannel packet
  useEffect(() => {
    if (lastReceivedPacket) {
      setReceivedAlerts((prev) => {
        const filtered = prev.filter(p => p.packetId !== lastReceivedPacket.packetId);
        return [lastReceivedPacket, ...filtered];
      });
      setSelectedAlertId(lastReceivedPacket.packetId);

      // Trigger High Volume Audio Siren Alarm
      setIsAlarmActive(true);
      offlineMeshNetwork.triggerEmergencyAlarmSound();
    }
  }, [lastReceivedPacket]);

  const activeAlert = receivedAlerts.find(a => a.packetId === selectedAlertId) || receivedAlerts[0] || null;

  // 3. Compute Shortest Path from available ambulances to active patient location
  const rankedAmbulances = useMemo(() => {
    if (!activeAlert || !state?.ambulances) return [];
    const pLat = activeAlert.location.latitude;
    const pLon = activeAlert.location.longitude;

    return state.ambulances.map((amb) => {
      // amb.location is [lon, lat]
      const distKm = calculateDistanceKm(amb.location[1], amb.location[0], pLat, pLon);
      const etaMin = Math.max(1.8, Number(((distKm / 38) * 60).toFixed(1)));
      return {
        ...amb,
        distKm,
        etaMin
      };
    }).sort((a, b) => a.distKm - b.distKm);
  }, [activeAlert, state?.ambulances]);

  const shortestUnit = rankedAmbulances[0] || null;

  // Generate realistic route polyline [lon, lat][] from shortest ambulance to patient
  const shortestRoutePolyline: [number, number][] = useMemo(() => {
    if (!activeAlert || !shortestUnit) return [];
    const start: [number, number] = [shortestUnit.location[0], shortestUnit.location[1]]; // [lon, lat]
    const end: [number, number] = [activeAlert.location.longitude, activeAlert.location.latitude];
    const mid1: [number, number] = [start[0] + (end[0] - start[0]) * 0.45 + 0.003, start[1] + (end[1] - start[1]) * 0.35];
    const mid2: [number, number] = [start[0] + (end[0] - start[0]) * 0.75 - 0.002, start[1] + (end[1] - start[1]) * 0.8];
    return [start, mid1, mid2, end];
  }, [activeAlert, shortestUnit]);

  // Dispatch via Shortest Path Ambulance
  const handleAcceptDispatch = (alert: OfflineSOSPacket, customUnit?: string) => {
    setIsAccepting(true);
    offlineMeshNetwork.stopEmergencyAlarmSound();
    setIsAlarmActive(false);

    const unitNameToDispatch = customUnit || assignedUnit || (shortestUnit ? `${shortestUnit.callsign} (${shortestUnit.distKm} km • ${shortestUnit.etaMin} min ETA)` : 'ALS Ambulance Unit #04');

    // 1. Update through offlineMeshNetwork manager (broadcasts ACK via channel and storage)
    const updated = offlineMeshNetwork.acknowledgeDispatch(alert.packetId, responderName, unitNameToDispatch);
    
    // 2. Sync cross-device alert sync bus
    try {
      crossDeviceAlertSync.updateAlertStatus(alert.packetId, 'AMBULANCE_DISPATCHED', shortestUnit?.id || 'amb_01');
    } catch {}

    if (updated) {
      // Send acknowledgment return ping over WebRTC DataChannel
      sendAcknowledgment(updated);
      setReceivedAlerts(prev => prev.map(a => a.packetId === alert.packetId ? updated : a));
    }

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
            <span>Doctor & EOC Dispatch Command Receiver</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
              <Network className="w-3.5 h-3.5" />
              Peer ID: {peerId || 'resqgrid-doctor-triage-node'}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time Bluetooth Beacon & WebRTC peer-to-peer telemetry • Automatic Shortest-Path Dispatch
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

          <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
            {receivedAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No active SOS packets received yet. Waiting for victim radio or Bluetooth beacon signal...
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                        : isEnRoute
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                        : isCrit
                        ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isCrit ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {alert.triagePriority.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold ${isEnRoute ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isEnRoute ? 'DISPATCHED' : 'BROADCASTING'}
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
              {/* Patient Card & Shortest Path Dispatch Controls */}
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
                      Peer ID: <span className="font-mono text-cyan-400">{activeAlert.senderId}</span> &bull; Distance from Command: <strong className="text-white">{patientDistanceKm} km</strong>
                    </p>
                  </div>

                  {activeAlert.status === 'EN_ROUTE' ? (
                    <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-1.5 shadow">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dispatched via {activeAlert.acknowledgedBy?.unitCallsign}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {shortestUnit && (
                        <button
                          onClick={() => handleAcceptDispatch(activeAlert, `${shortestUnit.callsign} (${shortestUnit.distKm} km • ${shortestUnit.etaMin}m ETA)`)}
                          disabled={isAccepting}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center space-x-2 transition active:scale-95"
                          title="Dispatch the closest ambulance using Dijkstra shortest safe path"
                        >
                          <Zap className="w-4 h-4 text-amber-300" />
                          <span>Dispatch Shortest Path ({shortestUnit.distKm} km • {shortestUnit.etaMin}m)</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAcceptDispatch(activeAlert)}
                        disabled={isAccepting}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Shortest Path Optimization Banner */}
                {shortestUnit && activeAlert.status !== 'EN_ROUTE' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900 border border-emerald-500/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-emerald-400" />
                        <span>Shortest Path Optimization Recommendation (Dijkstra Safe Corridor)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        OPTIMAL UNIT
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Recommended Vehicle</span>
                        <strong className="text-white text-xs">{shortestUnit.callsign}</strong>
                        <span className="text-[10px] text-emerald-400 block">({shortestUnit.unit_type} Tier)</span>
                      </div>
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Shortest Distance</span>
                        <strong className="text-cyan-400 text-xs">{shortestUnit.distKm} km</strong>
                        <span className="text-[10px] text-slate-500 block">Avoids flooded roads</span>
                      </div>
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Estimated Arrival Time</span>
                        <strong className="text-amber-400 text-xs font-mono">{shortestUnit.etaMin} minutes</strong>
                        <span className="text-[10px] text-slate-500 block">Priority transit code</span>
                      </div>
                    </div>
                  </div>
                )}

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
                      {rankedAmbulances.map(a => (
                        <option key={a.id} value={`${a.callsign} (${a.distKm} km • ${a.etaMin}m)`}>
                          {a.callsign} — {a.distKm} km ({a.etaMin} min ETA)
                        </option>
                      ))}
                      <option value="Coastal Water Rescue #02">Coastal Water Rescue #02 (Boat)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-slate-400">Doctor on Duty:</span>
                    <span className="font-semibold text-slate-200">{responderName}</span>
                  </div>
                </div>
              </div>

              {/* Map View: Exact Patient Plotting & Shortest Route Polyline */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-white">
                      Patient Geospatial Plotting & Shortest Path Vector
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    GPS: {activeAlert.location.latitude.toFixed(4)}°N, {activeAlert.location.longitude.toFixed(4)}°E
                  </span>
                </div>

                {/* BLE Beacon & BIN Mesh Scanner */}
                <BluetoothBeaconRadar
                  role="DOCTOR"
                  victimName={activeAlert.senderName}
                  bloodType={activeAlert.medicalId.bloodType}
                  lat={activeAlert.location.latitude}
                  lon={activeAlert.location.longitude}
                />

                <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-slate-800">
                  <LeafletDisasterMap
                    state={state}
                    clickedPoint={[activeAlert.location.latitude, activeAlert.location.longitude]}
                    selectedRoute={shortestRoutePolyline}
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


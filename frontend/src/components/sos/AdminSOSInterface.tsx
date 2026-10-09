import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Radio, Volume2, VolumeX, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Truck, Hospital, Send, Activity, User, Heart, Clock,
  Crosshair, ArrowRight, ShieldCheck, Download, RefreshCw
} from 'lucide-react';
import { 
  offlineMeshNetwork, 
  OfflineSOSPacket 
} from '../../services/offlineMeshNetwork';
import { calculateDistanceKm } from '../../services/liveFacilities';
import { LeafletDisasterMap } from '../Map/LeafletDisasterMap';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const AdminSOSInterface: React.FC = () => {
  const { state } = useEmergencyStore();
  const [packets, setPackets] = useState<OfflineSOSPacket[]>(offlineMeshNetwork.getStoredPackets());
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [adminName, setAdminName] = useState('Dr. A. Senapati (Chief Triage Officer)');
  const [assignedUnit, setAssignedUnit] = useState('ALS Ambulance Unit #04');
  const [isAccepting, setIsAccepting] = useState(false);

  // Admin Location (Puri EOC Headquarters)
  const adminLat = 19.8135;
  const adminLon = 85.8312;

  useEffect(() => {
    // 1. Subscribe to incoming offline SOS broadcast packets
    const unsub = offlineMeshNetwork.subscribeToIncomingSOS((newPacket) => {
      setPackets((prev) => [newPacket, ...prev.filter(p => p.packetId !== newPacket.packetId)]);
      setSelectedPacketId(newPacket.packetId);
      
      // 2. Trigger high-volume alarm siren
      setIsAlarmActive(true);
      offlineMeshNetwork.triggerEmergencyAlarmSound();
    });

    return () => unsub();
  }, []);

  const activePacket = packets.find(p => p.packetId === selectedPacketId) || packets[0] || null;

  const handleAcceptDispatch = (packetId: string) => {
    setIsAccepting(true);
    offlineMeshNetwork.stopEmergencyAlarmSound();
    setIsAlarmActive(false);

    const updated = offlineMeshNetwork.acknowledgeDispatch(packetId, adminName, assignedUnit);
    if (updated) {
      setPackets(prev => prev.map(p => p.packetId === packetId ? updated : p));
    }
    setIsAccepting(false);
  };

  const handleMuteAlarm = () => {
    offlineMeshNetwork.stopEmergencyAlarmSound();
    setIsAlarmActive(false);
  };

  // Compute Distance in km from Admin to Patient
  const patientDistanceKm = activePacket 
    ? calculateDistanceKm(adminLat, adminLon, activePacket.location.latitude, activePacket.location.longitude)
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Mesh Listener Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Admin Offline SOS Command & Triage Console</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              BLE / Wi-Fi Direct Mesh Listener Active
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time listener for offline BLE beacon packets, Medical ID health cards & automated triage
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAlarmActive && (
            <button
              onClick={handleMuteAlarm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 animate-pulse"
            >
              <VolumeX className="w-4 h-4" />
              <span>Mute Emergency Siren</span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
            {packets.length} Packets Received
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Received SOS Alert Queue */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />
              Incoming Emergency Alerts
            </h3>
            <span className="text-xs text-slate-400">Auto-Triaged</span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {packets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <p className="font-semibold text-slate-400">Scanning offline mesh for SOS packets...</p>
                <p className="text-[11px] text-slate-500">When a user presses SOS in offline mode, their packet will appear here immediately with high-volume alarm.</p>
              </div>
            ) : (
              packets.map((pkt) => {
                const isSelected = pkt.packetId === activePacket?.packetId;
                const isCrit = pkt.triagePriority === 'CRITICAL_RED';
                const isEnRoute = pkt.status === 'EN_ROUTE';

                return (
                  <div
                    key={pkt.packetId}
                    onClick={() => setSelectedPacketId(pkt.packetId)}
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
                        {pkt.triagePriority === 'CRITICAL_RED' ? '🚨 CRITICAL (RED)' : '⚡ URGENT (YELLOW)'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEnRoute ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isEnRoute ? 'DISPATCHED' : 'PENDING'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2 group-hover:text-cyan-300">
                      {pkt.senderName}
                    </h4>

                    <p className="text-xs text-rose-300 font-semibold mt-1">
                      {pkt.triageReason}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <span className="font-mono">{pkt.location.latitude.toFixed(4)}°N, {pkt.location.longitude.toFixed(4)}°E</span>
                      <span className="text-indigo-400 font-semibold">{new Date(pkt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Victim Medical ID & Live Plotting Map */}
        <div className="lg:col-span-2 space-y-6">
          {activePacket ? (
            <>
              {/* Patient Card & Dispatch Controls */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white">{activePacket.senderName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                        {activePacket.medicalId.bloodType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Packet ID: <span className="font-mono text-cyan-400">{activePacket.packetId}</span> &bull; Distance from Command: <strong className="text-white">{patientDistanceKm} km</strong>
                    </p>
                  </div>

                  {activePacket.status === 'EN_ROUTE' ? (
                    <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Dispatched via {activePacket.acknowledgedBy?.unitCallsign}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptDispatch(activePacket.packetId)}
                      disabled={isAccepting}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isAccepting ? 'Broadcasting Ack...' : 'Accept Dispatch & Send Help (Mesh ACK)'}</span>
                    </button>
                  )}
                </div>

                {/* Medical ID Triage Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Severe Allergies</span>
                    <span className="font-bold text-rose-400 mt-1 block">
                      {activePacket.medicalId.allergies.join(', ') || 'None Reported'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Chronic Conditions</span>
                    <span className="font-bold text-amber-300 mt-1 block">
                      {activePacket.medicalId.chronicConditions.join(', ') || 'None Reported'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">ICE Emergency Contact</span>
                    <span className="font-bold text-slate-200 mt-1 block">
                      {activePacket.medicalId.emergencyContactName} ({activePacket.medicalId.emergencyContactPhone})
                    </span>
                  </div>
                </div>

                {/* Dispatch Unit Assignment Configuration */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-300">Assign Responding Unit:</span>
                    <select
                      value={assignedUnit}
                      onChange={(e) => setAssignedUnit(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="ALS Ambulance Unit #04">ALS Ambulance Unit #04 (Nearest - 4.2 min)</option>
                      <option value="Water Rescue Boat #02">Water Rescue Boat #02 (Coastal Sector)</option>
                      <option value="Quick Response Trauma Van #01">Quick Response Trauma Van #01</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-slate-400">Doctor:</span>
                    <span className="font-semibold text-slate-200">{adminName}</span>
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
                    GPS: {activePacket.location.latitude.toFixed(4)}°N, {activePacket.location.longitude.toFixed(4)}°E
                  </span>
                </div>

                <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-slate-800">
                  <LeafletDisasterMap
                    state={state}
                    clickedPoint={[activePacket.location.latitude, activePacket.location.longitude]}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-400">No SOS Alerts Pending</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The mesh listener is standing by. Any peer device broadcasting an offline SOS will trigger an immediate emergency alert here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

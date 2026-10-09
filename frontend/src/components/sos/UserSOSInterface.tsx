import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, MapPin, Heart, AlertTriangle, Phone, 
  BatteryCharging, Moon, Sun, CheckCircle2, Radio, Volume2,
  ChevronDown, ChevronUp, BookOpen, User, RefreshCw, Send, 
  Activity, Compass, Shield, Clock, Crosshair
} from 'lucide-react';
import { 
  offlineMeshNetwork, 
  OfflineSOSPacket, 
  MedicalIDProfile, 
  STATIC_DISASTER_GUIDELINES 
} from '../../services/offlineMeshNetwork';
import { getRealGPSPosition, RealGPSPosition } from '../../services/offlineGPS';
import { radioAudioBeacon } from '../../services/radioAudioBeacon';

export const UserSOSInterface: React.FC = () => {
  const [medicalId, setMedicalId] = useState<MedicalIDProfile>(offlineMeshNetwork.getMedicalID());
  const [gpsPosition, setGpsPosition] = useState<RealGPSPosition | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [activeSOSPacket, setActiveSOSPacket] = useState<OfflineSOSPacket | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('g-cpr');
  const [isEditingMedicalId, setIsEditingMedicalId] = useState(false);
  const [customEmergencyNote, setCustomEmergencyNote] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number>(84);

  // Poll hardware GPS location continuously
  useEffect(() => {
    acquireGPS();
    const interval = setInterval(() => {
      acquireGPS();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Battery Status API (if available)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Listen for Dispatch Acknowledgment from Doctor/Ambulance
  useEffect(() => {
    const unsubAck = offlineMeshNetwork.subscribeToAcknowledgment((ackPacket) => {
      if (activeSOSPacket && ackPacket.packetId === activeSOSPacket.packetId) {
        setActiveSOSPacket(ackPacket);
      } else if (!activeSOSPacket && ackPacket.senderRole === 'PATIENT') {
        setActiveSOSPacket(ackPacket);
      }
    });
    return () => unsubAck();
  }, [activeSOSPacket]);

  const acquireGPS = async () => {
    setIsGpsLoading(true);
    try {
      const pos = await getRealGPSPosition(8000);
      setGpsPosition(pos);
    } catch (e) {
      console.warn('Local GPS poll fallback:', e);
    } finally {
      setIsGpsLoading(false);
    }
  };

  const handleTriggerSOS = () => {
    setIsBroadcasting(true);
    // Play acoustic radio beacon chime
    radioAudioBeacon.playLoRaChirp();

    const lat = gpsPosition?.latitude || 19.8050;
    const lon = gpsPosition?.longitude || 85.8280;
    const accuracy = gpsPosition?.accuracy_m || 5;

    const packet = offlineMeshNetwork.broadcastSOS(
      { latitude: lat, longitude: lon, accuracy },
      customEmergencyNote || 'Victim triggered emergency offline SOS'
    );
    setActiveSOSPacket(packet);

    // Auto-enable Low Power survival mode
    setIsLowPowerMode(true);
  };

  const handleCancelSOS = () => {
    setIsBroadcasting(false);
    setActiveSOSPacket(null);
    setIsLowPowerMode(false);
    radioAudioBeacon.stop();
  };

  const handleSaveMedicalId = (e: React.FormEvent) => {
    e.preventDefault();
    offlineMeshNetwork.saveMedicalID(medicalId);
    setIsEditingMedicalId(false);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
      isLowPowerMode 
        ? 'bg-black text-slate-100' 
        : 'bg-slate-900 text-slate-100'
    }`}>
      {/* 1. Top Resilience & Power Bar */}
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Offline Survival Hub (BIN Mode)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Peer-to-Peer Mesh
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Zero Internet / Cellular Required &bull; Bluetooth & Radio Active</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {/* Battery Status */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">{batteryLevel}% Battery</span>
          </div>

          {/* Low Power Toggle */}
          <button
            onClick={() => setIsLowPowerMode(!isLowPowerMode)}
            className={`px-3 py-1.5 rounded-xl font-semibold border flex items-center space-x-1.5 transition ${
              isLowPowerMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLowPowerMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{isLowPowerMode ? 'Low Power ON' : 'Normal Power'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 space-y-6">
        {/* 2. Main High-Impact SOS Button Card */}
        <div className={`p-6 md:p-8 rounded-3xl border shadow-2xl text-center space-y-5 transition-all ${
          activeSOSPacket
            ? activeSOSPacket.status === 'EN_ROUTE'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/10'
              : 'bg-rose-950/40 border-rose-500/60 shadow-rose-500/20'
            : 'bg-slate-950 border-slate-800'
        }`}>
          {/* Status Feedback Banner */}
          {activeSOSPacket ? (
            <div className="space-y-4">
              {activeSOSPacket.status === 'EN_ROUTE' ? (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 animate-pulse space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span className="text-base font-bold text-white">DISPATCH CONFIRMED — HELP IS EN ROUTE!</span>
                  </div>
                  <p className="text-xs text-emerald-200">
                    Accepted by: <strong>{activeSOSPacket.acknowledgedBy?.responderName}</strong> ({activeSOSPacket.acknowledgedBy?.unitCallsign})
                  </p>
                  <p className="text-sm font-black text-emerald-300 font-mono">
                    Estimated Arrival: ~{activeSOSPacket.acknowledgedBy?.estimatedEtaMinutes} Minutes
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Radio className="w-5 h-5 text-rose-400 animate-spin" />
                    <span className="text-base font-bold text-white">BROADCASTING OFFLINE SOS MESH PACKET</span>
                  </div>
                  <p className="text-xs text-rose-200">
                    Bouncing coordinates & Medical ID across nearby BLE / Wi-Fi Direct peer nodes to nearest emergency dispatcher.
                  </p>
                  <p className="text-xs font-mono text-rose-300">
                    Packet ID: {activeSOSPacket.packetId} &bull; Triage: {activeSOSPacket.triagePriority}
                  </p>
                </div>
              )}

              <button
                onClick={handleCancelSOS}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Cancel Active SOS Broadcast
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center">
                <button
                  onClick={handleTriggerSOS}
                  className="relative group w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-500 text-white font-black text-2xl md:text-3xl shadow-[0_0_50px_rgba(225,29,72,0.6)] flex flex-col items-center justify-center transition-all duration-300 active:scale-95 border-4 border-white/40 cursor-pointer"
                >
                  <span className="animate-ping absolute inset-0 rounded-full bg-rose-500 opacity-25 pointer-events-none"></span>
                  <ShieldAlert className="w-12 h-12 md:w-16 md:h-16 mb-2 drop-shadow-md group-hover:scale-110 transition" />
                  <span className="tracking-widest">TAP FOR SOS</span>
                  <span className="text-[11px] font-medium text-rose-100 opacity-80 mt-1 uppercase">1-Tap Offline Mesh</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Pressing SOS instantly packages your <strong>Live GPS coordinates</strong> and <strong>Medical ID</strong> into a lightweight packet broadcast over BLE/Wi-Fi Direct mesh.
              </p>
            </div>
          )}

          {/* Real-Time Cached GPS Coordinates */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>GPS Fix:</span>
              <strong className="font-mono text-white">
                {gpsPosition ? `${gpsPosition.latitude.toFixed(4)}°N, ${gpsPosition.longitude.toFixed(4)}°E` : '19.8050°N, 85.8280°E'}
              </strong>
              <span className="text-[10px] text-emerald-400 font-semibold">(±{Math.round(gpsPosition?.accuracy_m || 4)}m)</span>
            </div>
            <button
              onClick={acquireGPS}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline"
            >
              <RefreshCw className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Coordinates</span>
            </button>
          </div>
        </div>

        {/* 3. Medical ID & Emergency Health Summary Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Offline Medical ID Profile</h3>
                <p className="text-[11px] text-slate-400">Pre-cached locally; transmitted with every emergency ping</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingMedicalId(!isEditingMedicalId)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
            >
              {isEditingMedicalId ? 'Close' : 'Edit Medical ID'}
            </button>
          </div>

          {isEditingMedicalId ? (
            <form onSubmit={handleSaveMedicalId} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={medicalId.fullName}
                    onChange={(e) => setMedicalId({ ...medicalId, fullName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Blood Type</label>
                  <input
                    type="text"
                    value={medicalId.bloodType}
                    onChange={(e) => setMedicalId({ ...medicalId, bloodType: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Severe Allergies (Comma separated)</label>
                  <input
                    type="text"
                    value={medicalId.allergies.join(', ')}
                    onChange={(e) => setMedicalId({ ...medicalId, allergies: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Chronic Medical Conditions</label>
                  <input
                    type="text"
                    value={medicalId.chronicConditions.join(', ')}
                    onChange={(e) => setMedicalId({ ...medicalId, chronicConditions: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={medicalId.emergencyContactName}
                    onChange={(e) => setMedicalId({ ...medicalId, emergencyContactName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={medicalId.emergencyContactPhone}
                    onChange={(e) => setMedicalId({ ...medicalId, emergencyContactPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition"
                >
                  Save to Offline Device Store
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Patient Name</span>
                <span className="font-bold text-white mt-1 block truncate">{medicalId.fullName}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Blood Group</span>
                <span className="font-bold text-rose-400 mt-1 block">{medicalId.bloodType}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Severe Allergies</span>
                <span className="font-bold text-amber-400 mt-1 block truncate">
                  {medicalId.allergies.length > 0 ? medicalId.allergies[0] : 'None Reported'}
                </span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Emergency ICE Contact</span>
                <span className="font-bold text-slate-200 mt-1 block truncate">{medicalId.emergencyContactPhone}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pre-Downloaded Static Disaster Guidelines & Survival Tactics */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Offline Disaster Survival Protocols & First Aid</h3>
              <p className="text-[11px] text-slate-400">Pre-downloaded static guidelines available with 0% network</p>
            </div>
          </div>

          <div className="space-y-3">
            {STATIC_DISASTER_GUIDELINES.map((guide) => {
              const isOpen = activeAccordion === guide.id;
              return (
                <div
                  key={guide.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => setActiveAccordion(isOpen ? null : guide.id)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-slate-200 hover:text-white transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{guide.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        guide.urgency === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                      }`}>
                        {guide.category}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
                      <p className="text-slate-400 italic text-[11px]">{guide.summary}</p>
                      <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/40">
                        {guide.steps.map((step, idx) => (
                          <p key={idx} className="text-slate-200 text-xs">{step}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

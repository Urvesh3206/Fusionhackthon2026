import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, MapPin, Heart, AlertTriangle, Phone, 
  BatteryCharging, Moon, Sun, CheckCircle2, Radio, Volume2,
  ChevronDown, ChevronUp, BookOpen, User, RefreshCw, Send, 
  Activity, Compass, Shield, Clock, Crosshair, Network
} from 'lucide-react';
import { useWebRTCMesh } from '../../hooks/useWebRTCMesh';
import { 
  getMedicalIDRecord, 
  saveMedicalIDRecord, 
  cacheLastKnownGPS, 
  getLastKnownGPS,
  MedicalIDRecord 
} from '../../services/db/medicalIdDB';
import { STATIC_DISASTER_GUIDELINES, OfflineSOSPacket } from '../../services/offlineMeshNetwork';
import { radioAudioBeacon } from '../../services/radioAudioBeacon';

export const PatientSOSDashboard: React.FC = () => {
  const { peerId, isReady, connectionMode, lastAckPacket, sendSOSPacket } = useWebRTCMesh('PATIENT');

  const [medicalId, setMedicalId] = useState<MedicalIDRecord | null>(null);
  const [gpsPosition, setGpsPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [activeSOSPacket, setActiveSOSPacket] = useState<OfflineSOSPacket | null>(null);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('g-cpr');
  const [isEditingMedicalId, setIsEditingMedicalId] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(85);

  // 1. Load Medical ID & Last Known GPS from IndexedDB
  useEffect(() => {
    getMedicalIDRecord().then(setMedicalId);
    getLastKnownGPS().then((pos) => {
      if (pos) {
        setGpsPosition({ latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy });
      }
    });
  }, []);

  // 2. Hardware GPS Polling & IndexedDB Caching
  useEffect(() => {
    pollGPS();
    const timer = setInterval(() => {
      pollGPS();
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // 3. Battery Status API
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

  // 4. Update Acknowledgment Status when Admin accepts
  useEffect(() => {
    if (lastAckPacket) {
      setActiveSOSPacket(lastAckPacket);
    }
  }, [lastAckPacket]);

  const pollGPS = () => {
    if ('geolocation' in navigator) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 5)
          };
          setGpsPosition(coords);
          cacheLastKnownGPS(coords.latitude, coords.longitude, coords.accuracy);
          setIsGpsLoading(false);
        },
        () => {
          setIsGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  const handleTriggerSOS = async () => {
    // Play acoustic radio beacon sound
    radioAudioBeacon.playLoRaChirp();

    const record = medicalId || await getMedicalIDRecord();
    const lat = gpsPosition?.latitude || 19.8050;
    const lon = gpsPosition?.longitude || 85.8280;
    const accuracy = gpsPosition?.accuracy || 5;

    // Check for high risk conditions in Medical ID for automatic triage
    const hasSevereAllergy = record.allergies.some(a => a.toLowerCase().includes('anaphylaxis') || a.toLowerCase().includes('severe'));
    const isCritical = hasSevereAllergy || record.chronicConditions.some(c => c.toLowerCase().includes('asthma') || c.toLowerCase().includes('cardiac'));

    const packet: OfflineSOSPacket = {
      packetId: `SOS-P2P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      senderId: peerId || `patient-${Date.now().toString().slice(-5)}`,
      senderName: record.fullName,
      senderRole: 'PATIENT',
      location: {
        latitude: lat,
        longitude: lon,
        accuracy,
        timestamp: Date.now()
      },
      medicalId: {
        fullName: record.fullName,
        bloodType: record.bloodType,
        allergies: record.allergies,
        chronicConditions: record.chronicConditions,
        medications: record.medications,
        emergencyContactName: record.emergencyContactName,
        emergencyContactPhone: record.emergencyContactPhone,
        notes: record.notes
      },
      triagePriority: isCritical ? 'CRITICAL_RED' : 'URGENT_YELLOW',
      triageReason: isCritical ? 'Automated Triage: High-Risk Medical ID Alert' : 'Emergency Assistance Requested',
      status: 'BROADCASTING',
      meshHopCount: 1
    };

    setActiveSOSPacket(packet);
    sendSOSPacket(packet);
    setIsLowPowerMode(true);
  };

  const handleCancelSOS = () => {
    setActiveSOSPacket(null);
    setIsLowPowerMode(false);
    radioAudioBeacon.stop();
  };

  const handleSaveMedicalId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalId) return;
    const saved = await saveMedicalIDRecord(medicalId);
    setMedicalId(saved);
    setIsEditingMedicalId(false);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
      isLowPowerMode ? 'bg-black text-slate-100' : 'bg-slate-900 text-slate-100'
    }`}>
      {/* 1. Header & P2P Mesh Resilience Bar */}
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Patient SOS Hub (WebRTC DataChannel P2P)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PWA Offline Ready
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Peer ID: <span className="font-mono text-cyan-400">{peerId || 'Initializing...'}</span> &bull; Mode: <strong className="text-emerald-400">{connectionMode}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">{batteryLevel}% Battery</span>
          </div>

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
        {/* 2. Primary 1-Tap SOS Button */}
        <div className={`p-6 md:p-8 rounded-3xl border shadow-2xl text-center space-y-5 transition-all ${
          activeSOSPacket
            ? activeSOSPacket.status === 'EN_ROUTE'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/10'
              : 'bg-rose-950/40 border-rose-500/60 shadow-rose-500/20'
            : 'bg-slate-950 border-slate-800'
        }`}>
          {activeSOSPacket ? (
            <div className="space-y-4">
              {activeSOSPacket.status === 'EN_ROUTE' ? (
                <div className="p-5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 animate-pulse space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    <span className="text-lg font-black text-white">HELP IS EN ROUTE — STAY CALM</span>
                  </div>
                  <p className="text-xs text-emerald-200">
                    Dispatch confirmed by <strong>{activeSOSPacket.acknowledgedBy?.responderName || 'Emergency Response Team'}</strong>
                  </p>
                  <p className="text-sm font-black text-emerald-300 font-mono">
                    Unit: {activeSOSPacket.acknowledgedBy?.unitCallsign || 'ALS Ambulance #04'} &bull; ETA: ~{activeSOSPacket.acknowledgedBy?.estimatedEtaMinutes || 5} min
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Radio className="w-5 h-5 text-rose-400 animate-spin" />
                    <span className="text-base font-bold text-white">EMERGENCY SOS BROADCASTING VIA WEBRTC DATACHANNEL</span>
                  </div>
                  <p className="text-xs text-rose-200">
                    Your Medical ID & coordinates are actively transmitting over direct P2P mesh to Admin Triage.
                  </p>
                </div>
              )}

              <button
                onClick={handleCancelSOS}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Cancel Emergency Broadcast
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
                  <span className="tracking-widest">SOS EMERGENCY</span>
                  <span className="text-[11px] font-medium text-rose-100 opacity-80 mt-1 uppercase">Direct WebRTC P2P</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Pressing SOS queries your browser GPS and retrieves your <strong>Medical ID</strong> from <strong>IndexedDB</strong> to transmit an instant encrypted alert.
              </p>
            </div>
          )}

          {/* Cached GPS Coordinates Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>Current GPS Fix:</span>
              <strong className="font-mono text-white">
                {gpsPosition ? `${gpsPosition.latitude.toFixed(4)}°N, ${gpsPosition.longitude.toFixed(4)}°E` : '19.8050°N, 85.8280°E'}
              </strong>
              <span className="text-[10px] text-emerald-400 font-semibold">(±{gpsPosition?.accuracy || 5}m accuracy)</span>
            </div>
            <button
              onClick={pollGPS}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline"
            >
              <RefreshCw className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Coordinates</span>
            </button>
          </div>
        </div>

        {/* 3. IndexedDB Medical ID Profile Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">IndexedDB Medical ID Store</h3>
                <p className="text-[11px] text-slate-400">Persistently stored on-device; transmitted with emergency packet</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingMedicalId(!isEditingMedicalId)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
            >
              {isEditingMedicalId ? 'Close Editor' : 'Edit Medical ID'}
            </button>
          </div>

          {isEditingMedicalId && medicalId ? (
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
                  <label className="font-semibold text-slate-300 block mb-1">Chronic Conditions</label>
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
                  Save to IndexedDB Store
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Patient Name</span>
                <span className="font-bold text-white mt-1 block truncate">{medicalId?.fullName}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Blood Group</span>
                <span className="font-bold text-rose-400 mt-1 block">{medicalId?.bloodType}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Severe Allergies</span>
                <span className="font-bold text-amber-400 mt-1 block truncate">
                  {medicalId?.allergies.length ? medicalId.allergies[0] : 'None Reported'}
                </span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">ICE Contact</span>
                <span className="font-bold text-slate-200 mt-1 block truncate">{medicalId?.emergencyContactPhone}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pre-Cached Disaster Guidelines Accordion */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">PWA Pre-Cached Survival & First Aid Guidelines</h3>
              <p className="text-[11px] text-slate-400">Available completely offline with zero active internet</p>
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

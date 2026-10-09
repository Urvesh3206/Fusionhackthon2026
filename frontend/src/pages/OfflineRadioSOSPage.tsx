import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Radio, WifiOff, Wifi, Volume2, VolumeX, ShieldAlert, 
  Compass, Navigation, Activity, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Truck, Hospital, Play, Square, RefreshCw, 
  Zap, ArrowRight, Signal, Info, Send, Crosshair, HelpCircle
} from 'lucide-react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { RadioSOSBeacon, TriangulationNode } from '../types';
import { radioAudioBeacon } from '../services/radioAudioBeacon';
import { createNewRadioBeacon, computeTriangulation } from '../services/offlineRadioMesh';

export const OfflineRadioSOSPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, isOfflineNetworkCrash, setOfflineNetworkCrash,
    radioBeacons, addRadioBeacon, updateRadioBeaconStatus,
    selectedRadioBeaconId, setSelectedRadioBeacon,
    activeRadioFrequencyMHz, setActiveRadioFrequency,
    addOverride
  } = useEmergencyStore();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedModulation, setSelectedModulation] = useState<'AFSK_1200' | 'LORA_CHIRP' | 'CW_MORSE' | 'VHF_FM'>('AFSK_1200');
  const [emergencyType, setEmergencyType] = useState<RadioSOSBeacon['emergency_type']>('FLOOD_TRAPPED');
  const [priority, setPriority] = useState<RadioSOSBeacon['priority']>('CRITICAL_RED');
  const [beaconSentSuccess, setBeaconSentSuccess] = useState(false);
  const [radarAngle, setRadarAngle] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Selected beacon or fallback to first
  const activeBeacon = radioBeacons.find(b => b.id === selectedRadioBeaconId) || radioBeacons[0] || null;

  // Animate Radar Sweeper
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Animate Canvas Oscilloscope
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const draw = () => {
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, width, height);

      // Draw Tactical Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Center Line
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw Sine / AFSK Waveform
      ctx.strokeStyle = isPlayingAudio ? '#06b6d4' : '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = isPlayingAudio ? '#06b6d4' : '#10b981';

      ctx.beginPath();
      const amplitude = isPlayingAudio ? 28 : (isOfflineNetworkCrash ? 14 : 6);
      const freqMultiplier = isPlayingAudio ? 0.08 : 0.03;

      for (let x = 0; x < width; x++) {
        const y = (height / 2) + Math.sin(x * freqMultiplier + time * 4) * amplitude * Math.cos(x * 0.01);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlayingAudio, isOfflineNetworkCrash]);

  // Audio Playback handler
  const handleToggleAudioTone = () => {
    if (isPlayingAudio) {
      radioAudioBeacon.stop();
      setIsPlayingAudio(false);
    } else {
      if (selectedModulation === 'AFSK_1200') {
        radioAudioBeacon.playAFSKBurst(4.0);
      } else if (selectedModulation === 'LORA_CHIRP') {
        radioAudioBeacon.playLoRaChirp();
      } else {
        radioAudioBeacon.playMorseSOS();
      }
      setIsPlayingAudio(true);
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 4000);
    }
  };

  // Broadcast Offline Radio SOS
  const handleTransmitOfflineSOS = () => {
    // Determine location (browser live location or simulated Puri sector)
    const userLocation: [number, number] = [85.8312 + (Math.random() - 0.5) * 0.015, 19.8135 + (Math.random() - 0.5) * 0.015];
    
    // Play sound burst
    if (selectedModulation === 'AFSK_1200') {
      radioAudioBeacon.playAFSKBurst(2.5);
    } else if (selectedModulation === 'LORA_CHIRP') {
      radioAudioBeacon.playLoRaChirp();
    } else {
      radioAudioBeacon.playMorseSOS();
    }
    setIsPlayingAudio(true);
    setTimeout(() => setIsPlayingAudio(false), 3000);

    const newBeacon = createNewRadioBeacon({
      senderName: currentUser.full_name,
      senderRole: currentUser.role,
      location: userLocation,
      emergencyType,
      priority,
      frequencyMHz: activeRadioFrequencyMHz,
      modulation: selectedModulation,
      notes: `Offline Radio Beacon emitted on ${activeRadioFrequencyMHz} MHz during simulated cellular grid blackout.`
    });

    addRadioBeacon(newBeacon);
    setBeaconSentSuccess(true);

    addOverride({
      id: `rad_override_${Date.now()}`,
      recommendation_id: newBeacon.beacon_code,
      recommendation_type: 'RADIO_FREQUENCY_SOS',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'OFFLINE_RADIO_BEACON_TRANSMITTED',
      system_recommended_id: 'node_dhh_mast',
      dispatcher_chosen_id: newBeacon.assigned_ambulance_id || 'AMB-108-PURI-01',
      justification_reason: `Zero-Network SOS emitted on ${activeRadioFrequencyMHz} MHz. Triangulated from 3 receiver towers.`
    });

    setTimeout(() => setBeaconSentSuccess(false), 4000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
      
      {/* 1. Header Banner & Grid Blackout Toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl text-white font-black text-2xl flex-shrink-0 ${
              isOfflineNetworkCrash ? 'bg-amber-600 shadow-amber-600/30' : 'bg-cyan-600 shadow-cyan-600/30'
            }`}>
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Offline Emergency Radio Frequency (RF) & Triangulation
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isOfflineNetworkCrash 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isOfflineNetworkCrash ? '⚡ GRID BLACKOUT (RADIO MODE)' : 'CELLULAR STANDBY'}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                When mobile towers, internet, and electricity collapse during a severe cyclone, ResQGrid broadcasts encoded distress packets over VHF (156.800 MHz) and LoRa (433.920 MHz). Ambulances and hospital masts perform Direction Finding (RDF) to triangulate and navigate to the patient.
              </p>
            </div>
          </div>

          {/* Network Breaker Simulator Switch */}
          <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 flex-shrink-0">
            <button
              onClick={() => setOfflineNetworkCrash(false)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                !isOfflineNetworkCrash ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>4G/5G Online</span>
            </button>
            <button
              onClick={() => setOfflineNetworkCrash(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                isOfflineNetworkCrash ? 'bg-amber-600 text-white shadow-md animate-pulse' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <WifiOff className="w-4 h-4" />
              <span>Cut Network (Offline)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Three Main Tactical Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMN 1: Citizen Offline Radio Beacon Transmitter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-base text-slate-100">1. Citizen RF Transmitter</h2>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                PWA In-Browser Node
              </span>
            </div>

            {/* Frequency Selector */}
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Emergency Frequency Channel
                </label>
                <select
                  value={activeRadioFrequencyMHz}
                  onChange={(e) => setActiveRadioFrequency(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value={156.800}>156.800 MHz (VHF Ch-16 International Distress)</option>
                  <option value={433.920}>433.920 MHz (LoRa Mesh Disaster Channel)</option>
                  <option value={121.500}>121.500 MHz (Aviation Emergency Beacon)</option>
                  <option value={868.100}>868.100 MHz (Long-Range IoT Disaster Band)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Modulation</label>
                  <select
                    value={selectedModulation}
                    onChange={(e) => setSelectedModulation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="AFSK_1200">AFSK 1200 Baud (Bell 202)</option>
                    <option value="LORA_CHIRP">LoRa CSS (Chirp Spread)</option>
                    <option value="CW_MORSE">CW Morse SOS Tone</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Distress Type</label>
                  <select
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FLOOD_TRAPPED">Flood / Sea Surge Trapped</option>
                    <option value="MEDICAL_TRAUMA">Critical Medical Trauma</option>
                    <option value="POWER_GRID_OUTAGE">Power Outage / ICU Failure</option>
                    <option value="STRUCTURE_COLLAPSE">Structure Collapse</option>
                  </select>
                </div>
              </div>

              {/* Live Canvas Spectrum / Oscilloscope Display */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    RF Spectrum / Oscilloscope
                  </span>
                  <button
                    onClick={handleToggleAudioTone}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isPlayingAudio ? 'Mute Tone' : 'Test Audio Chirp'}</span>
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={90}
                  className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Transmit Button */}
          <div className="pt-4 space-y-2">
            {beaconSentSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>RF Distress Packet Emitted & Triangulated!</span>
              </div>
            )}

            <button
              onClick={handleTransmitOfflineSOS}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm shadow-xl shadow-red-600/30 transition flex items-center justify-center space-x-2 active:scale-95 border border-red-500/40"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span>TRANSMIT OFFLINE RADIO SOS BEACON</span>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Broadcasts acoustic chirp & radio packet without requiring Internet, Cellular, or Wi-Fi.
            </p>
          </div>
        </div>

        {/* COLUMN 2: Ambulance Mobile Direction Finding (RDF) Radar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-slate-100">2. Ambulance RDF Radar</h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              AMB-108-DF-01
            </span>
          </div>

          {/* Tactical 360 Degree Circular Compass Radar */}
          <div className="relative w-56 h-56 mx-auto rounded-full bg-slate-950 border-2 border-emerald-500/40 flex items-center justify-center shadow-inner shadow-emerald-500/10 overflow-hidden">
            {/* Concentric distance rings */}
            <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20"></div>
            <div className="absolute w-32 h-32 rounded-full border border-emerald-500/25"></div>
            <div className="absolute w-16 h-16 rounded-full border border-emerald-500/30"></div>

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-emerald-500/20"></div>
            <div className="absolute h-full w-[1px] bg-emerald-500/20"></div>

            {/* Rotating Radar Sweep Line */}
            <div 
              className="absolute w-full h-full rounded-full origin-center pointer-events-none"
              style={{
                transform: `rotate(${radarAngle}deg)`,
                background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.35) 0deg, transparent 60deg, transparent 360deg)'
              }}
            ></div>

            {/* Target Blip (Patient Beacon) */}
            {activeBeacon && (
              <div 
                className="absolute w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] font-black animate-ping"
                style={{
                  top: '32%',
                  left: '68%'
                }}
              ></div>
            )}
            {activeBeacon && (
              <div 
                className="absolute w-3.5 h-3.5 rounded-full bg-red-500 border border-white shadow-lg shadow-red-500/80"
                style={{
                  top: '32%',
                  left: '68%'
                }}
              ></div>
            )}

            {/* Center Vehicle Reticle */}
            <div className="relative z-10 w-4 h-4 rounded-full bg-emerald-400 border border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
            </div>

            {/* Compass Headings */}
            <span className="absolute top-1 text-[9px] font-bold font-mono text-emerald-400">N (000°)</span>
            <span className="absolute right-1.5 text-[9px] font-bold font-mono text-emerald-400">E</span>
            <span className="absolute bottom-1 text-[9px] font-bold font-mono text-emerald-400">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold font-mono text-emerald-400">W</span>
          </div>

          {/* Telemetry Metrics */}
          {activeBeacon ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Bearing Azimuth:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {activeBeacon.triangulation_nodes[1]?.bearing_deg || 42}° NE
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Estimated Distance:</span>
                  <span className="font-mono font-black text-cyan-400 text-sm">
                    {activeBeacon.triangulation_nodes[1]?.distance_estimate_m || 1120} meters
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Signal Strength (RSSI):</span>
                  <span className="font-mono font-bold text-slate-200">
                    {activeBeacon.rssi_dbm} dBm (SNR {activeBeacon.snr_db} dB)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  LOCKED ON
                </span>
              </div>

              <button
                onClick={() => navigate('/map')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>Engage RDF Vector Route on Map</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Awaiting active radio frequency distress signal...
            </p>
          )}
        </div>

        {/* COLUMN 3: Hospital Base Station Waterfall & Triangulation Console */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Hospital className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-base text-slate-100">3. Hospital Triangulation Base</h2>
            </div>
            <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
              Puri DHH Mast #01
            </span>
          </div>

          {activeBeacon ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-purple-300 text-sm">{activeBeacon.beacon_code}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                    {activeBeacon.priority.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  <span className="font-semibold text-slate-400">Sender:</span> {activeBeacon.sender_name}
                </p>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>Assumed Coords:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {activeBeacon.assumed_location[1].toFixed(4)}° N, {activeBeacon.assumed_location[0].toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Multilateration Accuracy:</span>
                  <span className="font-bold text-emerald-400">{activeBeacon.triangulation_confidence_pct}% Confidence</span>
                </div>
              </div>

              {/* Triangulation Receiving Nodes List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Listening Receiver Stations ({activeBeacon.triangulation_nodes.length})
                </span>

                {activeBeacon.triangulation_nodes.map((node) => (
                  <div key={node.node_id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block truncate w-44">{node.node_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Bearing: {node.bearing_deg}° &bull; Dist: {node.distance_estimate_m}m
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 text-[11px]">
                      {node.rssi_dbm} dBm
                    </span>
                  </div>
                ))}
              </div>

              {/* Dispatch Action */}
              <button
                onClick={() => {
                  updateRadioBeaconStatus(activeBeacon.id, 'AMBULANCE_DISPATCHED');
                  navigate('/dispatch');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm Ambulance Dispatch to Radio Location</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              No beacon selected. Select or emit a beacon on the left.
            </p>
          )}
        </div>

      </div>

      {/* 3. Active Offline Radio Distress Ledger Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Signal className="w-4 h-4 text-cyan-400" />
              <span>Offline Radio Frequency Distress Ledger (Puri Coastal Mesh)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Persisted in local browser storage; operates seamlessly during complete grid & ISP collapses.
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-cyan-300">
            {radioBeacons.length} Signals Intercepted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code / Channel</th>
                <th className="py-3 px-4">Sender & Role</th>
                <th className="py-3 px-4">Modulation & RF</th>
                <th className="py-3 px-4">Signal RSSI</th>
                <th className="py-3 px-4">Triangulated Coordinates</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {radioBeacons.map((b) => {
                const isCur = b.id === (activeBeacon?.id || '');
                return (
                  <tr key={b.id} className={`hover:bg-slate-800/50 transition ${isCur ? 'bg-cyan-500/10' : ''}`}>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-cyan-300 block">{b.beacon_code}</span>
                      <span className="text-[10px] text-slate-400">{b.channel_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-200 block">{b.sender_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{b.sender_role}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span>{b.frequency_mhz.toFixed(3)} MHz</span>
                      <span className="text-[10px] text-slate-400 block">{b.modulation}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {b.rssi_dbm} dBm
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {b.assumed_location[1].toFixed(4)}° N, {b.assumed_location[0].toFixed(4)}° E
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'AMBULANCE_DISPATCHED' ? 'bg-emerald-500/20 text-emerald-300' :
                        b.status === 'TRIANGULATING' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRadioBeacon(b.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
                      >
                        Select Radar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

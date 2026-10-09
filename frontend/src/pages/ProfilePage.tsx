import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Stethoscope, Users, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Hospital, Truck, Activity, Lock, Unlock, 
  ArrowRight, ShieldCheck, BatteryCharging, Send, RefreshCw,
  Clock, Award, Zap, FileText, Check, ChevronRight, Navigation,
  Radio, Smartphone, Cloud, Globe, ExternalLink, Copy, Volume2, 
  VolumeX, AlertCircle, Sparkles, LocateFixed
} from 'lucide-react';
import { useEmergencyStore, DEMO_USER_PROFILES } from '../stores/useEmergencyStore';
import { UserRole } from '../types';
import { crossDeviceAlertSync, CitizenSOSAlert } from '../services/crossDeviceAlertSync';
import { communicationManager } from '../services/communication/CommunicationManager';
import { getRealGPSPosition, RealGPSPosition } from '../services/offlineGPS';
import { radioAudioBeacon } from '../services/radioAudioBeacon';
import { offlineMeshNetwork, OfflineSOSPacket } from '../services/offlineMeshNetwork';
import { UserProfileDashboard } from '../components/profile/UserProfileDashboard';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, switchRole, state, 
    addOverride 
  } = useEmergencyStore();

  // Local state for interactive role demos
  const [sosSent, setSosSent] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [citizenReportText, setCitizenReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [bedUpdateSuccess, setBedUpdateSuccess] = useState(false);
  const [powerMode, setPowerMode] = useState<'normal' | 'generator' | 'critical'>('normal');
  const [selectedWard, setSelectedWard] = useState('icu');
  const [triageAccepted, setTriageAccepted] = useState<Record<string, boolean>>({});
  const [replanTriggered, setReplanTriggered] = useState(false);

  // Cross-device alert & offline mesh state
  const [incomingAlerts, setIncomingAlerts] = useState<CitizenSOSAlert[]>([]);
  const [liveSOSPackets, setLiveSOSPackets] = useState<OfflineSOSPacket[]>(() => offlineMeshNetwork.getStoredPackets());
  const [lastDispatchedAlertId, setLastDispatchedAlertId] = useState<string | null>(null);
  const [gpsPosition, setGpsPosition] = useState<RealGPSPosition | null>(null);
  const [copiedTunnelCmd, setCopiedTunnelCmd] = useState(false);

  // Subscribe to real-time incoming alerts across devices
  useEffect(() => {
    const unsub = crossDeviceAlertSync.subscribe((alerts) => {
      setIncomingAlerts(alerts);
    });

    const updateSOS = () => setLiveSOSPackets(offlineMeshNetwork.getStoredPackets());
    updateSOS();
    const unsubSOS = offlineMeshNetwork.subscribeToIncomingSOS(updateSOS);
    const unsubAck = offlineMeshNetwork.subscribeToAcknowledgment(updateSOS);
    const interval = setInterval(updateSOS, 2000);

    // Acquire GPS position
    getRealGPSPosition(5000).then(pos => setGpsPosition(pos)).catch(() => {});

    return () => {
      unsub();
      unsubSOS();
      unsubAck();
      clearInterval(interval);
    };
  }, []);

  // Helper for role metadata
  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'citizen':
        return {
          title: 'Citizen / Patient Profile',
          clearance: 'Tier 1: Emergency Patient Portal',
          color: 'from-sky-500 to-cyan-600',
          badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          icon: Users,
          description: 'Access patient emergency tools, real-time GPS acquisition, 1-click distress SOS, and live responder dispatch tracking.'
        };
      case 'doctor':
      case 'medical_coordinator':
        return {
          title: 'Chief Medical Officer / Doctor',
          clearance: 'Tier 2: Hospital & Medical Command',
          color: 'from-emerald-500 to-teal-600',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: Stethoscope,
          description: 'Manage ward bed capacities, ICU occupancy, incoming emergency triage patient queues, oxygen supply replenishments, and facility generator derating modes.'
        };
      case 'admin':
      default:
        return {
          title: 'EOC Director / System Admin (Team Delta)',
          clearance: 'Tier 3: Full Operational Command (God Mode)',
          color: 'from-purple-500 to-indigo-600',
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: Shield,
          description: 'Full supervisory authority over multi-agency disaster response, incoming Citizen SOS alert dispatching, AI MEXCLP replanning, and immutable audit ledgers.'
        };
    }
  };

  const roleInfo = getRoleInfo(currentUser.role);

  // If the user is logged in as a Citizen / Patient, render the dedicated, simple, stress-free Patient Dashboard!
  if (currentUser.role === 'citizen') {
    return (
      <div className="p-4 sm:p-6 animate-fade-in">
        {/* Quick Role Switcher Banner for Demo Presentations */}
        <div className="max-w-3xl mx-auto mb-4 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Active: <strong className="text-slate-200">Patient Emergency Profile</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => switchRole('admin')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-[11px] transition flex items-center space-x-1 border border-purple-500/30"
            >
              <Shield className="w-3 h-3" />
              <span>Switch to Admin Command (Device 2)</span>
            </button>
          </div>
        </div>

        <UserProfileDashboard />
      </div>
    );
  }

  // Handle Citizen SOS Trigger (Synchronizes across all devices & Admin Portal)
  const handleTriggerSOS = async (channelType: 'MULTI_CHANNEL' | 'CELLULAR_SMS' | 'OFFLINE_RADIO_MESH' = 'MULTI_CHANNEL') => {
    setSosSending(true);

    const lat = gpsPosition ? gpsPosition.latitude : 19.8135;
    const lon = gpsPosition ? gpsPosition.longitude : 85.8312;

    // 1. Play Acoustic Alert Tone
    try {
      radioAudioBeacon.playAFSKBurst(1.8);
    } catch { /* ignore */ }

    // 2. Broadcast across cross-device bus to Team Delta Admin Portal
    const alert = crossDeviceAlertSync.broadcastSOS({
      sender_name: `${currentUser.full_name} (${currentUser.username})`,
      sender_phone: '+91 98610 23456',
      sender_role: currentUser.role,
      emergency_type: 'FLOOD_TRAPPED',
      priority: 'P1_CRITICAL',
      description: 'Citizen activated 1-Click Priority Emergency SOS! Medical evacuation and ambulance dispatch requested.',
      location: [lon, lat],
      location_accuracy_m: gpsPosition ? Math.round(gpsPosition.accuracy_m) : 15,
      channel: channelType
    });

    // 3. Dispatch to multi-channel communication manager & outbox
    try {
      await communicationManager.createAndDispatchReport({
        senderId: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        emergencyType: 'FLOOD_TRAPPED',
        priority: 'P1_CRITICAL',
        description: 'Citizen activated 1-Click Priority Emergency SOS via mobile profile.',
        customLocation: [lon, lat]
      });
    } catch { /* offline fallback handled */ }

    // 4. Log Audit Override
    addOverride({
      id: `sos_${Date.now()}`,
      recommendation_id: alert.id,
      recommendation_type: 'AMBULANCE_DISPATCH',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'CITIZEN_EMERGENCY_SOS',
      system_recommended_id: 'AMB-108-PURI-01',
      dispatcher_chosen_id: 'AMB-108-PURI-01',
      justification_reason: `Citizen activated 1-Click Priority SOS via ${channelType}. Broadcasted to Admin Command Center.`
    });

    setSosSending(false);
    setSosSent(true);
    setLastDispatchedAlertId(alert.id);
  };

  // Handle Cellular SMS Launch (Mode B)
  const handleLaunchSMS = () => {
    const lat = gpsPosition ? gpsPosition.latitude.toFixed(4) : '19.8135';
    const lon = gpsPosition ? gpsPosition.longitude.toFixed(4) : '85.8312';
    const text = encodeURIComponent(`SOS: ResQGrid Emergency | FLOOD TRAPPED | P1 CRITICAL | Loc: ${lat}N, ${lon}E | User: ${currentUser.full_name}`);
    if (typeof window !== 'undefined') {
      window.location.href = `sms:108?body=${text}`;
    }
  };

  // Handle Admin Dispatching Ambulance to Citizen Alert
  const handleAdminDispatchAmbulance = (alert: CitizenSOSAlert, ambId: string = 'AMB-108-PURI-01') => {
    crossDeviceAlertSync.updateAlertStatus(alert.id, 'AMBULANCE_DISPATCHED', ambId);
    addOverride({
      id: `admin_disp_${Date.now()}`,
      recommendation_id: alert.id,
      recommendation_type: 'AMBULANCE_DISPATCH',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'ADMIN_DISPATCH_AMBULANCE_TO_CITIZEN',
      system_recommended_id: ambId,
      dispatcher_chosen_id: ambId,
      justification_reason: `Team Delta Admin dispatched ${ambId} to Citizen ${alert.sender_name} at [${alert.location[1].toFixed(4)}, ${alert.location[0].toFixed(4)}].`
    });
  };

  // Handle doctor capacity update
  const handleDoctorBedUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setBedUpdateSuccess(true);
    addOverride({
      id: `bed_mod_${Date.now()}`,
      recommendation_id: 'rec_bed_update',
      recommendation_type: 'HOSPITAL_CAPACITY',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'HOSPITAL_BED_CAPACITY_UPDATE',
      system_recommended_id: 'hosp_puri_dhh',
      dispatcher_chosen_id: 'hosp_puri_dhh',
      justification_reason: `Medical Officer updated ICU/Usable bed allocations. Power Mode set to ${powerMode.toUpperCase()}.`
    });
    setTimeout(() => setBedUpdateSuccess(false), 3000);
  };

  // Handle admin replan
  const handleAdminReplan = () => {
    setReplanTriggered(true);
    addOverride({
      id: `ai_replan_${Date.now()}`,
      recommendation_id: 'rec_admin_replan',
      recommendation_type: 'SYSTEM_OPTIMIZATION',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'ADMIN_GLOBAL_AI_REPLAN',
      system_recommended_id: 'all_subsystems',
      dispatcher_chosen_id: 'all_subsystems',
      justification_reason: 'EOC Director triggered deterministic global AI fleet reallocation and hospital load balancing.'
    });
    setTimeout(() => setReplanTriggered(false), 3000);
  };

  const copyCloudflareCmd = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('npx cloudflared tunnel --url http://localhost:5173');
      setCopiedTunnelCmd(true);
      setTimeout(() => setCopiedTunnelCmd(false), 3000);
    }
  };

  const allSystemHospitals = state?.hospitals || [];
  const totalAvailableBeds = allSystemHospitals.reduce((acc, h) => acc + (h.usable_beds - h.occupied_beds), 0);
  const pendingCitizenAlerts = incomingAlerts.filter(a => a.status === 'PENDING_DISPATCH');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-100">
      
      {/* 1. Header Banner with Profile Identity */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center space-x-5">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${roleInfo.color} flex items-center justify-center shadow-xl shadow-cyan-500/20 text-white font-black text-2xl flex-shrink-0 ring-4 ring-slate-800`}>
              {currentUser.username.includes(' ')
                ? currentUser.username.split(' ').map(w => w[0]).join('').toUpperCase()
                : currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {currentUser.full_name}
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${roleInfo.badgeBg}`}>
                  {currentUser.role === 'admin' ? 'TEAM DELTA (ADMIN)' : currentUser.role.replace('_', ' ')}
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Active & Verified</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-semibold text-slate-400">Organization:</span> {currentUser.organization}
                <span className="text-slate-600">&bull;</span>
                <span className="font-semibold text-slate-400">Clearance:</span> {roleInfo.clearance}
              </p>
              <div className="flex items-center gap-2 pt-0.5 text-xs text-cyan-300 font-mono">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  GPS: {gpsPosition ? `${gpsPosition.latitude.toFixed(4)}°N, ${gpsPosition.longitude.toFixed(4)}°E (±${Math.round(gpsPosition.accuracy_m)}m)` : '19.8135°N, 85.8312°E (Puri)'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/map')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center space-x-2 shadow-md hover:shadow-cyan-500/10"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Disaster Map</span>
            </button>
            <button
              onClick={() => navigate('/comms')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-cyan-600/20"
            >
              <Radio className="w-4 h-4" />
              <span>Multi-Channel Comms</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive 3-Way Role Switcher Bar (Citizen | Doctor | Admin) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              <span>Multi-Profile Role Access (Citizen vs. Admin)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Switch profiles to demonstrate the two-way workflow: Citizen triggers SOS on Device 1 &rarr; Team Delta Admin intercepts alert on Device 2.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Option A: Citizen / General User */}
          <button
            onClick={() => switchRole('citizen')}
            className="p-5 rounded-2xl border text-left transition-all relative overflow-hidden group bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                Switch <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-100">1. Citizen Profile (Device A)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Public access: 1-Click Priority SOS button, offline cellular SMS beacon, live nearest hospital beds, and self-triage.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Citizen Emergency Tools Ready</span>
            </div>
          </button>

          {/* Option B: Doctor / Medical Officer */}
          <button
            onClick={() => switchRole('doctor')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator'
                ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Stethoscope className="w-5 h-5" />
              </div>
              {currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE ON THIS DEVICE
                </span>
              ) : (
                <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                  Switch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-100">2. Doctor / Medical Officer</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Hospital staff: Manage bed allocations, ICU occupancy, incoming triage patient queues, and generator power modes.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Medical Ward Command Granted</span>
            </div>
          </button>

          {/* Option C: Admin / EOC Director (Team Delta) */}
          <button
            onClick={() => switchRole('admin')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              currentUser.role === 'admin'
                ? 'bg-gradient-to-b from-purple-950/60 to-slate-900 border-purple-500/60 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              {currentUser.role === 'admin' ? (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE (TEAM DELTA ADMIN)
                </span>
              ) : (
                <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                  Switch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-100">3. Admin Profile (Device B)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Team Delta EOC Command: Intercept incoming Citizen SOS alerts, dispatch ambulances with 1-click, and run AI global optimization.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-purple-400 font-medium">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Team Delta Root Command</span>
            </div>
          </button>

        </div>
      </div>

      {/* 3. Role-Specific Interactive Control Console */}
      <div className="space-y-4">
            
        {/* ──────── WORKSPACE B: DOCTOR / MEDICAL VIEW ──────── */}
        {(currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Hospital className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base text-slate-100">Doctor Ward Bed & ICU Allocator</h3>
                </div>
                <span className="text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded">
                  Puri District Hospital
                </span>
              </div>

              <form onSubmit={handleDoctorBedUpdate} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Ward Selection</label>
                    <select
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="icu">Intensive Care Unit (ICU)</option>
                      <option value="trauma">Trauma & Emergency Ward</option>
                      <option value="maternity">Maternity & Pediatric</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Free Usable Beds</label>
                    <input
                      type="number"
                      defaultValue={18}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Facility Power Mode</label>
                    <select
                      value={powerMode}
                      onChange={(e) => setPowerMode(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="normal">Grid Power Active (100% Cap)</option>
                      <option value="generator">Auxiliary Generator (80% Cap)</option>
                      <option value="critical">Critical Battery Reserve (40% Cap)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    Changes broadcast in real-time to all active ambulances and the central 108 dispatch engine.
                  </p>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{bedUpdateSuccess ? 'Capacities Updated & Synced!' : 'Commit Ward Status'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-slate-100">Inbound Triage Queue</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                  {liveSOSPackets.length} Live Packets
                </span>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {liveSOSPackets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No active inbound patient emergency calls currently.
                  </div>
                ) : (
                  liveSOSPackets.map((sos) => {
                    const isEnRoute = sos.status === 'EN_ROUTE' || triageAccepted[sos.packetId];
                    const isCrit = sos.triagePriority === 'CRITICAL_RED';

                    return (
                      <div
                        key={sos.packetId}
                        className={`p-3 rounded-xl border space-y-2 transition-all ${
                          isEnRoute 
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100' 
                            : isCrit
                            ? 'bg-rose-950/30 border-rose-500/50'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-xs font-bold block ${isCrit ? 'text-rose-400' : 'text-amber-400'}`}>
                              {isCrit ? '🚨 CRITICAL RED' : '⚡ URGENT'}: {sos.senderName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Blood: {sos.medicalId.bloodType} &bull; {new Date(sos.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isEnRoute ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {isEnRoute ? 'DISPATCHED' : 'BROADCASTING'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-tight line-clamp-2">
                          {sos.triageReason}
                        </p>

                        <div className="flex gap-2 pt-1">
                          {isEnRoute ? (
                            <div className="flex-1 py-1 text-center rounded text-[11px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Ambulance En Route</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setTriageAccepted(prev => ({ ...prev, [sos.packetId]: true }));
                                offlineMeshNetwork.acknowledgeDispatch(
                                  sos.packetId,
                                  currentUser.full_name || 'Dr. Subrat Mishra',
                                  'ALS Ambulance Unit #04'
                                );
                              }}
                              className="flex-1 py-1.5 rounded text-[11px] font-bold transition bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                            >
                              Accept & Dispatch ALS
                            </button>
                          )}
                          <button
                            onClick={() => navigate('/radio-sos')}
                            className="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                          >
                            Open Radar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──────── WORKSPACE C: ADMIN / EOC COMMAND VIEW (DEVICE B) ──────── */}
        {currentUser.role === 'admin' && (
          <div className="space-y-6">

            {/* Admin Live SOS Interceptor Radar (Incoming from Citizen Devices) */}
            <div className="bg-slate-900/90 border border-red-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-white">
                        Live Incoming Citizen SOS Alerts Feed
                      </h3>
                      {pendingCitizenAlerts.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                          {pendingCitizenAlerts.length} NEW DISTRESS SIGNAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      Real-time distress signals broadcast from citizen mobile devices (Device A) to Team Delta Admin Command (Device B).
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-cyan-300">
                  {incomingAlerts.length} Total Alerts Ingested
                </span>
              </div>

              {/* Alert Cards Feed */}
              <div className="space-y-3">
                {incomingAlerts.slice(0, 4).map((alert) => {
                  const isPending = alert.status === 'PENDING_DISPATCH';
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isPending 
                          ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-950/30 ring-1 ring-red-500/40' 
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{alert.sender_name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPending ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {alert.status.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300">
                            Channel: {alert.channel}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            🕒 {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 font-medium">
                          {alert.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-mono text-cyan-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            {alert.location[1].toFixed(4)}°N, {alert.location[0].toFixed(4)}°E (±{alert.location_accuracy_m || 10}m)
                          </span>
                          {alert.sender_phone && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              {alert.sender_phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin 1-Click Action Hub */}
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        {isPending ? (
                          <button
                            onClick={() => handleAdminDispatchAmbulance(alert, 'AMB-108-PURI-01')}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                          >
                            <Truck className="w-4 h-4" />
                            <span>1-Click Dispatch Ambulance (AMB-01)</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Dispatched ({alert.assigned_ambulance_id})</span>
                          </span>
                        )}

                        <button
                          onClick={() => navigate('/map')}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                        >
                          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Map</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Grid Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-base text-slate-100">Global AI Disaster Optimization Engine</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/30 font-mono">
                    Team Delta MEXCLP
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Supervise multi-objective ambulance coverage, re-allocate emergency beds dynamically across Puri district, and monitor road breaches.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Total Ambulances:</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">6 Units Active</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Total Usable Beds:</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{totalAvailableBeds} Open</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Target SLA:</span>
                    <span className="text-base font-bold text-purple-400 font-mono">8.4 min</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={handleAdminReplan}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${replanTriggered ? 'animate-spin' : ''}`} />
                    <span>{replanTriggered ? 'Computing Heuristic Plan...' : 'Trigger Global AI Replan'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/simulation')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                    >
                      Disaster Simulation
                    </button>
                    <button
                      onClick={() => navigate('/audit-logs')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                    >
                      Decision Audit Ledger
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-base text-slate-100">Supervisory Access Control</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-300 font-medium">PostGIS Spatial Engine</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ONLINE
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-300 font-medium">Cross-Device Alert Bus</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-300 font-medium">Deterministic Seed Control</span>
                    <span className="text-purple-400 font-mono font-bold">#FANI_PURI_2026</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center space-x-1"
                >
                  <span>Configure System Parameters</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. Cloudflare Public Mobile Access & Two-Device Testing Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Cloudflare Public Mobile Access & 2-Device Testing Hub</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono">
                  PUBLIC READY
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                How to test the two-way workflow on two separate mobile devices or laptops using Cloudflare Tunnel or local network.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-cyan-400" /> Method 1: Cloudflare Tunnel</span>
              <span className="text-[10px] text-emerald-400">Free & Instant</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Run this command in terminal to create a free public HTTPS tunnel that anyone can open on mobile phones:
            </p>
            <div className="p-2 bg-slate-900 rounded-lg font-mono text-[10px] text-cyan-300 flex items-center justify-between">
              <span className="truncate">npx cloudflared tunnel --url http://localhost:5173</span>
              <button
                onClick={copyCloudflareCmd}
                className="ml-2 text-slate-400 hover:text-white flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {copiedTunnelCmd && <span className="text-[10px] text-emerald-400 block font-semibold">✓ Copied to clipboard!</span>}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-emerald-400" /> Method 2: Local Wi-Fi / Hotspot</span>
              <span className="text-[10px] text-cyan-400">0.0.0.0 Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vite dev server is bound to <code className="text-cyan-300">0.0.0.0</code>. Connect your mobile phone to the same Wi-Fi/Hotspot and open:
            </p>
            <div className="p-2 bg-slate-900 rounded-lg font-mono text-[11px] text-emerald-300 font-bold">
              http://&lt;your-computer-ip&gt;:5173/profile
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-400" /> Two-Device Test Workflow</span>
              <span className="text-[10px] text-purple-400">Step-by-Step</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Open <strong>Device 1 (Mobile)</strong> &rarr; Switch to <strong>Citizen Profile</strong> &rarr; Tap <strong className="text-red-400">Emergency SOS</strong>.</li>
              <li>Open <strong>Device 2 (Admin)</strong> &rarr; Switch to <strong>Admin Profile</strong> &rarr; Watch the alert pop up live.</li>
              <li>Click <strong className="text-emerald-400">1-Click Dispatch Ambulance</strong> to confirm!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 5. Role Access Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Two-Way Role Feature Clearance Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Overview of permissions granted for Citizen vs Doctor vs Team Delta Admin.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Feature / Operation</th>
                <th className="py-3 px-4 text-center">Citizen Profile (Device A)</th>
                <th className="py-3 px-4 text-center">Doctor Profile</th>
                <th className="py-3 px-4 text-center">Team Delta Admin (Device B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td className="py-3 px-4 text-slate-200">1-Click Emergency SOS Broadcast</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Citizen Trigger</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Trigger</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Trigger</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Real-Time Citizen SOS Interceptor Radar</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Sender Only</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Read-Only</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Intercept & 1-Click Dispatch</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Find Nearby Hospitals & Live Beds</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ View & Navigate</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Manage & View</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Supervisory</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Hospital ICU Bed & Occupancy Controller</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Read-Only</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Write / Update</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Write / Override</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Global AI Fleet Optimization & Staging</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Root Command</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

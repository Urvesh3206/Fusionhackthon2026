import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Stethoscope, Users, CheckCircle2, AlertTriangle, 
  MapPin, Phone, Hospital, Truck, Activity, Lock, Unlock, 
  ArrowRight, ShieldCheck, BatteryCharging, Send, RefreshCw,
  Clock, Award, Zap, FileText, Check, ChevronRight, Navigation
} from 'lucide-react';
import { useEmergencyStore, DEMO_USER_PROFILES } from '../stores/useEmergencyStore';
import { UserRole } from '../types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, switchRole, state, 
    addOverride 
  } = useEmergencyStore();

  // Local state for interactive role demos
  const [sosSent, setSosSent] = useState(false);
  const [citizenReportText, setCitizenReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [bedUpdateSuccess, setBedUpdateSuccess] = useState(false);
  const [powerMode, setPowerMode] = useState<'normal' | 'generator' | 'critical'>('normal');
  const [selectedWard, setSelectedWard] = useState('icu');
  const [triageAccepted, setTriageAccepted] = useState<Record<string, boolean>>({});
  const [replanTriggered, setReplanTriggered] = useState(false);

  // Helper for role metadata
  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'citizen':
        return {
          title: 'Citizen / Public Resident',
          clearance: 'Tier 1: Public Access Portal',
          color: 'from-sky-500 to-cyan-600',
          badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          icon: Users,
          description: 'Access citizen-tier emergency tools, live GPS hospital routing, real-time bed discovery, public weather advisories, and 1-click SOS ambulance summoning.'
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
          title: 'EOC Director / System Admin',
          clearance: 'Tier 3: Full Operational Command (God Mode)',
          color: 'from-purple-500 to-indigo-600',
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: Shield,
          description: 'Full supervisory authority over multi-agency disaster response, AI MEXCLP dispatch replanning, ambulance fleet staging, road closure injection, and immutable audit ledgers.'
        };
    }
  };

  const roleInfo = getRoleInfo(currentUser.role);

  // Handle citizen SOS Trigger
  const handleTriggerSOS = () => {
    setSosSent(true);
    addOverride({
      id: `sos_${Date.now()}`,
      recommendation_id: 'rec_citizen_sos',
      recommendation_type: 'AMBULANCE_DISPATCH',
      timestamp: new Date().toISOString(),
      dispatcher_id: currentUser.id,
      action: 'CITIZEN_EMERGENCY_SOS',
      system_recommended_id: 'AMB-108-PURI-01',
      dispatcher_chosen_id: 'AMB-108-PURI-01',
      justification_reason: 'Citizen activated 1-Click Priority SOS dispatch with live GPS location.'
    });
    setTimeout(() => {
      // Auto reset notification badge
    }, 4000);
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

  const allSystemHospitals = state?.hospitals || [];
  const totalAvailableBeds = allSystemHospitals.reduce((acc, h) => acc + (h.usable_beds - h.occupied_beds), 0);
  const totalIcuBeds = allSystemHospitals.reduce((acc, h) => acc + h.free_icu_beds, 0);

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
                  {currentUser.role.replace('_', ' ')}
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Active & Verified</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-semibold text-slate-400">Organization:</span> {currentUser.organization}
                <span className="text-slate-600">&bull;</span>
                <span className="font-semibold text-slate-400">Email:</span> {currentUser.email}
              </p>
              <p className="text-xs text-cyan-300/90 font-mono flex items-center gap-1.5 pt-0.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>{roleInfo.clearance}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Button to Map */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/map')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center space-x-2 shadow-md hover:shadow-cyan-500/10"
            >
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Open Live Disaster Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive 3-Way Role Switcher Bar (Citizen | Doctor | Admin) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Multi-Role Profile Switcher</span>
            </h2>
            <p className="text-xs text-slate-400">
              Demonstrate the 2-way & 3-way access workflow by switching between Citizen, Doctor, and Admin roles in 1 click.
            </p>
          </div>
          <span className="text-[11px] font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-400 border border-slate-700">
            Instant Zero-Auth Demo Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Option A: Citizen / User */}
          <button
            onClick={() => switchRole('citizen')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              currentUser.role === 'citizen'
                ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-500/60 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              {currentUser.role === 'citizen' ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE PROFILE
                </span>
              ) : (
                <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                  Switch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-100">1. Citizen / General User</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              For public residents: 1-Click SOS emergency dispatch, live nearest open bed search, and safe high-elevation evacuation routing.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Public Tools Access Granted</span>
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
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE PROFILE
                </span>
              ) : (
                <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                  Switch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-100">2. Doctor / Medical Officer</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              For hospital staff: Hospital Bed & ICU occupancy controls, generator derating toggles, incoming triage queue acceptance, and supply orders.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Medical Ward Command Granted</span>
            </div>
          </button>

          {/* Option C: Admin / EOC Director */}
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
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE PROFILE
                </span>
              ) : (
                <span className="text-slate-500 text-xs group-hover:text-slate-300 transition flex items-center gap-1">
                  Switch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-100">3. Admin (Team Delta Command)</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Full Master Control: AI Global Replan (MEXCLP), ambulance fleet redeployment, road network closure injection, and decision ledger audit.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-purple-400 font-medium">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Unrestricted Root Clearance</span>
            </div>
          </button>

        </div>
      </div>

      {/* 3. Dynamic Interactive Role Portal Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>Role-Specific Interactive Control Console</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live operational tools uniquely enabled for the <span className="text-cyan-300 font-bold">{currentUser.role.toUpperCase()}</span> clearance level.
            </p>
          </div>
        </div>

        {/* WORKSPACE A: CITIZEN VIEW */}
        {currentUser.role === 'citizen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Citizen Tool 1: 1-Click Priority SOS */}
            <div className="lg:col-span-1 bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center space-x-2 text-red-400 mb-3">
                  <Phone className="w-5 h-5 animate-bounce" />
                  <h3 className="font-bold text-base text-red-200">1-Click Emergency SOS</h3>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Summon the closest available ALS/BLS 108 ambulance to your current GPS coordinates. Prioritized by the AI triage engine.
                </p>

                {sosSent ? (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs space-y-2 mb-4 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>SOS Dispatch Transmitted!</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Ambulance <span className="font-mono text-emerald-300 font-bold">AMB-108-PURI-01</span> has been dispatched. ETA: ~6.2 mins.
                    </p>
                    <button
                      onClick={() => navigate('/map')}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                    >
                      Track Ambulance on Map
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 mb-4">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Live GPS Telemetry:</span>
                      <span className="font-mono text-cyan-400 font-bold">19.8135° N, 85.8312° E</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Nearest Station:</span>
                      <span className="text-slate-200">Puri Grand Road Post</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleTriggerSOS}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition flex items-center justify-center space-x-2 active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>{sosSent ? 'Dispatch Triggered (Send Again)' : 'SUMMON EMERGENCY AMBULANCE'}</span>
              </button>
            </div>

            {/* Citizen Tool 2: Nearby Hospital Bed Availability */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Hospital className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-base text-slate-100">Nearby Hospitals & Live Available Beds</h3>
                </div>
                <button 
                  onClick={() => navigate('/hospitals')}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Full Hospital Directory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allSystemHospitals.slice(0, 4).map((h) => {
                  const freeGeneral = Math.max(0, h.usable_beds - h.occupied_beds);
                  const isPowerOk = h.has_power;
                  return (
                    <div key={h.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-bold text-xs text-slate-200 truncate">{h.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPowerOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isPowerOk ? 'Power Active' : 'Generator'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] my-2">
                        <div className="p-1.5 rounded bg-slate-900 text-slate-300">
                          <span className="text-slate-400 block text-[10px]">Open Beds:</span>
                          <span className="font-bold text-cyan-300 text-xs">{freeGeneral} Available</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900 text-slate-300">
                          <span className="text-slate-400 block text-[10px]">ICU Beds:</span>
                          <span className="font-bold text-emerald-300 text-xs">{h.free_icu_beds} Free</span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/map')}
                        className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition flex items-center justify-center gap-1"
                      >
                        <Navigation className="w-3 h-3 text-cyan-400" />
                        <span>Navigate from My Location</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Citizen Hazard Report Form */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Report a local road blockage or flooded causeway to EOC..."
                  value={citizenReportText}
                  onChange={(e) => setCitizenReportText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => {
                    if (citizenReportText.trim()) {
                      setReportSubmitted(true);
                      setCitizenReportText('');
                      setTimeout(() => setReportSubmitted(false), 3000);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{reportSubmitted ? 'Report Lodged!' : 'Send Alert'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE B: DOCTOR / MEDICAL VIEW */}
        {(currentUser.role === 'doctor' || currentUser.role === 'medical_coordinator') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Doctor Tool 1: Live Bed & ICU Allocation Management */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Hospital className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base text-slate-100">Hospital Ward & ICU Capacity Controller</h3>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Puri District Hospital #01
                </span>
              </div>

              <form onSubmit={handleDoctorBedUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Ward Selection</label>
                    <select 
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="icu">Critical Care ICU (18 Beds)</option>
                      <option value="trauma">Trauma Emergency Unit (25 Beds)</option>
                      <option value="cyclone">Cyclone Flood Overflow Ward (40 Beds)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Power Grid / Derating Status</label>
                    <select 
                      value={powerMode}
                      onChange={(e) => setPowerMode(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="normal">100% Primary Grid Power</option>
                      <option value="generator">75% Diesel Generator Mode</option>
                      <option value="critical">50% Emergency Critical Derated</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Oxygen & Medical Gas Reserve</label>
                    <div className="flex items-center space-x-2 pt-1">
                      <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[84%]"></div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">84% (Adequate)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
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

            {/* Doctor Tool 2: Incoming Ambulance Triage Queue */}
            <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base text-slate-100">Inbound Triage Queue</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                  2 En Route
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-rose-400 block">RED Priority: Severe Head Trauma</span>
                      <span className="text-[10px] text-slate-400 font-mono">AMB-108-PURI-01 &bull; ETA 4 min</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                      ALS Unit
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTriageAccepted(prev => ({ ...prev, p1: true }))}
                      className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${
                        triageAccepted.p1 ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {triageAccepted.p1 ? '✓ Bed Reserved' : 'Accept to ICU'}
                    </button>
                    <button
                      onClick={() => navigate('/dispatch')}
                      className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Reroute
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">YELLOW: Respiratory Distress</span>
                      <span className="text-[10px] text-slate-400 font-mono">AMB-108-PURI-03 &bull; ETA 9 min</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      BLS Unit
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTriageAccepted(prev => ({ ...prev, p2: true }))}
                      className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${
                        triageAccepted.p2 ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {triageAccepted.p2 ? '✓ Bed Reserved' : 'Accept to Ward'}
                    </button>
                    <button
                      onClick={() => navigate('/dispatch')}
                      className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Reroute
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE C: ADMIN / EOC COMMAND VIEW */}
        {currentUser.role === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Admin Tool 1: AI Global Optimization & Replan */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-base text-slate-100">Global AI Disaster Optimization Engine</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/30">
                  MEXCLP & PostGIS Solvers
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Recompute multi-objective ambulance coverage, evaluate flood hazard propagation across NH-316 & Marine Drive, and optimize bed equity across all Puri medical centers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Ambulances:</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">6 Units (5 Active)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Usable Beds:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{totalAvailableBeds} Open</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Target SLA (Mean ETA):</span>
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

            {/* Admin Tool 2: System Health & Security Clearance */}
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
                  <span className="text-slate-300 font-medium">Odisha 108 CAD Integration</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> LINKED
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
        )}
      </div>

      {/* 4. Permissions & Role Access Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Two-Way & Three-Way Role Feature Clearance Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Overview of permissions granted for each user profile tier in this demonstration environment.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Feature / Operation</th>
                <th className="py-3 px-4 text-center">Citizen Profile</th>
                <th className="py-3 px-4 text-center">Doctor Profile</th>
                <th className="py-3 px-4 text-center">Admin / EOC Director</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td className="py-3 px-4 text-slate-200">1-Click SOS Priority Dispatch</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Access</td>
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
                <td className="py-3 px-4 text-slate-200">Inbound Ambulance Triage Acceptance</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Accept / Triage</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Master Override</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Power Grid / Generator Derating Mode</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Toggle Mode</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Full Override</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Global AI Fleet Optimization & Staging</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-slate-500">✗ Restricted</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Root Command</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-slate-200">Disaster Scenario Simulation & Road Breaches</td>
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

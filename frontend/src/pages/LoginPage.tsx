import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, LogIn, CheckCircle, Lock, User, ArrowRight, 
  Shield, Users, Phone, Navigation, Award, Stethoscope, Sparkles
} from 'lucide-react';
import { useEmergencyStore, DEMO_USER_PROFILES } from '../stores/useEmergencyStore';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useEmergencyStore();

  // Active selected login portal mode ('patient' | 'admin' | 'doctor')
  const [selectedPortal, setSelectedPortal] = useState<'patient' | 'admin' | 'doctor'>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');
  const [authError, setAuthError] = useState<string | null>(null);

  const handlePortalSwitch = (portal: 'patient' | 'admin' | 'doctor') => {
    setSelectedPortal(portal);
    setAuthError(null);
    if (portal === 'patient') {
      setUsername('patient');
    } else if (portal === 'doctor') {
      setUsername('doctor');
    } else {
      setUsername('admin');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const userKey = username.toLowerCase().trim();
    if (selectedPortal === 'admin' && userKey === 'patient') {
      setAuthError('Access Denied: Patient accounts cannot access the Admin Response Team portal.');
      return;
    }

    let roleKey: UserRole = 'admin';
    if (selectedPortal === 'patient' || userKey === 'patient' || userKey === 'citizen') {
      roleKey = 'citizen';
    } else if (selectedPortal === 'doctor' || userKey === 'doctor' || userKey === 'medical') {
      roleKey = 'doctor';
    } else {
      roleKey = 'admin';
    }

    switchRole(roleKey);
    navigate(roleKey === 'citizen' ? '/profile' : '/');
  };

  const handleQuickLogin = (role: UserRole) => {
    switchRole(role);
    navigate(role === 'citizen' ? '/profile' : '/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 md:p-8 z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            ResQGrid AI
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Dual-Profile Disaster Response & Emergency Dispatch Network (IFRC Operations)
          </p>
        </div>

        {/* 1. Profile Portal Selection Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => handlePortalSwitch('patient')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              selectedPortal === 'patient'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Patient / User</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              selectedPortal === 'admin'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>2. Admin / EOC</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('doctor')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              selectedPortal === 'doctor'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>3. Doctor / CMO</span>
          </button>
        </div>

        {/* Portal Information Banner */}
        <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
          selectedPortal === 'patient'
            ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
            : selectedPortal === 'doctor'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-purple-950/40 border-purple-500/30 text-purple-300'
        }`}>
          {selectedPortal === 'patient' && (
            <div className="flex items-start space-x-2">
              <Phone className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-100 font-bold">Patient / Citizen Emergency Portal (Device A)</strong>
                Allows a patient to grant GPS permissions, press the 1-Click SOS distress button, prefill cellular SMS to 108 dispatch, and view real-time ambulance response status.
              </div>
            </div>
          )}
          {selectedPortal === 'admin' && (
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-100 font-bold">Team Delta Admin Command Portal (Device B)</strong>
                Supervisory EOC command center: Receives live incoming Citizen SOS alerts from mobile devices, views patient coordinates on Leaflet map, and authorizes 1-click ambulance dispatches.
              </div>
            </div>
          )}
          {selectedPortal === 'doctor' && (
            <div className="flex items-start space-x-2">
              <Stethoscope className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-100 font-bold">Hospital Medical Officer Portal</strong>
                Manage ward bed allocations, ICU availability, triage inbound trauma ambulances, and monitor backup generator fuel reserves.
              </div>
            </div>
          )}
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold">
            {authError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {selectedPortal === 'patient' ? 'Patient Identifier / Username' : 'Administrator Call ID'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Passcode / PIN</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 ${
              selectedPortal === 'patient'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/25'
                : selectedPortal === 'doctor'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>
              {selectedPortal === 'patient' ? 'Enter Patient SOS Portal' : 'Authenticate into Team Delta EOC'}
            </span>
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts Bar */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Seeded Demo Accounts (1-Click Instant Login)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('citizen')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition group"
            >
              <span className="font-bold text-xs text-cyan-300 block group-hover:underline">Rajesh Mohanty</span>
              <span className="text-[10px] text-slate-400">Demo Patient (Citizen)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-left transition group"
            >
              <span className="font-bold text-xs text-purple-300 block group-hover:underline">Team Delta</span>
              <span className="text-[10px] text-slate-400">EOC Director (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('doctor')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
            >
              <span className="font-bold text-xs text-emerald-300 block group-hover:underline">Dr. Subrat Mishra</span>
              <span className="text-[10px] text-slate-400">Chief Medical Officer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

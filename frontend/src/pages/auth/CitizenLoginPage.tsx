import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, Smartphone, LogIn, Lock, User, 
  MapPin, Heart, ArrowRight, ShieldCheck, CheckCircle2,
  Stethoscope, Shield
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const CitizenLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useEmergencyStore();

  const [email, setEmail] = useState('citizen@resqgrid.in');
  const [password, setPassword] = useState('citizen123');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      }).catch(() => {});
    } catch { /* offline mode fallback */ }

    switchRole('citizen');
    setIsLoading(false);
    navigate('/radio-sos');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Red/Rose Emergency Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 md:p-8 z-10 space-y-6">
        
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-xl shadow-rose-600/30">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            <span>Profile 1: Citizen & Patient Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            User / Patient Login
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            1-Tap Emergency SOS dispatch, live offline Medical ID, and instant responder tracking.
          </p>
        </div>

        {/* Feature Highlights Card */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">1-Tap SOS Distress</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <Heart className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Offline Medical ID</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Live GPS Radar</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Ambulance ETA Tracking</span>
          </div>
        </div>

        {/* Credentials Reminder */}
        <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-1">
            Citizen Profile Credentials (Device 1):
          </p>
          <div className="flex items-center justify-between font-mono text-xs text-white">
            <span>Email: <strong className="text-rose-200">{email}</strong></span>
            <span>PIN: <strong className="text-rose-200">{password}</strong></span>
          </div>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold">
            {authError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Patient Email or Phone
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition font-mono"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Connecting...' : 'Sign In to Citizen SOS Portal'}</span>
          </button>
        </form>

        {/* Switch Profile Links */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <Link to="/login/doctor" className="hover:text-emerald-300 flex items-center gap-1 transition">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Doctor Login &rarr;</span>
          </Link>
          <Link to="/login/admin" className="hover:text-indigo-300 flex items-center gap-1 transition">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin EOC Login &rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

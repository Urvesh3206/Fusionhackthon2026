import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Navigation, LogIn, Lock, User, 
  Map, Activity, Truck, AlertTriangle, ShieldCheck,
  Smartphone, Stethoscope
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useEmergencyStore();

  const [email, setEmail] = useState('admin@resqgrid.in');
  const [password, setPassword] = useState('admin123');
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

    switchRole('admin');
    setIsLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Indigo / Purple Command Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 md:p-8 z-10 space-y-6">
        
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>Profile 3: Team Delta Admin & EOC Command</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            EOC Director Login
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Supervisory disaster management, dynamic fleet staging, climate risk matrix, and multi-agency coordination.
          </p>
        </div>

        {/* Feature Highlights Card */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <Map className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">EOC Disaster Radar</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Climate Hazard Matrix</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Evacuation Optimization</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-200">Multi-Agency Audits</span>
          </div>
        </div>

        {/* Credentials Reminder */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
            Admin Profile Credentials (Command HQ):
          </p>
          <div className="flex items-center justify-between font-mono text-xs text-white">
            <span>Email: <strong className="text-indigo-200">{email}</strong></span>
            <span>PIN: <strong className="text-indigo-200">{password}</strong></span>
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
              Administrator Email or Call ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Connecting...' : 'Authenticate into Master EOC Command'}</span>
          </button>
        </form>

        {/* Switch Profile Links */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <Link to="/login/citizen" className="hover:text-rose-300 flex items-center gap-1 transition">
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
            <span>Citizen Login &rarr;</span>
          </Link>
          <Link to="/login/doctor" className="hover:text-emerald-300 flex items-center gap-1 transition">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Doctor Login &rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

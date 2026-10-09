import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogIn, CheckCircle, Lock, User, ArrowRight } from 'lucide-react';
import { useEmergencyStore, DEMO_USER_PROFILES } from '../stores/useEmergencyStore';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useEmergencyStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const roleKey = (username as UserRole) in DEMO_USER_PROFILES ? (username as UserRole) : 'admin';
    switchRole(roleKey);
    navigate('/');
  };

  const handleQuickRoleSelect = (role: UserRole) => {
    switchRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">ResQGrid AI</h1>
          <p className="text-xs text-slate-400 mt-1">Climate-Aware Emergency Response & Dispatch Network</p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-semibold text-cyan-400">
            IFRC Operations Portal
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username / Call ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Passcode</label>
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
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Authenticate into EOC Console</span>
          </button>
        </form>

        {/* Quick Demo Login Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
            Quick-Login Demo Roles
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {(Object.keys(DEMO_USER_PROFILES) as UserRole[]).map((role) => {
              const profile = DEMO_USER_PROFILES[role];
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleQuickRoleSelect(role)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left transition group"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block group-hover:text-cyan-300">
                      {profile.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

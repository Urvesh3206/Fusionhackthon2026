import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Radio, RefreshCw, Shield, User,
  PlaySquare, AlertTriangle, CheckCircle, ChevronDown, LogOut
} from 'lucide-react';
import { useEmergencyStore, DEMO_USER_PROFILES } from '../../stores/useEmergencyStore';
import { UserRole } from '../../types';
import { refreshHazards } from '../../services/api';

export const TopNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    state, currentUser, switchRole, 
    isConnected, showNotificationsDrawer, setShowNotificationsDrawer,
    globalSearchQuery, setGlobalSearchQuery 
  } = useEmergencyStore();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute Route Title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard': return 'Operations Dashboard';
      case '/map': return 'Live Disaster Map';
      case '/profile': return 'User Profile & Multi-Role Access Hub';
      case '/hazards': return 'Hazard Intelligence & Forecasts';
      case '/incidents': return 'Emergency Incident Management';
      case '/dispatch': return 'Hazard-Aware Emergency Dispatch';
      case '/fleet': return 'Ambulance Fleet & Predictive Staging';
      case '/hospitals': return 'Hospital Capacity & Cascading Deratings';
      case '/resources': return 'Medical Resources & Temporary Clinics';
      case '/evacuation': return 'Evacuation Planning & Shelter Routing';
      case '/simulation': return 'Deterministic Disaster Simulation';
      case '/analytics': return 'Analytics, Gini Index & Benchmark Reports';
      case '/alerts': return 'Emergency Alerts & Notification Center';
      case '/settings': return 'System Settings & Model Weights';
      case '/audit-logs': return 'Audit Logs & Decision Ledger';
      case '/login': return 'Authentication Portal';
      default: return 'ResQGrid Operations';
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshHazards();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <header className="flex flex-col bg-slate-900 border-b border-slate-800 select-none z-20">
      {/* 1. Global Simulation Active Banner */}
      <div className="bg-gradient-to-r from-amber-600/90 via-purple-600/90 to-cyan-600/90 text-white px-4 py-1 text-xs font-semibold flex items-center justify-between shadow-inner">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>SIMULATION MODE ACTIVE — Puri District Cyclone Fani & Extreme Surge Scenario</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
            Step: {state?.simulation_time_label || 'T-48h: Advisory'}
          </span>
          <span className="hidden sm:inline opacity-90">Simulated records isolated from real operations</span>
        </div>
      </div>

      {/* 2. Top Navigation Bar */}
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Breadcrumb & Title */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>{getPageTitle()}</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Odisha EOC &bull; Target SLA: 15.0 min &bull; PostGIS Active
            </p>
          </div>
        </div>

        {/* Search, Freshness & Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search incidents, vehicles, hospitals..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:w-72 transition-all"
            />
          </div>

          {/* Telemetry Freshness Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Telemetry:</span>
            <span className="text-emerald-400 font-mono font-bold">4s</span>
            <span className="text-slate-400 text-[10px]">(Verified)</span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            title="Refresh weather feeds and telemetry"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Alert Center Notification Bell */}
          <button
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className="relative p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            aria-label="Toggle notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {/* Profile Shortcut Button */}
          <button
            onClick={() => navigate('/profile')}
            title="Open Profile & Role Command Hub"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold transition shadow-sm"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Profile</span>
          </button>

            {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium transition"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                {currentUser.username.includes(' ')
                  ? currentUser.username.split(' ').map(w => w[0]).join('').toUpperCase()
                  : currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-semibold">
                {currentUser.full_name.startsWith('Team Delta') ? 'Team Delta' : currentUser.full_name.split(' ')[0]}
              </span>
              <span className="px-1.5 py-0.2 bg-slate-700 text-[10px] text-cyan-300 rounded uppercase font-bold">
                {currentUser.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                  <span>Switch Operational Profile</span>
                  <button 
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="text-cyan-400 hover:underline capitalize font-bold"
                  >
                    View All &rarr;
                  </button>
                </div>
                {(Object.keys(DEMO_USER_PROFILES) as UserRole[]).map((r) => {
                  const prof = DEMO_USER_PROFILES[r];
                  const isCur = currentUser.role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition ${isCur ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-slate-300'}`}
                    >
                      <div>
                        <p className="font-medium text-slate-200">{prof.full_name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{r.replace('_', ' ')}</p>
                      </div>
                      {isCur && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                    </button>
                  );
                })}
                <div className="border-t border-slate-800 mt-1 pt-1 px-2 space-y-1">
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full text-left px-3 py-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded flex items-center space-x-2 font-medium"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Open User Profile & Role Hub</span>
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch or Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

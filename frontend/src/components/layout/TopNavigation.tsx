import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Radio, RefreshCw, Shield, User,
  AlertTriangle, CheckCircle, ChevronDown, LogOut,
  Wifi, MessageSquare, Satellite, ShieldAlert
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
    globalSearchQuery, setGlobalSearchQuery, isOfflineNetworkCrash,
    uiThemeMode, setUiThemeMode
  } = useEmergencyStore();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute Route Title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard': return 'Dashboard Overview';
      case '/map': return 'Live Emergency Map';
      case '/comms': return 'Messages & Radio Comms';
      case '/radio-sos': return 'Offline Radio Mesh';
      case '/profile': return 'User Profile';
      case '/hazards': return 'Weather & Storm Alerts';
      case '/incidents': return 'Emergency Incidents';
      case '/dispatch': return 'Emergency Dispatch';
      case '/fleet': return 'Ambulance Fleet';
      case '/hospitals': return 'Hospital Bed Status';
      case '/resources': return 'Medical Supplies';
      case '/evacuation': return 'Evacuation Shelters';
      case '/simulation': return 'Disaster Simulator';
      case '/analytics': return 'Reports & Analytics';
      case '/alerts': return 'Notification Center';
      case '/settings': return 'System Settings';
      case '/audit-logs': return 'Audit Logs';
      case '/login': return 'Sign In';
      default: return 'ResQGrid';
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

  const isFriendly = uiThemeMode === 'user-friendly';

  return (
    <header className={`flex flex-col select-none z-20 transition-colors duration-200 ${
      isFriendly 
        ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm text-slate-800' 
        : 'bg-surface-container-lowest/95 backdrop-blur-xl border-b border-surface-container-high shadow-md text-on-surface'
    }`}>
      {/* Main Navigation Header */}
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-3">
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3 min-w-max">
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>{getPageTitle()}</span>
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">
              ResQGrid Emergency Response Network
            </span>
          </div>
        </div>

        {/* Center: Clean Connection Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOfflineNetworkCrash ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          <span className="text-slate-700 font-medium">
            {isOfflineNetworkCrash ? 'Offline Radio Mesh Active' : 'System Online • All Channels Operational'}
          </span>
        </div>

        {/* Right: Quick Search, Refresh, Notifications, SOS, Profile */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Quick Search */}
          <div className="relative hidden lg:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-40 pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:w-56 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
            />
          </div>

          {/* Simple Mode Toggle */}
          <button
            onClick={() => setUiThemeMode(isFriendly ? 'tactical' : 'user-friendly')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Toggle between Simple and Tactical Views"
          >
            <span>{isFriendly ? '✨ Simple' : '⚡ Tactical'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            title="Refresh status"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            aria-label="Toggle notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-rose-500 text-white shadow">
              3
            </span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={() => navigate('/radio-sos')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition active:scale-95"
            type="button"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>Emergency SOS</span>
          </button>

          {/* User Profile & Account Menu */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
              aria-label="User Account Menu"
            >
              <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs ${
                currentUser.role === 'citizen' ? 'bg-rose-600' : currentUser.role === 'doctor' ? 'bg-emerald-600' : 'bg-indigo-600'
              }`}>
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email || `${currentUser.username}@resqgrid.in`}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      currentUser.role === 'citizen'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : currentUser.role === 'doctor'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{currentUser.role === 'citizen' ? 'Citizen Account' : currentUser.role === 'doctor' ? 'Doctor Account' : 'EOC Admin Account'}</span>
                    </span>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="p-1 space-y-1">
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center space-x-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>View Profile & Medical Record</span>
                  </button>

                  {/* If Admin, allow testing other views in supervisory mode */}
                  {currentUser.role === 'admin' && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Admin Preview Sandbox
                      </div>
                      {[
                        { role: 'citizen' as UserRole, name: 'Preview Patient SOS View', color: 'hover:text-rose-600' },
                        { role: 'doctor' as UserRole, name: 'Preview Doctor Triage View', color: 'hover:text-emerald-600' },
                        { role: 'admin' as UserRole, name: 'Master EOC Command', color: 'hover:text-indigo-600' }
                      ].map((p) => (
                        <button
                          key={p.role}
                          onClick={() => {
                            switchRole(p.role);
                            setRoleDropdownOpen(false);
                            navigate(p.role === 'citizen' ? '/radio-sos' : (p.role === 'doctor' ? '/radio-sos' : '/'));
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between text-slate-600 hover:bg-slate-100 ${p.color} transition`}
                        >
                          <span>{p.name}</span>
                          {currentUser.role === p.role && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Secure Sign Out Button */}
                <div className="pt-2 px-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      navigate('/login');
                    }}
                    className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out / Switch Account</span>
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

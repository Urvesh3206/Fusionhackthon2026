import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Flame, AlertCircle, Send, 
  Truck, Hospital, Package, Users, PlaySquare, 
  BarChart3, Bell, Settings, FileText, ChevronDown,
  ChevronLeft, ChevronRight, ShieldAlert, User, Radio, Signal,
  Sparkles, Layers
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { state, currentUser, uiThemeMode } = useEmergencyStore();
  const [showMoreTools, setShowMoreTools] = useState(false);

  const isFriendly = uiThemeMode === 'user-friendly';

  const activeIncidents = state?.emergency_calls.filter(c => c.status !== 'Resolved').length || 0;
  const availableAmbs = state?.ambulances.filter(a => a.status === 'Available').length || 0;
  const totalAmbs = state?.ambulances.length || 0;
  const deratedHospitals = state?.hospitals.filter(h => !h.has_power || h.free_icu_beds === 0).length || 0;

  // 6 Core Essential, Easy-to-Understand Menu Items
  const primaryNavItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/map', label: 'Live Map', icon: Map, badge: 'Live GPS', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { to: '/comms', label: 'Messages & Comms', icon: Signal, badge: 'Online', badgeColor: 'bg-indigo-100 text-indigo-800 font-semibold' },
    { to: '/incidents', label: 'Emergency Incidents', icon: AlertCircle, badge: activeIncidents > 0 ? `${activeIncidents} Active` : null, badgeColor: 'bg-rose-100 text-rose-700 font-bold' },
    { to: '/fleet', label: 'Ambulance Fleet', icon: Truck, badge: `${availableAmbs}/${totalAmbs}`, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { to: '/hospitals', label: 'Hospital Beds', icon: Hospital, badge: deratedHospitals > 0 ? `${deratedHospitals} Alert` : null, badgeColor: 'bg-amber-100 text-amber-800' },
  ];

  // Secondary Tools (cleanly grouped)
  const secondaryNavItems = [
    { to: '/radio-sos', label: 'Offline Radio Mesh', icon: Radio },
    { to: '/dispatch', label: 'Emergency Dispatch', icon: Send },
    { to: '/hazards', label: 'Weather & Storm Alerts', icon: Flame },
    { to: '/resources', label: 'Medical Supplies', icon: Package },
    { to: '/evacuation', label: 'Evacuation Shelters', icon: Users },
    { to: '/simulation', label: 'Disaster Simulator', icon: PlaySquare },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/alerts', label: 'Notifications', icon: Bell },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className={`h-screen flex flex-col justify-between transition-all duration-300 z-30 select-none ${
      isFriendly
        ? 'bg-white border-r border-slate-200/90 shadow-sm text-slate-800'
        : 'bg-surface-container-lowest border-r border-surface-container-high/80 text-on-surface shadow-[1px_0_10px_rgba(0,0,0,0.5)]'
    } ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="flex flex-col">
        <div className={`h-16 flex items-center justify-between px-4 border-b ${
          isFriendly ? 'border-slate-200/80 bg-white' : 'border-surface-container-high/80 bg-surface-container-lowest'
        }`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isFriendly 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'bg-surface-container-high border border-secondary/40 text-secondary'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  ResQGrid
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Emergency Response
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg transition ${
              isFriendly 
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {/* Core Navigation Items */}
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative
                ${isActive
                  ? isFriendly 
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs' 
                    : 'bg-surface-container-high text-secondary font-semibold border-l-2 border-secondary'
                  : isFriendly
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${
                isFriendly ? 'text-indigo-600 group-hover:text-indigo-700' : ''
              } ${collapsed ? 'mx-auto' : 'mr-3'}`} />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}

        {/* Expandable Secondary Tools Section */}
        {!collapsed && (
          <div className="pt-2 border-t border-slate-200/80 mt-2">
            <button
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 rounded-xl transition"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>More Tools & Settings</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showMoreTools ? 'rotate-180' : ''}`} />
            </button>

            {showMoreTools && (
              <div className="pl-2 pr-1 pt-1 space-y-0.5 border-l-2 border-slate-100 ml-3">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `
                        flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5 mr-2.5 text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile Section at Bottom */}
      <div className={`p-3 border-t ${
        isFriendly ? 'border-slate-200/80 bg-slate-50/50' : 'border-surface-container-high/80 bg-surface-container-lowest'
      }`}>
        <NavLink 
          to="/profile"
          className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
            {currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate">{currentUser.full_name}</span>
              <span className="text-[10px] text-slate-500 capitalize">{currentUser.role.replace('_', ' ').toLowerCase()}</span>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
};



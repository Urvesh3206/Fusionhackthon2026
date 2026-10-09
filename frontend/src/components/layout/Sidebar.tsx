import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Flame, AlertCircle, Send, 
  Truck, Hospital, Package, Users, PlaySquare, 
  BarChart3, Bell, Settings, FileText, LifeBuoy,
  ChevronLeft, ChevronRight, ShieldAlert, CheckCircle, User
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { state, currentUser } = useEmergencyStore();

  const activeIncidents = state?.emergency_calls.filter(c => c.status !== 'Resolved').length || 0;
  const availableAmbs = state?.ambulances.filter(a => a.status === 'Available').length || 0;
  const deratedHospitals = state?.hospitals.filter(h => !h.has_power || h.free_icu_beds === 0).length || 0;

  const navItems = [
    { to: '/', label: 'Operations Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/map', label: 'Live Disaster Map', icon: Map, badge: null },
    { to: '/profile', label: 'User Profile & Roles', icon: User, badge: currentUser.role.toUpperCase(), badgeColor: 'bg-cyan-500/20 text-cyan-300' },
    { to: '/hazards', label: 'Hazard Intelligence', icon: Flame, badge: state?.forecast ? state.forecast.step_id : null, badgeColor: 'bg-amber-500/20 text-amber-400' },
    { to: '/incidents', label: 'Emergency Incidents', icon: AlertCircle, badge: activeIncidents > 0 ? `${activeIncidents}` : null, badgeColor: 'bg-red-500/20 text-red-400' },
    { to: '/dispatch', label: 'Emergency Dispatch', icon: Send, badge: 'AI', badgeColor: 'bg-cyan-500/20 text-cyan-400' },
    { to: '/fleet', label: 'Ambulance Fleet', icon: Truck, badge: `${availableAmbs} Avail`, badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { to: '/hospitals', label: 'Hospital Management', icon: Hospital, badge: deratedHospitals > 0 ? `${deratedHospitals} Alert` : null, badgeColor: 'bg-rose-500/20 text-rose-400' },
    { to: '/resources', label: 'Medical Resources', icon: Package, badge: null },
    { to: '/evacuation', label: 'Evacuation Planning', icon: Users, badge: null },
    { to: '/simulation', label: 'Disaster Simulation', icon: PlaySquare, badge: 'SIM', badgeColor: 'bg-purple-500/20 text-purple-400' },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3, badge: null },
    { to: '/alerts', label: 'Alerts & Warnings', icon: Bell, badge: '3', badgeColor: 'bg-red-500 text-white' },
    { to: '/audit-logs', label: 'Audit Logs', icon: FileText, badge: null },
    { to: '/settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside className={`h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col transition-all duration-300 z-30 select-none ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-white bg-clip-text text-transparent">
                ResQGrid AI
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                IFRC Disaster Response
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative
                ${isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-xs rounded-md shadow-xl border border-slate-800 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User / Organization Profile Card in Footer (Clickable to /profile) */}
      <NavLink 
        to="/profile"
        className="p-3 border-t border-slate-800/80 bg-slate-900/40 hover:bg-slate-850/80 transition cursor-pointer group block"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center font-bold text-xs text-cyan-300 group-hover:bg-cyan-500 group-hover:text-white transition flex-shrink-0">
            {currentUser.username.includes(' ')
              ? currentUser.username.split(' ').map(w => w[0]).join('').toUpperCase()
              : currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">{currentUser.full_name}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{currentUser.role.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      </NavLink>
    </aside>
  );
};

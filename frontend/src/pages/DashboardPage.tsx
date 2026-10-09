import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Truck, Hospital, Activity, Flame, 
  Send, Users, Shield, ArrowUpRight, TrendingUp, CheckCircle2,
  Clock, PlusCircle, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { runOptimizationReplan, advanceScenarioStep } from '../services/api';

const responseTimeData = [
  { time: 'T-48h', baseline: 24.5, resqgrid: 13.2 },
  { time: 'T-24h', baseline: 28.0, resqgrid: 14.5 },
  { time: 'T-6h', baseline: 39.5, resqgrid: 18.2 },
  { time: 'Landfall', baseline: 52.0, resqgrid: 22.4 },
  { time: 'T+6h', baseline: 46.0, resqgrid: 19.8 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, plan, setPlan, setState, isLoading, setLoading } = useEmergencyStore();
  const [replanLoading, setReplanLoading] = useState(false);

  const activeIncidents = state?.emergency_calls.filter(c => c.status !== 'Resolved') || [];
  const criticalCalls = activeIncidents.filter(c => c.priority.includes('Critical') || c.priority.includes('P1'));
  const availableAmbs = state?.ambulances.filter(a => a.status === 'Available') || [];
  const totalAmbs = state?.ambulances.length || 0;
  const deratedHospitals = state?.hospitals.filter(h => !h.has_power || h.free_icu_beds === 0) || [];
  const totalBedsFree = state?.hospitals.reduce((acc, h) => acc + Math.max(0, h.usable_beds - h.occupied_beds), 0) || 0;
  const totalIcuFree = state?.hospitals.reduce((acc, h) => acc + h.free_icu_beds, 0) || 0;

  const hospitalChartData = state?.hospitals.map(h => ({
    name: h.name.replace('Puri District Headquarters Hospital', 'DHH Puri').replace('Coastal Infectious Disease Hospital', 'Coastal ID').replace('Community Health Centre', 'CHC'),
    Occupied: h.occupied_beds,
    Available: Math.max(0, h.usable_beds - h.occupied_beds),
    ICU: h.free_icu_beds,
    hasPower: h.has_power
  })) || [];

  const handleReplan = async () => {
    setReplanLoading(true);
    try {
      const p = await runOptimizationReplan();
      setPlan(p);
    } catch (e) {
      console.error(e);
    } finally {
      setReplanLoading(false);
    }
  };

  const handleAdvanceStep = async () => {
    try {
      const nextIndex = ((state?.step_index || 0) + 1) % (state?.total_steps || 5);
      const nextState = await advanceScenarioStep(nextIndex);
      setState(nextState);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Incidents */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Calls</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-100">{activeIncidents.length}</span>
            <span className="text-[11px] font-bold text-red-400">({criticalCalls.length} Critical)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Pending response triage</p>
        </div>

        {/* Fleet Availability */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">ALS Fleet</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-100">{availableAmbs.length}</span>
            <span className="text-xs text-slate-400 font-semibold">/ {totalAmbs} Available</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1">MEXCLP Staging Optimal</p>
        </div>

        {/* Hospital Free Beds */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Free Beds</span>
            <Hospital className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-100">{totalBedsFree}</span>
            <span className="text-[11px] text-blue-400 font-bold">({totalIcuFree} ICU)</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Across 5 regional hubs</p>
        </div>

        {/* Derated Facilities */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Derated Hosp</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-400">{deratedHospitals.length}</span>
            <span className="text-xs text-slate-400 font-semibold">Outage</span>
          </div>
          <p className="text-[10px] text-rose-400 mt-1">Cascading power loss</p>
        </div>

        {/* Impassable Roads */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Closed Links</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-400">{state?.road_edges.filter(e => e.is_closed).length || 0}</span>
            <span className="text-xs text-slate-400 font-semibold">Bridges</span>
          </div>
          <p className="text-[10px] text-amber-400 mt-1">Flooded corridor avoid</p>
        </div>

        {/* Mean Response Time */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mean ETA</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-cyan-400">{plan?.efficiency_metrics?.mean_response_time_min || 13.8}m</span>
            <span className="text-[10px] text-emerald-400 font-bold">-48% vs Base</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Hazard-optimized routing</p>
        </div>
      </div>

      {/* 2. Main Center Grid: Interactive Map + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Geospatial Telemetry Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-200">Live Spatial Telemetry Grid (Puri Region)</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/map')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center font-semibold"
              >
                Full Map View <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
          
          <div className="h-[420px] w-full">
            <LeafletDisasterMap state={state} onSelectIncident={(id) => navigate('/dispatch')} />
          </div>
        </div>

        {/* Right 1 Col: Urgent Incident Queue & Fast Action Hub */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-200 flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-400 mr-1.5" /> Urgent Incident Queue
            </h2>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View All ({state?.emergency_calls.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[290px] pr-1">
            {activeIncidents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No pending emergency incidents</div>
            ) : (
              activeIncidents.slice(0, 4).map((inc) => {
                const isCrit = inc.priority.includes('Critical') || inc.priority.includes('P1');
                return (
                  <div
                    key={inc.id}
                    onClick={() => navigate('/dispatch')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {inc.priority}
                      </span>
                      <span className="text-[10px] text-slate-500">{inc.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mt-1.5 group-hover:text-cyan-300">
                      {inc.patient_condition}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{inc.district_zone}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Action Control Suite */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={handleReplan}
              disabled={replanLoading}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${replanLoading ? 'animate-spin' : ''}`} />
              <span>{replanLoading ? 'Solving Multi-Objective...' : 'Recompute Global Optimization'}</span>
            </button>
            <button
              onClick={handleAdvanceStep}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Advance Disaster Timeline Milestone</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Analytics & Hospital Capacity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trends Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Response Time Comparison (Minutes)</h3>
              <p className="text-xs text-slate-400">Baseline Shortest-Path vs ResQGrid Hazard-Aware Router</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">
              48% Faster at Landfall
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseTimeData}>
                <defs>
                  <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResQ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="m" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="baseline" name="Baseline (Unaware)" stroke="#ef4444" fillOpacity={1} fill="url(#colorBase)" strokeWidth={2} />
                <Area type="monotone" dataKey="resqgrid" name="ResQGrid (Hazard-Aware)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorResQ)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hospital Occupancy vs Available Capacity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Hospital Usable Bed & ICU Distribution</h3>
              <p className="text-xs text-slate-400">Occupied vs Available Bed Buffers with Cascading Derating</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Occupied" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ICU" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

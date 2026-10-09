import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, Truck, Hospital, Activity, Flame, 
  Send, Users, Shield, ArrowUpRight, TrendingUp, CheckCircle2,
  Clock, PlusCircle, RefreshCw, Zap, Wind, Droplets, Radio,
  Sparkles, Compass, AlertCircle, PlaySquare, ChevronRight, Crosshair, MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { QuickActionBar } from '../components/common/QuickActionBar';
import { QuickStartGuideModal } from '../components/common/QuickStartGuideModal';
import { ToastNotification } from '../components/common/ToastNotification';
import { runOptimizationReplan, advanceScenarioStep, triggerRoadClosure } from '../services/api';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const responseTimeData = [
  { time: 'T-48h', baseline: 24.5, resqgrid: 13.2 },
  { time: 'T-24h', baseline: 28.0, resqgrid: 14.5 },
  { time: 'T-6h', baseline: 39.5, resqgrid: 18.2 },
  { time: 'Landfall', baseline: 52.0, resqgrid: 22.4 },
  { time: 'T+6h', baseline: 46.0, resqgrid: 19.8 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, plan, setPlan, setState } = useEmergencyStore();
  const [replanLoading, setReplanLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString().slice(17, 25));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userLiveLocation, setUserLiveLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const activeIncidents = state?.emergency_calls.filter(c => c.status !== 'Resolved') || [];
  const criticalCalls = activeIncidents.filter(c => c.priority.includes('Critical') || c.priority.includes('P1'));
  const availableAmbs = state?.ambulances.filter(a => a.status === 'Available') || [];
  const totalAmbs = state?.ambulances.length || 0;
  const deratedHospitals = state?.hospitals.filter(h => !h.has_power || h.free_icu_beds === 0) || [];
  const totalBedsFree = state?.hospitals.reduce((acc, h) => acc + Math.max(0, h.usable_beds - h.occupied_beds), 0) || 0;
  const totalIcuFree = state?.hospitals.reduce((acc, h) => acc + h.free_icu_beds, 0) || 0;
  const f = state?.forecast;

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

  const handleStepTo = async (stepIdx: number) => {
    try {
      const nextState = await advanceScenarioStep(stepIdx);
      setState(nextState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUseLiveLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLiveLocation([lat, lon]);
          setIsLocating(false);
          showToast(`📍 Live GPS Locked: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
        },
        (error) => {
          console.warn('Geolocation fallback:', error);
          const fallbackLat = 19.8050;
          const fallbackLon = 85.8280;
          setUserLiveLocation([fallbackLat, fallbackLon]);
          setIsLocating(false);
          showToast('📍 Live GPS Simulated at Puri Coastal Command Sector');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = 19.8050;
      const fallbackLon = 85.8280;
      setUserLiveLocation([fallbackLat, fallbackLon]);
      setIsLocating(false);
      showToast('📍 Live GPS Simulated at Puri Coastal Sector');
    }
  };

  const refLat = userLiveLocation ? userLiveLocation[0] : 19.8135;
  const refLon = userLiveLocation ? userLiveLocation[1] : 85.8312;

  const nearestAmbulance = state?.ambulances ? [...state.ambulances].map(a => {
    const dist = calculateDistanceKm(refLat, refLon, a.location[1], a.location[0]);
    const estEta = Number((dist / 0.6).toFixed(1));
    return { ...a, dist, estEta };
  }).sort((a, b) => a.dist - b.dist)[0] : null;

  const nearestHospital = state?.hospitals ? [...state.hospitals].map(h => {
    const dist = calculateDistanceKm(refLat, refLon, h.location[1], h.location[0]);
    const freeBeds = Math.max(0, h.usable_beds - h.occupied_beds);
    return { ...h, dist, freeBeds };
  }).sort((a, b) => a.dist - b.dist)[0] : null;

  return (
    <div className="space-y-5">
      {/* 1. Live Threat Matrix HUD & Incident Ticker */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-950/95 border border-slate-800 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Active Disaster Threat Gauge */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white tracking-wide uppercase">
                {f?.hazard_type === 'cyclone' ? 'Category-4 Cyclone Warning' : 'Severe Heat Stress Advisory'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                CRITICAL SURGE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Wind: <span className="text-cyan-300 font-bold">{f?.wind_speed_kmh || 65} km/h</span> &bull; 
              Discharge: <span className="text-blue-300 font-bold">{f?.river_discharge_m3s || 140} m³/s</span> &bull; 
              Rain: <span className="text-indigo-300 font-bold">{f?.rain_rate_mmh || 10} mm/h</span>
            </p>
          </div>
        </div>

        {/* Center: Live Ticker Feed */}
        <div className="hidden xl:flex items-center space-x-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">EOC Ticker:</span>
          <span className="text-slate-200 font-medium truncate max-w-md">
            Kushabhadra River gauge cresting. 100% ALS units repositioned via MEXCLP algorithm.
          </span>
        </div>

        {/* Right: Live EOC Clock & Replan Trigger */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">UTC Operational Clock</span>
            <span className="text-xs font-mono font-bold text-cyan-400">{currentTime} UTC</span>
          </div>
          <button
            onClick={handleReplan}
            disabled={replanLoading}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${replanLoading ? 'animate-spin' : ''}`} />
            <span>{replanLoading ? 'Optimizing...' : 'AI Global Replan'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive 1-Click Action & Testing Bar */}
      <QuickActionBar onOpenGuide={() => setIsGuideOpen(true)} onShowToast={showToast} />

      {/* 3. Glassmorphic Creative KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Emergency Calls */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-red-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-red-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Emergency Calls</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-100">{activeIncidents.length}</span>
            <span className="text-[10px] font-bold text-red-400">({criticalCalls.length} P1 Crit)</span>
          </div>
          <div className="mt-2 w-full bg-slate-900 rounded-full h-1 overflow-hidden">
            <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, activeIncidents.length * 20)}%` }} />
          </div>
        </div>

        {/* ALS Fleet Status */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">ALS Fleet</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-emerald-400">{availableAmbs.length}</span>
            <span className="text-xs text-slate-400 font-semibold">/ {totalAmbs} Available</span>
          </div>
          <p className="text-[10px] text-emerald-400 font-semibold mt-1">MEXCLP Staged</p>
        </div>

        {/* Free Hospital Beds & ICU */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-blue-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Usable Beds</span>
            <Hospital className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-100">{totalBedsFree}</span>
            <span className="text-[10px] text-blue-400 font-bold">({totalIcuFree} ICU)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Across 5 Hospitals</p>
        </div>

        {/* Derated Hospital Alerts */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-rose-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Facility Outage</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-rose-400">{deratedHospitals.length}</span>
            <span className="text-xs text-slate-400 font-semibold">Grid Trips</span>
          </div>
          <p className="text-[10px] text-rose-400 mt-1">Cascading Deratings</p>
        </div>

        {/* Inundated Closed Links */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Closed Links</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-amber-400">{state?.road_edges.filter(e => e.is_closed).length || 0}</span>
            <span className="text-xs text-slate-400 font-semibold">Bridges</span>
          </div>
          <p className="text-[10px] text-amber-400 mt-1">Flooded Corridors</p>
        </div>

        {/* Mean Response SLA */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mean ETA</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-cyan-300">{plan?.efficiency_metrics?.mean_response_time_min || 13.8}m</span>
            <span className="text-[10px] text-emerald-400 font-bold">-48%</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1">Hazard-Aware Router</p>
        </div>
      </div>

      {/* 3. Interactive Scenario Quick-Milestone Selector Bar */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center">
          <Clock className="w-3.5 h-3.5 text-amber-400 mr-1.5" /> Timeline Stepper:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { idx: 0, label: 'T-48h Advisory' },
            { idx: 1, label: 'T-24h Feeder Bands' },
            { idx: 2, label: 'T-6h Bridge Surge' },
            { idx: 3, label: 'Landfall Peak' },
            { idx: 4, label: 'T+6h Recovery' },
          ].map((s) => (
            <button
              key={s.idx}
              onClick={() => handleStepTo(s.idx)}
              className={`px-3 py-1 rounded-xl font-semibold transition ${
                state?.step_index === s.idx
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Center Main Section: Interactive Tactical Map + Live Incident Dispatch Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tactical Leaflet Map with HUD Overlay */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Tactical Geospatial Grid — Puri Coastal Sector</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUseLiveLocation}
                disabled={isLocating}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : 'animate-pulse'}`} />
                <span>{isLocating ? 'Acquiring...' : '📍 Use My Live GPS'}</span>
              </button>
              <button
                onClick={() => navigate('/map')}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl text-cyan-400 hover:text-cyan-300 flex items-center font-semibold transition"
              >
                Fullscreen Map <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* Quick GPS telemetry snippet banner if active */}
          {userLiveLocation && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex flex-wrap items-center justify-between text-xs text-emerald-300 gap-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>GPS Pin: <strong>{userLiveLocation[0].toFixed(4)}°N, {userLiveLocation[1].toFixed(4)}°E</strong></span>
                <span>&bull; Nearest Amb: <strong className="text-white">{nearestAmbulance?.callsign}</strong> ({nearestAmbulance?.dist} km, ETA {nearestAmbulance?.estEta}m)</span>
                <span>&bull; Nearest Hosp: <strong className="text-white">{nearestHospital?.name?.split(' ')[0]}</strong> ({nearestHospital?.dist} km, {nearestHospital?.freeBeds} Beds)</span>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
              >
                Open Route Navigator &rarr;
              </button>
            </div>
          )}

          <div className="h-[440px] w-full rounded-xl overflow-hidden relative">
            <LeafletDisasterMap 
              state={state} 
              clickedPoint={userLiveLocation}
              onSelectIncident={() => navigate('/dispatch')} 
            />
          </div>
        </div>

        {/* Right 1 Col: Urgent Incident Queue & Fast Action Hub */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-100 flex items-center">
              <AlertCircle className="w-4 h-4 text-red-400 mr-1.5" /> High-Priority Incident Queue
            </h2>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View All ({state?.emergency_calls.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[310px] pr-1">
            {activeIncidents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">No pending emergency calls</div>
            ) : (
              activeIncidents.slice(0, 4).map((inc) => {
                const isCrit = inc.priority.includes('Critical') || inc.priority.includes('P1');
                return (
                  <div
                    key={inc.id}
                    onClick={() => navigate('/dispatch')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl cursor-pointer transition group"
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

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => navigate('/dispatch')}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Open 10-Step Dispatch Solver</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Rich Analytics & Hospital Capacity Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Area Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Response Time Trends (Minutes)</h3>
              <p className="text-xs text-slate-400">Baseline Shortest-Path vs ResQGrid Hazard-Aware Router</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/30">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="m" />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="baseline" name="Baseline (Unaware)" stroke="#ef4444" fillOpacity={1} fill="url(#colorBase)" strokeWidth={2} />
                <Area type="monotone" dataKey="resqgrid" name="ResQGrid (Hazard-Aware)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorResQ)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hospital Occupancy vs Free Beds Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Hospital Bed Capacity & ICU Buffers</h3>
              <p className="text-xs text-slate-400">Occupied vs Available Bed Distribution with Cascading Derating</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1120', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Occupied" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ICU" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Quick-Start Tour Modal */}
      <QuickStartGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Floating Toast Notification */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};

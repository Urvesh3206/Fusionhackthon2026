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
import { fetchLiveNearbyHospitals, generateNearbyAmbulances, calculateDistanceKm } from '../services/liveFacilities';

const responseTimeData = [
  { time: 'T-48h', baseline: 24.5, resqgrid: 13.2 },
  { time: 'T-24h', baseline: 28.0, resqgrid: 14.5 },
  { time: 'T-6h', baseline: 39.5, resqgrid: 18.2 },
  { time: 'Landfall', baseline: 52.0, resqgrid: 22.4 },
  { time: 'T+6h', baseline: 46.0, resqgrid: 19.8 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, plan, setPlan, setState, uiThemeMode } = useEmergencyStore();
  const [replanLoading, setReplanLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString().slice(17, 25));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userLiveLocation, setUserLiveLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const isFriendly = uiThemeMode === 'user-friendly';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically acquire live GPS location on mount
  useEffect(() => {
    handleUseLiveLocation();
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
      showToast('✨ Response plan optimized for current road conditions & bed capacity.');
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
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLiveLocation([lat, lon]);
          showToast(`📍 Live GPS Locked: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E — Syncing Nearby Facilities...`);
          
          try {
            const liveHosps = await fetchLiveNearbyHospitals(lat, lon);
            const liveAmbs = generateNearbyAmbulances(lat, lon);
            if (state) {
              setState({
                ...state,
                hospitals: liveHosps,
                ambulances: liveAmbs
              });
            }
          } catch (err) {
            console.error(err);
          } finally {
            setIsLocating(false);
          }
        },
        () => {
          const fallbackLat = 19.8050;
          const fallbackLon = 85.8280;
          setUserLiveLocation([fallbackLat, fallbackLon]);
          setIsLocating(false);
          showToast('📍 Using Command Sector Location (Puri Coastal)');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = 19.8050;
      const fallbackLon = 85.8280;
      setUserLiveLocation([fallbackLat, fallbackLon]);
      setIsLocating(false);
      showToast('📍 Using Command Sector Location');
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
      {/* 1. Header Overview & Status Card */}
      <div className={`p-4 md:p-5 rounded-2xl shadow-sm border flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isFriendly
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 text-white'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
            isFriendly
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          }`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base md:text-lg font-bold ${isFriendly ? 'text-slate-900' : 'text-white'}`}>
                Emergency Operations Center
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Active
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
              Real-time monitoring of emergency calls, ambulance routes, and hospital capacity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleUseLiveLocation}
            disabled={isLocating}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
              isFriendly
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-indigo-600' : 'text-emerald-600'}`} />
            <span>{isLocating ? 'Locating...' : '📍 My Location'}</span>
          </button>

          <button
            onClick={handleReplan}
            disabled={replanLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${replanLoading ? 'animate-spin' : ''}`} />
            <span>{replanLoading ? 'Optimizing...' : 'Optimize Routes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Action & Simulation Bar */}
      <QuickActionBar onOpenGuide={() => setIsGuideOpen(true)} onShowToast={showToast} />

      {/* 3. 4 Core, Easy-to-Understand Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Emergency Calls */}
        <div 
          onClick={() => navigate('/incidents')}
          className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer group ${
            isFriendly
              ? 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-rose-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>Active Calls</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl md:text-3xl font-bold ${isFriendly ? 'text-slate-900' : 'text-white'}`}>
              {activeIncidents.length}
            </span>
            <span className="text-xs font-semibold text-rose-600">
              ({criticalCalls.length} Urgent)
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            Click to view emergency list &rarr;
          </p>
        </div>

        {/* Ambulances */}
        <div 
          onClick={() => navigate('/fleet')}
          className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer group ${
            isFriendly
              ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>Available Ambulances</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl md:text-3xl font-bold text-emerald-600">
              {availableAmbs.length}
            </span>
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
              / {totalAmbs} Ready
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            GPS-tracked & ready for dispatch
          </p>
        </div>

        {/* Hospital Beds */}
        <div 
          onClick={() => navigate('/hospitals')}
          className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer group ${
            isFriendly
              ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-indigo-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>Free Hospital Beds</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Hospital className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className={`text-2xl md:text-3xl font-bold ${isFriendly ? 'text-slate-900' : 'text-white'}`}>
              {totalBedsFree}
            </span>
            <span className="text-xs font-semibold text-indigo-600">
              ({totalIcuFree} ICU)
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            Across {state?.hospitals.length || 5} regional hospitals
          </p>
        </div>

        {/* Comms Network */}
        <div 
          onClick={() => navigate('/comms')}
          className={`p-4 rounded-2xl border transition-all shadow-sm cursor-pointer group ${
            isFriendly
              ? 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-sky-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>Comms Network</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl md:text-3xl font-bold text-sky-600">
              100%
            </span>
            <span className={`text-xs font-semibold ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
              Online
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isFriendly ? 'text-slate-500' : 'text-slate-400'}`}>
            Radio, SMS & Internet connected
          </p>
        </div>
      </div>

      {/* 4. Center Main Section: Interactive Map + Incident List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map */}
        <div className={`lg:col-span-2 rounded-2xl p-4 md:p-5 border shadow-sm flex flex-col space-y-3 transition-colors ${
          isFriendly
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              <h3 className={`text-sm font-bold ${isFriendly ? 'text-slate-900' : 'text-white'}`}>
                Live Interactive Map
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/map')}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl font-semibold transition flex items-center"
              >
                Open Fullscreen Map <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {userLiveLocation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between text-xs text-emerald-800 gap-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Your Location: <strong>{userLiveLocation[0].toFixed(4)}°N, {userLiveLocation[1].toFixed(4)}°E</strong></span>
                {nearestAmbulance && <span>&bull; Nearest Amb: <strong>{nearestAmbulance.callsign}</strong> ({nearestAmbulance.dist} km)</span>}
              </div>
            </div>
          )}

          <div className="h-[380px] w-full rounded-xl overflow-hidden relative border border-slate-200">
            <LeafletDisasterMap 
              state={state} 
              clickedPoint={userLiveLocation}
              onSelectIncident={() => navigate('/dispatch')} 
            />
          </div>
        </div>

        {/* Right 1 Col: Urgent Emergencies & Hospitals */}
        <div className="flex flex-col space-y-4">
          {/* Active Emergencies Card */}
          <div className={`rounded-2xl p-4 border shadow-sm flex flex-col space-y-3 transition-colors ${
            isFriendly
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isFriendly ? 'text-slate-600' : 'text-slate-300'} flex items-center`}>
                <AlertCircle className="w-4 h-4 text-rose-500 mr-1.5" /> Recent Calls
              </h3>
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                View All &rarr;
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {activeIncidents.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No active emergency calls</div>
              ) : (
                activeIncidents.slice(0, 3).map((inc) => {
                  const isCrit = inc.priority.includes('Critical') || inc.priority.includes('P1');
                  return (
                    <div
                      key={inc.id}
                      onClick={() => navigate('/dispatch')}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isFriendly
                          ? 'bg-slate-50 hover:bg-indigo-50/50 border-slate-200'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inc.priority}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            {inc.patient_condition}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{inc.district_zone}</p>
                      </div>
                      <Send className="w-3.5 h-3.5 text-indigo-600 ml-2 flex-shrink-0" />
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => navigate('/dispatch')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Ambulances</span>
            </button>
          </div>

          {/* Hospital Bed Availability List */}
          <div className={`rounded-2xl p-4 border shadow-sm flex flex-col space-y-3 transition-colors ${
            isFriendly
              ? 'bg-white border-slate-200 text-slate-800'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isFriendly ? 'text-slate-600' : 'text-slate-300'} flex items-center`}>
                <Hospital className="w-4 h-4 text-indigo-600 mr-1.5" /> Hospital Beds
              </h3>
              <button
                onClick={() => navigate('/hospitals')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                All Hospitals &rarr;
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {state?.hospitals.slice(0, 3).map((hosp) => {
                const free = Math.max(0, hosp.usable_beds - hosp.occupied_beds);
                return (
                  <div
                    key={hosp.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isFriendly ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {hosp.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {hosp.free_icu_beds} ICU Beds Available
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {free} Free
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal & Toasts */}
      <QuickStartGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      {toastMessage && <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { 
  Layers, Navigation, Shield, AlertTriangle, 
  Hospital as HospIcon, Truck, MapPin, Zap, CheckCircle2,
  Compass, ArrowRight, RefreshCw, Send
} from 'lucide-react';
import { calculateRoute, assignIncident } from '../services/api';

export const DisasterMapPage: React.FC = () => {
  const { state, setState } = useEmergencyStore();
  const [selectedRoute, setSelectedRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [routeMode, setRouteMode] = useState<'safest' | 'fastest'>('safest');
  const [selectedAmbId, setSelectedAmbId] = useState<string>('');
  const [selectedHospId, setSelectedHospId] = useState<string>('');
  const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const ambulances = state?.ambulances || [];
  const hospitals = state?.hospitals || [];

  // Default selection
  useEffect(() => {
    if (ambulances.length > 0 && !selectedAmbId) {
      setSelectedAmbId(ambulances[0].id);
    }
    if (hospitals.length > 0 && !selectedHospId) {
      setSelectedHospId(hospitals[0].id);
    }
  }, [ambulances, hospitals, selectedAmbId, selectedHospId]);

  // Compute route whenever ambulance, hospital, or mode changes
  const handleCalculateShortestRoute = async (
    customOrigin?: [number, number],
    customDest?: [number, number],
    overrideSafety?: number
  ) => {
    setIsCalculating(true);
    setDispatchStatus(null);
    try {
      const amb = ambulances.find(a => a.id === selectedAmbId) || ambulances[0];
      const hosp = hospitals.find(h => h.id === selectedHospId) || hospitals[0];

      const origin: [number, number] = customOrigin || (amb ? amb.location : [85.83, 19.81]);
      const destination: [number, number] = customDest || (hosp ? hosp.location : [85.83, 19.82]);
      const safetyWeight = overrideSafety !== undefined ? overrideSafety : (routeMode === 'safest' ? 0.75 : 0.0);

      const res = await calculateRoute(origin, destination, safetyWeight);
      if (res && res.polyline) {
        setSelectedRoute(res.polyline);
        setRouteInfo(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle map click
  const handleMapClick = (lat: number, lon: number) => {
    setClickedLocation([lat, lon]);
    // Find nearest ambulance and compute route
    const amb = ambulances[0];
    if (amb) {
      handleCalculateShortestRoute(amb.location, [lon, lat]);
    }
  };

  // Handle direct popup routing
  const handleRouteBetween = (origin: [number, number], dest: [number, number]) => {
    handleCalculateShortestRoute(origin, dest);
  };

  const handleDispatchSelected = async () => {
    if (!selectedAmbId || !selectedHospId) return;
    try {
      await assignIncident('call_101', selectedAmbId, selectedHospId);
      setDispatchStatus(`Ambulance ${selectedAmbId} successfully dispatched!`);
      if (state) {
        setState({
          ...state,
          ambulances: state.ambulances.map(a => a.id === selectedAmbId ? { ...a, status: 'Dispatched' } : a)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Live Disaster Map & Shortest Route Navigator</h2>
            <p className="text-xs text-slate-400">
              Click anywhere on the map or select facilities below to calculate shortest & flood-safe ambulance routes
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCalculateShortestRoute()}
            disabled={isCalculating}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition"
          >
            <Navigation className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Calculating Route...' : 'Compute Shortest Route'}</span>
          </button>
          <button
            onClick={() => {
              setSelectedRoute(undefined);
              setRouteInfo(null);
              setClickedLocation(null);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Clear Map
          </button>
        </div>
      </div>

      {/* 2. Main Center Grid: Interactive Map + Route Inspector HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Main Interactive Leaflet Map */}
        <div className="lg:col-span-3 h-[560px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          <LeafletDisasterMap 
            state={state} 
            selectedRoute={selectedRoute}
            clickedPoint={clickedLocation}
            onMapClick={handleMapClick}
            onRouteBetween={handleRouteBetween}
            routeColor={routeMode === 'safest' ? '#06b6d4' : '#f59e0b'}
          />

          {/* Route Stats HUD Overlay on Map */}
          {routeInfo && (
            <div className="absolute top-16 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs max-w-xs text-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-cyan-400 flex items-center">
                  <Navigation className="w-3.5 h-3.5 mr-1 text-cyan-400" /> 
                  {routeMode === 'safest' ? 'Hazard-Aware Safe Route' : 'Fastest Shortest Path'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  {routeInfo.is_feasible ? 'Passable' : 'Blocked'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Estimated ETA</span>
                  <p className="text-lg font-black text-emerald-400">{routeInfo.total_time_min} min</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Total Distance</span>
                  <p className="text-lg font-black text-slate-100">{(routeInfo.total_distance_m / 1000).toFixed(1)} km</p>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Corridor Risk Score:</span>
                <span className={`font-bold ${routeInfo.average_risk < 0.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {routeInfo.average_risk} (Safe)
                </span>
              </div>

              {dispatchStatus ? (
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-[11px] font-semibold text-center">
                  {dispatchStatus}
                </div>
              ) : (
                <button
                  onClick={handleDispatchSelected}
                  className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Dispatch Ambulance on This Route</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Route & Facility Selector Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-bold text-slate-100 text-sm flex items-center">
              <Navigation className="w-4 h-4 text-cyan-400 mr-1.5" /> Route Configurator
            </h3>
            <p className="text-[11px] text-slate-400">Select ambulance & hospital to calculate</p>
          </div>

          {/* 1. Starting Ambulance */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center">
              <Truck className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Origin: Ambulance
            </label>
            <select
              value={selectedAmbId}
              onChange={(e) => setSelectedAmbId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
            >
              {ambulances.map((amb) => (
                <option key={amb.id} value={amb.id}>
                  {amb.callsign} ({amb.unit_type}) - {amb.status}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Destination Hospital */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center">
              <HospIcon className="w-3.5 h-3.5 text-blue-400 mr-1" /> Destination: Hospital
            </label>
            <select
              value={selectedHospId}
              onChange={(e) => setSelectedHospId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
            >
              {hospitals.map((hosp) => (
                <option key={hosp.id} value={hosp.id}>
                  {hosp.name} ({hosp.free_icu_beds} ICU, {hosp.has_power ? 'Power OK' : 'Outage'})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Routing Mode Toggle (Safe vs Fastest) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-300 font-semibold block">Optimization Priority</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRouteMode('safest');
                  handleCalculateShortestRoute(undefined, undefined, 0.75);
                }}
                className={`py-1.5 rounded-lg font-semibold text-center transition ${
                  routeMode === 'safest'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Flood-Safe
              </button>
              <button
                type="button"
                onClick={() => {
                  setRouteMode('fastest');
                  handleCalculateShortestRoute(undefined, undefined, 0.0);
                }}
                className={`py-1.5 rounded-lg font-semibold text-center transition ${
                  routeMode === 'fastest'
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Shortest
              </button>
            </div>
          </div>

          {/* 4. Nearby Facilities Quick List */}
          <div className="pt-2 border-t border-slate-800 space-y-2 flex-1 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Nearby Operational Hospitals
            </span>
            <div className="space-y-1.5">
              {hospitals.slice(0, 3).map((h) => {
                const freeBeds = Math.max(0, h.usable_beds - h.occupied_beds);
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHospId(h.id);
                      handleCalculateShortestRoute();
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedHospId === h.id
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold text-xs">
                      <span className="truncate">{h.name.replace('Puri District Headquarters Hospital', 'DHH Puri')}</span>
                      <span className="text-emerald-400 font-mono text-[11px]">{freeBeds} Beds</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>ICU: {h.free_icu_beds} Free</span>
                      <span className={h.has_power ? 'text-emerald-400' : 'text-red-400'}>
                        {h.has_power ? 'Power Active' : 'Power Outage'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { 
  Layers, Navigation, Shield, AlertTriangle, 
  Hospital as HospIcon, Truck, MapPin, Zap, CheckCircle2,
  Compass, ArrowRight, RefreshCw, Send, Crosshair, Radio, Sparkles
} from 'lucide-react';
import { calculateRoute, assignIncident } from '../services/api';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

export const DisasterMapPage: React.FC = () => {
  const { state, setState } = useEmergencyStore();
  const [selectedRoute, setSelectedRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [routeMode, setRouteMode] = useState<'safest' | 'fastest'>('safest');
  const [selectedAmbId, setSelectedAmbId] = useState<string>('');
  const [selectedHospId, setSelectedHospId] = useState<string>('');
  const [userLiveLocation, setUserLiveLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);

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

  // Handle Browser Live GPS Geolocation
  const handleUseLiveLocation = () => {
    setIsLocating(true);
    setLocationStatusMessage('Acquiring high-accuracy GPS fix from browser...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLiveLocation([lat, lon]);
          setIsLocating(false);
          setLocationStatusMessage(`Live GPS Locked: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);

          // Auto-select the nearest available ambulance
          const sortedAmbs = [...ambulances].sort((a, b) => {
            const distA = calculateDistanceKm(lat, lon, a.location[1], a.location[0]);
            const distB = calculateDistanceKm(lat, lon, b.location[1], b.location[0]);
            return distA - distB;
          });
          const nearestAvail = sortedAmbs.find(a => a.status === 'Available') || sortedAmbs[0];
          if (nearestAvail) setSelectedAmbId(nearestAvail.id);

          // Auto-select the nearest hospital with beds
          const sortedHosps = [...hospitals].sort((a, b) => {
            const distA = calculateDistanceKm(lat, lon, a.location[1], a.location[0]);
            const distB = calculateDistanceKm(lat, lon, b.location[1], b.location[0]);
            return distA - distB;
          });
          if (sortedHosps[0]) setSelectedHospId(sortedHosps[0].id);

          // Calculate shortest route from nearest ambulance to user's live location
          const originLoc = nearestAvail ? nearestAvail.location : undefined;
          handleCalculateShortestRoute(originLoc, [lon, lat]);
        },
        (error) => {
          console.warn('Geolocation access error, falling back to Puri Central EOC:', error);
          // Fallback location: Puri Coastal District Sector
          const fallbackLat = 19.8050;
          const fallbackLon = 85.8280;
          setUserLiveLocation([fallbackLat, fallbackLon]);
          setIsLocating(false);
          setLocationStatusMessage('Live GPS simulated at Puri Coastal Command Sector (19.8050°N, 85.8280°E)');
          
          const sortedAmbs = [...ambulances].sort((a, b) => {
            const distA = calculateDistanceKm(fallbackLat, fallbackLon, a.location[1], a.location[0]);
            const distB = calculateDistanceKm(fallbackLat, fallbackLon, b.location[1], b.location[0]);
            return distA - distB;
          });
          const nearestAvail = sortedAmbs.find(a => a.status === 'Available') || sortedAmbs[0];
          if (nearestAvail) setSelectedAmbId(nearestAvail.id);

          handleCalculateShortestRoute(nearestAvail?.location, [fallbackLon, fallbackLat]);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = 19.8050;
      const fallbackLon = 85.8280;
      setUserLiveLocation([fallbackLat, fallbackLon]);
      setIsLocating(false);
      setLocationStatusMessage('Live location set to Puri Urban Sector (19.8050°N, 85.8280°E)');
      handleCalculateShortestRoute(ambulances[0]?.location, [fallbackLon, fallbackLat]);
    }
  };

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
      const destination: [number, number] = customDest || (userLiveLocation ? [userLiveLocation[1], userLiveLocation[0]] : (hosp ? hosp.location : [85.83, 19.82]));
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

  // Handle manual map click
  const handleMapClick = (lat: number, lon: number) => {
    setUserLiveLocation([lat, lon]);
    setLocationStatusMessage(`Custom Pin: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
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

  // Compute nearby facilities sorted by distance to userLiveLocation (or center of Puri)
  const refLat = userLiveLocation ? userLiveLocation[0] : 19.8135;
  const refLon = userLiveLocation ? userLiveLocation[1] : 85.8312;

  const nearbyAmbulances = [...ambulances].map((a) => {
    const dist = calculateDistanceKm(refLat, refLon, a.location[1], a.location[0]);
    const estEtaMin = Number((dist / 0.6).toFixed(1)); // Approx 36 km/h in disaster zone
    return { ...a, distanceKm: dist, etaMin: estEtaMin };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearbyHospitals = [...hospitals].map((h) => {
    const dist = calculateDistanceKm(refLat, refLon, h.location[1], h.location[0]);
    const freeBeds = Math.max(0, h.usable_beds - h.occupied_beds);
    return { ...h, distanceKm: dist, freeBeds };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="space-y-4">
      {/* 1. Top Header Bar with Live Location Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Live GPS Disaster Map & Nearby Dispatch Navigator</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                GPS Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {locationStatusMessage || 'Use your live GPS location or click anywhere on the map to find nearby ambulances & hospitals'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live GPS Button */}
          <button
            onClick={handleUseLiveLocation}
            disabled={isLocating}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{isLocating ? 'Acquiring GPS...' : '📍 Use My Live GPS Location'}</span>
          </button>

          <button
            onClick={() => handleCalculateShortestRoute()}
            disabled={isCalculating}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition"
          >
            <Navigation className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>Compute Route</span>
          </button>

          <button
            onClick={() => {
              setSelectedRoute(undefined);
              setRouteInfo(null);
              setUserLiveLocation(null);
              setLocationStatusMessage(null);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 2. Live GPS Emergency Assistance Overview Card (When Live Location is Active) */}
      {userLiveLocation && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-emerald-500/30 p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-100">Live GPS Coordinate Lock</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {userLiveLocation[0].toFixed(4)}°N, {userLiveLocation[1].toFixed(4)}°E
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
                  {nearbyAmbulances.filter(a => a.status === 'Available').length} Available Ambulances in Sector
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Closest Ambulance: <strong className="text-emerald-400">{nearbyAmbulances[0]?.callsign || 'AMB-01'}</strong> ({nearbyAmbulances[0]?.distanceKm} km away, ETA <span className="text-emerald-400 font-bold">{nearbyAmbulances[0]?.etaMin} min</span>) &bull; Closest Hospital: <strong className="text-blue-400">{nearbyHospitals[0]?.name || 'DHH Puri'}</strong> ({nearbyHospitals[0]?.distanceKm} km away, <span className="text-emerald-400 font-semibold">{nearbyHospitals[0]?.freeBeds} Free Beds</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDispatchSelected}
              disabled={!selectedAmbId}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>1-Click Dispatch Nearest Ambulance</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Grid: Leaflet Map + Nearby Facilities HUD Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Leaflet Tactical Map */}
        <div className="lg:col-span-3 h-[580px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          <LeafletDisasterMap 
            state={state} 
            selectedRoute={selectedRoute}
            clickedPoint={userLiveLocation}
            onMapClick={handleMapClick}
            onRouteBetween={handleRouteBetween}
            routeColor={routeMode === 'safest' ? '#06b6d4' : '#f59e0b'}
          />

          {/* Route Stats HUD Overlay on Map */}
          {routeInfo && (
            <div className="absolute top-16 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-xs max-w-xs text-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-400 flex items-center">
                  <Navigation className="w-3.5 h-3.5 mr-1 text-cyan-400" /> 
                  {routeMode === 'safest' ? 'Flood-Safe Shortest Route' : 'Fastest Route'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {routeInfo.is_feasible ? 'Verified Safe' : 'Blocked'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Estimated ETA</span>
                  <p className="text-lg font-black text-emerald-400">{routeInfo.total_time_min} min</p>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Distance</span>
                  <p className="text-lg font-black text-slate-100">{(routeInfo.total_distance_m / 1000).toFixed(1)} km</p>
                </div>
              </div>

              <div className="p-2 bg-slate-950/80 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
                <span>Corridor Risk Score:</span>
                <span className={`font-bold ${routeInfo.average_risk < 0.2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {routeInfo.average_risk} (Low Risk)
                </span>
              </div>

              {dispatchStatus ? (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] font-semibold text-center">
                  {dispatchStatus}
                </div>
              ) : (
                <button
                  onClick={handleDispatchSelected}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Nearest Ambulance</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Nearby Ambulances & Hospitals Live List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col space-y-4 text-xs h-[580px] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-bold text-slate-100 text-sm flex items-center">
              <Radio className="w-4 h-4 text-cyan-400 mr-1.5 animate-pulse" /> Nearby Facility Telemetry
            </h3>
            <p className="text-[11px] text-slate-400">Ranked by proximity to your position</p>
          </div>

          {/* 1. Nearest Ambulances List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Truck className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Nearby Ambulances ({nearbyAmbulances.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Live GPS</span>
            </div>

            <div className="space-y-1.5">
              {nearbyAmbulances.slice(0, 3).map((a, idx) => {
                const isAvail = a.status === 'Available';
                const isSelected = selectedAmbId === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedAmbId(a.id);
                      handleCalculateShortestRoute(a.location);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center text-cyan-400">
                          #{idx + 1}
                        </span>
                        <span>{a.callsign}</span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isAvail ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                      <span>Distance: <strong className="text-slate-200">{a.distanceKm} km</strong></span>
                      <span>ETA: <strong className="text-emerald-400">{a.etaMin} min</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Nearest Hospitals List */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <HospIcon className="w-3.5 h-3.5 text-blue-400 mr-1" /> Nearby Hospitals ({nearbyHospitals.length})
              </span>
              <span className="text-[10px] text-blue-400 font-semibold">HMIS Feed</span>
            </div>

            <div className="space-y-1.5">
              {nearbyHospitals.slice(0, 3).map((h, idx) => {
                const isSelected = selectedHospId === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHospId(h.id);
                      handleCalculateShortestRoute(undefined, h.location);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/60 text-blue-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center space-x-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center text-blue-400 flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="truncate">{h.name.replace('Puri District Headquarters Hospital', 'DHH Puri')}</span>
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px] flex-shrink-0 ml-1">
                        {h.freeBeds} Beds
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                      <span>Dist: <strong className="text-slate-200">{h.distanceKm} km</strong></span>
                      <span>ICU: <strong className={h.free_icu_beds > 0 ? 'text-blue-400' : 'text-red-400'}>{h.free_icu_beds} Free</strong></span>
                      <span className={h.has_power ? 'text-emerald-400 font-semibold' : 'text-red-400 font-bold'}>
                        {h.has_power ? 'Power OK' : 'Outage'}
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

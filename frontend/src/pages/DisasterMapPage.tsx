import React, { useState, useEffect } from 'react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { 
  Layers, Navigation, Shield, AlertTriangle, 
  Hospital as HospIcon, Truck, MapPin, Zap, CheckCircle2,
  Compass, ArrowRight, RefreshCw, Send, Crosshair, Radio, Sparkles,
  Satellite, Flame, Eye, EyeOff, BatteryCharging, WifiOff
} from 'lucide-react';
import { calculateRoute, assignIncident } from '../services/api';
import { fetchLiveNearbyHospitals, generateNearbyAmbulances, calculateDistanceKm } from '../services/liveFacilities';

export const DisasterMapPage: React.FC = () => {
  const { state, setState, isOfflineNetworkCrash, setOfflineNetworkCrash } = useEmergencyStore();
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

  // Stitch Tactical Map Controls State
  const [baseLayer, setBaseLayer] = useState<'topo' | 'satellite' | 'thermal' | 'flood'>('topo');
  const [toggleLoraMesh, setToggleLoraMesh] = useState(true);
  const [toggleCellBlackout, setToggleCellBlackout] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [satTimer, setSatTimer] = useState('18m 42s');

  const ambulances = state?.ambulances || [];
  const hospitals = state?.hospitals || [];

  // 1. Automatically acquire and show Live GPS location immediately on mount
  useEffect(() => {
    handleUseLiveLocation();
  }, []);

  // Default selection
  useEffect(() => {
    if (ambulances.length > 0 && !selectedAmbId) {
      setSelectedAmbId(ambulances[0].id);
    }
    if (hospitals.length > 0 && !selectedHospId) {
      setSelectedHospId(hospitals[0].id);
    }
  }, [ambulances, hospitals, selectedAmbId, selectedHospId]);

  // Handle Browser Live GPS Geolocation with Real-Time Hospital Feed
  const handleUseLiveLocation = () => {
    setIsLocating(true);
    setLocationStatusMessage('Acquiring high-accuracy GNSS fix from sensor array...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLiveLocation([lat, lon]);
          setLocationStatusMessage(`GNSS Locked: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (±${Math.round(position.coords.accuracy || 4)}m) — Live Mesh Facilities Synced`);

          try {
            // Fetch real live hospitals around user's GPS coordinates
            const liveHosps = await fetchLiveNearbyHospitals(lat, lon);
            const liveAmbs = generateNearbyAmbulances(lat, lon);

            if (state) {
              setState({
                ...state,
                hospitals: liveHosps,
                ambulances: liveAmbs
              });
            }

            // Auto-select the nearest available ambulance
            const sortedAmbs = [...liveAmbs].sort((a, b) => {
              const distA = calculateDistanceKm(lat, lon, a.location[1], a.location[0]);
              const distB = calculateDistanceKm(lat, lon, b.location[1], b.location[0]);
              return distA - distB;
            });
            const nearestAvail = sortedAmbs.find(a => a.status === 'Available') || sortedAmbs[0];
            if (nearestAvail) setSelectedAmbId(nearestAvail.id);

            // Auto-select the nearest hospital with beds
            const sortedHosps = [...liveHosps].sort((a, b) => {
              const distA = calculateDistanceKm(lat, lon, a.location[1], a.location[0]);
              const distB = calculateDistanceKm(lat, lon, b.location[1], b.location[0]);
              return distA - distB;
            });
            if (sortedHosps[0]) setSelectedHospId(sortedHosps[0].id);

            // Calculate shortest route from nearest ambulance to user's live location
            const originLoc = nearestAvail ? nearestAvail.location : undefined;
            handleCalculateShortestRoute(originLoc, [lon, lat]);
          } catch (err) {
            console.error('Error updating live facilities:', err);
          } finally {
            setIsLocating(false);
          }
        },
        async (error) => {
          console.warn('Geolocation access error, showing demo sector coordinates:', error);
          const fallbackLat = 19.8050;
          const fallbackLon = 85.8280;
          setUserLiveLocation([fallbackLat, fallbackLon]);
          
          const liveHosps = await fetchLiveNearbyHospitals(fallbackLat, fallbackLon);
          const liveAmbs = generateNearbyAmbulances(fallbackLat, fallbackLon);
          if (state) {
            setState({
              ...state,
              hospitals: liveHosps,
              ambulances: liveAmbs
            });
          }
          setIsLocating(false);
          setLocationStatusMessage('Displaying Tactical Operational Sector (19.8050°N, 85.8280°E) — Offline Map Mode');
          handleCalculateShortestRoute(liveAmbs[0]?.location, [fallbackLon, fallbackLat]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = 19.8050;
      const fallbackLon = 85.8280;
      setUserLiveLocation([fallbackLat, fallbackLon]);
      setIsLocating(false);
      setLocationStatusMessage('Geolocation not supported — Displaying Tactical Grid Sector');
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
    setLocationStatusMessage(`Tactical Coordinate Fix: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
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

  // Compute nearby facilities sorted by distance to userLiveLocation
  const refLat = userLiveLocation ? userLiveLocation[0] : 19.8135;
  const refLon = userLiveLocation ? userLiveLocation[1] : 85.8312;

  const nearbyAmbulances = [...ambulances].map((a) => {
    const dist = calculateDistanceKm(refLat, refLon, a.location[1], a.location[0]);
    const estEtaMin = Number((dist / 0.6).toFixed(1));
    return { ...a, distanceKm: dist, etaMin: estEtaMin };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearbyHospitals = [...hospitals].map((h) => {
    const dist = calculateDistanceKm(refLat, refLon, h.location[1], h.location[0]);
    const freeBeds = Math.max(0, h.usable_beds - h.occupied_beds);
    return { ...h, distanceKm: dist, freeBeds };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-on-surface">
      
      {/* 1. Stitch Top Telemetry & Sensor Ribbon */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 bg-surface-container-lowest p-2 rounded-xl border border-surface-container-high shadow-md">
        {/* Primary Coordinate Fix */}
        <div className="xl:col-span-5 flex flex-wrap items-center justify-between gap-3 bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container-high/50">
          <div className="flex items-center gap-2">
            <Crosshair className={`w-4 h-4 text-secondary ${isLocating ? 'animate-spin' : 'animate-pulse'}`} />
            <div className="flex flex-col">
              <span className="font-label-caps text-on-surface-variant text-[9px] uppercase">Tactical Pos Watcher</span>
              <div className="flex items-center gap-1.5">
                <span className="font-telemetry-lg text-on-surface font-bold font-mono">
                  {userLiveLocation ? `${userLiveLocation[0].toFixed(4)}° N, ${userLiveLocation[1].toFixed(4)}° E` : '19.8135° N, 85.8312° E'}
                </span>
                <span className="bg-secondary/20 text-secondary text-[9px] font-telemetry-sm px-1.5 py-0.2 rounded uppercase font-bold font-mono">
                  WGS-84
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="font-label-caps text-on-surface-variant text-[9px] uppercase">Elev / Accuracy</span>
              <span className="font-telemetry-md text-on-surface font-mono">920m <span className="text-secondary font-bold">±4.2m</span></span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-caps text-on-surface-variant text-[9px] uppercase">Lock Status</span>
              <span className="font-telemetry-sm text-secondary flex items-center justify-end gap-1 font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 3D-DGPS
              </span>
            </div>
          </div>
        </div>

        {/* Sensor Vector / Bearing / Battery */}
        <div className="xl:col-span-4 flex items-center justify-around bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container-high/50 gap-2">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-tertiary" />
            <div className="flex flex-col">
              <span className="font-label-caps text-on-surface-variant text-[9px]">Bearing</span>
              <span className="font-telemetry-md text-tertiary font-bold font-mono">042° NE</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-secondary" />
            <div className="flex flex-col">
              <span className="font-label-caps text-on-surface-variant text-[9px]">Chassis Batt</span>
              <span className="font-telemetry-md text-on-surface font-bold font-mono">88% <span className="text-[10px] text-secondary">24.2V</span></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Satellite className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-label-caps text-on-surface-variant text-[9px]">Iridium Pass</span>
              <span className="font-telemetry-md text-primary font-bold font-mono">{satTimer}</span>
            </div>
          </div>
        </div>

        {/* Tile Cache & Precision Filter */}
        <div className="xl:col-span-3 flex items-center justify-between bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container-high/50">
          <div className="flex flex-col">
            <span className="font-label-caps text-on-surface-variant text-[9px]">Offline Cache</span>
            <div className="flex items-center gap-1">
              <span className="font-telemetry-sm text-on-surface font-bold font-mono">PURI-URBAN (48MB)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
            </div>
            <span className="font-telemetry-sm text-[9px] text-secondary font-mono">7D TTL • 12,480 TILES</span>
          </div>

          <button
            onClick={() => setIsStealthMode(!isStealthMode)}
            className={`px-2 py-1 rounded flex items-center gap-1 font-label-caps text-[10px] transition border ${
              isStealthMode 
                ? 'bg-error-container text-on-error-container border-primary' 
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-surface-container-high'
            }`}
          >
            {isStealthMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-secondary" />}
            <span>{isStealthMode ? 'STEALTH ON' : 'STEALTH'}</span>
          </button>
        </div>
      </div>

      {/* 2. Stitch Map Control Sub-Header & Tactical Layers */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-surface-container-high shadow-sm">
        {/* Layer Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase pr-1 hidden md:inline">Base Layer:</span>
          
          <button
            onClick={() => setBaseLayer('topo')}
            className={`px-2.5 py-1 rounded font-telemetry-sm text-[11px] font-bold flex items-center gap-1 transition ${
              baseLayer === 'topo'
                ? 'bg-surface-container-high text-secondary border border-secondary/40 shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Layers className="w-3 h-3" /> TOPO CONTOUR
          </button>

          <button
            onClick={() => setBaseLayer('satellite')}
            className={`px-2.5 py-1 rounded font-telemetry-sm text-[11px] font-bold flex items-center gap-1 transition ${
              baseLayer === 'satellite'
                ? 'bg-surface-container-high text-secondary border border-secondary/40 shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Satellite className="w-3 h-3" /> SATELLITE
          </button>

          <button
            onClick={() => setBaseLayer('thermal')}
            className={`px-2.5 py-1 rounded font-telemetry-sm text-[11px] font-bold flex items-center gap-1 transition ${
              baseLayer === 'thermal'
                ? 'bg-surface-container-high text-tertiary border border-tertiary/40 shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Flame className="w-3 h-3" /> THERMAL IR
          </button>

          <button
            onClick={() => setBaseLayer('flood')}
            className={`px-2.5 py-1 rounded font-telemetry-sm text-[11px] font-bold flex items-center gap-1 transition ${
              baseLayer === 'flood'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-error-container/30 text-primary hover:bg-error-container/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" /> FLOOD INUNDATION
          </button>
        </div>

        {/* Tactical Mesh & Telemetry Overlays */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded cursor-pointer select-none border border-surface-container-high">
            <input
              type="checkbox"
              checked={toggleLoraMesh}
              onChange={(e) => setToggleLoraMesh(e.target.checked)}
              className="accent-secondary h-3 w-3"
            />
            <span className="font-telemetry-sm text-[10px] text-on-surface uppercase font-mono">LoRa RF (865MHz)</span>
          </label>

          <label className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded cursor-pointer select-none border border-surface-container-high">
            <input
              type="checkbox"
              checked={isOfflineNetworkCrash}
              onChange={(e) => setOfflineNetworkCrash(e.target.checked)}
              className="accent-primary h-3 w-3"
            />
            <span className="font-telemetry-sm text-[10px] text-primary uppercase font-mono font-bold">Cellular Blackout</span>
          </label>

          <button
            onClick={handleUseLiveLocation}
            disabled={isLocating}
            className="px-3 py-1 bg-gradient-to-r from-secondary-container to-secondary text-surface font-bold rounded font-headline-sm text-xs transition flex items-center gap-1 shadow-sm"
          >
            <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>MY GPS</span>
          </button>
        </div>
      </div>

      {/* 3. Main Grid: Leaflet Map + Tactical Facilities HUD Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8/12 Cols: Leaflet Tactical Map */}
        <div className="lg:col-span-8 h-[600px] relative rounded-xl overflow-hidden shadow-2xl border border-surface-container-high">
          <LeafletDisasterMap 
            state={state} 
            selectedRoute={selectedRoute}
            clickedPoint={userLiveLocation}
            onMapClick={handleMapClick}
            onRouteBetween={handleRouteBetween}
            routeColor={routeMode === 'safest' ? '#4cd7f6' : '#ffb95f'}
          />

          {/* Route Stats HUD Overlay on Map */}
          {routeInfo && (
            <div className="absolute top-14 left-3 z-[1000] bg-surface-container-lowest/95 backdrop-blur-md p-4 rounded-xl border border-surface-container-high shadow-2xl text-xs max-w-xs text-on-surface space-y-2.5">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                <span className="font-bold text-secondary flex items-center">
                  <Navigation className="w-3.5 h-3.5 mr-1 text-secondary" /> 
                  {routeMode === 'safest' ? 'Flood-Safe Shortest Corridor' : 'Fastest Route'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-label-caps bg-secondary/20 text-secondary font-bold">
                  {routeInfo.is_feasible ? 'PATH VERIFIED' : 'HAZARD BLOCKED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-surface-container-low rounded-lg border border-surface-container-high">
                  <span className="text-on-surface-variant text-[10px] block font-label-caps">Estimated ETA</span>
                  <p className="text-base font-bold text-secondary">{routeInfo.total_time_min} min</p>
                </div>
                <div className="p-2 bg-surface-container-low rounded-lg border border-surface-container-high">
                  <span className="text-on-surface-variant text-[10px] block font-label-caps">Total Distance</span>
                  <p className="text-base font-bold text-on-surface">{(routeInfo.total_distance_m / 1000).toFixed(1)} km</p>
                </div>
              </div>

              <div className="p-2 bg-surface-container-low/80 rounded-lg text-[11px] text-on-surface-variant flex items-center justify-between font-telemetry-sm">
                <span>Corridor Inundation Risk:</span>
                <span className={`font-bold ${routeInfo.average_risk < 0.2 ? 'text-secondary' : 'text-tertiary'}`}>
                  {routeInfo.average_risk} (Low Risk)
                </span>
              </div>

              {dispatchStatus ? (
                <div className="p-2.5 bg-secondary/20 border border-secondary/40 rounded-lg text-secondary text-[11px] font-semibold text-center font-telemetry-sm">
                  {dispatchStatus}
                </div>
              ) : (
                <button
                  onClick={handleDispatchSelected}
                  className="w-full py-2 bg-gradient-to-r from-secondary-container to-secondary text-surface font-bold rounded-lg shadow-md transition flex items-center justify-center space-x-1.5 font-headline-sm text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Unit to Target</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right 4/12 Cols: Tactical Node Proximity HUD */}
        <div className="lg:col-span-4 bg-surface-container-low border border-surface-container-high rounded-xl p-4 shadow-xl flex flex-col space-y-3.5 text-xs h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-surface-container-high pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="font-headline-sm text-xs font-bold text-on-surface flex items-center uppercase">
                <Radio className="w-4 h-4 text-secondary mr-1.5 animate-pulse" /> Field Node Grid Telemetry
              </h3>
              <p className="text-[10px] text-on-surface-variant font-telemetry-sm">Proximity sorted from high-accuracy GNSS fix</p>
            </div>
            <button
              onClick={handleUseLiveLocation}
              disabled={isLocating}
              title="Refresh Live Location and Facilities"
              className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-secondary transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 1. Nearest Ambulances List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant tracking-wider flex items-center">
                <Truck className="w-3.5 h-3.5 text-secondary mr-1" /> Mobile Fleet Units ({nearbyAmbulances.length})
              </span>
              <span className="font-telemetry-sm text-[9px] px-1.5 py-0.2 rounded bg-secondary/20 text-secondary font-bold font-mono">
                ACTIVE
              </span>
            </div>

            <div className="space-y-1.5">
              {nearbyAmbulances.map((a, idx) => {
                const isAvail = a.status === 'Available';
                const isSelected = selectedAmbId === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedAmbId(a.id);
                      handleCalculateShortestRoute(a.location);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-surface-container-high border-secondary text-secondary shadow-md'
                        : 'bg-surface-container-lowest border-surface-container-high/60 hover:border-secondary/50 text-on-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded bg-surface-container text-[10px] font-bold flex items-center justify-center text-secondary font-mono">
                          #{idx + 1}
                        </span>
                        <span className="font-bold font-mono">{a.callsign}</span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-telemetry-sm text-[10px] font-bold ${
                        isAvail ? 'bg-secondary/20 text-secondary' : 'bg-tertiary/20 text-tertiary'
                      }`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="flex justify-between font-telemetry-sm text-on-surface-variant mt-1">
                      <span>Distance: <strong className="text-on-surface font-mono">{a.distanceKm} km</strong></span>
                      <span>ETA: <strong className="text-secondary font-bold font-mono">{a.etaMin} min</strong></span>
                    </div>

                    <div className="flex items-center justify-between font-telemetry-sm text-[9px] text-on-surface-variant mt-1 pt-1 border-t border-surface-container-high/40">
                      <span>Unit: {a.unit_type || 'ALS'} Tier</span>
                      <span className="text-secondary font-bold">Trace Tactical Route &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Nearest Hospitals List */}
          <div className="space-y-2 pt-2 border-t border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant tracking-wider flex items-center">
                <HospIcon className="w-3.5 h-3.5 text-tertiary mr-1" /> Trauma Hubs & Clinics ({nearbyHospitals.length})
              </span>
              <span className="font-telemetry-sm text-[9px] px-1.5 py-0.2 rounded bg-tertiary/20 text-tertiary font-bold font-mono">
                HMIS LIVE
              </span>
            </div>

            <div className="space-y-1.5">
              {nearbyHospitals.map((h, idx) => {
                const isSelected = selectedHospId === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHospId(h.id);
                      handleCalculateShortestRoute(undefined, h.location);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-surface-container-high border-tertiary text-tertiary shadow-md'
                        : 'bg-surface-container-lowest border-surface-container-high/60 hover:border-tertiary/50 text-on-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span className="flex items-center space-x-1.5 truncate">
                        <span className="w-4 h-4 rounded bg-surface-container text-[10px] font-bold flex items-center justify-center text-tertiary flex-shrink-0 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="truncate font-bold">{h.name.replace('Puri District Headquarters Hospital', 'DHH Puri')}</span>
                      </span>
                      <span className="text-secondary font-mono text-[10px] font-bold flex-shrink-0 ml-1">
                        {h.freeBeds} Beds
                      </span>
                    </div>

                    <div className="flex justify-between font-telemetry-sm text-on-surface-variant mt-1">
                      <span>Dist: <strong className="text-on-surface font-mono">{h.distanceKm} km</strong></span>
                      <span>ICU: <strong className={h.free_icu_beds > 0 ? 'text-secondary font-mono' : 'text-primary font-mono'}>{h.free_icu_beds} Free</strong></span>
                      <span className={h.has_power ? 'text-secondary font-mono' : 'text-primary font-mono font-bold'}>
                        {h.has_power ? '⚡ Grid OK' : '⚠ Outage'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-telemetry-sm text-[9px] text-on-surface-variant mt-1 pt-1 border-t border-surface-container-high/40">
                      <span className="truncate">{h.specialties?.slice(0, 2).join(', ') || 'Emergency Trauma'}</span>
                      <span className="text-tertiary font-bold">Select Trauma Hub &rarr;</span>
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

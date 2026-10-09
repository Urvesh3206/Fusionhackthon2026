import React, { useState } from 'react';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { LeafletDisasterMap } from '../components/Map/LeafletDisasterMap';
import { 
  Layers, Filter, Eye, Navigation, Shield, AlertTriangle, 
  Hospital as HospIcon, Truck, Users, Activity
} from 'lucide-react';
import { calculateRoute } from '../services/api';

export const DisasterMapPage: React.FC = () => {
  const { state } = useEmergencyStore();
  const [selectedRoute, setSelectedRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const handleTestRoute = async () => {
    // Route from Puri Beach Road to DHH Puri avoiding flooded links
    const origin: [number, number] = [85.83, 19.80];
    const destination: [number, number] = [85.83, 19.82];
    try {
      const res = await calculateRoute(origin, destination, 0.5);
      if (res && res.polyline) {
        setSelectedRoute(res.polyline);
        setRouteInfo(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-4">
      {/* Top Map Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200">Interactive Tactical Map Grid</span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            CARTO DarkMatter &bull; PostGIS &bull; Leaflet 1.9
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestRoute}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Trace Safe Emergency Route</span>
          </button>
          <button
            onClick={() => setSelectedRoute(undefined)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Clear Route
          </button>
        </div>
      </div>

      {/* Main Map View Container */}
      <div className="flex-1 w-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
        <LeafletDisasterMap state={state} selectedRoute={selectedRoute} />

        {/* Route Info Overlay if active */}
        {routeInfo && (
          <div className="absolute top-16 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl text-xs max-w-xs text-slate-200 space-y-1">
            <p className="font-bold text-cyan-400 flex items-center">
              <Navigation className="w-3.5 h-3.5 mr-1" /> Hazard-Aware Route Solved
            </p>
            <p>ETA: <span className="font-semibold text-white">{routeInfo.total_time_min} min</span></p>
            <p>Distance: <span className="font-semibold text-white">{(routeInfo.total_distance_m / 1000).toFixed(1)} km</span></p>
            <p>Corridor Risk Score: <span className="font-semibold text-emerald-400">{routeInfo.average_risk}</span> (Safe)</p>
            <p className="text-[10px] text-slate-400 mt-1 italic">Avoided flooded Kushabhadra & Bhargavi bridges.</p>
          </div>
        )}
      </div>
    </div>
  );
};

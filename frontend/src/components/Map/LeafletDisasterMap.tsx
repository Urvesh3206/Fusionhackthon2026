import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FullSystemState, Ambulance, Hospital, EmergencyCall, Shelter } from '../../types';
import { 
  Shield, AlertTriangle, Hospital as HospitalIcon, 
  Navigation, Truck, CheckCircle, Flame, Droplets, MapPin, Send
} from 'lucide-react';

// Google Maps Style SVG Icons
function createHospitalIcon(isDerated: boolean = false) {
  const svg = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background-color: ${isDerated ? '#dc2626' : '#ea4335'};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
        color: #ffffff;
        font-weight: 900;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        H
      </div>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

function createAmbulanceIcon(isAvailable: boolean = true) {
  const svg = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background-color: ${isAvailable ? '#059669' : '#d97706'};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
        font-size: 16px;
      ">
        🚑
      </div>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function createLiveGpsUserIcon() {
  const svg = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(26, 115, 232, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 18px; height: 18px; border-radius: 50%; background: #1a73e8; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.5); z-index: 10;"></div>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

function createIncidentIcon(isCrit: boolean = true) {
  const svg = `
    <div style="
      background-color: ${isCrit ? '#dc2626' : '#ea580c'};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 10px rgba(220, 38, 38, 0.6);
      font-size: 15px;
    ">
      🚨
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin critical-pin-pulse',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

function createShelterIcon() {
  const svg = `
    <div style="
      background-color: #7c3aed;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
      font-size: 14px;
    ">
      ⛺
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18]
  });
}

const hospIconNormal = createHospitalIcon(false);
const hospIconDerated = createHospitalIcon(true);
const ambIconAvail = createAmbulanceIcon(true);
const ambIconBusy = createAmbulanceIcon(false);
const callIconCrit = createIncidentIcon(true);
const callIconUrgent = createIncidentIcon(false);
const shelterIcon = createShelterIcon();
const customClickIcon = createLiveGpsUserIcon();

export type BasemapType = 'street' | 'osm' | 'satellite' | 'dark';

const BASEMAP_PROVIDERS: Record<BasemapType, { name: string; url: string; attribution: string }> = {
  street: {
    name: '🗺️ Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, OpenStreetMap'
  },
  osm: {
    name: '🌐 OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: '🛰️ Satellite Hybrid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar'
  },
  dark: {
    name: '🌙 Dark Mode',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> & OpenStreetMap'
  }
};

interface DisasterMapProps {
  state: FullSystemState | null;
  selectedRoute?: [number, number][];
  routeColor?: string;
  clickedPoint?: [number, number] | null;
  onMapClick?: (lat: number, lon: number) => void;
  onSelectIncident?: (id: string) => void;
  onSelectVehicle?: (id: string) => void;
  onSelectHospital?: (id: string) => void;
  onRouteBetween?: (origin: [number, number], destination: [number, number]) => void;
}

function MapViewController({ 
  center, 
  zoom, 
  clickedPoint, 
  selectedRoute 
}: { 
  center: [number, number]; 
  zoom: number; 
  clickedPoint?: [number, number] | null;
  selectedRoute?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedRoute && selectedRoute.length > 1) {
      try {
        const bounds = L.latLngBounds(selectedRoute.map(pt => [pt[1], pt[0]]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    } else if (clickedPoint) {
      map.flyTo(clickedPoint, 13, { duration: 1.2 });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, clickedPoint, selectedRoute, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export const LeafletDisasterMap: React.FC<DisasterMapProps> = ({
  state,
  selectedRoute,
  routeColor = '#06b6d4',
  clickedPoint,
  onMapClick,
  onSelectIncident,
  onSelectVehicle,
  onSelectHospital,
  onRouteBetween
}) => {
  const defaultCenter: [number, number] = [19.8135, 85.8312]; // Puri District Coordinates [lat, lon]
  const [basemap, setBasemap] = useState<BasemapType>('street');
  const [activeLayers, setActiveLayers] = useState({
    hazards: true,
    ambulances: true,
    hospitals: true,
    incidents: true,
    shelters: true,
    closures: true,
  });

  const ambulances = state?.ambulances || [];
  const hospitals = state?.hospitals || [];
  const emergency_calls = state?.emergency_calls || [];
  const shelters = state?.shelters || [];
  const road_edges = state?.road_edges || [];
  const forecast = state?.forecast || null;

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Telemetry Status Indicator Pill if state is still loading */}
      {!state && (
        <div className="absolute top-14 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-300 text-xs shadow-lg flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Synchronizing Telemetry Grid...</span>
        </div>
      )}
      
      {/* Top Map Layer Control Bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-xl text-xs flex flex-wrap gap-2 text-slate-200">
        <span className="font-semibold text-slate-400 flex items-center mr-1">
          <Shield className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Layers:
        </span>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.hazards}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, hazards: e.target.checked }))}
            className="rounded bg-slate-800 text-cyan-500 border-slate-700"
          />
          <span className="text-amber-400 font-medium">Hazards & Surge</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.incidents}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, incidents: e.target.checked }))}
            className="rounded bg-slate-800 text-red-500 border-slate-700"
          />
          <span className="text-red-400 font-medium">Incidents ({emergency_calls.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.ambulances}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, ambulances: e.target.checked }))}
            className="rounded bg-slate-800 text-emerald-500 border-slate-700"
          />
          <span className="text-emerald-400 font-medium">Fleet ({ambulances.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.hospitals}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, hospitals: e.target.checked }))}
            className="rounded bg-slate-800 text-blue-500 border-slate-700"
          />
          <span className="text-rose-400 font-medium">Hospitals ({hospitals.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.shelters}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, shelters: e.target.checked }))}
            className="rounded bg-slate-800 text-purple-500 border-slate-700"
          />
          <span className="text-purple-400 font-medium">Shelters ({shelters.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.closures}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, closures: e.target.checked }))}
            className="rounded bg-slate-800 text-rose-500 border-slate-700"
          />
          <span className="text-rose-400 font-medium">Closed Roads ({road_edges.filter(e => e.is_closed).length})</span>
        </label>
      </div>

      {/* Top Right Basemap Style Switcher (Google Street Map, OSM, Satellite, Dark) */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-xl text-xs flex items-center space-x-1.5">
        {(['street', 'osm', 'satellite', 'dark'] as BasemapType[]).map((type) => (
          <button
            key={type}
            onClick={() => setBasemap(type)}
            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
              basemap === type
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {BASEMAP_PROVIDERS[type].name}
          </button>
        ))}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapViewController 
          center={defaultCenter} 
          zoom={12} 
          clickedPoint={clickedPoint} 
          selectedRoute={selectedRoute} 
        />
        <MapResizer />
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Vibrant High-Detail Map Tiles (Default: Google Maps style Street Map) */}
        <TileLayer
          key={basemap}
          attribution={BASEMAP_PROVIDERS[basemap].attribution}
          url={BASEMAP_PROVIDERS[basemap].url}
          maxZoom={19}
        />

        {/* 1. Road Network & Inundation Closures */}
        {road_edges.map((edge) => {
          if (!edge || !Array.isArray(edge.geometry) || edge.geometry.length < 2) return null;
          const latLngs: [number, number][] = edge.geometry
            .filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
            .map(pt => [pt[1], pt[0]]);
          if (latLngs.length < 2) return null;
          const isClosed = edge.is_closed || edge.failure_prob >= 0.50;
          
          if (isClosed && activeLayers.closures) {
            return (
              <Polyline
                key={`edge-${edge.id}`}
                positions={latLngs}
                pathOptions={{
                  color: '#ef4444',
                  weight: 5,
                  dashArray: '8, 8',
                  opacity: 0.95
                }}
              >
                <Popup>
                  <div className="text-xs p-1 min-w-[180px]">
                    <p className="font-bold text-red-600 flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Road Closed / Impassable
                    </p>
                    <p className="font-semibold text-slate-800">{edge.name}</p>
                    <p className="text-slate-600">Failure Probability: {(edge.failure_prob * 100).toFixed(0)}%</p>
                    <p className="text-slate-500 mt-1 italic">{edge.closure_reason || 'Water level exceeded bridge elevation threshold.'}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          }
          return null;
        })}

        {/* 2. Selected Shortest / Safest Route with Animated Glowing Polyline */}
        {selectedRoute && Array.isArray(selectedRoute) && selectedRoute.length > 1 && (
          <Polyline
            positions={selectedRoute
              .filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
              .map(pt => [pt[1], pt[0]])}
            pathOptions={{
              color: routeColor,
              weight: 6,
              opacity: 0.95
            }}
          />
        )}

        {/* 3. User Live GPS / Clicked Location Marker & Satellite Accuracy Circle */}
        {clickedPoint && Array.isArray(clickedPoint) && clickedPoint.length >= 2 && !isNaN(clickedPoint[0]) && !isNaN(clickedPoint[1]) && (
          <>
            <Circle
              center={clickedPoint}
              radius={600}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.18,
                weight: 1.5,
                dashArray: '4, 4'
              }}
            />
            <Marker position={clickedPoint} icon={customClickIcon}>
              <Popup>
                <div className="p-1.5 text-xs min-w-[200px]">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <p className="font-bold text-cyan-800 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Live GPS Location
                    </p>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                      DIRECT SATELLITE FIX
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1 font-mono text-[11px]">
                    {clickedPoint[0].toFixed(4)}°N, {clickedPoint[1].toFixed(4)}°E
                  </p>
                  <p className="text-slate-500 mt-1 text-[10px]">
                    Showing nearest emergency ambulances and hospitals ranked by direct response time.
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 4. Hazard Overlay */}
        {activeLayers.hazards && forecast && (
          <>
            {forecast.cone_polygon && Array.isArray(forecast.cone_polygon) && forecast.cone_polygon.length >= 3 && (
              <Polygon
                positions={forecast.cone_polygon
                  .filter(pt => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
                  .map(pt => [pt[1], pt[0]])}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
            )}
            <Circle
              center={[19.85, 85.87]}
              radius={3500}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: forecast.river_discharge_m3s > 800 ? 0.30 : 0.10,
                weight: 1.5
              }}
            />
          </>
        )}

        {/* 5. Ambulances with Interactive Routing */}
        {activeLayers.ambulances && ambulances.map((amb) => {
          if (!amb || !Array.isArray(amb.location) || amb.location.length < 2 || isNaN(amb.location[0]) || isNaN(amb.location[1])) {
            return null;
          }
          const lat = amb.location[1];
          const lon = amb.location[0];
          const isAvail = amb.status === 'Available';
          return (
            <Marker
              key={`amb-${amb.id}`}
              position={[lat, lon]}
              icon={isAvail ? ambIconAvail : ambIconBusy}
              eventHandlers={{
                click: () => onSelectVehicle?.(amb.id)
              }}
            >
              <Popup>
                <div className="p-1 text-xs min-w-[200px]">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{amb.callsign}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {amb.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">Tier: {amb.unit_type} (Advanced Life Support)</p>
                  <p className="text-slate-500">Telemetry: {amb.data_age_sec}s ago (GPS Direct)</p>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => onRouteBetween?.([lon, lat], [85.83, 19.82])}
                      className="w-full py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded text-[11px] flex items-center justify-center space-x-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Trace Route to Nearest Hospital</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Hospitals with Capacity & Direct Routing */}
        {activeLayers.hospitals && hospitals.map((hosp) => {
          if (!hosp || !Array.isArray(hosp.location) || hosp.location.length < 2 || isNaN(hosp.location[0]) || isNaN(hosp.location[1])) {
            return null;
          }
          const lat = hosp.location[1];
          const lon = hosp.location[0];
          const isDerated = !hosp.has_power || hosp.free_icu_beds === 0 || !hosp.has_comms;
          const availableBeds = Math.max(0, hosp.usable_beds - hosp.occupied_beds);
          return (
            <Marker
              key={`hosp-${hosp.id}`}
              position={[lat, lon]}
              icon={isDerated ? hospIconDerated : hospIconNormal}
              eventHandlers={{
                click: () => onSelectHospital?.(hosp.id)
              }}
            >
              <Popup>
                <div className="p-1 text-xs min-w-[210px]">
                  <p className="font-bold text-slate-900">{hosp.name}</p>
                  <div className="mt-1 space-y-0.5 text-slate-700">
                    <p>Free Beds: <span className="font-semibold text-emerald-600">{availableBeds} / {hosp.usable_beds}</span></p>
                    <p>Free ICU: <span className={`font-semibold ${hosp.free_icu_beds > 0 ? 'text-blue-600' : 'text-red-600'}`}>{hosp.free_icu_beds} beds</span></p>
                    <p>Power Mode: <span className={hosp.has_power ? 'text-emerald-600 font-medium' : 'text-rose-600 font-bold'}>{hosp.has_power ? 'Grid Active' : 'POWER OUTAGE / TRIP'}</span></p>
                    {isDerated && (
                      <p className="text-rose-700 bg-rose-50 p-1 rounded font-medium mt-1">
                        Derating: {hosp.status_reason}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => onRouteBetween?.([85.83, 19.81], [lon, lat])}
                      className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] flex items-center justify-center space-x-1"
                    >
                      <Truck className="w-3 h-3" />
                      <span>Route Nearest Ambulance Here</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 7. Emergency Incidents */}
        {activeLayers.incidents && emergency_calls.map((call) => {
          if (!call || !Array.isArray(call.location) || call.location.length < 2 || isNaN(call.location[0]) || isNaN(call.location[1])) {
            return null;
          }
          const lat = call.location[1];
          const lon = call.location[0];
          const isCrit = call.priority.includes('Critical') || call.priority.includes('P1');
          return (
            <Marker
              key={`call-${call.id}`}
              position={[lat, lon]}
              icon={isCrit ? callIconCrit : callIconUrgent}
              eventHandlers={{
                click: () => onSelectIncident?.(call.id)
              }}
            >
              <Popup>
                <div className="p-1 text-xs min-w-[210px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-600">{call.priority}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">{call.status}</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">{call.patient_condition}</p>
                  <p className="text-slate-600">Zone: {call.district_zone}</p>
                  <p className="text-slate-500">Specialty Required: {call.required_specialty}</p>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => onRouteBetween?.([85.84, 19.82], [lon, lat])}
                      className="w-full py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px] flex items-center justify-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Dispatch Nearest Ambulance</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 8. Shelters */}
        {activeLayers.shelters && shelters.map((s) => {
          if (!s || !Array.isArray(s.location) || s.location.length < 2 || isNaN(s.location[0]) || isNaN(s.location[1])) {
            return null;
          }
          const lat = s.location[1];
          const lon = s.location[0];
          return (
            <Marker key={`shelter-${s.id}`} position={[lat, lon]} icon={shelterIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-purple-900">{s.name}</p>
                  <p className="text-slate-700">Capacity: {s.current_occupancy} / {s.capacity}</p>
                  <p className="text-slate-600">Remaining: <span className="font-semibold text-emerald-600">{s.capacity - s.current_occupancy}</span></p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay in Bottom Right */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1">
        <p className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Map Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white"></span>
          <span>Available Ambulance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white"></span>
          <span>Critical Emergency Call</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white"></span>
          <span>District Hospital</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-0.5 bg-red-500 inline-block border-b-2 border-dashed border-red-500"></span>
          <span>Flooded / Closed Road</span>
        </div>
      </div>
    </div>
  );
};

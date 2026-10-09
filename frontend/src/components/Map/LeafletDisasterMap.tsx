import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FullSystemState, Ambulance, Hospital, EmergencyCall, Shelter } from '../../types';
import { Shield, AlertTriangle, Hospital as HospitalIcon, Navigation, Home, Activity, CheckCircle, Flame, Droplets } from 'lucide-react';

// Custom SVG Icons
function createCustomIcon(color: string, label: string, iconType: string) {
  const svg = `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
      color: white;
      font-weight: bold;
      font-size: 11px;
    ">
      ${iconType === 'amb' ? '🚑' : iconType === 'hosp' ? '🏥' : iconType === 'call' ? '🚨' : iconType === 'shelter' ? '⛺' : '📍'}
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

const ambIconAvail = createCustomIcon('#10b981', 'A', 'amb');
const ambIconBusy = createCustomIcon('#f59e0b', 'B', 'amb');
const hospIconNormal = createCustomIcon('#3b82f6', 'H', 'hosp');
const hospIconDerated = createCustomIcon('#ef4444', 'H!', 'hosp');
const callIconCrit = createCustomIcon('#dc2626', 'P1', 'call');
const callIconUrgent = createCustomIcon('#f97316', 'P2', 'call');
const shelterIcon = createCustomIcon('#8b5cf6', 'S', 'shelter');
const clinicIcon = createCustomIcon('#06b6d4', 'C', 'clinic');

interface DisasterMapProps {
  state: FullSystemState | null;
  selectedRoute?: [number, number][];
  onSelectIncident?: (id: string) => void;
  onSelectVehicle?: (id: string) => void;
  onSelectHospital?: (id: string) => void;
}

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const LeafletDisasterMap: React.FC<DisasterMapProps> = ({
  state,
  selectedRoute,
  onSelectIncident,
  onSelectVehicle,
  onSelectHospital
}) => {
  const defaultCenter: [number, number] = [19.8135, 85.8312]; // Puri District Coordinates [lat, lon]
  const [activeLayers, setActiveLayers] = useState({
    hazards: true,
    ambulances: true,
    hospitals: true,
    incidents: true,
    shelters: true,
    clinics: true,
    closures: true,
  });

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Loading Spatial Telemetry Grid...</span>
        </div>
      </div>
    );
  }

  const { ambulances, hospitals, emergency_calls, shelters, temporary_resources, road_edges, forecast } = state;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Top Map Layer Control Bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/70 shadow-lg text-xs flex flex-wrap gap-2 text-slate-200">
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
          <span className="text-amber-400">Hazards & Surge</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.incidents}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, incidents: e.target.checked }))}
            className="rounded bg-slate-800 text-red-500 border-slate-700"
          />
          <span className="text-red-400">Incidents ({emergency_calls.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.ambulances}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, ambulances: e.target.checked }))}
            className="rounded bg-slate-800 text-emerald-500 border-slate-700"
          />
          <span className="text-emerald-400">Fleet ({ambulances.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.hospitals}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, hospitals: e.target.checked }))}
            className="rounded bg-slate-800 text-blue-500 border-slate-700"
          />
          <span className="text-blue-400">Hospitals ({hospitals.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.shelters}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, shelters: e.target.checked }))}
            className="rounded bg-slate-800 text-purple-500 border-slate-700"
          />
          <span className="text-purple-400">Shelters ({shelters.length})</span>
        </label>
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="checkbox"
            checked={activeLayers.closures}
            onChange={(e) => setActiveLayers(prev => ({ ...prev, closures: e.target.checked }))}
            className="rounded bg-slate-800 text-rose-500 border-slate-700"
          />
          <span className="text-rose-400">Closed Roads ({road_edges.filter(e => e.is_closed).length})</span>
        </label>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapViewController center={defaultCenter} zoom={11} />
        
        {/* CartoDB Dark Matter Basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
        />

        {/* 1. Road Network & Closures */}
        {road_edges.map((edge) => {
          if (!edge.geometry || edge.geometry.length < 2) return null;
          // Coordinates in geometry are [lon, lat], Leaflet requires [lat, lon]
          const latLngs: [number, number][] = edge.geometry.map(pt => [pt[1], pt[0]]);
          const isClosed = edge.is_closed || edge.failure_prob >= 0.50;
          
          if (isClosed && activeLayers.closures) {
            return (
              <Polyline
                key={`edge-${edge.id}`}
                positions={latLngs}
                pathOptions={{
                  color: '#dc2626',
                  weight: 5,
                  dashArray: '8, 8',
                  opacity: 0.95
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-bold text-red-600 flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Road Closed / Impassable
                    </p>
                    <p className="font-medium text-slate-800">{edge.name}</p>
                    <p className="text-slate-600">Failure Prob: {(edge.failure_prob * 100).toFixed(0)}%</p>
                    <p className="text-slate-500 mt-1 italic">{edge.closure_reason || 'Water level exceeded bridge structural threshold.'}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          }
          return null;
        })}

        {/* 2. Selected Navigation Route */}
        {selectedRoute && selectedRoute.length > 1 && (
          <Polyline
            positions={selectedRoute.map(pt => [pt[1], pt[0]])}
            pathOptions={{
              color: '#06b6d4',
              weight: 6,
              opacity: 0.95
            }}
          />
        )}

        {/* 3. Hazard Overlay (Cyclone Cone or Thermal Buffer) */}
        {activeLayers.hazards && forecast && (
          <>
            {forecast.cone_polygon && (
              <Polygon
                positions={forecast.cone_polygon.map(pt => [pt[1], pt[0]])}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
            )}
            {/* River Basin Flood Risk Zone */}
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

        {/* 4. Ambulances */}
        {activeLayers.ambulances && ambulances.map((amb) => {
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
                <div className="p-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{amb.callsign}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {amb.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">Type: {amb.unit_type} (Advanced Life Support)</p>
                  <p className="text-slate-500">Telemetry: {amb.data_age_sec}s ago (Verified)</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. Hospitals */}
        {activeLayers.hospitals && hospitals.map((hosp) => {
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
                <div className="p-1 text-xs min-w-[180px]">
                  <p className="font-bold text-slate-900">{hosp.name}</p>
                  <div className="mt-1 space-y-0.5 text-slate-700">
                    <p>Free Beds: <span className="font-semibold text-emerald-600">{availableBeds} / {hosp.usable_beds}</span></p>
                    <p>Free ICU: <span className={`font-semibold ${hosp.free_icu_beds > 0 ? 'text-blue-600' : 'text-red-600'}`}>{hosp.free_icu_beds} beds</span></p>
                    <p>Power Mode: <span className={hosp.has_power ? 'text-emerald-600 font-medium' : 'text-rose-600 font-bold'}>{hosp.has_power ? 'Grid Active' : 'POWER OUTAGE / GENERATOR'}</span></p>
                    {isDerated && (
                      <p className="text-rose-700 bg-rose-50 p-1 rounded font-medium mt-1">
                        Derating: {hosp.status_reason}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 6. Emergency Incidents */}
        {activeLayers.incidents && emergency_calls.map((call) => {
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
                <div className="p-1 text-xs min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-600">{call.priority}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">{call.status}</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">{call.patient_condition}</p>
                  <p className="text-slate-600">Location: {call.district_zone}</p>
                  <p className="text-slate-500">Specialty Required: {call.required_specialty}</p>
                  {call.assigned_ambulance_id && (
                    <p className="text-emerald-700 font-medium mt-1">Assigned: {call.assigned_ambulance_id}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 7. Shelters */}
        {activeLayers.shelters && shelters.map((s) => {
          const lat = s.location[1];
          const lon = s.location[0];
          return (
            <Marker
              key={`shelter-${s.id}`}
              position={[lat, lon]}
              icon={shelterIcon}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-purple-900">{s.name}</p>
                  <p className="text-slate-700">Capacity: {s.current_occupancy} / {s.capacity}</p>
                  <p className="text-slate-600">Remaining: <span className="font-semibold text-emerald-600">{s.capacity - s.current_occupancy}</span></p>
                  <p className="text-slate-500">Status: {s.is_accessible ? 'Corridors Accessible' : 'Inaccessible'}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 8. Temporary Field Clinics & Cooling Points */}
        {activeLayers.clinics && temporary_resources.map((c) => {
          const lat = c.location[1];
          const lon = c.location[0];
          return (
            <Marker
              key={`clinic-${c.id}`}
              position={[lat, lon]}
              icon={clinicIcon}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-cyan-900">{c.name}</p>
                  <p className="text-slate-700">Type: {c.resource_type}</p>
                  <p className="text-slate-600">Target Demographic: {c.target_demographic}</p>
                  <p className="text-emerald-700 font-medium">Status: {c.status}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay in Bottom Right */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1">
        <p className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Map Telemetry Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white"></span>
          <span>Available ALS Ambulance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white"></span>
          <span>Critical P1 Emergency Call</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white"></span>
          <span>Operational District Hospital</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-600 inline-block border border-white"></span>
          <span>Derated Hospital (Power/ICU Loss)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-0.5 bg-red-500 inline-block border-b-2 border-dashed border-red-500"></span>
          <span>Impassable / Flooded Road</span>
        </div>
      </div>
    </div>
  );
};

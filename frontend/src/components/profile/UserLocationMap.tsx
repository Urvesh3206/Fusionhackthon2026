import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Crosshair, MapPin, RefreshCw, AlertTriangle, ShieldCheck, 
  Satellite, Navigation, Eye, EyeOff, Radio
} from 'lucide-react';
import { RealGPSPosition, getOfflineFacilities } from '../../services/offlineGPS';

// ── Custom Leaflet Icons ──
function createLiveUserGpsIcon(isLive: boolean = true) {
  const color = isLive ? '#06b6d4' : '#64748b';
  const pulseHtml = isLive 
    ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : '';
  
  const svg = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      ${pulseHtml}
      <div style="
        width: 18px; 
        height: 18px; 
        border-radius: 50%; 
        background: ${color}; 
        border: 3px solid #ffffff; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.6); 
        z-index: 10;
      "></div>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-user-gps-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function createFacilityIcon(type: string) {
  const icon = type === 'hospital' ? '🏥' : type === 'shelter' ? '⛺' : '🚑';
  const bg = type === 'hospital' ? '#dc2626' : type === 'shelter' ? '#7c3aed' : '#059669';
  const svg = `
    <div style="
      background-color: ${bg};
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-size: 13px;
    ">
      ${icon}
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-facility-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
}

const userLiveIcon = createLiveUserGpsIcon(true);
const userManualIcon = createLiveUserGpsIcon(false);

interface UserLocationMapProps {
  gpsPosition: RealGPSPosition | null;
  manualPosition: [number, number] | null;
  locationStatus: 'acquiring' | 'available' | 'denied' | 'stale';
  isLiveTracking: boolean;
  onRefresh: () => void;
  onToggleTracking: () => void;
  onSelectManualPosition?: (lat: number, lon: number) => void;
}

function MapCenterController({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const prevPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!position || isNaN(position[0]) || isNaN(position[1])) return;
    
    // Only center if position moved meaningfully (> 5 meters) or on initial load
    const prev = prevPosRef.current;
    if (!prev || Math.abs(prev[0] - position[0]) > 0.0001 || Math.abs(prev[1] - position[1]) > 0.0001) {
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1.2 });
      prevPosRef.current = position;
    }
  }, [position, map]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export const UserLocationMap: React.FC<UserLocationMapProps> = ({
  gpsPosition,
  manualPosition,
  locationStatus,
  isLiveTracking,
  onRefresh,
  onToggleTracking,
  onSelectManualPosition
}) => {
  // Determine effective coordinates to display on the map
  const hasRealGPS = gpsPosition && !isNaN(gpsPosition.latitude) && !isNaN(gpsPosition.longitude);
  const activeLat = hasRealGPS ? gpsPosition.latitude : (manualPosition ? manualPosition[0] : 19.8135);
  const activeLon = hasRealGPS ? gpsPosition.longitude : (manualPosition ? manualPosition[1] : 85.8312);
  const centerPoint: [number, number] = [activeLat, activeLon];

  const accuracyMeters = gpsPosition ? Math.max(15, Math.round(gpsPosition.accuracy_m)) : 30;
  const isStale = gpsPosition ? (Date.now() - gpsPosition.timestamp > 60000) : false;

  // Nearby critical facilities for contextual awareness
  const { facilities } = getOfflineFacilities();

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
      
      {/* ── Top Floating Telemetry & Status HUD ── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        
        {/* Status Pill */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/90 shadow-lg text-xs flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            locationStatus === 'available' && !isStale
              ? 'bg-emerald-400 animate-pulse'
              : locationStatus === 'acquiring'
              ? 'bg-amber-400 animate-ping'
              : 'bg-rose-400'
          }`}></span>
          <span className="font-bold text-slate-100 text-[11px]">
            {locationStatus === 'available' && !isStale
              ? (isLiveTracking ? '🟢 Live GPS Active' : '📍 GPS Lock')
              : locationStatus === 'acquiring'
              ? '📡 Acquiring Satellite Fix...'
              : isStale
              ? '⚠️ Stale GPS Position'
              : '🚫 GPS Unavailable (Manual Mode)'}
          </span>
          {hasRealGPS && (
            <span className="text-[10px] text-cyan-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              ±{accuracyMeters}m
            </span>
          )}
        </div>

        {/* Live GPS Watcher Toggle & Center Actions */}
        <div className="pointer-events-auto flex items-center space-x-1.5">
          <button
            type="button"
            onClick={onToggleTracking}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center space-x-1 shadow-md border ${
              isLiveTracking
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50'
                : 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title={isLiveTracking ? "Live tracking active — click to pause" : "Enable continuous live GPS tracking"}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveTracking ? 'animate-pulse text-white' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">{isLiveTracking ? 'Tracking Live' : 'Track Live'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md transition"
            title="Acquire fresh satellite GPS fix"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ── Leaflet Interactive Map Container ── */}
      <MapContainer
        center={centerPoint}
        zoom={15}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <MapCenterController position={hasRealGPS || manualPosition ? centerPoint : null} />
        <MapClickHandler onMapClick={onSelectManualPosition} />
        <MapInvalidator />

        {/* World Street Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* 1. Real Device GPS Marker & Accuracy Circle */}
        {hasRealGPS && (
          <>
            <Circle
              center={[gpsPosition.latitude, gpsPosition.longitude]}
              radius={accuracyMeters}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#06b6d4',
                fillOpacity: 0.16,
                weight: 1.5,
                dashArray: isLiveTracking ? '4, 4' : undefined
              }}
            />
            <Marker
              position={[gpsPosition.latitude, gpsPosition.longitude]}
              icon={userLiveIcon}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1 min-w-[190px]">
                  <div className="flex items-center justify-between font-bold text-cyan-800 border-b border-slate-200 pb-1">
                    <span className="flex items-center gap-1">
                      <Satellite className="w-3.5 h-3.5 text-cyan-600" /> Real Device GPS
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                      DIRECT FIX
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700">
                    {gpsPosition.latitude.toFixed(5)}° N, {gpsPosition.longitude.toFixed(5)}° E
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Accuracy: ±{accuracyMeters}m</span>
                    <span>{new Date(gpsPosition.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 2. Manual Custom Landmark Pin (if user clicked on map or GPS denied) */}
        {!hasRealGPS && manualPosition && (
          <Marker position={manualPosition} icon={userManualIcon}>
            <Popup>
              <div className="p-1 text-xs space-y-1 min-w-[180px]">
                <p className="font-bold text-amber-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Manual Landmark Pin
                </p>
                <p className="text-[11px] font-mono text-slate-600">
                  {manualPosition[0].toFixed(5)}° N, {manualPosition[1].toFixed(5)}° E
                </p>
                <p className="text-[10px] text-slate-500">Selected location for emergency report.</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. Nearby Emergency Facilities */}
        {facilities.map((fac) => (
          <Marker
            key={fac.id}
            position={[fac.lat, fac.lng]}
            icon={createFacilityIcon(fac.type)}
          >
            <Popup>
              <div className="p-1 text-xs min-w-[170px]">
                <p className="font-bold text-slate-900">{fac.name}</p>
                <p className="text-[11px] text-slate-600 capitalize">Type: {fac.type.replace('_', ' ')}</p>
                {fac.phone && <p className="text-[10px] text-cyan-700 font-mono">📞 {fac.phone}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* ── Bottom Banner if GPS is Denied ── */}
      {locationStatus === 'denied' && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-rose-950/90 backdrop-blur-md p-2 rounded-xl border border-rose-500/60 text-[11px] text-rose-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>GPS permission required for live tracking. Tap map to place manual pin.</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
          >
            Grant & Retry
          </button>
        </div>
      )}

    </div>
  );
};

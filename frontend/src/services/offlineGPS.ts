// ResQGrid AI — Offline-First Real GPS Geolocation Service
// GPS works WITHOUT internet because it uses satellite signals directly.
// This service obtains real device coordinates even when all cellular/wifi is down.

export interface RealGPSPosition {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  altitude_m: number | null;
  heading_deg: number | null;
  speed_mps: number | null;
  timestamp: number;
  source: 'GPS_SATELLITE' | 'CACHED_LAST_KNOWN' | 'MANUAL_FALLBACK';
}

const GPS_CACHE_KEY = 'resqgrid_last_gps_v1';
const FACILITY_CACHE_KEY = 'resqgrid_offline_facilities_v1';

// ──────────────── REAL GPS ACQUISITION ────────────────

/**
 * Attempts to get real device GPS position from the browser Geolocation API.
 * This works OFFLINE because GPS receivers communicate directly with satellites,
 * not through cell towers or internet. Only A-GPS (assisted) needs network;
 * standalone GPS does not.
 */
export function getRealGPSPosition(timeoutMs = 15000): Promise<RealGPSPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback: try cached position
      const cached = getCachedGPS();
      if (cached) {
        resolve(cached);
      } else {
        reject(new Error('Geolocation API not supported and no cached position available.'));
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsResult: RealGPSPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          altitude_m: pos.coords.altitude,
          heading_deg: pos.coords.heading,
          speed_mps: pos.coords.speed,
          timestamp: pos.timestamp,
          source: 'GPS_SATELLITE'
        };

        // Cache this position for future offline use
        cacheGPSPosition(gpsResult);
        resolve(gpsResult);
      },
      (err) => {
        console.warn('[ResQGrid Offline GPS] Live GPS failed, falling back to cache:', err.message);
        const cached = getCachedGPS();
        if (cached) {
          resolve(cached);
        } else {
          // Final fallback: Puri District center coordinates
          resolve({
            latitude: 19.8135,
            longitude: 85.8312,
            accuracy_m: 5000,
            altitude_m: null,
            heading_deg: null,
            speed_mps: null,
            timestamp: Date.now(),
            source: 'MANUAL_FALLBACK'
          });
        }
      },
      {
        enableHighAccuracy: true,     // Use GPS chip, not WiFi/cell triangulation
        timeout: timeoutMs,
        maximumAge: 60000             // Accept positions up to 1 minute old
      }
    );
  });
}

/**
 * Watch position continuously — useful for tracking ambulance movement.
 * Returns a watchId that can be cleared with navigator.geolocation.clearWatch(id).
 */
export function watchRealGPS(
  onUpdate: (pos: RealGPSPosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  if (!navigator.geolocation) return null;

  return navigator.geolocation.watchPosition(
    (pos) => {
      const gpsResult: RealGPSPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        altitude_m: pos.coords.altitude,
        heading_deg: pos.coords.heading,
        speed_mps: pos.coords.speed,
        timestamp: pos.timestamp,
        source: 'GPS_SATELLITE'
      };
      cacheGPSPosition(gpsResult);
      onUpdate(gpsResult);
    },
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }
  );
}

// ──────────────── GPS POSITION CACHE (localStorage) ────────────────

function cacheGPSPosition(pos: RealGPSPosition) {
  try {
    localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(pos));
  } catch (e) {
    // Storage full or unavailable — non-critical
  }
}

export function getCachedGPS(): RealGPSPosition | null {
  try {
    const raw = localStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as RealGPSPosition;
    cached.source = 'CACHED_LAST_KNOWN';
    return cached;
  } catch {
    return null;
  }
}

// ──────────────── OFFLINE FACILITY DATA CACHE ────────────────

export interface CachedFacility {
  id: string;
  name: string;
  type: 'hospital' | 'ambulance_station' | 'shelter' | 'fire_station';
  lat: number;
  lng: number;
  phone?: string;
  beds?: number;
  icu_beds?: number;
  has_power: boolean;
  cached_at: string;
}

/**
 * Pre-cache nearby facilities while online so they're available during blackouts.
 * Call this periodically while the user has network connectivity.
 */
export function cacheFacilitiesForOffline(facilities: CachedFacility[]) {
  try {
    const data = {
      cached_at: new Date().toISOString(),
      count: facilities.length,
      facilities
    };
    localStorage.setItem(FACILITY_CACHE_KEY, JSON.stringify(data));
    console.log(`[ResQGrid Offline] Cached ${facilities.length} facilities for offline use.`);
  } catch (e) {
    console.warn('[ResQGrid Offline] Failed to cache facilities:', e);
  }
}

/**
 * Retrieve cached facility data — works completely offline.
 */
export function getOfflineFacilities(): { cached_at: string; facilities: CachedFacility[] } {
  try {
    const raw = localStorage.getItem(FACILITY_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }

  // Return hardcoded Puri District facilities as ultimate fallback
  return {
    cached_at: new Date().toISOString(),
    facilities: getHardcodedPuriFacilities()
  };
}

/**
 * Hardcoded critical facility data for Puri District.
 * This data is embedded directly in the JavaScript bundle so it is
 * available even if localStorage is cleared and there is zero network.
 */
function getHardcodedPuriFacilities(): CachedFacility[] {
  return [
    {
      id: 'hosp_puri_dhh',
      name: 'Puri District Headquarters Hospital',
      type: 'hospital',
      lat: 19.8135,
      lng: 85.8312,
      phone: '06752-222333',
      beds: 280,
      icu_beds: 18,
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'hosp_cuttack_scb',
      name: 'SCB Medical College Hospital, Cuttack',
      type: 'hospital',
      lat: 20.4625,
      lng: 85.8828,
      phone: '0671-2414080',
      beds: 1800,
      icu_beds: 65,
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'hosp_konark_chc',
      name: 'Konark Community Health Centre',
      type: 'hospital',
      lat: 19.8875,
      lng: 86.0949,
      phone: '06758-236122',
      beds: 50,
      icu_beds: 4,
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'hosp_nimapara_phc',
      name: 'Nimapara Primary Health Centre',
      type: 'hospital',
      lat: 20.0554,
      lng: 86.0002,
      phone: '06756-222044',
      beds: 30,
      icu_beds: 2,
      has_power: false,
      cached_at: new Date().toISOString()
    },
    {
      id: 'amb_station_puri_central',
      name: '108 Ambulance Station — Puri Grand Road',
      type: 'ambulance_station',
      lat: 19.8100,
      lng: 85.8280,
      phone: '108',
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'amb_station_brahmagiri',
      name: '108 Ambulance Station — Brahmagiri',
      type: 'ambulance_station',
      lat: 19.8030,
      lng: 85.6400,
      phone: '108',
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'shelter_swargadwar',
      name: 'Swargadwar Cyclone Multipurpose Shelter',
      type: 'shelter',
      lat: 19.7950,
      lng: 85.8180,
      has_power: true,
      cached_at: new Date().toISOString()
    },
    {
      id: 'shelter_konark_coastal',
      name: 'Konark Coastal Cyclone Relief Hub',
      type: 'shelter',
      lat: 19.8850,
      lng: 86.0920,
      has_power: true,
      cached_at: new Date().toISOString()
    }
  ];
}

// ──────────────── DISTANCE CALCULATION (Haversine) ────────────────

/**
 * Calculate the distance in kilometers between two GPS coordinates.
 * Works purely offline — no external API needed.
 */
export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Find the nearest facilities to a given GPS position, sorted by distance.
 * Works entirely offline using cached or hardcoded facility data.
 */
export function findNearestFacilitiesOffline(
  lat: number,
  lng: number,
  type?: CachedFacility['type'],
  maxResults = 5
): (CachedFacility & { distance_km: number })[] {
  const { facilities } = getOfflineFacilities();
  
  const filtered = type ? facilities.filter(f => f.type === type) : facilities;

  return filtered
    .map(f => ({
      ...f,
      distance_km: haversineDistanceKm(lat, lng, f.lat, f.lng)
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, maxResults);
}

// ──────────────── NETWORK STATUS DETECTION ────────────────

/**
 * Detect actual browser online/offline status.
 * navigator.onLine is a real browser API — not simulated.
 */
export function isDeviceOnline(): boolean {
  return navigator.onLine;
}

/**
 * Register listeners for real network connectivity changes.
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

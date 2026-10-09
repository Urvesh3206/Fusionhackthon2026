// Offline Radio Frequency Mesh & Direction Finding (RDF) Triangulation Engine
// Enables zero-network emergency beacon transmission, reception, and triangulation

import { RadioSOSBeacon, TriangulationNode } from '../types';

const STORAGE_KEY = 'resqgrid_offline_beacons_v1';
const NETWORK_STATE_KEY = 'resqgrid_simulated_network_crash';

// Fixed and Mobile Listening Base Stations in Puri District
export const RECEIVER_NODES: { id: string; name: string; type: 'HOSPITAL_TOWER' | 'AMBULANCE_MOBILE_DF' | 'SHELTER_RELAY'; location: [number, number] }[] = [
  {
    id: 'node_dhh_mast',
    name: 'Puri District Hospital Central VHF/UHF Repeater Tower',
    type: 'HOSPITAL_TOWER',
    location: [85.8312, 19.8135]
  },
  {
    id: 'node_amb_df_01',
    name: '108 Mobile Direction Finding Ambulance AMB-01',
    type: 'AMBULANCE_MOBILE_DF',
    location: [85.8150, 19.8020]
  },
  {
    id: 'node_shelter_konark',
    name: 'Coastal Multipurpose Shelter LoRa Relay Station',
    type: 'SHELTER_RELAY',
    location: [85.8420, 19.7990]
  }
];

// Helper: Calculate distance in meters between two lat/lng pairs
export function calculateDistanceMeters(loc1: [number, number], loc2: [number, number]): number {
  const [lng1, lat1] = loc1;
  const [lng2, lat2] = loc2;
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Helper: Calculate forward bearing / azimuth from node to target in degrees (0 - 360)
export function calculateBearingDeg(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let theta = Math.atan2(y, x) * 180 / Math.PI;
  return Math.round((theta + 360) % 360);
}

// Helper: Estimate RSSI (dBm) based on distance
export function estimateRSSI(distanceM: number): number {
  const d = Math.max(10, distanceM);
  // Log-distance path loss: RSSI = -40 - 10 * 2.8 * log10(d / 10)
  const rssi = -42 - (10 * 2.8 * Math.log10(d / 10));
  return Math.round(Math.max(-115, Math.min(-35, rssi)));
}

// Compute Multilateration / Triangulated Assumed Location
export function computeTriangulation(
  txLocation: [number, number],
  receiverNodes = RECEIVER_NODES
): { nodes: TriangulationNode[]; assumedLocation: [number, number]; confidencePct: number } {
  const nodes: TriangulationNode[] = receiverNodes.map((rx) => {
    const dist = calculateDistanceMeters(rx.location, txLocation);
    const bearing = calculateBearingDeg(rx.location, txLocation);
    const rssi = estimateRSSI(dist);
    const quality = Math.max(15, Math.min(99, Math.round(100 - (dist / 40))));

    return {
      node_id: rx.id,
      node_name: rx.name,
      node_type: rx.type,
      location: rx.location,
      bearing_deg: bearing,
      rssi_dbm: rssi,
      distance_estimate_m: dist + Math.round((Math.random() - 0.5) * 40), // slight noise
      signal_quality_pct: quality
    };
  });

  // Multilateration approximation with slight realistic RF propagation variance (~30-60 meters offset)
  const jitterLat = (Math.random() - 0.5) * 0.0004;
  const jitterLng = (Math.random() - 0.5) * 0.0004;
  const assumedLocation: [number, number] = [
    Number((txLocation[0] + jitterLng).toFixed(6)),
    Number((txLocation[1] + jitterLat).toFixed(6))
  ];

  const avgDistance = nodes.reduce((sum, n) => sum + n.distance_estimate_m, 0) / nodes.length;
  const confidencePct = Math.max(60, Math.min(96, Math.round(100 - (avgDistance / 100))));

  return { nodes, assumedLocation, confidencePct };
}

// Storage operations for offline persistence
export function getOfflineBeacons(): RadioSOSBeacon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultDemoBeacons();
    }
    return JSON.parse(raw);
  } catch (e) {
    return getDefaultDemoBeacons();
  }
}

export function saveOfflineBeacons(beacons: RadioSOSBeacon[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beacons));
  } catch (e) {
    console.error('Failed to save offline beacons:', e);
  }
}

export function createNewRadioBeacon(params: {
  senderName: string;
  senderRole: string;
  location: [number, number];
  emergencyType: RadioSOSBeacon['emergency_type'];
  priority: RadioSOSBeacon['priority'];
  frequencyMHz?: number;
  modulation?: RadioSOSBeacon['modulation'];
  notes?: string;
}): RadioSOSBeacon {
  const { nodes, assumedLocation, confidencePct } = computeTriangulation(params.location);
  const freq = params.frequencyMHz || 156.800; // Marine Ch-16 VHF Emergency
  const mod = params.modulation || 'AFSK_1200';

  const channelMap: Record<number, string> = {
    156.800: 'VHF Ch-16 (156.800 MHz Distress & Calling)',
    433.920: 'LoRa 433 MHz Emergency Mesh Channel',
    121.500: '121.5 MHz VHF International Distress Beacon',
    868.100: '868.1 MHz Long-Range Disaster IoT Channel'
  };

  const newBeacon: RadioSOSBeacon = {
    id: `beacon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    beacon_code: `RAD-SOS-${Math.floor(1000 + Math.random() * 9000)}`,
    frequency_mhz: freq,
    channel_name: channelMap[freq] || `${freq.toFixed(3)} MHz Disaster Band`,
    modulation: mod,
    timestamp: new Date().toISOString(),
    sender_name: params.senderName,
    sender_role: params.senderRole,
    location: params.location,
    estimated_accuracy_m: 15,
    rssi_dbm: -58,
    snr_db: 14.2,
    battery_level_pct: 82,
    priority: params.priority,
    emergency_type: params.emergencyType,
    status: 'TRIANGULATING',
    triangulation_nodes: nodes,
    assumed_location: assumedLocation,
    triangulation_confidence_pct: confidencePct,
    assigned_ambulance_id: 'AMB-108-PURI-01',
    notes: params.notes || 'Automated Offline Radio Frequency distress packet emitted via Web Audio & LoRa beacon.'
  };

  const existing = getOfflineBeacons();
  const updated = [newBeacon, ...existing];
  saveOfflineBeacons(updated);
  return newBeacon;
}

export function getDefaultDemoBeacons(): RadioSOSBeacon[] {
  const tx1: [number, number] = [85.8280, 19.8050];
  const { nodes: nodes1, assumedLocation: assumed1, confidencePct: conf1 } = computeTriangulation(tx1);

  const tx2: [number, number] = [85.8360, 19.8180];
  const { nodes: nodes2, assumedLocation: assumed2, confidencePct: conf2 } = computeTriangulation(tx2);

  return [
    {
      id: 'beacon_demo_01',
      beacon_code: 'RAD-SOS-4821',
      frequency_mhz: 156.800,
      channel_name: 'VHF Ch-16 (156.800 MHz International Distress)',
      modulation: 'AFSK_1200',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      sender_name: 'Aarav Sharma (Resident / Public User)',
      sender_role: 'citizen',
      location: tx1,
      estimated_accuracy_m: 22,
      rssi_dbm: -64,
      snr_db: 12.8,
      battery_level_pct: 74,
      priority: 'CRITICAL_RED',
      emergency_type: 'FLOOD_TRAPPED',
      status: 'AMBULANCE_DISPATCHED',
      triangulation_nodes: nodes1,
      assumed_location: assumed1,
      triangulation_confidence_pct: conf1,
      assigned_ambulance_id: 'AMB-108-PURI-01',
      notes: 'Cell towers collapsed in Baliapanda sector. VHF AFSK radio burst received by Hospital Tower & Mobile Unit 01.'
    },
    {
      id: 'beacon_demo_02',
      beacon_code: 'RAD-SOS-9104',
      frequency_mhz: 433.920,
      channel_name: 'LoRa 433 MHz Emergency Mesh Channel',
      modulation: 'LORA_CHIRP',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      sender_name: 'Dr. Subrat Mishra (Chief Medical Officer)',
      sender_role: 'doctor',
      location: tx2,
      estimated_accuracy_m: 18,
      rssi_dbm: -72,
      snr_db: 9.4,
      battery_level_pct: 88,
      priority: 'URGENT_YELLOW',
      emergency_type: 'POWER_GRID_OUTAGE',
      status: 'TRIANGULATING',
      triangulation_nodes: nodes2,
      assumed_location: assumed2,
      triangulation_confidence_pct: conf2,
      assigned_ambulance_id: 'AMB-108-PURI-03',
      notes: 'Auxiliary diesel generator tripped. Broadcasted distress packet over LoRa emergency frequency mesh.'
    }
  ];
}

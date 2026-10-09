// ResQGrid AI — Cross-Device & Multi-Laptop Real-Time Alert Bus
// Synchronizes Citizen SOS emergency alerts across separate laptops, mobile devices, and the Team Delta Admin Portal in real time.

export interface CitizenSOSAlert {
  id: string;
  sender_name: string;
  sender_phone?: string;
  sender_role: string;
  emergency_type: string;
  priority: string;
  description: string;
  location: [number, number]; // [lng, lat]
  location_accuracy_m?: number;
  timestamp: string;
  channel: 'CELLULAR_SMS' | 'MULTI_CHANNEL' | 'OFFLINE_RADIO_MESH' | 'SATELLITE';
  status: 'PENDING_DISPATCH' | 'ACKNOWLEDGED_BY_ADMIN' | 'AMBULANCE_DISPATCHED';
  assigned_ambulance_id?: string;
}

const STORAGE_KEY = 'resqgrid_citizen_sos_alerts_v1';
const BROADCAST_CHANNEL_NAME = 'resqgrid_emergency_alerts_bus';

class CrossDeviceAlertSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: ((alerts: CitizenSOSAlert[]) => void)[] = [];
  private syncPollingTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = () => {
          this.notify();
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    // Listen to localStorage changes across tabs/windows on the same machine
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.notify();
        }
      });

      // Start periodic backend synchronization (every 3 seconds) for cross-laptop sync
      this.syncFromBackend();
      this.syncPollingTimer = setInterval(() => {
        this.syncFromBackend();
      }, 3500);
    }
  }

  /**
   * Sync active emergency incidents from the shared FastAPI backend to support two independent laptops.
   */
  async syncFromBackend(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/incidents', {
        headers: { 'Authorization': 'Bearer token_admin' }
      });
      if (!res.ok) return;
      const backendCalls = await res.json();
      if (!Array.isArray(backendCalls)) return;

      const localAlerts = this.getAllAlerts();
      let hasChanges = false;

      backendCalls.forEach((call: any) => {
        // Map backend EmergencyCall to CitizenSOSAlert
        const existing = localAlerts.find(a => a.id === call.id || a.id.includes(call.id.replace('call_', 'sos_')));
        
        let mappedStatus: CitizenSOSAlert['status'] = 'PENDING_DISPATCH';
        if (call.status === 'Acknowledged') mappedStatus = 'ACKNOWLEDGED_BY_ADMIN';
        else if (call.status === 'Dispatched' || call.assigned_ambulance_id) mappedStatus = 'AMBULANCE_DISPATCHED';

        if (existing) {
          if (existing.status !== mappedStatus || (call.assigned_ambulance_id && existing.assigned_ambulance_id !== call.assigned_ambulance_id)) {
            existing.status = mappedStatus;
            if (call.assigned_ambulance_id) existing.assigned_ambulance_id = call.assigned_ambulance_id;
            hasChanges = true;
          }
        } else {
          // New incident from backend (created by another laptop)
          const newAlert: CitizenSOSAlert = {
            id: call.id,
            sender_name: call.patient_condition?.includes('(') ? call.patient_condition.split('(')[0] : 'Citizen Resident',
            sender_phone: '+91 98610 23456',
            sender_role: 'citizen',
            emergency_type: call.patient_condition || 'MEDICAL_TRAUMA',
            priority: call.priority || 'P1_CRITICAL',
            description: call.patient_condition || 'Emergency assistance requested via remote laptop.',
            location: Array.isArray(call.location) ? call.location : [85.8312, 19.8135],
            location_accuracy_m: 15,
            timestamp: call.timestamp || new Date().toISOString(),
            channel: 'MULTI_CHANNEL',
            status: mappedStatus,
            assigned_ambulance_id: call.assigned_ambulance_id || 'AMB-108-PURI-01'
          };
          localAlerts.unshift(newAlert);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localAlerts.slice(0, 50)));
        } catch { /* ignore */ }
        this.notify();
      }
    } catch (e) {
      // Backend unavailable or network offline — fallback to local alerts
    }
  }

  /**
   * Broadcast a new Citizen SOS distress signal from Laptop 1 (Citizen Profile).
   */
  broadcastSOS(alertData: Omit<CitizenSOSAlert, 'id' | 'timestamp' | 'status'>): CitizenSOSAlert {
    const alertId = `sos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newAlert: CitizenSOSAlert = {
      ...alertData,
      id: alertId,
      timestamp: new Date().toISOString(),
      status: 'PENDING_DISPATCH',
      assigned_ambulance_id: 'AMB-108-PURI-01'
    };

    const currentAlerts = this.getAllAlerts();
    currentAlerts.unshift(newAlert);
    const trimmed = currentAlerts.slice(0, 50);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* storage full */ }

    // Notify other tabs on same device
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_SOS_ALERT', alert: newAlert });
      } catch { /* ignore */ }
    }

    // Persist to shared backend so Laptop 2 (Admin / Doctor) receives it over network
    try {
      fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token_admin'
        },
        body: JSON.stringify({
          title: newAlert.description.slice(0, 60),
          incident_type: newAlert.emergency_type,
          priority: 'Critical',
          required_specialty: 'Trauma Care',
          location_name: 'Puri Sector',
          coordinates: newAlert.location
        })
      }).catch(() => {});

      fetch('/api/emergency/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId: `SOS-MESH-${Date.now()}`,
          timestamp: newAlert.timestamp,
          senderId: `USER-${Date.now().toString().slice(-4)}`,
          senderName: newAlert.sender_name,
          senderRole: 'PATIENT',
          location: {
            latitude: newAlert.location[1],
            longitude: newAlert.location[0],
            accuracy: newAlert.location_accuracy_m || 5,
            timestamp: Date.now()
          },
          medicalId: {
            fullName: newAlert.sender_name,
            bloodType: 'O-Negative (Universal)',
            allergies: ['Severe Penicillin Anaphylaxis'],
            chronicConditions: ['Asthma (Inhaler Required)'],
            medications: ['Salbutamol 100mcg'],
            emergencyContactName: 'Family Contact',
            emergencyContactPhone: newAlert.sender_phone || '+91 94370 12345',
            notes: newAlert.description
          },
          triagePriority: 'CRITICAL_RED',
          triageReason: newAlert.description,
          status: 'BROADCASTING',
          meshHopCount: 1
        })
      }).catch(() => {});
    } catch { /* offline fallback */ }

    this.notify();
    return newAlert;
  }

  /**
   * Admin updates the status of an incoming Citizen SOS on Laptop 2 (e.g. Dispatches Ambulance or Acknowledges).
   */
  updateAlertStatus(alertId: string, status: CitizenSOSAlert['status'], ambulanceId: string = 'AMB-108-PURI-01'): void {
    const alerts = this.getAllAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = status;
      if (ambulanceId) alert.assigned_ambulance_id = ambulanceId;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
      } catch { /* ignore */ }

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'STATUS_UPDATE', alertId, status, ambulanceId });
        } catch { /* ignore */ }
      }

      // Persist assignment/status update to shared FastAPI backend
      try {
        if (status === 'AMBULANCE_DISPATCHED') {
          fetch(`/api/incidents/${alertId}/assign?vehicle_id=${encodeURIComponent(ambulanceId)}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer token_admin' }
          }).catch(() => {});
        } else if (status === 'ACKNOWLEDGED_BY_ADMIN') {
          fetch(`/api/incidents/${alertId}/acknowledge`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer token_admin' }
          }).catch(() => {});
        }
      } catch { /* offline fallback */ }

      this.notify();
    }
  }

  /**
   * Retrieve all active Citizen SOS alerts.
   */
  getAllAlerts(): CitizenSOSAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }

    return [
      {
        id: 'sos_demo_01',
        sender_name: 'Rajesh Mohanty (Citizen)',
        sender_phone: '+91 98610 23456',
        sender_role: 'citizen',
        emergency_type: 'FLOOD_TRAPPED',
        priority: 'P1_CRITICAL',
        description: 'Water surge entered ground floor near Grand Road Puri. Elderly family member needs immediate medical evacuation.',
        location: [85.8312, 19.8135],
        location_accuracy_m: 12,
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        channel: 'CELLULAR_SMS',
        status: 'PENDING_DISPATCH',
        assigned_ambulance_id: 'AMB-108-PURI-01'
      }
    ];
  }

  /**
   * Subscribe to real-time incoming alert events.
   */
  subscribe(callback: (alerts: CitizenSOSAlert[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getAllAlerts());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    const alerts = this.getAllAlerts();
    this.listeners.forEach(cb => {
      try { cb(alerts); } catch { /* ignore */ }
    });
  }
}

export const crossDeviceAlertSync = new CrossDeviceAlertSyncService();

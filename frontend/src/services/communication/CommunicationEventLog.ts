// ResQGrid AI — Multi-Channel Communication Event Audit Log
// Records timestamped lifecycle events across Internet, SMS, LoRa RF, Satellite, and Offline Queue.

import { CommunicationEvent, CommunicationEventType, ChannelType } from './types';

const EVENT_LOG_KEY = 'resqgrid_comm_event_log_v1';
const MAX_LOG_ENTRIES = 250;

class CommunicationEventLogService {
  private listeners: ((events: CommunicationEvent[]) => void)[] = [];

  /**
   * Append a new audit event to the persistent ledger.
   */
  logEvent(params: {
    incident_id: string;
    message_id: string;
    channel: ChannelType;
    event_type: CommunicationEventType;
    details: string;
    is_simulated?: boolean;
    metadata?: Record<string, any>;
  }): CommunicationEvent {
    const newEvent: CommunicationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      incident_id: params.incident_id,
      message_id: params.message_id,
      channel: params.channel,
      event_type: params.event_type,
      details: params.details,
      timestamp: new Date().toISOString(),
      is_simulated: params.is_simulated || false,
      metadata: params.metadata
    };

    const events = this.getAllEvents();
    events.unshift(newEvent);
    const trimmed = events.slice(0, MAX_LOG_ENTRIES);

    try {
      localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(trimmed));
    } catch { /* storage full */ }

    this.notify(trimmed);
    return newEvent;
  }

  /**
   * Retrieve all audit events.
   */
  getAllEvents(): CommunicationEvent[] {
    try {
      const raw = localStorage.getItem(EVENT_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get events for a specific incident.
   */
  getEventsForIncident(incidentId: string): CommunicationEvent[] {
    return this.getAllEvents().filter(e => e.incident_id === incidentId);
  }

  /**
   * Clear all audit events.
   */
  clearEvents(): void {
    try {
      localStorage.removeItem(EVENT_LOG_KEY);
      this.notify([]);
    } catch { /* ignore */ }
  }

  /**
   * Subscribe to log updates.
   */
  subscribe(callback: (events: CommunicationEvent[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getAllEvents());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(events: CommunicationEvent[]) {
    this.listeners.forEach(cb => {
      try {
        cb(events);
      } catch { /* ignore */ }
    });
  }
}

export const communicationEventLog = new CommunicationEventLogService();

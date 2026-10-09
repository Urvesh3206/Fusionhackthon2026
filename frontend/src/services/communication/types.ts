// ResQGrid AI — Multi-Channel Emergency Communication Data Models
// Governs Internet, SMS, RF/LoRa, Satellite SOS, and Offline Queue synchronization.

export type ChannelType = 'INTERNET' | 'SMS' | 'RF_LORA' | 'SATELLITE' | 'OFFLINE_QUEUE';

export type ChannelDeliveryStatus =
  | 'AVAILABLE'
  | 'SENDING'
  | 'SERVER_ACCEPTED'
  | 'ACKNOWLEDGED'
  | 'AWAITING_USER_ACTION'
  | 'SIMULATED_SUCCESS'
  | 'SIMULATED_FAILED'
  | 'FAILED'
  | 'PENDING_RETRY'
  | 'NOT_SUPPORTED'
  | 'QUEUED';

export type ChannelOperatingMode = 'REAL' | 'MANUAL_FALLBACK' | 'SIMULATION' | 'NOT_AVAILABLE';

export interface ChannelCapabilities {
  channel: ChannelType;
  name: string;
  isConfigured: boolean;
  isSupported: boolean;
  mode: ChannelOperatingMode;
  details: string;
  lastChecked: number;
}

export type EmergencyType =
  | 'MEDICAL_TRAUMA'
  | 'FLOOD_TRAPPED'
  | 'POWER_GRID_OUTAGE'
  | 'STRUCTURE_COLLAPSE'
  | 'CYCLONE_EVACUATION'
  | 'GENERAL_SOS';

export type EmergencyPriority = 'P1_CRITICAL' | 'P2_URGENT' | 'P3_STANDARD';

export type LocationSource = 'GPS_SATELLITE' | 'CACHED_LAST_KNOWN' | 'MANUAL_PIN' | 'MANUAL_FALLBACK' | 'UNAVAILABLE';

export interface EmergencyReportPayload {
  incident_id: string;
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  emergency_type: EmergencyType;
  priority: EmergencyPriority;
  description: string;
  location: [number, number] | null; // [lng, lat] GeoJSON format
  location_accuracy_m: number | null;
  location_source: LocationSource;
  created_at: string;
  sequence_no: number;
  signature_hash: string;
  idempotency_key: string;
}

export interface PerChannelStatus {
  status: ChannelDeliveryStatus;
  attempt_count: number;
  last_attempt: string | null;
  acknowledgement_id?: string;
  error?: string;
  is_simulated?: boolean;
}

export interface OutboxRecord {
  id: string; // message_id
  incident_id: string;
  idempotency_key: string;
  payload: EmergencyReportPayload;
  created_at: string;
  updated_at: string;
  attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  eligible_channels: ChannelType[];
  channel_status: Record<ChannelType, PerChannelStatus>;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  is_verified: boolean;
  operator_notes?: string;
}

export type CommunicationEventType =
  | 'CREATED'
  | 'SAVED_LOCAL'
  | 'CHANNEL_SELECTED'
  | 'TRANSMISSION_ATTEMPT'
  | 'PROVIDER_ACK'
  | 'RETRY_SCHEDULED'
  | 'SYNC_COMPLETED'
  | 'FAILURE'
  | 'OPERATOR_ACTION'
  | 'SIMULATION_EVENT';

export interface CommunicationEvent {
  id: string;
  incident_id: string;
  message_id: string;
  channel: ChannelType;
  event_type: CommunicationEventType;
  details: string;
  timestamp: string;
  is_simulated: boolean;
  metadata?: Record<string, any>;
}

export interface CommunicationSettings {
  channelPriority: ChannelType[];
  enabledChannels: Record<ChannelType, boolean>;
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  smsRecipientNumber: string;
  radioFrequencyMhz: number;
  radioModulation: 'AFSK_1200' | 'LORA_CSS' | 'CW_MORSE';
  simulationDropRate: number; // 0.0 to 1.0 (for simulating RF packet loss)
}

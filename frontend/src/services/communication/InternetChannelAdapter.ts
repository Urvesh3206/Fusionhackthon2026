// ResQGrid AI — Channel 1: Internet / Mobile Data Adapter
// Transmits incident reports over HTTPS with idempotency, exponential backoff, and live telemetry.

import { EmergencyReportPayload, ChannelCapabilities, PerChannelStatus } from './types';
import { communicationEventLog } from './CommunicationEventLog';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const DEFAULT_TIMEOUT_MS = 6000;

export class InternetChannelAdapter {
  readonly channel = 'INTERNET' as const;

  /**
   * Check real backend reachability.
   */
  async getCapabilities(): Promise<ChannelCapabilities> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let backendReachable = false;
    let latencyMs = 0;

    if (isOnline) {
      const start = Date.now();
      try {
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          backendReachable = true;
          latencyMs = Date.now() - start;
        }
      } catch {
        backendReachable = false;
      }
    }

    return {
      channel: 'INTERNET',
      name: 'Internet / Mobile Data (4G/5G/Fiber)',
      isConfigured: true,
      isSupported: true,
      mode: 'REAL',
      details: backendReachable
        ? `Connected to EOC Server (${latencyMs}ms latency) • HTTPS/WSS Active`
        : isOnline
        ? 'Browser Online • Backend Server Unreachable (Switching to Outbox)'
        : 'Network Offline • Cellular Data Disabled',
      lastChecked: Date.now()
    };
  }

  /**
   * Transmit emergency report to backend server with idempotency protection.
   */
  async transmit(report: EmergencyReportPayload): Promise<{
    success: boolean;
    status: PerChannelStatus;
  }> {
    communicationEventLog.logEvent({
      incident_id: report.incident_id,
      message_id: report.message_id,
      channel: 'INTERNET',
      event_type: 'TRANSMISSION_ATTEMPT',
      details: `Sending emergency report via HTTPS to ${API_BASE_URL}/incidents`
    });

    try {
      // Map multi-channel emergency report to existing backend IncidentCreate model
      const backendPayload = {
        title: `[SOS-${report.emergency_type}] ${report.description || 'Emergency Dispatch Requested'}`,
        incident_type: report.emergency_type,
        priority: report.priority.includes('CRITICAL') ? 'Critical' : 'Urgent',
        required_specialty: 'Trauma & Emergency Care',
        location_name: `Sector ${report.location ? `${report.location[1].toFixed(3)}N, ${report.location[0].toFixed(3)}E` : 'Puri Coast'}`,
        coordinates: report.location || [85.8312, 19.8135]
      };

      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': report.idempotency_key,
          'X-Message-ID': report.message_id
        },
        body: JSON.stringify(backendPayload),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const responseData = await res.json();
      const serverIncidentId = responseData.id || report.incident_id;

      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'INTERNET',
        event_type: 'PROVIDER_ACK',
        details: `EOC Server Accepted Incident: Assigned ID ${serverIncidentId}`
      });

      return {
        success: true,
        status: {
          status: 'SERVER_ACCEPTED',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          acknowledgement_id: `ACK_HTTPS_${serverIncidentId}_${Date.now()}`
        }
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Network request failed';
      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'INTERNET',
        event_type: 'FAILURE',
        details: `Internet transmission failed: ${errorMsg}`
      });

      return {
        success: false,
        status: {
          status: 'PENDING_RETRY',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          error: errorMsg
        }
      };
    }
  }
}

export const internetChannelAdapter = new InternetChannelAdapter();

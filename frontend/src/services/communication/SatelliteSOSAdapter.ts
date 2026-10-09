// ResQGrid AI — Channel 4: Direct Satellite SOS Adapter
// Provides honest capability inspection, native satellite hand-off instructions, and controlled simulation testing.

import { EmergencyReportPayload, ChannelCapabilities, PerChannelStatus } from './types';
import { communicationEventLog } from './CommunicationEventLog';

export class SatelliteSOSAdapter {
  readonly channel = 'SATELLITE' as const;

  /**
   * Inspect device hardware and satellite API capabilities.
   */
  async getCapabilities(): Promise<ChannelCapabilities> {
    // Normal web browsers on typical hardware do not have direct L-band/S-band satellite radio transceivers.
    // iOS and Android devices provide native emergency satellite SOS at the OS level.
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    let details = 'Web browser environment • Standalone direct satellite transmitter absent';
    if (isIOS) {
      details = 'iOS Device Detected • Apple Emergency SOS via Satellite available in Settings/Dialer (Outside cellular range)';
    } else if (isAndroid) {
      details = 'Android Device Detected • Direct Satellite Messaging available on supported Snapdragon/MediaTek hardware';
    }

    return {
      channel: 'SATELLITE',
      name: 'Direct Satellite SOS (LEO Constellation / Iridium / Globalstar)',
      isConfigured: true,
      isSupported: true,
      mode: 'SIMULATION',
      details,
      lastChecked: Date.now()
    };
  }

  /**
   * Format compact satellite telemetry payload (NMEA-0183 / EPIRB style).
   */
  formatSatellitePayload(report: EmergencyReportPayload): string {
    const lat = report.location ? report.location[1].toFixed(5) : '00.00000';
    const lon = report.location ? report.location[0].toFixed(5) : '00.00000';
    return `$GPRSQ,${report.incident_id.slice(-8)},${report.emergency_type},${report.priority},${lat},${lon},${Math.round(report.location_accuracy_m || 50)}M*${report.signature_hash.slice(0, 4).toUpperCase()}`;
  }

  /**
   * Transmit or execute satellite SOS simulation.
   */
  async transmit(
    report: EmergencyReportPayload,
    options: {
      forceFailure?: boolean;
      passDelayMs?: number;
    } = {}
  ): Promise<{
    success: boolean;
    satellitePayload: string;
    status: PerChannelStatus;
    telemetry: {
      constellation: string;
      uplink_frequency_ghz: number;
      satellite_elevation_deg: number;
      azimuth_deg: number;
      ground_station: string;
    };
  }> {
    const satPayload = this.formatSatellitePayload(report);

    communicationEventLog.logEvent({
      incident_id: report.incident_id,
      message_id: report.message_id,
      channel: 'SATELLITE',
      event_type: 'TRANSMISSION_ATTEMPT',
      is_simulated: true,
      details: `[SIMULATED] Preparing Satellite L-band Uplink (1616.0 MHz Iridium / 1618.725 MHz Globalstar): "${satPayload}"`
    });

    // Simulate orbital pass delay
    const delay = options.passDelayMs || 800;
    await new Promise(r => setTimeout(r, delay));

    const isSuccess = !options.forceFailure;

    if (isSuccess) {
      const elevation = 48 + Math.floor(Math.random() * 30);
      const azimuth = 135 + Math.floor(Math.random() * 40);

      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'SATELLITE',
        event_type: 'PROVIDER_ACK',
        is_simulated: true,
        details: `[SIMULATED] Satellite Uplink Confirmed via LEO Constellation Bird #42 (Elevation: ${elevation}°, Azimuth: ${azimuth}°). Routed to INCOIS/NDRF Gateway.`
      });

      return {
        success: true,
        satellitePayload: satPayload,
        telemetry: {
          constellation: 'Iridium NEXT / Globalstar LEO',
          uplink_frequency_ghz: 1.621,
          satellite_elevation_deg: elevation,
          azimuth_deg: azimuth,
          ground_station: 'INCOIS Hyderabad / ISRO ISTRAC Ground Terminal'
        },
        status: {
          status: 'SIMULATED_SUCCESS',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          acknowledgement_id: `SAT_ACK_LEO_${Date.now()}`,
          is_simulated: true
        }
      };
    } else {
      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'SATELLITE',
        event_type: 'FAILURE',
        is_simulated: true,
        details: `[SIMULATED] Satellite Uplink Failed: Obstructed line-of-sight / no overhead satellite lock.`
      });

      return {
        success: false,
        satellitePayload: satPayload,
        telemetry: {
          constellation: 'LEO Constellation',
          uplink_frequency_ghz: 1.621,
          satellite_elevation_deg: 12,
          azimuth_deg: 90,
          ground_station: 'No Lock'
        },
        status: {
          status: 'SIMULATED_FAILED',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          error: 'No overhead satellite in line of sight (simulated obstruction)',
          is_simulated: true
        }
      };
    }
  }
}

export const satelliteSOSAdapter = new SatelliteSOSAdapter();

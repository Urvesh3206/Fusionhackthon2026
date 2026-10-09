// ResQGrid AI — Channel 3: RF / LoRa Radio Adapter
// Encodes compact binary radio frames with CRC16, plays Web Audio AFSK tones, and executes realistic RF simulation.

import { EmergencyReportPayload, ChannelCapabilities, PerChannelStatus, EmergencyType } from './types';
import { communicationEventLog } from './CommunicationEventLog';
import { radioAudioBeacon } from '../radioAudioBeacon';

// ──────────────── PACKET ENCODING (Compact LoRa Frame) ────────────────

const EMERGENCY_TYPE_MAP: Record<EmergencyType, number> = {
  MEDICAL_TRAUMA: 1,
  FLOOD_TRAPPED: 2,
  POWER_GRID_OUTAGE: 3,
  STRUCTURE_COLLAPSE: 4,
  CYCLONE_EVACUATION: 5,
  GENERAL_SOS: 6
};

/**
 * Calculates standard CRC16-CCITT checksum for LoRa frame verification.
 */
function calculateCRC16(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

export interface EncodedLoRaPacket {
  rawBytes: Uint8Array;
  hexString: string;
  byteLength: number;
  crc16: number;
  frequencyMHz: number;
  modulation: string;
}

export class LoRaChannelAdapter {
  readonly channel = 'RF_LORA' as const;
  private defaultFrequencyMHz = 433.920; // 433.920 MHz (ISM / Disaster Band)

  /**
   * Check RF/LoRa capabilities.
   */
  async getCapabilities(): Promise<ChannelCapabilities> {
    const hasWebAudio = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext);
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

    return {
      channel: 'RF_LORA',
      name: 'RF / LoRa Radio Mesh (433.920 MHz / 156.800 MHz)',
      isConfigured: true,
      isSupported: true,
      mode: hasSerial ? 'REAL' : 'SIMULATION',
      details: hasSerial
        ? 'Web Serial Hardware Bridge Available • Acoustic AFSK Coupler Online'
        : 'Acoustic AFSK 1200 Audio Synthesizer Active • Software Mesh Simulator Ready',
      lastChecked: Date.now()
    };
  }

  /**
   * Encodes an emergency report into a compact 22-byte LoRa/VHF radio packet.
   */
  encodeReportToPacket(report: EmergencyReportPayload): EncodedLoRaPacket {
    const buffer = new ArrayBuffer(22);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Header: 'R' (0x52), 'Q' (0x51)
    view.setUint8(0, 0x52);
    view.setUint8(1, 0x51);

    // Version: 1
    view.setUint8(2, 0x01);

    // Message Sequence Number
    view.setUint16(3, report.sequence_no & 0xffff, false);

    // Emergency Type & Priority
    const typeCode = EMERGENCY_TYPE_MAP[report.emergency_type] || 1;
    const prioCode = report.priority.includes('CRITICAL') ? 1 : 2;
    view.setUint8(5, typeCode);
    view.setUint8(6, prioCode);

    // Coordinates (IEEE-754 32-bit floats)
    const lat = report.location ? report.location[1] : 19.8135;
    const lon = report.location ? report.location[0] : 85.8312;
    view.setFloat32(7, lat, false);
    view.setFloat32(11, lon, false);

    // Sender Hash (4 bytes)
    let senderHash = 0;
    for (let i = 0; i < report.sender_id.length; i++) {
      senderHash = (senderHash * 31 + report.sender_id.charCodeAt(i)) & 0xffffffff;
    }
    view.setUint32(15, senderHash >>> 0, false);

    // Compute CRC16 over the first 19 bytes
    const payloadForCrc = uint8.subarray(0, 19);
    const crc = calculateCRC16(payloadForCrc);
    view.setUint16(19, crc, false);

    // Trailing sync byte 0xFF
    view.setUint8(21, 0xff);

    // Format Hex String
    let hexString = '';
    for (let i = 0; i < uint8.length; i++) {
      hexString += uint8[i].toString(16).padStart(2, '0').toUpperCase() + (i < uint8.length - 1 ? ' ' : '');
    }

    return {
      rawBytes: uint8,
      hexString,
      byteLength: uint8.length,
      crc16: crc,
      frequencyMHz: this.defaultFrequencyMHz,
      modulation: 'LoRa CSS (SF7, BW125kHz)'
    };
  }

  /**
   * Transmit packet over RF / LoRa (Acoustic Bell 202 tone + Mesh Simulator).
   */
  async transmit(
    report: EmergencyReportPayload,
    options: {
      forceFailure?: boolean;
      dropRate?: number;
      playAcousticBurst?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    packet: EncodedLoRaPacket;
    status: PerChannelStatus;
    simulatedTelemetry: {
      rssi_dbm: number;
      snr_db: number;
      receiving_masts: string[];
      triangulation_confidence_pct: number;
    };
  }> {
    const packet = this.encodeReportToPacket(report);

    communicationEventLog.logEvent({
      incident_id: report.incident_id,
      message_id: report.message_id,
      channel: 'RF_LORA',
      event_type: 'TRANSMISSION_ATTEMPT',
      is_simulated: true,
      details: `[SIMULATED] Emitting 22-byte LoRa packet on ${packet.frequencyMHz} MHz (CRC16: 0x${packet.crc16.toString(16).toUpperCase()}) Hex: [${packet.hexString}]`
    });

    // Play real acoustic tone coupler if requested
    if (options.playAcousticBurst !== false) {
      try {
        radioAudioBeacon.playAFSKBurst(1.8);
      } catch { /* ignore audio failure */ }
    }

    // Simulate RF propagation delay
    await new Promise(r => setTimeout(r, 600));

    // Determine simulated success or packet loss
    const dropRate = options.dropRate !== undefined ? options.dropRate : 0.05; // 5% default simulated loss
    const isSuccess = !options.forceFailure && Math.random() >= dropRate;

    if (isSuccess) {
      const rssi = -72 - Math.floor(Math.random() * 20);
      const snr = 8.5 + Number((Math.random() * 4).toFixed(1));
      const receivingMasts = ['Puri DHH Main Mast #01', 'Swargadwar RDF Relay #02', 'Ambulance 108 Mobile DF'];
      const confidence = 94 + Math.floor(Math.random() * 5);

      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'RF_LORA',
        event_type: 'PROVIDER_ACK',
        is_simulated: true,
        details: `[SIMULATED] LoRa packet intercepted by ${receivingMasts.length} receiver stations. RSSI: ${rssi} dBm, SNR: ${snr} dB. Conf: ${confidence}%`
      });

      return {
        success: true,
        packet,
        simulatedTelemetry: {
          rssi_dbm: rssi,
          snr_db: snr,
          receiving_masts: receivingMasts,
          triangulation_confidence_pct: confidence
        },
        status: {
          status: 'SIMULATED_SUCCESS',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          acknowledgement_id: `LORA_SIM_ACK_0x${packet.crc16.toString(16).toUpperCase()}`,
          is_simulated: true
        }
      };
    } else {
      communicationEventLog.logEvent({
        incident_id: report.incident_id,
        message_id: report.message_id,
        channel: 'RF_LORA',
        event_type: 'FAILURE',
        is_simulated: true,
        details: `[SIMULATED] LoRa packet lost in transit (Simulated RF interference / out of range).`
      });

      return {
        success: false,
        packet,
        simulatedTelemetry: {
          rssi_dbm: -125,
          snr_db: -12.0,
          receiving_masts: [],
          triangulation_confidence_pct: 0
        },
        status: {
          status: 'SIMULATED_FAILED',
          attempt_count: 1,
          last_attempt: new Date().toISOString(),
          error: 'Simulated RF noise / zero receiver acknowledgements received',
          is_simulated: true
        }
      };
    }
  }
}

export const loraChannelAdapter = new LoRaChannelAdapter();

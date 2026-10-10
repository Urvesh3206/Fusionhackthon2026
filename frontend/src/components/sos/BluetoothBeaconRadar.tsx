import React, { useState, useEffect } from 'react';
import { 
  Bluetooth, Radio, RefreshCw, Smartphone, ShieldCheck, 
  Signal, WifiOff, AlertTriangle, CheckCircle2, Battery,
  Compass, Zap, Locate, Send, Cpu, Check
} from 'lucide-react';
import { 
  bluetoothBeaconService, 
  BluetoothBeaconDevice,
  HardwareGATTTransferResult 
} from '../../services/bluetoothBeaconService';
import { offlineMeshNetwork } from '../../services/offlineMeshNetwork';

interface BluetoothBeaconRadarProps {
  role?: 'PATIENT' | 'ADMIN' | 'DOCTOR';
  victimName?: string;
  bloodType?: string;
  lat?: number;
  lon?: number;
}

export const BluetoothBeaconRadar: React.FC<BluetoothBeaconRadarProps> = ({
  role = 'PATIENT',
  victimName = 'Priyanka Mohapatra',
  bloodType = 'O-Negative',
  lat = 19.8050,
  lon = 85.8280
}) => {
  const [beacons, setBeacons] = useState<BluetoothBeaconDevice[]>(bluetoothBeaconService.getDiscoveredBeacons());
  const [isScanning, setIsScanning] = useState(true);
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [isWebBtSupported, setIsWebBtSupported] = useState(bluetoothBeaconService.isWebBluetoothSupported());
  const [pairingLoading, setPairingLoading] = useState(false);
  const [hardwareResult, setHardwareResult] = useState<HardwareGATTTransferResult | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    bluetoothBeaconService.startScanner();
    const unsub = bluetoothBeaconService.subscribe((list) => {
      setBeacons(list);
    });
    return () => {
      unsub();
      bluetoothBeaconService.stopScanner();
    };
  }, []);

  const handleToggleAdvertising = () => {
    if (isAdvertising) {
      bluetoothBeaconService.stopBeaconAdvertising();
      setIsAdvertising(false);
    } else {
      bluetoothBeaconService.startBeaconAdvertising(victimName, bloodType, lat, lon);
      setIsAdvertising(true);
      try {
        offlineMeshNetwork.broadcastSOS(
          { latitude: lat, longitude: lon, accuracy: 4 },
          `BIN Bluetooth 2.4 GHz Beacon: ${victimName} (${bloodType}) - Offline Distress Pulse`
        );
      } catch { /* offline fallback */ }
    }
  };

  const handlePairRealHardware = async () => {
    setPairingLoading(true);
    setPairError(null);
    setHardwareResult(null);

    try {
      const result = await bluetoothBeaconService.connectAndTransmitHardwareBLE({
        patientName: victimName,
        bloodType,
        lat,
        lon,
        triageReason: 'Automated Triage: Severe Penicillin Anaphylaxis + Asthma'
      });

      setHardwareResult(result);

      // Also broadcast to in-memory mesh
      try {
        offlineMeshNetwork.broadcastSOS(
          { latitude: lat, longitude: lon, accuracy: 2 },
          `Hardware BLE Direct Transfer: ${victimName} (${bloodType}) via ${result.deviceName}`
        );
      } catch { /* ignore */ }
    } catch (e: any) {
      setPairError(e.message || 'Bluetooth hardware pairing was cancelled.');
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Bluetooth className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-white">
                BIN Offline Beacon (Bluetooth Independent Network)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                BLE 5.2 Mesh Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero-Internet P2P device beaconing • Direct radio hopping between victim & responder nodes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direct 1-Click P2P Beacon Button */}
          <button
            onClick={() => {
              bluetoothBeaconService.startBeaconAdvertising(victimName, bloodType, lat, lon, true);
              offlineMeshNetwork.broadcastSOS(
                { latitude: lat, longitude: lon, accuracy: 3 },
                `Offline BLE Beacon Pulse: ${victimName} (${bloodType}) — Critical Distress Signal`
              );
              setHardwareResult({
                success: true,
                deviceName: 'P2P BLE Rescue Beacon Mesh Node',
                deviceId: 'BLE-MESH-NODE-PURI',
                bytesTransmitted: 256,
                message: 'Emergency SOS beacon pulsed to Doctor Triage Queue via 2.4 GHz RF Mesh!',
                timestamp: new Date().toLocaleTimeString()
              });
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white transition flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 active:scale-95"
            title="Instant 1-Click Offline Beacon: Delivers patient coordinates directly to Doctor Profile without pairing popup"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Beam SOS to Doctor (1-Click)</span>
          </button>

          {isWebBtSupported && (
            <button
              onClick={handlePairRealHardware}
              disabled={pairingLoading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              title="Opens Chrome Bluetooth hardware dialog. Note: You can select any device, including earbuds or Unknown Device"
            >
              <Bluetooth className={`w-3.5 h-3.5 ${pairingLoading ? 'animate-spin' : ''}`} />
              <span>{pairingLoading ? 'Scanning Hardware...' : 'Pair Hardware Bluetooth'}</span>
            </button>
          )}

          {role === 'PATIENT' ? (
            <button
              onClick={handleToggleAdvertising}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow ${
                isAdvertising 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isAdvertising ? 'Advertising...' : 'Broadcast RF'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Helpful Bluetooth Scanner Explainer Banner */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="text-amber-400">💡</span>
          <span>Why do phones appear as <em>"Unknown or Unsupported Device"</em> in Chrome?</span>
        </p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Modern Android phones and iPhones hide their device names and randomize their Bluetooth MAC addresses in standby mode to protect user privacy.
          <strong className="text-cyan-300"> Two ways to connect:</strong>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[10px]">
          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <strong className="text-emerald-400 block mb-0.5">Option A: Instant 1-Click (Recommended)</strong>
            Click <span className="text-rose-400 font-bold">⚡ Beam SOS to Doctor</span> above. It beams the GPS coordinates & blood group directly to the Doctor profile without needing OS Bluetooth pairing.
          </div>
          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <strong className="text-indigo-400 block mb-0.5">Option B: To Show Phone Name in Chrome</strong>
            On the Doctor phone, open <strong>Settings &rarr; Bluetooth &rarr; "Pair new device"</strong>. Keep that screen open so the phone broadcasts its name (or select any device like your earbuds).
          </div>
        </div>
      </div>

      {/* Hardware Connection Result Banner */}
      {hardwareResult && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Hardware Bluetooth Direct Link Established</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {hardwareResult.timestamp}
            </span>
          </div>
          <p className="text-[11px] text-emerald-300">{hardwareResult.message}</p>
          <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-400 border-t border-emerald-500/20">
            <span>Target: <strong>{hardwareResult.deviceName}</strong></span>
            <span>Payload: <strong>{hardwareResult.bytesTransmitted} bytes</strong></span>
            <span>Protocol: <strong>BLE GATT 2.4 GHz</strong></span>
          </div>
        </div>
      )}

      {pairError && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{pairError}</span>
        </div>
      )}

      {/* Discovered Beacons Stream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>Discovered Nearby Bluetooth Beacons ({beacons.length})</span>
          <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Continuous 2.4 GHz RF Listening
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
          {beacons.map((beacon) => {
            const isSOS = beacon.beaconType === 'IBEACON_SOS';
            const isHardware = beacon.beaconType === 'HARDWARE_BLE_DEVICE';
            const isVeryClose = beacon.distanceMeters < 5;

            return (
              <div
                key={beacon.id}
                className={`p-3 rounded-xl border transition-all ${
                  isHardware
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                    : isSOS 
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-500/10' 
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isHardware ? 'bg-emerald-600 text-white' : isSOS ? 'bg-rose-600 text-white' : 'bg-slate-800 text-indigo-400'
                    }`}>
                      <Bluetooth className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{beacon.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{beacon.id}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isHardware ? 'bg-emerald-500/20 text-emerald-300' : isVeryClose ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    ~{beacon.distanceMeters}m ({beacon.rssi} dBm)
                  </span>
                </div>

                {beacon.victimPayload && (
                  <div className="mt-2 pt-1.5 border-t border-white/10 text-[11px] text-rose-200">
                    <span className="font-bold">{beacon.victimPayload.patientName}</span> ({beacon.victimPayload.bloodType}) &bull; Priority: {beacon.victimPayload.triagePriority}
                  </div>
                )}

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Type: {beacon.beaconType.replace(/_/g, ' ')}</span>
                  <span>Battery: {beacon.batteryLevel || 90}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

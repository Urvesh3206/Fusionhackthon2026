import React, { useState, useEffect } from 'react';
import { 
  Bluetooth, Radio, RefreshCw, Smartphone, ShieldCheck, 
  Signal, WifiOff, AlertTriangle, CheckCircle2, Battery,
  Compass, Zap, Locate
} from 'lucide-react';
import { 
  bluetoothBeaconService, 
  BluetoothBeaconDevice 
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
  const [pairMessage, setPairMessage] = useState<string | null>(null);

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
    setPairMessage(null);
    try {
      const dev = await bluetoothBeaconService.requestHardwareBluetoothDevice();
      if (dev) {
        setPairMessage(`Connected to hardware Bluetooth device: ${dev.name}`);
      }
    } catch (e: any) {
      setPairMessage(e.message || 'Bluetooth pair request cancelled');
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

        <div className="flex items-center space-x-2">
          {isWebBtSupported && (
            <button
              onClick={handlePairRealHardware}
              disabled={pairingLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{pairingLoading ? 'Scanning...' : 'Pair Web Bluetooth'}</span>
            </button>
          )}

          {role === 'PATIENT' ? (
            <button
              onClick={handleToggleAdvertising}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow ${
                isAdvertising 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isAdvertising ? 'Broadcasting BLE Beacon...' : 'Broadcast BLE Beacon'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const simulatedName = 'Priyanka Mohapatra (Victim Node #02)';
                bluetoothBeaconService.startBeaconAdvertising(simulatedName, 'O-Negative', 19.8050, 85.8280, true);
                offlineMeshNetwork.broadcastSOS(
                  { latitude: 19.8050, longitude: 85.8280, accuracy: 4 },
                  'Offline BLE Beacon: Severe Penicillin Anaphylaxis Detected via 2.4 GHz Radio'
                );
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center space-x-1.5 shadow"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Beacon Pulse</span>
            </button>
          )}
        </div>
      </div>

      {pairMessage && (
        <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{pairMessage}</span>
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
            const isVeryClose = beacon.distanceMeters < 5;

            return (
              <div
                key={beacon.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSOS 
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-500/10' 
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isSOS ? 'bg-rose-600 text-white' : 'bg-slate-800 text-indigo-400'
                    }`}>
                      <Bluetooth className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{beacon.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{beacon.id}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isVeryClose ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
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
                  <span>Type: {beacon.beaconType.replace('_', ' ')}</span>
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

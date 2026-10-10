import React, { useState, useEffect } from 'react';
import { 
  Smartphone, MapPin, Vibrate, Battery, Bell, Eye, Volume2, 
  VolumeX, Share2, Download, CheckCircle2, AlertTriangle, 
  RefreshCw, Radio, Shield, X, Zap, Activity, HardDrive
} from 'lucide-react';
import { deviceServices, GPSCoordinate, BatteryInfo, DeviceTelemetry } from '../../services/deviceServices';

interface DeviceServicesHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceServicesHub: React.FC<DeviceServicesHubProps> = ({ isOpen, onClose }) => {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [gpsData, setGpsData] = useState<GPSCoordinate | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [battery, setBattery] = useState<BatteryInfo>({ level: 1.0, charging: false, supported: false });
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [vibrateStatus, setVibrateStatus] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string>('Online Cache Synchronized');

  useEffect(() => {
    if (!isOpen) return;

    // Load initial device telemetry
    deviceServices.getDeviceTelemetry().then(setTelemetry);

    // Battery listener
    const unsubBattery = deviceServices.listenToBattery((b) => setBattery(b));

    // Wake Lock initial status
    setIsWakeLockActive(deviceServices.isWakeLockActive());

    // Notification permission
    setNotificationStatus(deviceServices.getNotificationPermission());

    // Initial GPS poll
    fetchGps();

    return () => {
      unsubBattery();
    };
  }, [isOpen]);

  const fetchGps = async () => {
    setIsGpsLoading(true);
    setGpsError(null);
    try {
      const coords = await deviceServices.getCurrentPosition();
      setGpsData(coords);
    } catch (err: any) {
      setGpsError(err.message || 'Failed to acquire GPS sensor lock.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  const handleToggleWakeLock = async () => {
    if (isWakeLockActive) {
      deviceServices.releaseWakeLock();
      setIsWakeLockActive(false);
    } else {
      const success = await deviceServices.requestWakeLock();
      setIsWakeLockActive(success);
    }
  };

  const handleTestVibrationSOS = () => {
    const ok = deviceServices.vibrateSOS();
    if (ok) {
      setVibrateStatus('Vibrating Morse SOS (• • • — — — • • •)');
      setTimeout(() => setVibrateStatus(null), 3500);
    } else {
      setVibrateStatus('Haptic vibration not supported or disabled on this browser.');
      setTimeout(() => setVibrateStatus(null), 3000);
    }
  };

  const handleToggleSiren = () => {
    if (isSirenActive) {
      deviceServices.stopEmergencySiren();
      setIsSirenActive(false);
    } else {
      const ok = deviceServices.startEmergencySiren();
      setIsSirenActive(ok);
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await deviceServices.requestNotificationPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      await deviceServices.sendNotification('ResQGrid Device Alert Active', {
        body: 'Push & emergency hazard telemetry is actively paired to this device.',
        tag: 'resqgrid-pairing-test'
      });
    }
  };

  const handleShareEmergencyPass = async () => {
    const locText = gpsData ? `Location: ${gpsData.latitude.toFixed(5)}, ${gpsData.longitude.toFixed(5)}` : 'Location: Active Field Unit';
    const shared = await deviceServices.shareEmergencyData({
      title: 'ResQGrid Emergency Beacon / Triage Unit',
      text: `[EMERGENCY BROADCAST] First Responder / Citizen Unit Active.\n${locText}\nStatus: PWA Offline-Ready.`,
      url: window.location.href
    });

    if (shared) {
      setShareStatus('Emergency pass dispatched via native share.');
      setTimeout(() => setShareStatus(null), 3000);
    }
  };

  const handlePWAInstall = async () => {
    const outcome = await deviceServices.promptInstall();
    if (outcome === 'accepted') {
      const tel = await deviceServices.getDeviceTelemetry();
      setTelemetry(tel);
    }
  };

  const handleClearCacheAndSync = async () => {
    setCacheStatus('Clearing and rebuilding offline caches...');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      setCacheStatus('Offline Caches Purged. Reloading service worker...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Device Hardware & PWA Services Hub</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  telemetry?.isPWA 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {telemetry?.isPWA ? 'INSTALLED PWA' : 'BROWSER MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage offline hardware sensors, vibration, GPS & native push alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* PWA Install Banner inside Hub if not standalone */}
          {!telemetry?.isPWA && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Install ResQGrid on this Device</span>
                </div>
                <p className="text-xs text-slate-300">
                  Adds full standalone icon to Home Screen, enables 100% offline map tiles & instant launch.
                </p>
              </div>
              <button
                onClick={handlePWAInstall}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/30 transition flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Install Application</span>
              </button>
            </div>
          )}

          {/* Quick Hardware Sensor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* 1. GPS Sensor Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>High-Precision GPS</span>
                </div>
                <button
                  onClick={fetchGps}
                  disabled={isGpsLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
                  title="Refresh GPS sensor"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {gpsData ? (
                <div className="space-y-1 font-mono text-[11px] bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latitude:</span>
                    <span className="text-cyan-400 font-bold">{gpsData.latitude.toFixed(6)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Longitude:</span>
                    <span className="text-cyan-400 font-bold">{gpsData.longitude.toFixed(6)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accuracy:</span>
                    <span className="text-emerald-400">±{Math.round(gpsData.accuracy)} meters</span>
                  </div>
                  {gpsData.altitude !== null && gpsData.altitude !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Altitude:</span>
                      <span className="text-amber-400">{Math.round(gpsData.altitude)} m</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl">
                  {gpsError ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {gpsError}
                    </span>
                  ) : (
                    'Acquiring satellite GPS lock...'
                  )}
                </div>
              )}
            </div>

            {/* 2. Battery & Low-Power Mode */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span>Battery Telemetry</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  battery.charging ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {battery.charging ? '⚡ Charging' : 'On Battery'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Device Charge Level:</span>
                  <span className="font-mono font-bold text-emerald-400">{Math.round(battery.level * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      battery.level > 0.4 ? 'bg-emerald-500' : battery.level > 0.15 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round(battery.level * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {battery.level <= 0.2 
                    ? '⚠️ Low battery: Background mesh polling throttled to conserve power.' 
                    : 'System power level optimal for high-bandwidth radio mesh.'}
                </p>
              </div>
            </div>

            {/* 3. Screen Wake Lock & Mission Mode */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Screen Wake Lock</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isWakeLockActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isWakeLockActive ? 'ACTIVE (AWAKE)' : 'STANDBY'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                Prevents display from sleeping during active field navigation and emergency dispatch triage.
              </p>

              <button
                onClick={handleToggleWakeLock}
                className={`w-full py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  isWakeLockActive
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isWakeLockActive ? 'Release Screen Wake Lock' : 'Enable Keep-Awake Mode'}</span>
              </button>
            </div>

            {/* 4. Haptic Vibration Motor & Morse SOS */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Vibrate className="w-4 h-4 text-purple-400" />
                  <span>Haptic Motor Engine</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Tactile Alert</span>
              </div>

              <p className="text-[11px] text-slate-300">
                Dispatches tactile Morse code pulses to device vibration motors in zero-visibility disaster zones.
              </p>

              <button
                onClick={handleTestVibrationSOS}
                className="w-full py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Vibrate className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Morse SOS Pulse</span>
              </button>

              {vibrateStatus && (
                <div className="text-[10px] text-center text-purple-300 animate-pulse font-mono">
                  {vibrateStatus}
                </div>
              )}
            </div>

            {/* 5. Acoustic Rescue Siren */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Acoustic Rescue Siren</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isSirenActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isSirenActive ? 'SIREN ACTIVE' : 'OFF'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                Synthesizes a 960Hz dual-tone acoustic beacon via Web Audio API without internet connection.
              </p>

              <button
                onClick={handleToggleSiren}
                className={`w-full py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  isSirenActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-200'
                }`}
              >
                {isSirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isSirenActive ? 'Stop Emergency Siren' : 'Trigger Acoustic Siren'}</span>
              </button>
            </div>

            {/* 6. Push Notifications */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <Bell className="w-4 h-4 text-blue-400" />
                  <span>Native System Alerts</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  notificationStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {notificationStatus.toUpperCase()}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                Delivers lock-screen notifications for incoming SOS mesh packets and hazard updates.
              </p>

              <button
                onClick={handleRequestNotifications}
                className="w-full py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Bell className="w-3.5 h-3.5 text-blue-400" />
                <span>{notificationStatus === 'granted' ? 'Send Test Dispatch Notification' : 'Enable Push Notifications'}</span>
              </button>
            </div>

          </div>

          {/* Action Row: Web Share & Offline Cache Management */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-200">Emergency Unit Share Sheet</p>
                <p className="text-[11px] text-slate-400">Share GPS coordinates & medical triage via system share sheet</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleShareEmergencyPass}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Dispatch Share</span>
              </button>
              <button
                onClick={handleClearCacheAndSync}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
                title="Force reload Service Worker cache"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Re-Sync Cache</span>
              </button>
            </div>
          </div>

          {shareStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-center font-semibold text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{shareStatus}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ResQGrid Offline Core Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

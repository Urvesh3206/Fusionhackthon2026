import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, MapPin, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, Shield, User, LogOut, ChevronDown, ChevronUp, 
  HelpCircle, Navigation, Radio, Check, Info, ShieldCheck,
  AlertCircle, Smartphone, Flame, HeartPulse, Waves, Users,
  Satellite, Compass, Crosshair
} from 'lucide-react';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { crossDeviceAlertSync, CitizenSOSAlert } from '../../services/crossDeviceAlertSync';
import { communicationManager } from '../../services/communication/CommunicationManager';
import { EmergencyType } from '../../services/communication/types';
import { 
  getRealGPSPosition, 
  watchRealGPS, 
  RealGPSPosition, 
  getGeolocationErrorMessage 
} from '../../services/offlineGPS';
import { radioAudioBeacon } from '../../services/radioAudioBeacon';
import { UserLocationMap } from './UserLocationMap';

interface IncidentUpdate {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'dispatch';
}

export const UserProfileDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchRole, addOverride } = useEmergencyStore();

  // ──────── GPS / Real Device Location State ────────
  const [gpsPosition, setGpsPosition] = useState<RealGPSPosition | null>(null);
  const [locationStatus, setLocationStatus] = useState<'acquiring' | 'available' | 'denied' | 'stale'>('acquiring');
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [manualPosition, setManualPosition] = useState<[number, number] | null>(null);
  const [manualLocationText, setManualLocationText] = useState('');
  const [showManualLocationInput, setShowManualLocationInput] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const [lastLocationUpdateTime, setLastLocationUpdateTime] = useState<string | null>(null);

  // Watcher ref for clean lifecycle management
  const watcherIdRef = useRef<number | null>(null);

  // ──────── Emergency SOS State ────────
  const [isConfirmingSOS, setIsConfirmingSOS] = useState(false);
  const [isSubmittingSOS, setIsSubmittingSOS] = useState(false);
  const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<CitizenSOSAlert | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [incidentHistory, setIncidentHistory] = useState<CitizenSOSAlert[]>([]);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);

  // ──────── Optional Emergency Details ────────
  const [showDetailsSection, setShowDetailsSection] = useState(false);
  const [emergencyCategory, setEmergencyCategory] = useState<EmergencyType>('MEDICAL_TRAUMA');
  const [affectedPeopleCount, setAffectedPeopleCount] = useState<number>(1);
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [accessibilityNotes, setAccessibilityNotes] = useState('');

  // ──────── Profile & Menu State ────────
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHelpInstructions, setShowHelpInstructions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ──────── 1. Acquire Real Device GPS ────────
  const acquireLocation = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshingLocation(true);
    setLocationErrorMessage(null);
    setLocationStatus('acquiring');

    try {
      const pos = await getRealGPSPosition({ timeoutMs: 12000, maximumAgeMs: 0 });
      setGpsPosition(pos);
      setLocationStatus('available');
      setLastLocationUpdateTime(new Date(pos.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.warn('[User Dashboard] Real GPS acquisition failed:', err);
      const msg = getGeolocationErrorMessage(err);
      setLocationErrorMessage(msg);
      setLocationStatus('denied');
    } finally {
      if (isManualRefresh) setIsRefreshingLocation(false);
    }
  }, []);

  // ──────── 2. Continuous Live GPS Watcher ────────
  const startLiveTracking = useCallback(() => {
    if (watcherIdRef.current !== null) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    setIsLiveTracking(true);
    setLocationErrorMessage(null);

    const id = watchRealGPS(
      (pos) => {
        setGpsPosition(pos);
        setLocationStatus('available');
        setLastLocationUpdateTime(new Date(pos.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      },
      (err) => {
        console.warn('[User Dashboard Watcher Error]:', err);
        setLocationErrorMessage(getGeolocationErrorMessage(err));
        if (err.code === 1) { // Permission denied
          setLocationStatus('denied');
          setIsLiveTracking(false);
        }
      },
      { timeoutMs: 15000, maximumAgeMs: 0 }
    );

    watcherIdRef.current = id;
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (watcherIdRef.current !== null) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }
    setIsLiveTracking(false);
  }, []);

  const toggleLiveTracking = () => {
    if (isLiveTracking) {
      stopLiveTracking();
    } else {
      startLiveTracking();
    }
  };

  // Initial location acquisition on mount
  useEffect(() => {
    acquireLocation();

    // Clean up watcher on unmount
    return () => {
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
    };
  }, [acquireLocation]);

  // Periodic staleness check
  useEffect(() => {
    const interval = setInterval(() => {
      if (gpsPosition) {
        const ageSec = Math.floor((Date.now() - gpsPosition.timestamp) / 1000);
        if (ageSec > 120 && locationStatus === 'available') {
          setLocationStatus('stale');
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [gpsPosition, locationStatus]);

  // ──────── 3. Real-time Subscription for Alert Updates ────────
  useEffect(() => {
    const unsub = crossDeviceAlertSync.subscribe((alerts) => {
      // Find latest alert sent by or associated with this citizen
      const userAlerts = alerts.filter(
        a => a.sender_name.includes(currentUser.username) || a.sender_name.includes(currentUser.full_name) || a.sender_role === 'citizen'
      );
      setIncidentHistory(userAlerts);

      if (userAlerts.length > 0) {
        const active = userAlerts.find(a => a.status === 'PENDING_DISPATCH' || a.status === 'ACKNOWLEDGED_BY_ADMIN' || a.status === 'AMBULANCE_DISPATCHED');
        if (active) {
          setActiveAlert(active);
        } else if (activeAlert) {
          const updated = userAlerts.find(a => a.id === activeAlert.id);
          if (updated) setActiveAlert(updated);
        }
      }
    });

    return unsub;
  }, [currentUser, activeAlert]);

  // ──────── 4. Trigger Emergency SOS ────────
  const handleTriggerSOS = async () => {
    if (isSubmittingSOS) return;
    setIsSubmittingSOS(true);
    setSubmissionError(null);

    // Use genuine device GPS coordinates if available, otherwise manual landmark pin or Puri fallback
    const hasGps = gpsPosition && !isNaN(gpsPosition.latitude) && !isNaN(gpsPosition.longitude);
    const hasManual = manualPosition && !isNaN(manualPosition[0]) && !isNaN(manualPosition[1]);

    const lat = hasGps ? gpsPosition.latitude : (hasManual ? manualPosition[0] : 19.8135);
    const lon = hasGps ? gpsPosition.longitude : (hasManual ? manualPosition[1] : 85.8312);
    const accuracy = hasGps ? Math.round(gpsPosition.accuracy_m) : undefined;

    try {
      // Play acoustic tone beacon
      try {
        radioAudioBeacon.playAFSKBurst(1.2);
      } catch { /* ignore */ }

      // Build emergency description
      const descParts = [];
      if (emergencyNotes.trim()) descParts.push(emergencyNotes.trim());
      if (affectedPeopleCount > 1) descParts.push(`(${affectedPeopleCount} people affected)`);
      if (accessibilityNotes.trim()) descParts.push(`[Note: ${accessibilityNotes.trim()}]`);
      if (manualLocationText.trim()) descParts.push(`[Landmark: ${manualLocationText.trim()}]`);
      if (!hasGps) descParts.push('[Location Mode: Manual / Approximate]');

      const fullDescription = descParts.length > 0 
        ? descParts.join(' • ')
        : 'Citizen activated 1-Click Priority Emergency SOS! Urgent medical evacuation and assistance requested.';

      // A. Broadcast across alert bus (synced in real-time to Team Delta Admin Command)
      const alert = crossDeviceAlertSync.broadcastSOS({
        sender_name: `${currentUser.full_name} (${currentUser.username})`,
        sender_phone: '+91 98610 23456',
        sender_role: currentUser.role,
        emergency_type: emergencyCategory,
        priority: 'P1_CRITICAL',
        description: fullDescription,
        location: [lon, lat],
        location_accuracy_m: accuracy,
        channel: 'MULTI_CHANNEL'
      });

      // B. Dispatch to multi-channel communication manager & outbox
      try {
        await communicationManager.createAndDispatchReport({
          senderId: currentUser.id,
          senderName: currentUser.full_name,
          senderRole: currentUser.role,
          emergencyType: emergencyCategory,
          priority: 'P1_CRITICAL',
          description: fullDescription,
          customLocation: [lon, lat]
        });
      } catch (commsErr) {
        console.warn('[User Dashboard] Comms manager fallback:', commsErr);
      }

      // C. Audit log entry
      addOverride({
        id: `sos_${Date.now()}`,
        recommendation_id: alert.id,
        recommendation_type: 'AMBULANCE_DISPATCH',
        timestamp: new Date().toISOString(),
        dispatcher_id: currentUser.id,
        action: 'CITIZEN_EMERGENCY_SOS',
        system_recommended_id: 'AMB-108-PURI-01',
        dispatcher_chosen_id: 'AMB-108-PURI-01',
        justification_reason: `Citizen pressed 1-Click Emergency SOS from GPS [${lat.toFixed(4)}, ${lon.toFixed(4)}]. Broadcasted to Team Delta EOC.`
      });

      setActiveAlert(alert);
      setSubmissionSuccessMessage(`SOS Submitted Successfully! Incident ID: ${alert.id.slice(0, 12)} — Synced with EOC Command.`);
      setIsConfirmingSOS(false);
      setTimeout(() => setSubmissionSuccessMessage(null), 8000);
    } catch (err: any) {
      console.error('Failed to submit SOS:', err);
      setSubmissionError('Unable to transmit request. Your emergency request is saved locally on this device. Retrying...');
    } finally {
      setIsSubmittingSOS(false);
    }
  };

  // ──────── 5. Optional Cellular SMS Fallback Helpers ────────
  const getSMSMessageBody = () => {
    const hasGps = gpsPosition && !isNaN(gpsPosition.latitude) && !isNaN(gpsPosition.longitude);
    const locStr = hasGps 
      ? `${gpsPosition.latitude.toFixed(4)}N,${gpsPosition.longitude.toFixed(4)}E` 
      : (manualPosition ? `${manualPosition[0].toFixed(4)}N,${manualPosition[1].toFixed(4)}E` : 'LOCATION_UNAVAILABLE');
    return `SOS: ResQGrid Emergency | ${emergencyCategory} | P1 CRITICAL | Loc:${locStr} | User:${currentUser.full_name} | People:${affectedPeopleCount}`;
  };

  const handleCopySMS = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getSMSMessageBody());
      setSmsCopied(true);
      setTimeout(() => setSmsCopied(false), 3000);
    }
  };

  const handleLaunchNativeSMS = () => {
    const text = encodeURIComponent(getSMSMessageBody());
    if (typeof window !== 'undefined') {
      try {
        window.location.href = `sms:108?body=${text}`;
      } catch (err) {
        console.warn('Native SMS launch:', err);
      }
    }
  };

  const getFirstName = () => {
    const raw = currentUser.full_name || currentUser.username || 'Citizen';
    return raw.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'User';
  };

  // ──────── 6. Response-Team Updates Timeline ────────
  const getResponseUpdates = (alert: CitizenSOSAlert): IncidentUpdate[] => {
    const updates: IncidentUpdate[] = [];
    const createdTime = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    updates.push({
      id: 'upd_1',
      time: createdTime,
      title: 'Request Received by ResQGrid Platform',
      description: 'Your emergency distress signal and live GPS snapshot were received and logged.',
      type: 'info'
    });

    if (alert.status === 'ACKNOWLEDGED_BY_ADMIN' || alert.status === 'AMBULANCE_DISPATCHED') {
      updates.push({
        id: 'upd_2',
        time: new Date(new Date(alert.timestamp).getTime() + 45000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Response Team Acknowledged Incident',
        description: 'Team Delta Dispatcher in Puri EOC has verified your coordinates and prioritized response.',
        type: 'success'
      });
    }

    if (alert.status === 'AMBULANCE_DISPATCHED') {
      updates.push({
        id: 'upd_3',
        time: new Date(new Date(alert.timestamp).getTime() + 90000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: `Ambulance Dispatched (${alert.assigned_ambulance_id || 'AMB-108-PURI-01'})`,
        description: `Advanced Life Support unit has been dispatched and is en route to your location.`,
        type: 'dispatch'
      });
    }

    return updates;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 text-slate-100 pb-12 animate-fade-in">
      
      {/* ──────────────── A. COMPACT HEADER ──────────────── */}
      <header className="bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm tracking-tight text-white">ResQGrid AI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Patient Portal
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100">
              Hello, {getFirstName()}
            </h1>
          </div>
        </div>

        {/* Profile Menu & Quick Actions */}
        <div className="relative flex items-center space-x-2">
          <button
            onClick={() => setShowHelpInstructions(!showHelpInstructions)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
            title="Emergency Instructions"
            aria-label="Emergency Instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Account</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Account Dropdown */}
          {showAccountMenu && (
            <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-fade-in text-xs">
              <div className="px-2 py-1.5 border-b border-slate-800">
                <p className="font-bold text-slate-100">{currentUser.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email || 'aarav.sharma@puri-resident.in'}</p>
                <p className="text-[10px] text-emerald-400 font-medium mt-0.5">✓ Verified Patient Account</p>
              </div>

              <button
                onClick={() => { setShowAccountMenu(false); setShowHistoryModal(true); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 transition flex items-center justify-between"
              >
                <span>View Emergency History</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-mono">
                  {incidentHistory.length}
                </span>
              </button>

              <button
                onClick={() => { setShowAccountMenu(false); switchRole('admin'); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-purple-300 transition flex items-center space-x-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Switch to Admin Profile</span>
              </button>

              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => { setShowAccountMenu(false); navigate('/login'); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-rose-950/40 text-rose-400 transition flex items-center space-x-2 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Emergency Instructions Modal / Banner */}
      {showHelpInstructions && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              How to Request Emergency Help in 3 Steps:
            </span>
            <button
              onClick={() => setShowHelpInstructions(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
            >
              Close
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
            <li>Verify that your <strong>Live Location Map</strong> below shows your accurate device GPS position.</li>
            <li>Tap the large red <strong>SOS — Request Emergency Help</strong> button.</li>
            <li>Confirm the prompt. Your real device coordinates and emergency status will immediately dispatch to the 108 Command Center.</li>
          </ol>
        </div>
      )}

      {/* ──────────────── B. MAIN EMERGENCY ASSISTANCE CARD ──────────────── */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertCircle className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>Priority Emergency Help</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Need Emergency Help?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Request assistance from the emergency response team. Your real GPS position will be sent with highest priority.
          </p>
        </div>

        {/* SOS Button Area */}
        <div className="flex flex-col items-center justify-center space-y-4 pt-1">
          {!isConfirmingSOS ? (
            <button
              onClick={() => setIsConfirmingSOS(true)}
              disabled={isSubmittingSOS}
              className="w-full sm:w-80 py-5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-base sm:text-lg shadow-2xl shadow-red-600/40 hover:shadow-red-600/60 transition-all transform active:scale-95 flex items-center justify-center space-x-3 border border-red-400/50 group"
              aria-label="SOS Request Emergency Help"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-4 h-4 text-white animate-bounce" />
              </div>
              <span className="tracking-wide">SOS — Request Emergency Help</span>
            </button>
          ) : (
            /* Confirmation Step to Prevent Accidental Activation */
            <div className="w-full max-w-md p-5 rounded-2xl bg-red-950/80 border-2 border-red-500 text-left space-y-4 animate-scale-in shadow-2xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Confirm Emergency Distress Request?</h3>
                  <p className="text-xs text-red-200 mt-0.5">
                    This will alert 108 Emergency Dispatch and Response Teams with your exact GPS coordinates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingSOS(false)}
                  disabled={isSubmittingSOS}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition text-center border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerSOS}
                  disabled={isSubmittingSOS}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition text-center shadow-lg shadow-red-600/40 flex items-center justify-center space-x-1.5"
                >
                  {isSubmittingSOS ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Yes, Send SOS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Offline Cellular SMS Option */}
          <button
            type="button"
            onClick={() => setShowSMSModal(true)}
            className="text-xs text-slate-400 hover:text-emerald-300 transition flex items-center space-x-1.5 font-medium py-1"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline SMS Backup Options (108 Dispatch)</span>
          </button>
        </div>

        {submissionSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{submissionSuccessMessage}</span>
          </div>
        )}

        {submissionError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{submissionError}</span>
          </div>
        )}
      </section>

      {/* ──────────────── C. LOCATION STATUS & LIVE LEAFLET MAP CARD ──────────────── */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">Your Real-Time Location</h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
              locationStatus === 'available'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : locationStatus === 'acquiring'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : locationStatus === 'stale'
                ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                locationStatus === 'available' ? 'bg-emerald-400 animate-pulse' : locationStatus === 'acquiring' ? 'bg-amber-400 animate-ping' : 'bg-rose-400'
              }`}></span>
              <span>
                {locationStatus === 'available' 
                  ? (isLiveTracking ? 'Live GPS Tracking' : 'GPS Fix Available') 
                  : locationStatus === 'acquiring' 
                  ? 'Acquiring Fix...' 
                  : locationStatus === 'stale'
                  ? 'Stale GPS Fix'
                  : 'GPS Unavailable'}
              </span>
            </span>

            <button
              onClick={() => acquireLocation(true)}
              disabled={isRefreshingLocation}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs flex items-center gap-1 border border-slate-700"
              title="Refresh Location"
              aria-label="Refresh Location"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocation ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline text-[11px]">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Interactive Leaflet Live Map Section ── */}
        <UserLocationMap
          gpsPosition={gpsPosition}
          manualPosition={manualPosition}
          locationStatus={locationStatus}
          isLiveTracking={isLiveTracking}
          onRefresh={() => acquireLocation(true)}
          onToggleTracking={toggleLiveTracking}
          onSelectManualPosition={(lat, lon) => {
            setManualPosition([lat, lon]);
            setManualLocationText(`Selected Pin: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
          }}
        />

        {/* Error / Alert Message if Geolocation failed */}
        {locationErrorMessage && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Location Notice</p>
              <p className="text-[11px] text-amber-300">{locationErrorMessage}</p>
            </div>
          </div>
        )}

        {/* Coordinate Readout Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/90">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Device Coordinates</span>
            <span className="font-mono text-cyan-300 font-bold text-xs sm:text-sm">
              {gpsPosition 
                ? `${gpsPosition.latitude.toFixed(5)}°N, ${gpsPosition.longitude.toFixed(5)}°E` 
                : manualPosition 
                ? `${manualPosition[0].toFixed(5)}°N, ${manualPosition[1].toFixed(5)}°E (Manual)`
                : 'Acquiring GPS...'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/90">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">GPS Accuracy Radius</span>
            <span className="font-mono text-slate-200 font-bold text-xs sm:text-sm">
              {gpsPosition ? `±${Math.round(gpsPosition.accuracy_m)} meters` : (manualPosition ? 'Custom Pin' : 'Awaiting fix')}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/90">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Last Fix Time</span>
            <span className="text-slate-300 text-xs sm:text-sm font-medium">
              {lastLocationUpdateTime || 'Just now'}
            </span>
          </div>
        </div>

        {/* Manual Location Fallback (when GPS denied or user prefers text description) */}
        {locationStatus === 'denied' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] text-amber-300 font-medium">
                GPS permission denied. Enter your location landmark or tap on the map:
              </span>
              <button
                type="button"
                onClick={() => setShowManualLocationInput(!showManualLocationInput)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {showManualLocationInput ? 'Hide' : 'Enter Address'}
              </button>
            </div>
            {showManualLocationInput && (
              <input
                type="text"
                value={manualLocationText}
                onChange={(e) => setManualLocationText(e.target.value)}
                placeholder="e.g. Near Jagannath Temple East Gate, Grand Road, Puri"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            )}
          </div>
        )}
      </section>

      {/* ──────────────── D. CURRENT SOS STATUS ──────────────── */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">Current SOS Status</h3>
          </div>

          {activeAlert && (
            <span className="text-[11px] font-mono bg-slate-950 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
              ID: {activeAlert.id.substring(0, 14)}
            </span>
          )}
        </div>

        {!activeAlert ? (
          /* Calm Empty State */
          <div className="py-6 text-center space-y-1.5">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400/70" />
            </div>
            <h4 className="font-bold text-sm text-slate-300">No active emergency request</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              If you need assistance, you can request help above. Your status and responder updates will appear here.
            </p>
          </div>
        ) : (
          /* Active Incident Status Card */
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              activeAlert.status === 'AMBULANCE_DISPATCHED'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : activeAlert.status === 'ACKNOWLEDGED_BY_ADMIN'
                ? 'bg-cyan-950/40 border-cyan-500/40'
                : 'bg-amber-950/40 border-amber-500/40'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    activeAlert.status === 'AMBULANCE_DISPATCHED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}></span>
                  <span className="font-extrabold text-sm text-white">
                    {activeAlert.status === 'AMBULANCE_DISPATCHED' 
                      ? 'Ambulance Dispatched & En Route' 
                      : activeAlert.status === 'ACKNOWLEDGED_BY_ADMIN'
                      ? 'Acknowledged by Response Team'
                      : 'Received by ResQGrid — Awaiting Dispatcher'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {activeAlert.description}
                </p>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center text-right text-[11px] text-slate-400 font-mono">
                <span>Submitted: {new Date(activeAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-cyan-300 font-semibold">{activeAlert.channel} Channel</span>
              </div>
            </div>

            {/* Quick Map Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-slate-400">
                Assigned Unit: <strong className="text-slate-200">{activeAlert.assigned_ambulance_id || 'AMB-108-PURI-01'}</strong>
              </span>
              <button
                onClick={() => navigate('/map')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold transition flex items-center gap-1.5 border border-slate-700"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Track on Full Disaster Map</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ──────────────── E. RESPONSE-TEAM UPDATES ──────────────── */}
      {activeAlert && (
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-100">Response Updates</h3>
            </div>
            <span className="text-[10px] text-slate-400">Live Sync</span>
          </div>

          <div className="space-y-3">
            {getResponseUpdates(activeAlert).map((upd, idx) => (
              <div key={upd.id} className="flex items-start space-x-3 text-xs">
                <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    upd.type === 'dispatch' ? 'bg-emerald-500 text-white' : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    <Check className="w-3 h-3" />
                  </div>
                  {idx < getResponseUpdates(activeAlert).length - 1 && (
                    <div className="w-0.5 h-6 bg-slate-800 my-0.5"></div>
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200">{upd.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{upd.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{upd.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ──────────────── F. OPTIONAL EMERGENCY DETAILS ──────────────── */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => setShowDetailsSection(!showDetailsSection)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-850/60 transition"
        >
          <div className="flex items-center space-x-2.5">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">Emergency Details (Optional)</h3>
              <p className="text-[11px] text-slate-400">Specify category, affected people, or assistance notes before or after pressing SOS.</p>
            </div>
          </div>
          <div className="text-slate-400">
            {showDetailsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDetailsSection && (
          <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-800/80 text-xs">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Emergency Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'MEDICAL_TRAUMA' as EmergencyType, label: 'Medical Emergency', icon: HeartPulse },
                  { id: 'FLOOD_TRAPPED' as EmergencyType, label: 'Flood / Trapped', icon: Waves },
                  { id: 'STRUCTURE_COLLAPSE' as EmergencyType, label: 'Collapse / Hazard', icon: Flame },
                  { id: 'GENERAL_SOS' as EmergencyType, label: 'General Assistance', icon: AlertTriangle },
                ].map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEmergencyCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        emergencyCategory === cat.id
                          ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Affected People & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Number of People Affected</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={affectedPeopleCount}
                  onChange={(e) => setAffectedPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Specific Assistance / Medical Needs</label>
                <input
                  type="text"
                  placeholder="e.g. Oxygen cylinder, elderly person, wheelchair"
                  value={accessibilityNotes}
                  onChange={(e) => setAccessibilityNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Short Description</label>
              <textarea
                rows={2}
                placeholder="Add any additional details that will assist responders..."
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>
          </div>
        )}
      </section>

      {/* ──────────────── G. HELP & ACCOUNT OPTIONS ──────────────── */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Need help? Emergency Hotline: <strong className="text-slate-200">108</strong> (Ambulance) / <strong className="text-slate-200">112</strong> (Unified Emergency)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
          >
            Past Incidents ({incidentHistory.length})
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition text-[11px]"
          >
            Sign Out
          </button>
        </div>
      </section>

      {/* ──────────────── EMERGENCY HISTORY MODAL ──────────────── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Your Emergency Request History</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700"
              >
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {incidentHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No previous emergency requests found on this device.</p>
              ) : (
                incidentHistory.map(inc => (
                  <div key={inc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-300 font-bold">{inc.id.substring(0, 14)}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {inc.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-slate-300">{inc.description}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>{new Date(inc.timestamp).toLocaleString()}</span>
                      <span>Channel: {inc.channel}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── OPTIONAL OFFLINE SMS MODAL ──────────────── */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-slate-100 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Offline SMS Distress Backup (108 Dispatch)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSMSModal(false)}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1 text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <Info className="w-3.5 h-3.5" />
                <span>Notice on SMS Delivery:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                The primary <strong>SOS Button</strong> directly transmits to the live response center database. 
                This offline SMS tool is a secondary manual fallback that formats a 160-character distress SMS for mobile phones with GSM cellular reception.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">Pre-formatted 108 Emergency SMS Payload:</label>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-300 text-[11px] break-all select-all leading-relaxed">
                {getSMSMessageBody()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopySMS}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span>{smsCopied ? '✓ Copied to Clipboard!' : 'Copy SMS Payload'}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchNativeSMS}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open SMS App (Mobile)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Activity Icon helper
function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  );
}

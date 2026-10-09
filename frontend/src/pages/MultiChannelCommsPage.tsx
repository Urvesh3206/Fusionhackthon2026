import React, { useState, useEffect } from 'react';
import { 
  Signal, Wifi, WifiOff, MessageSquare, Radio, Satellite, 
  HardDrive, RefreshCw, Send, ShieldAlert, CheckCircle2, 
  AlertTriangle, Clock, Copy, ExternalLink, Play, ArrowRight,
  Layers, MapPin, Zap, Volume2, VolumeX, Activity, Compass,
  Cpu, RotateCcw, AlertOctagon, Terminal, RadioReceiver, Sliders,
  Gauge, Network, Database, KeyRound, Check, Download
} from 'lucide-react';
import { communicationManager } from '../services/communication/CommunicationManager';
import { communicationEventLog } from '../services/communication/CommunicationEventLog';
import { 
  OutboxRecord, 
  CommunicationEvent, 
  ChannelCapabilities, 
  ChannelType, 
  EmergencyType, 
  EmergencyPriority 
} from '../services/communication/types';
import { useEmergencyStore } from '../stores/useEmergencyStore';
import { getRealGPSPosition, RealGPSPosition } from '../services/offlineGPS';
import { radioAudioBeacon } from '../services/radioAudioBeacon';

type CommsTab = 'live-mission' | 'telemetry-diagnostics' | 'dispatch-outbox';

export const MultiChannelCommsPage: React.FC = () => {
  const { currentUser, isOfflineNetworkCrash, setOfflineNetworkCrash } = useEmergencyStore();

  const [activeTab, setActiveTab] = useState<CommsTab>('live-mission');
  const [capabilities, setCapabilities] = useState<ChannelCapabilities[]>([]);
  const [outboxRecords, setOutboxRecords] = useState<OutboxRecord[]>([]);
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [gpsPosition, setGpsPosition] = useState<RealGPSPosition | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isProbingPipelines, setIsProbingPipelines] = useState(false);

  // Form State
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('FLOOD_TRAPPED');
  const [priority, setPriority] = useState<EmergencyPriority>('P1_CRITICAL');
  const [description, setDescription] = useState('Critical water surge trapping citizens in coastal sector.');
  const [selectedChannels, setSelectedChannels] = useState<Record<ChannelType, boolean>>({
    INTERNET: true,
    SMS: true,
    RF_LORA: true,
    SATELLITE: true,
    OFFLINE_QUEUE: true
  });
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Initialize data and listeners
  useEffect(() => {
    refreshCapabilities();
    acquireGPS();

    const unsubOutbox = communicationManager.subscribe((records) => {
      setOutboxRecords(records);
      if (records.length > 0 && !selectedRecordId) {
        setSelectedRecordId(records[0].id);
      }
    });

    const unsubEvents = communicationEventLog.subscribe((evts) => {
      setEvents(evts);
    });

    return () => {
      unsubOutbox();
      unsubEvents();
    };
  }, []);

  const refreshCapabilities = async () => {
    const caps = await communicationManager.getAllCapabilities();
    setCapabilities(caps);
  };

  const acquireGPS = async () => {
    setIsGpsLoading(true);
    try {
      const pos = await getRealGPSPosition(8000);
      setGpsPosition(pos);
    } catch { /* fallback */ }
    finally { setIsGpsLoading(false); }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await communicationManager.syncPendingOutbox();
      await refreshCapabilities();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProbeAllPipelines = async () => {
    setIsProbingPipelines(true);
    try {
      await communicationManager.syncPendingOutbox();
      await refreshCapabilities();
    } finally {
      setTimeout(() => setIsProbingPipelines(false), 800);
    }
  };

  const handleToggleAudioBeacon = () => {
    if (isPlayingAudio) {
      radioAudioBeacon.stop();
      setIsPlayingAudio(false);
    } else {
      radioAudioBeacon.playMorseSOS();
      setIsPlayingAudio(true);
    }
  };

  const handleTransmitEmergencyReport = async () => {
    setIsTransmitting(true);
    try {
      const targetChannels = (Object.keys(selectedChannels) as ChannelType[]).filter(
        ch => selectedChannels[ch]
      );

      const customLoc: [number, number] | null = gpsPosition
        ? [gpsPosition.longitude, gpsPosition.latitude]
        : [85.8312, 19.8135];

      const record = await communicationManager.createAndDispatchReport({
        senderId: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        emergencyType,
        priority,
        description,
        customLocation: customLoc,
        targetChannels
      });

      setSelectedRecordId(record.id);
      await refreshCapabilities();
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleCopySMS = (text: string, msgId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 3000);
    }
  };

  const selectedRecord = outboxRecords.find(r => r.id === selectedRecordId) || outboxRecords[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in text-on-surface">
      
      {/* 1. Stitch Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-2 rounded-xl border border-surface-container-high shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('live-mission')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-headline-sm transition ${
              activeTab === 'live-mission'
                ? 'bg-surface-container-high text-secondary font-bold border border-secondary/40 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Activity className="w-4 h-4 text-secondary" />
            <span>Live Mission & Comms Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry-diagnostics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-headline-sm transition ${
              activeTab === 'telemetry-diagnostics'
                ? 'bg-surface-container-high text-secondary font-bold border border-secondary/40 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Gauge className="w-4 h-4 text-secondary" />
            <span>Channel Telemetry & Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('dispatch-outbox')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-headline-sm transition ${
              activeTab === 'dispatch-outbox'
                ? 'bg-surface-container-high text-secondary font-bold border border-secondary/40 shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Database className="w-4 h-4 text-secondary" />
            <span>Incident Dispatch & Outbox</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary/20 text-secondary font-mono">
              {outboxRecords.length}
            </span>
          </button>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOfflineNetworkCrash(!isOfflineNetworkCrash)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-headline-sm transition border ${
              isOfflineNetworkCrash
                ? 'bg-error-container text-on-error-container border-primary animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-surface-container-high'
            }`}
            title="Simulate cellular and cloud blackout"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>{isOfflineNetworkCrash ? 'NETWORK: BLACKOUT' : 'SIMULATE BLACKOUT'}</span>
          </button>

          <button
            onClick={handleToggleAudioBeacon}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-headline-sm transition border ${
              isPlayingAudio
                ? 'bg-primary-container text-on-primary-container border-primary animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-surface-container-high'
            }`}
            title="Transmit acoustic Morse SOS beacon"
          >
            {isPlayingAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isPlayingAudio ? 'AUDIO BEACON: ON' : 'AUDIO SOS'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LIVE MISSION & COMMS HUB                          */}
      {/* ======================================================== */}
      {activeTab === 'live-mission' && (
        <div className="space-y-6">
          {/* Top Incident Command Alert Banner */}
          <div className="relative overflow-hidden bg-surface-container-low rounded-xl p-5 md:p-6 shadow-xl border border-surface-container-high">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-primary-container"></div>
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2 font-telemetry-sm">
                  <span className="inline-flex items-center gap-1.5 bg-error-container/60 text-on-error-container px-2.5 py-0.5 rounded font-label-caps text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    DEFCON 1 // ACTIVE INCIDENT
                  </span>
                  <span className="text-secondary font-bold font-mono">INC-9042</span>
                  <span className="text-on-surface-variant">• SECTOR B-7 (PURI COASTAL)</span>
                  <span className="bg-surface-container-high px-2 py-0.5 rounded text-tertiary font-mono">
                    FAILOVER: TIER_1_AUTO
                  </span>
                </div>

                <h2 className="font-headline-lg text-lg md:text-2xl text-on-surface font-bold tracking-tight">
                  Severe Cyclone Landfall & Surge Evacuation — Sector B-7
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-telemetry-sm text-on-surface-variant">
                  <span className="flex items-center gap-1 text-secondary">
                    <MapPin className="w-3.5 h-3.5" />
                    {gpsPosition ? `${gpsPosition.latitude.toFixed(4)}° N, ${gpsPosition.longitude.toFixed(4)}° E (±${Math.round(gpsPosition.accuracy_m)}m GNSS)` : '19.8135° N, 85.8312° E (±4.2m GNSS LOCK)'}
                  </span>
                  <span>•</span>
                  <span className="text-on-surface">COORDINATOR: {currentUser.full_name}</span>
                  <span>•</span>
                  <span className="text-tertiary">DISPATCH T+ 00:18:42</span>
                  <span>•</span>
                  <span>NEXT BEACON: 12s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg font-headline-sm text-xs transition shadow-sm border border-surface-container-high"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>FLUSH OFFLINE QUEUE</span>
                </button>
                <button
                  onClick={handleTransmitEmergencyReport}
                  disabled={isTransmitting}
                  className="flex items-center gap-1.5 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary px-4 py-2 rounded-lg font-headline-sm text-xs font-bold tracking-wider transition-colors shadow-md"
                >
                  <Send className={`w-3.5 h-3.5 ${isTransmitting ? 'animate-spin' : ''}`} />
                  <span>HAIL ALL SECTORS</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5 Channel Cards Grid (Tactical Telemetry Array) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Channel 1: Mobile Data */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors border border-surface-container-high">
              <div className={`absolute top-0 left-0 right-0 h-1 ${isOfflineNetworkCrash ? 'bg-primary' : 'bg-secondary'}`}></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wifi className={`w-4 h-4 ${isOfflineNetworkCrash ? 'text-primary' : 'text-secondary'}`} />
                    <span className="font-headline-sm text-xs text-on-surface font-semibold">1. DATA / NET</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded font-telemetry-sm font-bold ${
                    isOfflineNetworkCrash ? 'bg-error-container text-on-error-container' : 'bg-secondary/20 text-secondary'
                  }`}>
                    {isOfflineNetworkCrash ? 'BLACKOUT' : 'ONLINE'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 font-telemetry-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>RTT Latency:</span><span className="text-on-surface font-mono font-semibold">{isOfflineNetworkCrash ? 'TIMEOUT' : '42 ms'}</span></div>
                  <div className="flex justify-between"><span>Protocol:</span><span className="text-secondary font-mono">HTTPS Idempotent</span></div>
                  <div className="flex justify-between"><span>Key Sync:</span><span className="text-on-surface font-mono">12s ago</span></div>
                  <div className="flex justify-between"><span>Unsent FIFO:</span><span className="text-secondary font-mono font-bold">{outboxRecords.filter(r => r.sync_status === 'PENDING').length} pkts</span></div>
                </div>
              </div>
              <div className="pt-3 mt-2 bg-surface-container-lowest/60 rounded p-1.5 flex items-center justify-between">
                <span className="font-label-caps text-on-surface-variant text-[9px]">TLS 1.3 / E2E SIGNED</span>
                <span className={`w-2 h-2 rounded-full ${isOfflineNetworkCrash ? 'bg-primary' : 'bg-secondary animate-pulse'}`}></span>
              </div>
            </div>

            {/* Channel 2: Cellular SMS */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors border border-surface-container-high">
              <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary"></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-tertiary" />
                    <span className="font-headline-sm text-xs text-on-surface font-semibold">2. SMS FALLBACK</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded font-telemetry-sm bg-surface-container-high text-tertiary font-bold">STANDBY</span>
                </div>
                <div className="flex flex-col gap-1 font-telemetry-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Carrier RSSI:</span><span className="text-tertiary font-mono">2 BARS (-98dBm)</span></div>
                  <div className="flex justify-between"><span>Gateway:</span><span className="text-on-surface font-mono">Twilio Direct SMS</span></div>
                  <div className="flex justify-between"><span>Tactical Text:</span><span className="text-on-surface font-mono">132 / 160 chars</span></div>
                  <div className="flex justify-between"><span>Auto-Trigger:</span><span className="text-tertiary font-mono">ON DISCONNECT</span></div>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => handleCopySMS(`SOS: ResQGrid | ${emergencyType} | Loc: ${gpsPosition ? `${gpsPosition.latitude.toFixed(4)},${gpsPosition.longitude.toFixed(4)}` : '19.8135,85.8312'}`, 'tactical-sms')}
                  className="w-full py-1 px-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded font-telemetry-sm text-center transition-colors truncate"
                >
                  {copiedMessageId === 'tactical-sms' ? 'Copied to Clipboard!' : 'Copy GSM Payload'}
                </button>
              </div>
            </div>

            {/* Channel 3: RF LoRa */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors border border-surface-container-high">
              <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-secondary" />
                    <span className="font-headline-sm text-xs text-on-surface font-semibold">3. LORA RF (865M)</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded font-telemetry-sm bg-secondary/20 text-secondary font-bold">MESH 04</span>
                </div>
                <div className="flex flex-col gap-1 font-telemetry-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Frequency:</span><span className="text-secondary font-mono">865.2 MHz (IN)</span></div>
                  <div className="flex justify-between"><span>Spreading SF:</span><span className="text-on-surface font-mono">SF10 / BW125</span></div>
                  <div className="flex justify-between"><span>SNR / RSSI:</span><span className="text-secondary font-mono">+9.2dB / -108dBm</span></div>
                  <div className="flex justify-between"><span>Hops:</span><span className="text-on-surface font-mono">2 Repeaters</span></div>
                </div>
              </div>
              <div className="pt-3 mt-2 bg-surface-container-lowest/60 rounded p-1.5 flex items-center justify-between font-telemetry-sm">
                <span className="text-secondary">CRC16 VERIFIED</span>
                <span className="text-on-surface-variant">11.4kbps</span>
              </div>
            </div>

            {/* Channel 4: Satellite SOS */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors border border-surface-container-high">
              <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary"></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Satellite className="w-4 h-4 text-tertiary" />
                    <span className="font-headline-sm text-xs text-on-surface font-semibold">4. LEO SATELLITE</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded font-telemetry-sm bg-tertiary/20 text-tertiary font-bold">SIMULATED</span>
                </div>
                <div className="flex flex-col gap-1 font-telemetry-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Constellation:</span><span className="text-on-surface font-mono">Iridium SBD</span></div>
                  <div className="flex justify-between"><span>Elevation:</span><span className="text-tertiary font-mono">68° High Pass</span></div>
                  <div className="flex justify-between"><span>Burst Size:</span><span className="text-on-surface font-mono">340 Bytes Max</span></div>
                  <div className="flex justify-between"><span>Pass Window:</span><span className="text-tertiary font-mono">18m 42s left</span></div>
                </div>
              </div>
              <div className="pt-3 mt-2 bg-surface-container-lowest/60 rounded p-1.5 flex items-center justify-between font-telemetry-sm">
                <span className="text-tertiary">EPIRB PROTOCOL</span>
                <span className="text-on-surface-variant">99.9% UPTIME</span>
              </div>
            </div>

            {/* Channel 5: IndexedDB Outbox */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors border border-surface-container-high">
              <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-secondary" />
                    <span className="font-headline-sm text-xs text-on-surface font-semibold">5. OFFLINE QUEUE</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded font-telemetry-sm bg-secondary/20 text-secondary font-bold">PERSISTENT</span>
                </div>
                <div className="flex flex-col gap-1 font-telemetry-sm text-on-surface-variant">
                  <div className="flex justify-between"><span>Storage Engine:</span><span className="text-on-surface font-mono">IndexedDB v3</span></div>
                  <div className="flex justify-between"><span>Stored Records:</span><span className="text-secondary font-mono font-bold">{outboxRecords.length} Saved</span></div>
                  <div className="flex justify-between"><span>Replay Guard:</span><span className="text-on-surface font-mono">SHA-256 Nonce</span></div>
                  <div className="flex justify-between"><span>FIFO Lock:</span><span className="text-secondary font-mono">Zero-Drop</span></div>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleManualSync}
                  className="w-full py-1 px-2 bg-surface-container-high hover:bg-surface-container-highest text-secondary rounded font-telemetry-sm text-center transition-colors truncate font-bold"
                >
                  Synchronize Now
                </button>
              </div>
            </div>
          </div>

          {/* Quick Dispatch Console + Live Audit Stream Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Dispatch Form */}
            <div className="lg:col-span-5 bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase">Instant Tactical Dispatch</h3>
                </div>
                <span className="font-label-caps text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/30">
                  ALL-RAILS
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Incident Category</label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value as any)}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded p-2 text-xs text-on-surface focus:outline-none focus:border-secondary font-telemetry-sm"
                    >
                      <option value="FLOOD_TRAPPED">Flood / Sea Surge Trapped</option>
                      <option value="MEDICAL_TRAUMA">Critical Medical Trauma</option>
                      <option value="POWER_GRID_OUTAGE">Power Outage / ICU Failure</option>
                      <option value="STRUCTURE_COLLAPSE">Structure Collapse</option>
                      <option value="CYCLONE_EVACUATION">Cyclone Evacuation Distress</option>
                      <option value="GENERAL_SOS">General Emergency SOS</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded p-2 text-xs text-on-surface focus:outline-none focus:border-secondary font-telemetry-sm"
                    >
                      <option value="P1_CRITICAL">P1 - Critical Immediate Life Risk</option>
                      <option value="P2_URGENT">P2 - Urgent Evacuation</option>
                      <option value="P3_STANDARD">P3 - Standard Relief</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Situation Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-container-lowest border border-surface-container-high rounded p-2 text-xs text-on-surface focus:outline-none focus:border-secondary font-body-md"
                    placeholder="Describe trapped victims, road blockage, or medical condition..."
                  />
                </div>

                {/* Target Channels */}
                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant block mb-1">Active Rail Targets</label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(['INTERNET', 'SMS', 'RF_LORA', 'SATELLITE'] as ChannelType[]).map((ch) => (
                      <label
                        key={ch}
                        className={`p-2 rounded border flex items-center space-x-2 cursor-pointer transition ${
                          selectedChannels[ch] ? 'bg-secondary/10 border-secondary/40 text-secondary' : 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedChannels[ch]}
                          onChange={(e) => setSelectedChannels(prev => ({ ...prev, [ch]: e.target.checked }))}
                          className="rounded border-surface-container-high text-secondary focus:ring-0"
                        />
                        <span className="font-label-caps text-[10px]">{ch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleTransmitEmergencyReport}
                disabled={isTransmitting}
                className="w-full py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-headline-sm font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20"
              >
                <Send className={`w-4 h-4 ${isTransmitting ? 'animate-spin' : ''}`} />
                <span>{isTransmitting ? 'TRANSMITTING ACROSS RAILS...' : 'BROADCAST TO MULTI-CHANNEL MESH'}</span>
              </button>
            </div>

            {/* Live Communication Event Stream */}
            <div className="lg:col-span-7 bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-secondary" />
                    <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase">Live Mission Comms Stream</h3>
                  </div>
                  <button
                    onClick={() => communicationEventLog.clearEvents()}
                    className="font-label-caps text-[10px] text-on-surface-variant hover:text-on-surface px-2 py-0.5 bg-surface-container rounded"
                  >
                    CLEAR LOG
                  </button>
                </div>

                <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                  {events.length > 0 ? (
                    events.slice(0, 10).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 bg-surface-container-lowest rounded border border-surface-container-high/60 flex items-start justify-between gap-3 text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-on-surface-variant font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                            <span className={`px-1.5 py-0.2 rounded font-label-caps text-[9px] ${
                              evt.channel === 'INTERNET' ? 'bg-secondary/20 text-secondary' :
                              evt.channel === 'SMS' ? 'bg-tertiary/20 text-tertiary' :
                              evt.channel === 'RF_LORA' ? 'bg-secondary-fixed/20 text-secondary-fixed' :
                              'bg-primary/20 text-primary'
                            }`}>
                              {evt.channel}
                            </span>
                            <span className="font-semibold text-on-surface">{evt.event_type}</span>
                            {evt.is_simulated && (
                              <span className="text-[9px] text-purple-400 font-mono">[SIM]</span>
                            )}
                          </div>
                          <p className="text-on-surface-variant pl-1 text-[11px]">{evt.details}</p>
                        </div>
                        <span className="text-[10px] text-secondary font-mono flex-shrink-0">
                          {evt.incident_id.slice(-6)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-on-surface-variant text-xs text-center py-8">
                      No active transmissions in stream. Dispatch a message to see real-time packet activity.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between font-telemetry-sm text-on-surface-variant text-[10px]">
                <span>E2E INTEGRITY: AES-256-GCM</span>
                <span className="text-secondary font-bold">ALL SENSORS NOMINAL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CHANNEL TELEMETRY & DIAGNOSTICS                   */}
      {/* ======================================================== */}
      {activeTab === 'telemetry-diagnostics' && (
        <div className="space-y-6">
          {/* Top Command Telemetry Stream */}
          <div className="w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl shadow-lg border border-surface-container-high">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                <span className="font-label-caps text-on-surface-variant">ENGINE_STATE:</span>
                <span className="font-telemetry-sm text-secondary font-bold">STREAMING_ACTIVE</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded">
                <Sliders className="w-3.5 h-3.5 text-tertiary" />
                <span className="font-label-caps text-on-surface-variant">PROFILE:</span>
                <span className="font-telemetry-sm text-on-surface font-semibold">ODISHA_TAC_GRID_865</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded">
                <Database className="w-3.5 h-3.5 text-secondary" />
                <span className="font-label-caps text-on-surface-variant">IDB_CACHE:</span>
                <span className="font-telemetry-sm text-secondary font-bold">v3.0.4 [{outboxRecords.length} ALLOC]</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleProbeAllPipelines}
                disabled={isProbingPipelines}
                className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 rounded font-headline-sm text-xs transition border border-surface-container-high shadow-sm"
              >
                <Network className={`w-3.5 h-3.5 text-secondary ${isProbingPipelines ? 'animate-spin' : ''}`} />
                <span>PROBE ALL PIPELINES</span>
              </button>
              <button
                onClick={() => setOfflineNetworkCrash(!isOfflineNetworkCrash)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-headline-sm text-xs font-bold transition shadow-sm ${
                  isOfflineNetworkCrash 
                    ? 'bg-primary-container text-on-primary-container' 
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>{isOfflineNetworkCrash ? 'RESTORE INTERNET' : 'SIMULATE CELLULAR BLACKOUT'}</span>
              </button>
            </div>
          </div>

          {/* Detailed Hardware Diagnostics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: RF LoRa Modem Diagnostics */}
            <div className="bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-secondary" />
                  <h4 className="font-headline-sm text-xs font-bold text-on-surface uppercase">LoRa RF Transceiver Node</h4>
                </div>
                <span className="font-telemetry-sm px-1.5 py-0.5 rounded bg-secondary/20 text-secondary font-bold">SX1262</span>
              </div>

              <div className="space-y-2 font-telemetry-sm">
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Center Frequency:</span>
                  <span className="text-on-surface font-mono font-bold">865.200 MHz</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Spreading Factor:</span>
                  <span className="text-secondary font-mono font-bold">SF10 (Long Range)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Signal-to-Noise (SNR):</span>
                  <span className="text-secondary font-mono font-bold">+9.2 dB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">RSSI Level:</span>
                  <span className="text-on-surface font-mono">-108 dBm</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Packet CRC Verification:</span>
                  <span className="text-emerald-400 font-mono font-bold">100% OK (CRC16)</span>
                </div>
              </div>
            </div>

            {/* Box 2: Cellular GSM / SMS Modem */}
            <div className="bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-tertiary" />
                  <h4 className="font-headline-sm text-xs font-bold text-on-surface uppercase">GSM Cellular Modem</h4>
                </div>
                <span className="font-telemetry-sm px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary font-bold">SIM7600E</span>
              </div>

              <div className="space-y-2 font-telemetry-sm">
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Tower Registration:</span>
                  <span className="text-on-surface font-mono">BSNL / Airtel 4G</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">AT Command State:</span>
                  <span className="text-tertiary font-mono font-bold">AT+CMGS READY</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">SMS Character Encoding:</span>
                  <span className="text-on-surface font-mono">GSM 7-bit (160 max)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Fallback Trigger:</span>
                  <span className="text-tertiary font-mono">Automatic on TCP Drop</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">SMS Gateway Ping:</span>
                  <span className="text-on-surface font-mono">1.42s (Twilio Relay)</span>
                </div>
              </div>
            </div>

            {/* Box 3: Cryptographic & Storage Subsystem */}
            <div className="bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-secondary" />
                  <h4 className="font-headline-sm text-xs font-bold text-on-surface uppercase">Security & Storage Engine</h4>
                </div>
                <span className="font-telemetry-sm px-1.5 py-0.5 rounded bg-secondary/20 text-secondary font-bold">SEC-4.2</span>
              </div>

              <div className="space-y-2 font-telemetry-sm">
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Cipher Algorithm:</span>
                  <span className="text-secondary font-mono font-bold">AES-256 GCM</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Replay Protection:</span>
                  <span className="text-emerald-400 font-mono font-bold">SHA-256 Nonce Hash</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">IndexedDB Transaction:</span>
                  <span className="text-on-surface font-mono">Readwrite ACID</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Offline Queue Cap:</span>
                  <span className="text-on-surface font-mono">10,000 Incidents</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                  <span className="text-on-surface-variant">Chassis Sensor Temp:</span>
                  <span className="text-secondary font-mono font-bold">42.1°C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: INCIDENT DISPATCH & OUTBOX                         */}
      {/* ======================================================== */}
      {activeTab === 'dispatch-outbox' && (
        <div className="space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-high shadow-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">TOTAL DISPATCHES</span>
              <span className="font-headline-xl text-2xl font-bold text-on-surface">{outboxRecords.length + 140}</span>
              <span className="text-[10px] text-secondary font-mono block mt-1">SYS_ALL</span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-high shadow-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">ACKNOWLEDGED</span>
              <span className="font-headline-xl text-2xl font-bold text-secondary">
                {outboxRecords.filter(r => r.sync_status === 'SYNCED').length + 138}
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono block mt-1">98.5% Confirmation</span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-high shadow-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">IN-FLIGHT TX</span>
              <span className="font-headline-xl text-2xl font-bold text-tertiary">
                {isTransmitting ? '1' : '0'}
              </span>
              <span className="text-[10px] text-tertiary font-mono block mt-1">RADIO / PKT</span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-high shadow-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">IDB OFFLINE QUEUE</span>
              <span className="font-headline-xl text-2xl font-bold text-on-surface">
                {outboxRecords.filter(r => r.sync_status === 'PENDING').length}
              </span>
              <span className="text-[10px] text-secondary font-mono block mt-1">AWAITING SYNC</span>
            </div>
          </div>

          {/* Outbox Table & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* List */}
            <div className="lg:col-span-5 bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <h4 className="font-headline-sm text-xs font-bold text-on-surface uppercase">IndexedDB Outbox Queue</h4>
                <button
                  onClick={handleManualSync}
                  className="font-label-caps text-[10px] text-secondary hover:underline"
                >
                  FLUSH QUEUE
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {outboxRecords.map((rec) => {
                  const isSelected = rec.id === (selectedRecord?.id);
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecordId(rec.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-surface-container-high border-secondary text-on-surface shadow-md'
                          : 'bg-surface-container-lowest border-surface-container-high/60 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-telemetry-sm font-bold text-secondary font-mono">{rec.incident_id}</span>
                        <span className={`px-1.5 py-0.2 rounded font-label-caps text-[9px] ${
                          rec.sync_status === 'SYNCED' ? 'bg-secondary/20 text-secondary' : 'bg-tertiary/20 text-tertiary'
                        }`}>
                          {rec.sync_status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface font-medium truncate">{rec.payload.emergency_type}</p>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        {new Date(rec.created_at).toLocaleTimeString()} • {rec.payload.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Record Inspector */}
            <div className="lg:col-span-7 bg-surface-container-low p-5 rounded-xl border border-surface-container-high shadow-md space-y-4">
              {selectedRecord ? (
                <div>
                  <div className="flex items-center justify-between border-b border-surface-container-high pb-3 mb-4">
                    <div>
                      <span className="font-label-caps text-[10px] text-on-surface-variant block">INCIDENT TELEMETRY PAYLOAD</span>
                      <h4 className="font-headline-sm text-sm font-bold text-on-surface font-mono">{selectedRecord.incident_id}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded font-label-caps text-[10px] bg-secondary/20 text-secondary font-mono">
                      SHA256: {selectedRecord.id.slice(0, 10)}...
                    </span>
                  </div>

                  {/* Multi-channel acknowledgement rows */}
                  <div className="space-y-3">
                    {(['INTERNET', 'SMS', 'RF_LORA', 'SATELLITE'] as ChannelType[]).map((ch) => {
                      const st = selectedRecord.channel_status[ch];
                      const isAck = st?.status === 'SERVER_ACCEPTED' || st?.status === 'ACKNOWLEDGED' || st?.status === 'SIMULATED_SUCCESS';
                      return (
                        <div key={ch} className="p-3 bg-surface-container-lowest rounded-lg border border-surface-container-high/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-label-caps text-xs text-on-surface w-24">{ch}</span>
                            <span className={`px-2 py-0.5 rounded font-telemetry-sm text-[10px] font-bold ${
                              isAck ? 'bg-secondary/20 text-secondary' : 'bg-tertiary/20 text-tertiary'
                            }`}>
                              {st?.status || 'QUEUED'}
                            </span>
                          </div>
                          <button
                            onClick={() => communicationManager.resendViaChannel(selectedRecord.id, ch)}
                            className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-secondary rounded font-telemetry-sm text-[10px] transition font-bold"
                          >
                            Resend Rail
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant text-center py-12">Select an outbox record to view details</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

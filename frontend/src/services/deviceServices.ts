// ResQGrid AI — Hardware & Device Services Integration Layer
// Unifies PWA Installation, GPS, Haptic Motors, Battery, Screen Wake Lock, Web Push, Audio Siren & Web Share

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface BatteryInfo {
  level: number; // 0.0 to 1.0
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  supported: boolean;
}

export interface DeviceTelemetry {
  isPWA: boolean;
  isOnline: boolean;
  networkType?: string;
  hasGPS: boolean;
  hasVibration: boolean;
  hasWakeLock: boolean;
  hasBatteryAPI: boolean;
  hasNotifications: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  hasWebShare: boolean;
  hasAudio: boolean;
}

class DeviceServicesManager {
  private deferredInstallPrompt: any = null;
  private wakeLockSentinel: any = null;
  private audioCtx: AudioContext | null = null;
  private sirenOscillator: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSWUpdateWaiting = false;
  private updateListeners: Array<() => void> = [];
  private installPromptListeners: Array<(canInstall: boolean) => void> = [];

  constructor() {
    this.initPWAEvents();
  }

  // -------------------------------------------------------------
  // 1. PWA & Installation Lifecycle
  // -------------------------------------------------------------
  private initPWAEvents() {
    if (typeof window === 'undefined') return;

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.notifyInstallListeners(true);
      console.log('[DeviceServices] PWA install prompt ready.');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.notifyInstallListeners(false);
      console.log('[DeviceServices] ResQGrid PWA installed to device successfully!');
    });

    // Check service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        this.swRegistration = reg;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.isSWUpdateWaiting = true;
                this.notifyUpdateListeners();
              }
            });
          }
        });
      });
    }
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  public isInstallPromptAvailable(): boolean {
    return !!this.deferredInstallPrompt;
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredInstallPrompt) {
      return 'unavailable';
    }
    try {
      this.deferredInstallPrompt.prompt();
      const { outcome } = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      this.notifyInstallListeners(false);
      return outcome;
    } catch (err) {
      console.error('[DeviceServices] Install prompt error:', err);
      return 'unavailable';
    }
  }

  public subscribeInstallPrompt(cb: (canInstall: boolean) => void): () => void {
    this.installPromptListeners.push(cb);
    cb(this.isInstallPromptAvailable());
    return () => {
      this.installPromptListeners = this.installPromptListeners.filter((l) => l !== cb);
    };
  }

  private notifyInstallListeners(canInstall: boolean) {
    this.installPromptListeners.forEach((cb) => cb(canInstall));
  }

  public isUpdateAvailable(): boolean {
    return this.isSWUpdateWaiting;
  }

  public subscribeUpdate(cb: () => void): () => void {
    this.updateListeners.push(cb);
    return () => {
      this.updateListeners = this.updateListeners.filter((l) => l !== cb);
    };
  }

  private notifyUpdateListeners() {
    this.updateListeners.forEach((cb) => cb());
  }

  public applyUpdateAndReload() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }

  // -------------------------------------------------------------
  // 2. High-Accuracy GPS Sensor
  // -------------------------------------------------------------
  public async getCurrentPosition(): Promise<GPSCoordinate> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your device browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp
          });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  public watchPosition(
    onLocation: (coords: GPSCoordinate) => void,
    onError?: (err: GeolocationPositionError) => void
  ): () => void {
    if (!('geolocation' in navigator)) {
      return () => {};
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp
        });
      },
      onError,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }

  // -------------------------------------------------------------
  // 3. Haptic Vibration Motor Integration
  // -------------------------------------------------------------
  public vibrate(pattern: number | number[] = 200): boolean {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        return navigator.vibrate(pattern);
      } catch {
        return false;
      }
    }
    return false;
  }

  // Morse Code SOS: . . .   - - -   . . .
  public vibrateSOS(): boolean {
    const morseSOS = [
      150, 100, 150, 100, 150, // S (. . .)
      300,                      // gap
      400, 100, 400, 100, 400, // O (- - -)
      300,                      // gap
      150, 100, 150, 100, 150  // S (. . .)
    ];
    return this.vibrate(morseSOS);
  }

  public vibrateAlert(): boolean {
    return this.vibrate([250, 100, 250]);
  }

  public vibratePulse(): boolean {
    return this.vibrate(100);
  }

  public stopVibration() {
    this.vibrate(0);
  }

  // -------------------------------------------------------------
  // 4. Battery Health & Low-Power Auto Saver
  // -------------------------------------------------------------
  public async getBatteryStatus(): Promise<BatteryInfo> {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100) / 100,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          supported: true
        };
      } catch {
        // Fallback
      }
    }
    return {
      level: 1.0,
      charging: false,
      supported: false
    };
  }

  public listenToBattery(onUpdate: (battery: BatteryInfo) => void): () => void {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const handler = () => {
          onUpdate({
            level: Math.round(battery.level * 100) / 100,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
            supported: true
          });
        };
        battery.addEventListener('levelchange', handler);
        battery.addEventListener('chargingchange', handler);
        handler();
        return () => {
          battery.removeEventListener('levelchange', handler);
          battery.removeEventListener('chargingchange', handler);
        };
      }).catch(() => {});
    }
    return () => {};
  }

  // -------------------------------------------------------------
  // 5. Screen Wake Lock API (Keep Awake during Missions)
  // -------------------------------------------------------------
  public async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        console.log('[DeviceServices] Screen Wake Lock activated.');
        return true;
      } catch (err) {
        console.warn('[DeviceServices] Wake lock failed:', err);
        return false;
      }
    }
    return false;
  }

  public releaseWakeLock() {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
      console.log('[DeviceServices] Screen Wake Lock released.');
    }
  }

  public isWakeLockActive(): boolean {
    return !!this.wakeLockSentinel;
  }

  // -------------------------------------------------------------
  // 6. Push Notifications & Local Alerts
  // -------------------------------------------------------------
  public getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  public async sendNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission !== 'granted') {
      const p = await this.requestNotificationPermission();
      if (p !== 'granted') return false;
    }

    try {
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          ...options
        });
        return true;
      } else {
        new Notification(title, {
          icon: '/icon.svg',
          ...options
        });
        return true;
      }
    } catch (e) {
      console.warn('[DeviceServices] Failed to trigger notification:', e);
      return false;
    }
  }

  // -------------------------------------------------------------
  // 7. Native Web Share API
  // -------------------------------------------------------------
  public canShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  public async shareEmergencyData(data: { title: string; text: string; url?: string }): Promise<boolean> {
    if (this.canShare()) {
      try {
        await navigator.share(data);
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
        console.warn('[DeviceServices] Web Share failed, falling back:', err);
      }
    }
    // Fallback: Copy to clipboard
    try {
      const content = `${data.title}\n${data.text}\n${data.url || window.location.href}`;
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // 8. Acoustic Audio Siren & Acoustic Rescue Beacon (100% Offline)
  // -------------------------------------------------------------
  public startEmergencySiren(): boolean {
    try {
      this.stopEmergencySiren();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.sirenGain = this.audioCtx.createGain();
      this.sirenGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      this.sirenGain.connect(this.audioCtx.destination);

      this.sirenOscillator = this.audioCtx.createOscillator();
      this.sirenOscillator.type = 'sawtooth';
      this.sirenOscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      this.sirenOscillator.connect(this.sirenGain);
      this.sirenOscillator.start();

      let toggle = false;
      this.sirenInterval = setInterval(() => {
        if (!this.audioCtx || !this.sirenOscillator) return;
        toggle = !toggle;
        const targetFreq = toggle ? 960 : 770;
        this.sirenOscillator.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.15);
      }, 400);

      // Trigger tactile haptic pulse alongside audio
      this.vibrate([400, 200, 400, 200]);
      return true;
    } catch (e) {
      console.warn('[DeviceServices] Siren error:', e);
      return false;
    }
  }

  public stopEmergencySiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      } catch {}
      this.sirenOscillator = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.stopVibration();
  }

  public isSirenActive(): boolean {
    return !!this.sirenInterval;
  }

  // -------------------------------------------------------------
  // 9. Overall Device Telemetry Assessment
  // -------------------------------------------------------------
  public async getDeviceTelemetry(): Promise<DeviceTelemetry> {
    const battery = await this.getBatteryStatus();
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      isPWA: this.isStandalone(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      networkType: conn ? `${conn.effectiveType || conn.type || 'cellular'}` : undefined,
      hasGPS: typeof navigator !== 'undefined' && 'geolocation' in navigator,
      hasVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
      hasWakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
      hasBatteryAPI: battery.supported,
      hasNotifications: typeof window !== 'undefined' && 'Notification' in window,
      notificationPermission: this.getNotificationPermission(),
      hasWebShare: this.canShare(),
      hasAudio: typeof window !== 'undefined' && (!!window.AudioContext || !!(window as any).webkitAudioContext)
    };
  }

  // -------------------------------------------------------------
  // 10. Background Sync Registration
  // -------------------------------------------------------------
  public async registerBackgroundSync(tag: string = 'sync-emergency-outbox'): Promise<boolean> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as any).sync.register(tag);
        console.log('[DeviceServices] Background sync registered:', tag);
        return true;
      } catch (err) {
        console.warn('[DeviceServices] Background sync registration failed:', err);
        return false;
      }
    }
    return false;
  }
}

export const deviceServices = new DeviceServicesManager();

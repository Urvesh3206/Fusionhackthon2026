// Web Audio API Emergency Radio Tone & Oscilloscope Synthesizer
// Generates tactical acoustic / frequency distress beacons offline in-browser

class RadioAudioBeaconSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentOsc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sequenceTimer: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime); // Safe volume
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    this.initContext();
    return this.analyserNode;
  }

  public isAudioActive(): boolean {
    return this.isPlaying;
  }

  // Play LoRa Chirp Spread Spectrum (sweeping sound)
  public playLoRaChirp() {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    this.isPlaying = true;
    const startTime = this.ctx.currentTime;
    
    // Create dual swept oscillators for chirp emulation
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, startTime);
    osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.4);
    osc.frequency.setValueAtTime(440, startTime + 0.45);
    osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.85);

    osc.connect(this.gainNode);
    osc.start(startTime);
    osc.stop(startTime + 0.9);
    this.currentOsc = osc;

    osc.onended = () => {
      this.isPlaying = false;
    };
  }

  // Play AFSK 1200 Baud emergency telemetry burst (1200Hz Mark / 2200Hz Space)
  public playAFSKBurst(durationSec = 2.0) {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    this.isPlaying = true;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    
    let now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(1200, now);

    // Rapidly toggle between 1200Hz and 2200Hz
    const steps = Math.floor(durationSec / 0.05);
    for (let i = 0; i < steps; i++) {
      const freq = (i % 2 === 0 || i % 5 === 0) ? 2200 : 1200;
      osc.frequency.setValueAtTime(freq, now + (i * 0.05));
    }

    osc.connect(this.gainNode);
    osc.start(now);
    osc.stop(now + durationSec);
    this.currentOsc = osc;

    osc.onended = () => {
      this.isPlaying = false;
    };
  }

  // Play SOS in Morse Code (... --- ...)
  public playMorseSOS() {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    this.isPlaying = true;
    const dot = 0.08;
    const dash = 0.24;
    const gap = 0.08;
    const letterGap = 0.24;

    const pattern = [
      dot, gap, dot, gap, dot, letterGap, // S
      dash, gap, dash, gap, dash, letterGap, // O
      dot, gap, dot, gap, dot // S
    ];

    let t = this.ctx.currentTime + 0.05;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t); // 800Hz distress tone

    const localGain = this.ctx.createGain();
    localGain.gain.setValueAtTime(0, t);
    osc.connect(localGain);
    localGain.connect(this.gainNode);

    let isTone = true;
    pattern.forEach((duration) => {
      if (isTone) {
        localGain.gain.setValueAtTime(0.2, t);
        localGain.gain.setValueAtTime(0, t + duration - 0.01);
      } else {
        localGain.gain.setValueAtTime(0, t);
      }
      t += duration;
      isTone = !isTone;
    });

    osc.start(this.ctx.currentTime);
    osc.stop(t);
    this.currentOsc = osc;

    osc.onended = () => {
      this.isPlaying = false;
    };
  }

  // Continuous Beacon Ping
  public startRepeatingPing(intervalMs = 3000) {
    this.stop();
    this.playLoRaChirp();
    this.sequenceTimer = window.setInterval(() => {
      this.playLoRaChirp();
    }, intervalMs);
  }

  public stop() {
    if (this.sequenceTimer) {
      clearInterval(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    if (this.currentOsc) {
      try {
        this.currentOsc.stop();
        this.currentOsc.disconnect();
      } catch (e) {
        // already stopped
      }
      this.currentOsc = null;
    }
    this.isPlaying = false;
  }
}

export const radioAudioBeacon = new RadioAudioBeaconSynthesizer();

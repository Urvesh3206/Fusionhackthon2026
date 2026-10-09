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

  public playLoRaChirp() {
    // Sound disabled per user request
    this.isPlaying = false;
  }

  // Play AFSK 1200 Baud emergency telemetry burst (1200Hz Mark / 2200Hz Space)
  public playAFSKBurst(_durationSec = 2.0) {
    this.isPlaying = false;
  }

  // Play SOS in Morse Code (... --- ...)
  public playMorseSOS() {
    this.isPlaying = false;
  }

  // Continuous Beacon Ping
  public startRepeatingPing(_intervalMs = 3000) {
    this.isPlaying = false;
  }

  public stop() {
    if (this.sequenceTimer) {
      clearInterval(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    this.isPlaying = false;
  }
}

export const radioAudioBeacon = new RadioAudioBeaconSynthesizer();

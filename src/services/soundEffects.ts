// Procedural Web Audio synthesizer for alert notifications + HTML5 fallback
import { AlertType } from '../types';

class SoundController {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playAlertSound(type: AlertType) {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      if (type === 'red') {
        // Bloqueo: Urgent dual alarm tone
        this.playTone(880, 'sawtooth', now, 0.18, 0.35);
        this.playTone(587.33, 'sawtooth', now + 0.2, 0.25, 0.35);
        this.playTone(880, 'sawtooth', now + 0.48, 0.22, 0.35);
      } else if (type === 'security') {
        // Zona Roja: Rapid high-frequency tactical alert
        this.playTone(950, 'square', now, 0.12, 0.3);
        this.playTone(1200, 'square', now + 0.14, 0.12, 0.3);
        this.playTone(950, 'square', now + 0.28, 0.12, 0.3);
        this.playTone(1200, 'square', now + 0.42, 0.2, 0.35);
      } else if (type === 'orange') {
        // Incidente: Dual warning chime
        this.playTone(523.25, 'sine', now, 0.18, 0.3);
        this.playTone(659.25, 'sine', now + 0.18, 0.25, 0.3);
      } else if (type === 'green') {
        // Vía libre: Ascending soft pleasant chime
        this.playTone(440, 'triangle', now, 0.15, 0.2);
        this.playTone(554.37, 'triangle', now + 0.14, 0.15, 0.2);
        this.playTone(659.25, 'triangle', now + 0.28, 0.25, 0.25);
      }
    } catch {
      // Ignore any audio autoplay constraints quietly
    }
  }

  public play(soundName: string = 'click') {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      if (soundName === 'click') {
        this.playTone(800, 'sine', now, 0.04, 0.08);
      } else {
        this.playTone(600, 'sine', now, 0.08, 0.15);
      }
    } catch {
      // Ignore audio constraints
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    volume: number = 0.3
  ) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundController();

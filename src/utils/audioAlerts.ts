/**
 * Audio Alerts Engine using Web Audio API
 * Synthesizes tactical alarm tones and sonar pings safely
 */

class AudioAlertsEngine {
  private audioCtx: AudioContext | null = null;
  public isMuted: boolean = false;
  private activeAlarmOsc1: OscillatorNode | null = null;
  private activeAlarmOsc2: OscillatorNode | null = null;
  private alarmInterval: number | null = null;

  private initCtx() {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Tactical click for UI controls
  public playClick(frequency = 800) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx || ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio autoplay policy catch
    }
  }

  // Sonar radar acoustic ping
  public playSonarPing(dangerLevel: 'safe' | 'caution' | 'danger') {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx || ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = dangerLevel === 'danger' ? 1400 : dangerLevel === 'caution' ? 950 : 650;
      const duration = dangerLevel === 'danger' ? 0.12 : 0.2;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }

  // Warning chime
  public playWarningBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx || ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // ignore
    }
  }

  // Start continuous critical pulsing alarm
  public startCriticalAlarm() {
    if (this.isMuted || this.alarmInterval !== null) return;
    try {
      const ctx = this.initCtx();
      if (!ctx || ctx.state === 'suspended') return;

      let state = false;
      const playPulse = () => {
        if (this.isMuted) return;
        try {
          const c = this.initCtx();
          if (!c || c.state === 'suspended') return;

          const osc = c.createOscillator();
          const gain = c.createGain();

          state = !state;
          const freq = state ? 1100 : 850;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, c.currentTime);
          osc.frequency.linearRampToValueAtTime(freq + 150, c.currentTime + 0.2);

          gain.gain.setValueAtTime(0.3, c.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.22);

          osc.connect(gain);
          gain.connect(c.destination);

          osc.start();
          osc.stop(c.currentTime + 0.23);
        } catch {
          // ignore
        }
      };

      playPulse();
      this.alarmInterval = window.setInterval(playPulse, 400);
    } catch {
      // ignore
    }
  }

  // Stop critical alarm
  public stopCriticalAlarm() {
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.activeAlarmOsc1) {
      try { this.activeAlarmOsc1.stop(); } catch { /* ignore */ }
      this.activeAlarmOsc1 = null;
    }
    if (this.activeAlarmOsc2) {
      try { this.activeAlarmOsc2.stop(); } catch { /* ignore */ }
      this.activeAlarmOsc2 = null;
    }
  }
}

export const soundManager = new AudioAlertsEngine();

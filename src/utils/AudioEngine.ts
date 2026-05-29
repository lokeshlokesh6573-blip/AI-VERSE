'use client';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("AudioEngine failed to initialize Web Audio API:", e);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  // Play a short synth cursor hover click (PS5 UI style)
  public playHover() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Play a premium futuristic UI activation beep (PS5 style select)
  public playSelect() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Play two quick overlapping chime notes (E5 and B5)
    const playNote = (freq: number, delay: number, vol: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    };

    playNote(659.25, 0, 0.15); // E5
    playNote(987.77, 0.08, 0.12); // B5
  }

  // Synthesize Spider-Man's web shoot sound ("thwip")
  public playWebShoot() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 0.15;

    // 1. Noise buffer for the air hiss of the web
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // 2. High-pass filter to make noise sound like thin web string
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + duration);
    filter.Q.setValueAtTime(3, now);

    // 3. Envelope for the web shoot
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    // 4. Oscillator sweep to add a subtle laser-like zip tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    // Apply high pass on oscillator to keep it clean
    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'highpass';
    oscFilter.frequency.setValueAtTime(300, now);

    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.masterGain!);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Deep structural landing shockwave rumble
  public playLandingRumble() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 1.8;

    // Low-frequency impact synth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(30, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05); // Rapid swell
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);

    // Noise explosion crackle
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(150, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.8);
  }

  // Start the background ambient superhero/cyberpunk OS hum
  public startAmbientHum() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Prevent duplicate drones
    if (this.droneOscs.length > 0) return;

    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, now);
    this.droneGain.gain.linearRampToValueAtTime(0.08, now + 3.0); // Gentle fade-in over 3 seconds
    this.droneGain.connect(this.masterGain!);

    // Drone oscillator 1 (55Hz, A1 - low root note)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now);
    
    // Drone oscillator 2 (110Hz, A2 - first octave)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, now);

    // Filter to make the triangle wave warm and sub-bass heavy
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(80, now);

    // LFO to modulate the filter frequency for a shifting breathing effect
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, now); // Very slow, 0.15Hz cycles
    lfoGain.gain.setValueAtTime(15, now);

    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    osc1.connect(this.droneGain);
    osc2.connect(lp);
    lp.connect(this.droneGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.droneOscs = [osc1, osc2, lfo];
  }

  public stopAmbientHum() {
    if (this.droneGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0); // Smooth 1s fade-out
      
      setTimeout(() => {
        this.droneOscs.forEach(o => {
          try { o.stop(); } catch(e) {}
        });
        this.droneOscs = [];
      }, 1000);
    }
  }

  // Synthesize a brief lightning thunder crash & rumble
  public playThunder() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 2.5;

    // Create noise source
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass filter for rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(25, now + duration);

    // Modulate gain for thunder's stutter/crackling envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.05); // initial sharp strike
    gain.gain.setValueAtTime(0.2, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.15); // second strike
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // trailing rumble

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + duration);
  }
}

export const audio = new AudioEngine();
export default audio;

/** All sound is synthesized with the Web Audio API; there are no audio assets. */
export class Synth {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastHit = 0;
  enabled = true;
  volume = 0.6;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    const master = ctx.createGain();
    master.gain.value = this.enabled ? this.volume : 0;
    const sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.sfx = sfx;
    if (ctx.state === 'suspended') void ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyGain();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.03);
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  private tone(o: { type: OscillatorType; freq: number; freqEnd?: number; start?: number; attack?: number; decay: number; gain: number; sustain?: number; lowpass?: number }): void {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out || !this.enabled) return;
    const t0 = ctx.currentTime + (o.start ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t0);
    const attack = o.attack ?? 0.005;
    const total = attack + (o.sustain ?? 0) + o.decay;
    if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + total);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + attack);
    if (o.sustain) g.gain.setValueAtTime(o.gain, t0 + attack + o.sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
    let node: AudioNode = osc;
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lowpass;
      osc.connect(lp);
      node = lp;
    }
    node.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + total + 0.05);
  }

  private burst(o: { start?: number; duration: number; gain: number; filter?: BiquadFilterType; freq?: number; freqEnd?: number; q?: number }): void {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out || !this.enabled) return;
    const t0 = ctx.currentTime + (o.start ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
    let node: AudioNode = src;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.setValueAtTime(o.freq ?? 1000, t0);
      if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + o.duration);
      if (o.q) f.Q.value = o.q;
      src.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(out);
    src.start(t0);
    src.stop(t0 + o.duration + 0.05);
  }

  // ---- cues ----------------------------------------------------------------

  hit(crit: boolean, skill: boolean): void {
    const now = performance.now();
    if (now - this.lastHit < 45) return;
    this.lastHit = now;
    if (crit) {
      this.tone({ type: 'square', freq: 900, freqEnd: 300, decay: 0.12, gain: 0.08, lowpass: 2500 });
      this.burst({ duration: 0.08, gain: 0.08, filter: 'highpass', freq: 2500 });
    } else if (skill) {
      this.burst({ duration: 0.1, gain: 0.07, filter: 'bandpass', freq: 1200, q: 1.5 });
    } else {
      this.burst({ duration: 0.05, gain: 0.05, filter: 'bandpass', freq: 1800, q: 2 });
      this.tone({ type: 'triangle', freq: 320, freqEnd: 140, decay: 0.06, gain: 0.05 });
    }
  }

  tap(): void {
    this.tone({ type: 'sine', freq: 700, freqEnd: 420, decay: 0.06, gain: 0.07 });
  }

  skill(fx: string): void {
    switch (fx) {
      case 'fireball':
      case 'meteor':
        this.burst({ duration: 0.35, gain: 0.14, filter: 'lowpass', freq: 3000, freqEnd: 200 });
        this.tone({ type: 'sawtooth', freq: 180, freqEnd: 60, decay: 0.3, gain: 0.08, lowpass: 800 });
        break;
      case 'lightning':
        this.burst({ duration: 0.25, gain: 0.16, filter: 'highpass', freq: 1500 });
        this.tone({ type: 'square', freq: 1200, freqEnd: 200, decay: 0.2, gain: 0.06 });
        break;
      case 'quake':
      case 'ultWarrior':
        this.tone({ type: 'sine', freq: 70, freqEnd: 35, decay: 0.5, gain: 0.25 });
        this.burst({ duration: 0.4, gain: 0.12, filter: 'lowpass', freq: 400 });
        break;
      case 'arrowRain':
      case 'doubleShot':
      case 'ultArcher':
        for (let i = 0; i < (fx === 'doubleShot' ? 2 : 5); i++) this.burst({ start: i * 0.05, duration: 0.08, gain: 0.05, filter: 'bandpass', freq: 2600 + i * 200, q: 4 });
        if (fx === 'ultArcher') this.tone({ type: 'sine', freq: 600, freqEnd: 1800, decay: 0.5, gain: 0.08 });
        break;
      case 'shield':
      case 'stealth':
        this.tone({ type: 'sine', freq: 500, freqEnd: 900, attack: 0.05, decay: 0.3, gain: 0.07 });
        break;
      case 'assassinate':
      case 'ultThief':
      case 'shuriken':
        this.burst({ duration: 0.12, gain: 0.1, filter: 'highpass', freq: 3000 });
        this.tone({ type: 'triangle', freq: 1400, freqEnd: 400, decay: 0.15, gain: 0.06 });
        break;
      case 'firefield':
      case 'poison':
        this.burst({ duration: 0.5, gain: 0.07, filter: 'bandpass', freq: 600, q: 1 });
        break;
      default:
        this.tone({ type: 'triangle', freq: 500, freqEnd: 250, decay: 0.15, gain: 0.08 });
        this.burst({ duration: 0.1, gain: 0.06, filter: 'bandpass', freq: 1500, q: 2 });
    }
  }

  kill(boss: boolean): void {
    if (boss) {
      this.tone({ type: 'sine', freq: 60, freqEnd: 30, decay: 0.8, gain: 0.3 });
      this.burst({ duration: 0.8, gain: 0.2, filter: 'lowpass', freq: 3000, freqEnd: 100 });
      [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: 0.5 + i * 0.1, decay: 0.4, gain: 0.09 }));
    } else {
      this.tone({ type: 'triangle', freq: 260, freqEnd: 90, decay: 0.16, gain: 0.07 });
      this.tone({ type: 'sine', freq: 1500, start: 0.03, decay: 0.08, gain: 0.03 });
    }
  }

  coin(): void {
    this.tone({ type: 'sine', freq: 1760, decay: 0.08, gain: 0.03 });
    this.tone({ type: 'sine', freq: 2349, start: 0.05, decay: 0.1, gain: 0.03 });
  }

  levelUp(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.08, decay: 0.3, gain: 0.08 }));
  }

  jobAdvance(): void {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.12, decay: 0.6, gain: 0.09 }));
    this.tone({ type: 'sine', freq: 130, attack: 0.3, sustain: 0.6, decay: 1.2, gain: 0.12 });
    this.burst({ start: 0.6, duration: 1.2, gain: 0.06, filter: 'highpass', freq: 4000 });
  }

  bossStart(): void {
    this.tone({ type: 'sawtooth', freq: 55, decay: 0.9, gain: 0.2, lowpass: 400 });
    this.tone({ type: 'sawtooth', freq: 58, start: 0.4, decay: 0.9, gain: 0.18, lowpass: 400 });
  }

  bossFail(): void {
    [440, 415, 392, 370].forEach((f, i) => this.tone({ type: 'square', freq: f, start: i * 0.15, decay: 0.25, gain: 0.05, lowpass: 1200 }));
  }

  heroDie(): void {
    this.tone({ type: 'sawtooth', freq: 300, freqEnd: 60, decay: 0.7, gain: 0.1, lowpass: 900 });
  }

  heroHurt(): void {
    this.tone({ type: 'square', freq: 200, freqEnd: 120, decay: 0.08, gain: 0.05, lowpass: 900 });
  }

  gacha(maxRarity: number): void {
    const notes = [523, 659, 784, 1046, 1318, 1568].slice(0, 2 + maxRarity);
    notes.forEach((f, i) => this.tone({ type: 'sine', freq: f, start: 0.1 + i * 0.09, decay: 0.35, gain: 0.08 }));
    if (maxRarity >= 4) this.burst({ start: 0.4, duration: 0.8, gain: 0.05, filter: 'highpass', freq: 5000 });
  }

  purchase(count = 1): void {
    this.tone({ type: 'triangle', freq: 523, decay: 0.07, gain: 0.09 });
    this.tone({ type: 'triangle', freq: 784, start: 0.07, decay: 0.09, gain: 0.09 });
    if (count > 1) this.tone({ type: 'triangle', freq: 1046, start: 0.15, decay: 0.12, gain: 0.08 });
  }

  starforce(): void {
    this.tone({ type: 'sine', freq: 880, freqEnd: 1760, decay: 0.25, gain: 0.08 });
    this.tone({ type: 'sine', freq: 2637, start: 0.15, decay: 0.3, gain: 0.05 });
  }

  cannotAfford(): void {
    this.tone({ type: 'square', freq: 110, decay: 0.07, gain: 0.06, lowpass: 600 });
  }

  quest(): void {
    [659, 784, 1046].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.1, decay: 0.3, gain: 0.08 }));
  }

  achievement(): void {
    [523, 659, 784].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.1, decay: 0.35, gain: 0.08 }));
    this.tone({ type: 'sine', freq: 2000, start: 0.3, decay: 0.3, gain: 0.03 });
  }

  ui(): void {
    this.tone({ type: 'sine', freq: 1000, decay: 0.03, gain: 0.04 });
  }
}

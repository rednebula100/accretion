// Fully procedural audio: ZzFX-synthesised one-shots routed through a small reverb bus + reactive ambient bed.
import { ZZFX } from "zzfx";

// [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo, filter]
const DEFS = {
  capture: [1, 0, 392, 0.004, 0.02, 0.16, 1, 1.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.02],
  tick: [0.5, 0, 880, 0.001, 0.005, 0.03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.01],
  absorb: [1, 0, 82, 0.005, 0.03, 0.22, 0, 1.2, -1.2, 0, 0, 0, 0, 0.2, 0, 0, 0, 0.7, 0.04],
  pulse: [1.3, 0, 110, 0.004, 0.05, 0.42, 2, 2.2, -4.5, 0.1, 0, 0, 0, 1.2, 0, 0.1, 0, 0.6, 0.08],
  shock: [0.7, 0, 160, 0.002, 0.02, 0.2, 4, 1.5, -6, 0, 0, 0, 0, 0.8, 0, 0, 0, 0.5, 0.05],
  breakk: [1, 0, 520, 0.002, 0.03, 0.3, 3, 0.6, -8, 0, 0, 0, 0, 1.6, 0, 0.2, 0, 0.7, 0.06],
  buy: [0.8, 0, 523, 0.004, 0.03, 0.14, 1, 1.4, 0, 0, 392, 0.05, 0, 0, 0, 0, 0, 0.7, 0.02],
  key: [1, 0, 392, 0.01, 0.1, 0.5, 1, 1.2, 0, 0, 196, 0.08, 0.09, 0, 0, 0, 0.08, 0.7, 0.05],
  deny: [0.6, 0, 110, 0.005, 0.03, 0.1, 2, 0.8, -1, 0, 0, 0, 0, 0.3, 0, 0.3, 0, 0.5, 0.02],
  hover: [0.25, 0, 1320, 0.001, 0.004, 0.02, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.005],
  open: [0.5, 0, 220, 0.01, 0.03, 0.12, 1, 1, 6, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.5, 0.02],
  discover: [0.9, 0, 659, 0.01, 0.12, 0.6, 0, 1, 0, 0, 330, 0.07, 0.07, 0, 0, 0, 0.12, 0.7, 0.06],
  release: [1.6, 0, 62, 0.02, 0.35, 1.4, 2, 2.6, -0.6, -0.05, 0, 0, 0, 2.2, 0, 0.1, 0.1, 0.8, 0.2, 0.2],
  riser: [0.8, 0, 90, 0.5, 0.3, 0.25, 2, 1.5, 9, 0.6, 0, 0, 0, 0.3, 0, 0, 0, 0.7, 0.05, 0.3],
  inject: [1, 0, 196, 0.03, 0.25, 0.8, 1, 0.8, 2.4, 0, 98, 0.12, 0.1, 0.1, 6, 0, 0.1, 0.7, 0.1, 0.2],
  segment: [1.4, 0, 240, 0.003, 0.08, 0.7, 4, 0.9, -5, 0, 0, 0, 0, 2.4, 0, 0.3, 0.06, 0.6, 0.1],
  collapse: [1.5, 0, 220, 0.9, 0.5, 0.2, 2, 2, -3.2, -0.3, 0, 0, 0, 0.6, 0, 0, 0, 0.9, 0.05, 0.4],
  wave: [2, 0, 46, 0.01, 0.5, 2.4, 0, 1.8, -0.25, 0, 0, 0, 0, 1.4, 0, 0, 0.15, 0.85, 0.3],
  heart: [0.9, 0, 54, 0.005, 0.03, 0.2, 0, 1.4, -0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.03],
};
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

export class Audio {
  constructor() {
    this.ctx = ZZFX.audioContext;
    this.buf = {};
    this.sfx = 0.6;
    this.music = 0.5;
    this.ready = false;
    this.last = {};
  }
  start() {
    if (this.ready) return this.ctx.resume();
    const c = this.ctx;
    c.resume();
    this.ready = true;
    this.master = c.createDynamicsCompressor();
    this.master.threshold.value = -14;
    this.master.ratio.value = 6;
    this.master.connect(c.destination);
    this.bus = c.createGain();
    this.bus.connect(this.master);
    // generated impulse response: wide, dark, 2.6s tail
    const len = c.sampleRate * 2.6,
      ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += ((Math.random() * 2 - 1) - lp) * 0.22;
        d[i] = lp * (1 - i / len) ** 2.6;
      }
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    this.wet = c.createGain();
    this.wet.gain.value = 0.55;
    this.bus.connect(this.verb);
    this.verb.connect(this.wet);
    this.wet.connect(this.master);
    // ambient bed: detuned low drone + slow pad through a filter that opens with pressure
    this.amb = c.createGain();
    this.amb.gain.value = 0;
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 260;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.amb);
    this.amb.connect(this.master);
    this.amb.connect(this.verb);
    this.osc = [];
    const voices = [[55, "sine", 0.5], [55.4, "sine", 0.4], [82.4, "triangle", 0.16], [110.3, "sawtooth", 0.05], [164.8, "triangle", 0.07], [220.6, "sine", 0.05], [329.6, "sine", 0.03]];
    for (const [f, type, g] of voices) {
      const o = c.createOscillator(),
        gn = c.createGain(),
        lfo = c.createOscillator(),
        lg = c.createGain();
      o.type = type;
      o.frequency.value = f;
      gn.gain.value = g;
      lfo.frequency.value = 0.03 + Math.random() * 0.09;
      lg.gain.value = g * 0.6;
      lfo.connect(lg);
      lg.connect(gn.gain);
      o.connect(gn);
      gn.connect(this.filter);
      o.start();
      lfo.start();
      this.osc.push({ o, base: f });
    }
    this.chord = 0;
    this.setVolumes(this.sfx, this.music);
  }
  setVolumes(sfx, music) {
    this.sfx = sfx;
    this.music = music;
    if (!this.ready) return;
    this.bus.gain.value = sfx;
    this.amb.gain.setTargetAtTime(music * 0.5, this.ctx.currentTime, 0.4);
  }
  /** mood: pressure 0..1, resonance bool. Called every frame. */
  mood(pressure, hot) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.setTargetAtTime(240 + pressure * 1500 + (hot ? 900 : 0), t, 0.25);
    if (t - (this.lastChord || 0) > 14) {
      this.lastChord = t;
      this.chord = (this.chord + 1) % 4;
      const tr = [1, 0.891, 1.189, 0.794][this.chord]; // i – bVII – bIII – bVI
      for (const v of this.osc) v.o.frequency.setTargetAtTime(v.base * tr, t, 2.5);
    }
  }
  play(name, { rate = 1, vol = 1, pan = 0, gap = 0 } = {}) {
    if (!this.ready || this.sfx <= 0) return;
    const c = this.ctx,
      now = c.currentTime;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    let b = this.buf[name];
    if (!b) {
      const s = ZZFX.buildSamples(...DEFS[name]);
      b = this.buf[name] = c.createBuffer(1, s.length, ZZFX.sampleRate);
      b.getChannelData(0).set(s);
    }
    const src = c.createBufferSource(),
      g = c.createGain(),
      p = c.createStereoPanner();
    src.buffer = b;
    src.playbackRate.value = rate;
    g.gain.value = vol * 0.5;
    p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(g);
    g.connect(p);
    p.connect(this.bus);
    src.start();
  }
  /** rising pentatonic pluck for chained captures */
  capture(chain, pan, big) {
    const step = SCALE[Math.min(SCALE.length - 1, Math.floor(chain / 2) % SCALE.length)];
    this.play("capture", { rate: 2 ** (step / 12) * (big ? 0.5 : 1), vol: big ? 1 : 0.7, pan, gap: 0.028 });
  }
}

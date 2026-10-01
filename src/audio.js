export class Soundscape {
  constructor() {
    this.ctx = null;
    this.volume = 0.35;
    this.lastFeed = 0;
  }
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.ctx = new Audio();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 5;
    this.master.connect(compressor);
    compressor.connect(c.destination);
    this.ambient = c.createGain();
    this.ambient.gain.value = 0.065;
    this.ambient.connect(this.master);
    for (const f of [38, 57.04, 76.08]) {
      const o = c.createOscillator();
      o.frequency.value = f;
      o.connect(this.ambient);
      o.start();
    }
    const length = c.sampleRate * 3;
    this.noise = c.createBuffer(1, length, c.sampleRate);
    const data = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.08) / 1.02;
      data[i] = last * 3;
    }
  }
  setVolume(v) {
    this.volume = v;
    if (this.master)
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15);
  }
  tone(from, to, duration, gain = 0.12, noise = false) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(this.master);
    const o = noise ? c.createBufferSource() : c.createOscillator();
    if (noise) {
      o.buffer = this.noise;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(from, t);
      filter.frequency.exponentialRampToValueAtTime(to, t + duration);
      o.connect(filter);
      filter.connect(g);
    } else {
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(to, t + duration);
      o.connect(g);
    }
    o.start(t);
    o.stop(t + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  click() {
    this.tone(180, 90, 0.16, 0.018);
  }
  feed(category, merger = false) {
    if (!this.ctx) return;
    if (this.ctx.currentTime - this.lastFeed < 0.12) return;
    this.lastFeed = this.ctx.currentTime;
    this.tone(
      merger ? 50 : 95 + category * 3,
      merger ? 190 : 28,
      merger ? 1.6 : 0.45 + category * 0.045,
      0.04 + category * 0.003,
    );
    if (category >= 9) this.tone(900, 80, 1.5, 0.09, true);
  }
  cinematic(t) {
    if (!this.ctx) return;
    this.ambient.gain.setTargetAtTime(
      t > 9 && t < 12 ? 0.0001 : 0.045 + Math.min(t, 8) * 0.01,
      this.ctx.currentTime,
      0.15,
    );
  }
  burst() {
    this.tone(1100, 35, 2.2, 0.35, true);
    this.tone(120, 18, 1.5, 0.22);
  }
  restore() {
    if (this.ctx)
      this.ambient.gain.setTargetAtTime(0.065, this.ctx.currentTime, 0.4);
  }
}

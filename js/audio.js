/* Oui, Chef! – Klang
 * Alles synthetisch: Zischen, Blubbern, Bondrucker, Glocke, Herzschlag-Beat, der mit dem Stress schneller wird.
 */
(function () {
  const A = {
    ctx: null, on: true, master: null, noise: null, loops: {}, beat: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { this.ctx = null; return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.on ? 0.9 : 0;
      this.master.connect(c.destination);
      // Rauschpuffer für Zischen, Drucker, Wischen
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.loop('sizzle', 'highpass', 2600, 0);
      this.loop('bubble', 'lowpass', 500, 0);
      this.loop('crowd', 'bandpass', 380, 0.035);
    },
    setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 0.9 : 0; },
    loop(name, type, freq, vol) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = type === 'bandpass' ? 0.6 : 0.7;
      const g = c.createGain(); g.gain.value = vol;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.loops[name] = { g, f };
    },
    level(name, v) { const l = this.loops[name]; if (l && this.ctx) l.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.12); },
    tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    burst(dur, freq, vol, type = 'bandpass', delay = 0) {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime + delay;
      const s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(this.master);
      s.start(t, Math.random()); s.stop(t + dur + 0.02);
    },
    printer() { for (let i = 0; i < 6; i++) this.burst(0.05, 3200, 0.12, 'bandpass', i * 0.06); this.tone(1200, 0.05, 'square', 0.03, 0, 0.38); },
    tap() { this.tone(520, 0.05, 'triangle', 0.08); },
    flip() { this.burst(0.18, 1800, 0.35, 'highpass'); this.tone(300, 0.12, 'sine', 0.08, 200); },
    perfect() { [880, 1108, 1320, 1760].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, 0, i * 0.05)); },
    good() { this.tone(700, 0.12, 'triangle', 0.12); this.tone(940, 0.14, 'triangle', 0.08, 0, 0.06); },
    bad() { this.tone(220, 0.25, 'sawtooth', 0.09, -80); },
    burn() { for (let i = 0; i < 3; i++) this.tone(980, 0.09, 'square', 0.07, 0, i * 0.14); this.burst(0.6, 900, 0.25, 'lowpass'); },
    cut() { this.burst(0.09, 5200, 0.3, 'highpass'); },
    swoosh() { this.burst(0.35, 1400, 0.2, 'bandpass'); },
    bell() { [1760, 2640, 3520].forEach((f, i) => this.tone(f, 1.1 - i * 0.3, 'sine', 0.16 / (i + 1))); },
    whoosh() { this.burst(0.3, 700, 0.3, 'lowpass'); },
    clink() { const f = 1800 + Math.random() * 1600; this.tone(f, 0.08, 'triangle', 0.025); this.tone(f * 1.5, 0.12, 'sine', 0.015, 0, 0.03); if (Math.random() < 0.4) this.burst(0.06, 4000, 0.04, 'highpass', 0.05); },
    coin() { this.tone(1320, 0.06, 'square', 0.05); this.tone(1760, 0.12, 'square', 0.05, 0, 0.07); },
    fail() { this.tone(330, 0.3, 'triangle', 0.12, -120); this.tone(250, 0.4, 'triangle', 0.1, -100, 0.18); },
    star(i) { this.tone(660 + i * 220, 0.4, 'triangle', 0.16); this.tone(990 + i * 330, 0.5, 'sine', 0.08, 0, 0.05); },
    phone() { [0, 0.18].forEach((d) => { this.tone(880, 0.14, 'sine', 0.12, 0, d); this.tone(1100, 0.14, 'sine', 0.08, 0, d); }); },
    // Herzschlag-Beat: Tempo und Lautstärke wachsen mit dem Stress
    beatTick(stress, dt) {
      if (!this.ctx) return;
      this.beatT = (this.beatT || 0) - dt;
      if (this.beatT > 0) return;
      const bpm = 84 + stress * 0.9;
      this.beatT = 60 / bpm;
      const v = 0.05 + stress / 100 * 0.18;
      this.tone(62, 0.16, 'sine', v, -20);
      this.tone(58, 0.12, 'sine', v * 0.6, -15, 0.17);
      if (stress > 55) this.burst(0.03, 7000, 0.04 + stress / 2000, 'highpass', 60 / bpm / 2);
    },
    haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nicht verfügbar */ } },
  };
  G.Audio = A;
})();

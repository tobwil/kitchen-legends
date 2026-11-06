/* Oui, Chef! – Der Service
 * Ein Abend an der Linie: Bons, Stationen, Pass, Anrichten, Glocke.
 * Alles auf einem Canvas, gebaut für Daumen im Hochformat.
 */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  G.util = { clamp, rnd, pick, lerp, ease };

  const C = {
    bg: '#12161a', tile: '#1c2227', tile2: '#232b31', line: '#2f383f', ink: '#ebe5d9', muted: '#8f989f',
    paper: '#f3ead8', paperInk: '#2a2520', heat: '#ff6b1f', gold: '#e8c46a', bad: '#ef5a4a', good: '#7cc495', steel: '#aeb6bd',
  };
  G.COLORS = C;
  const FONT = {
    callout: "800 {s}px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif",
    dish: "italic 700 {s}px 'Bodoni Moda', Georgia, serif",
    mono: "600 {s}px 'IBM Plex Mono', ui-monospace, monospace",
    body: "600 {s}px 'Figtree', system-ui, sans-serif",
  };
  const font = (k, s) => FONT[k].replace('{s}', Math.round(s));

  // Pfade zum Anrichten (in Teller-Radien, Mitte = 0,0)
  const PATHS = [
    { name: 'Bogen', pts: (t) => [Math.cos(Math.PI * (1.15 - t * 0.9)) * 0.62, Math.sin(Math.PI * (1.15 - t * 0.9)) * -0.62 + 0.05] },
    { name: 'Welle', pts: (t) => [-0.62 + t * 1.24, Math.sin(t * Math.PI * 2) * 0.22 + 0.32] },
    { name: 'Komma', pts: (t) => { const a = Math.PI * (0.2 + t * 1.25); const r = 0.58 - t * 0.32; return [Math.cos(a) * r, Math.sin(a) * r]; } },
    { name: 'Strich', pts: (t) => [-0.55 + t * 1.1, 0.42 - t * 0.12 + Math.sin(t * Math.PI) * -0.06] },
  ];

  class Service {
    constructor(host, night, save, onEnd) {
      this.host = host;
      this.night = night;
      this.save = save;
      this.onEnd = onEnd;
      this.up = (id) => (save.up && save.up[id]) || 0;
      const c = document.createElement('canvas');
      c.className = 'svc-canvas';
      host.appendChild(c);
      this.c = c;
      this.ctx = c.getContext('2d');
      this.t = 0;
      this.rt = 0;
      this.tickets = [];
      this.slots = Array(night.mods.includes('spueler') ? 2 : this.up('pass') ? 4 : 3).fill(null);
      this.stations = night.stations.map((id) => ({ id, def: G.STATIONS[id], state: 'idle', p: 0, item: null, ticketId: null, shake: 0 }));
      this.particles = [];
      this.popups = [];
      this.flyers = [];
      this.score = 0; this.combo = 0; this.bestCombo = 0; this.perfects = 0; this.served = 0; this.lost = 0; this.burnt = 0;
      this.stress = 0; this.weeds = false; this.weedsT = 0;
      this.spawnT = 1.2; this.ticketSeq = 0; this.sumValue = 0;
      this.shake = 0; this.flash = 0; this.flashCol = C.bad;
      this.plating = null;
      this.ended = false;
      this.paused = false;
      this.events = [];
      this.tableBusy = new Set();
      // Sonderereignisse planen
      const d = night.dur;
      if (night.mods.includes('rush')) this.events.push({ at: d * 0.48, fn: () => { this.callout('RUSH!', C.heat); for (let i = 0; i < 3; i++) this.spawn(); } });
      if (night.mods.includes('blogger')) this.events.push({ at: d * 0.3, fn: () => this.spawn({ table: 4, blogger: true }) });
      if (night.mods.includes('vip')) this.events.push({ at: d * 0.58, fn: () => this.spawn({ vip: true }) });
      if (night.boss) {
        this.insp = { table: 9, qs: [], lost: false, tell: pick(G.INSPECTOR_TELLS) };
        [0.22, 0.47, 0.7].forEach((f, i) => this.events.push({ at: d * f, fn: () => { this.spawn({ table: 9, insp: true, course: i + 1 }); if (i === 0) this.callout('Tisch 9 · Einzelgast', C.gold, 2.4); } }));
      }
      this.tut = night.n === 0 && !save.tutDone ? { step: 0, t: 0 } : null;
      this._down = (e) => this.onDown(e);
      this._move = (e) => this.onMove(e);
      this._up = (e) => this.onUp(e);
      c.addEventListener('pointerdown', this._down);
      window.addEventListener('pointermove', this._move);
      window.addEventListener('pointerup', this._up);
      window.addEventListener('pointercancel', this._up);
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      this.resize();
      this.running = true;
      this._loop = (ts) => this.loop(ts);
      requestAnimationFrame(this._loop);
    }

    destroy() {
      this.running = false;
      this._ro.disconnect();
      window.removeEventListener('pointermove', this._move);
      window.removeEventListener('pointerup', this._up);
      window.removeEventListener('pointercancel', this._up);
      G.Audio.level('sizzle', 0); G.Audio.level('bubble', 0);
      this.c.remove();
    }

    /* ---------- Layout ---------- */
    resize() {
      const r = this.host.getBoundingClientRect();
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.w = Math.max(300, r.width); this.h = Math.max(480, r.height);
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
      const w = this.w, h = this.h, pad = 10;
      this.U = clamp(Math.min(w / 390, h / 760), 0.8, 1.6);
      const U = this.U;
      this.hud = { x: pad, y: 6, w: w - pad * 2, h: 50 * U };
      const railH = clamp(h * 0.165, 96 * U, 150 * U);
      this.rail = { x: pad, y: this.hud.y + this.hud.h + 10, w: w - pad * 2, h: railH };
      const passH = clamp(h * 0.2, 128 * U, 190 * U);
      this.pass = { x: pad, y: h - passH - 8, w: w - pad * 2, h: passH };
      const top = this.rail.y + this.rail.h + 12, bot = this.pass.y - 12;
      const n = this.stations.length, cols = 2, rows = Math.ceil(n / cols), gap = 10;
      const tileH = (bot - top - gap * (rows - 1)) / rows;
      const tileW = (w - pad * 2 - gap) / cols;
      this.stations.forEach((s, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const last = i === n - 1 && n % 2 === 1;
        s.r = { x: pad + (last ? 0 : col * (tileW + gap)), y: top + row * (tileH + gap), w: last ? w - pad * 2 : tileW, h: tileH };
      });
      const sw = this.pass.w / this.slots.length;
      this.slotR = this.slots.map((_, i) => ({ x: this.pass.x + sw * i + sw / 2, y: this.pass.y + this.pass.h * 0.58, r: Math.min(sw * 0.4, this.pass.h * 0.34) }));
    }

    /* ---------- Tickets ---------- */
    spawn(o = {}) {
      const nt = this.night;
      let pool = nt.dishes;
      if (nt.mods.includes('hochzeit')) { const big = pool.filter((d) => d.items.length === 3); if (big.length && Math.random() < 0.6) pool = big; }
      const dish = o.dish || (o.insp ? pick(pool.slice().sort((a, b) => b.value - a.value).slice(0, 3)) : pick(pool));
      let table = o.table;
      if (!table) { const free = [1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14].filter((t) => !this.tableBusy.has(t)); table = free.length ? pick(free) : 1 + Math.floor(Math.random() * 14); }
      this.tableBusy.add(table);
      const pat = nt.patience * (1 + 0.1 * this.up('lampen')) * (0.75 + 0.18 * dish.items.length) * (o.insp ? 1.1 : 1);
      const tk = { id: ++this.ticketSeq, table, dish, items: dish.items.map((id) => ({ id, done: false, cooking: false, q: 0 })), patience: pat, max: pat, born: this.t, bornRT: this.rt, slot: null, blogger: !!o.blogger, vip: !!o.vip, insp: !!o.insp, course: o.course || 0, plated: [] };
      this.tickets.push(tk);
      this.sumValue += dish.value * (tk.blogger ? 2 : 1);
      G.Audio.printer();
      if (this.rail) this.pop(`Tisch ${table} – ça marche!`, this.w / 2, this.rail.y + this.rail.h + 14, o.insp ? C.gold : 'rgba(235,229,217,0.85)', 0.75);
      return tk;
    }

    assignSlots() {
      this.slots.forEach((sid, i) => {
        if (sid !== null && this.tickets.some((t) => t.id === sid)) return;
        this.slots[i] = null;
        const next = this.tickets.filter((t) => t.slot === null).sort((a, b) => (b.insp - a.insp) || (a.born - b.born))[0];
        if (next) { next.slot = i; this.slots[i] = next.id; }
      });
    }

    ticket(id) { return this.tickets.find((t) => t.id === id); }

    /* ---------- Stationen ---------- */
    win(s) {
      const [a, b] = s.def.win;
      const c = (a + b) / 2, hw = ((b - a) / 2) * (1 + 0.12 * this.up('pfannen'));
      return [c - hw, c + hw];
    }
    burnAt(s) { return s.def.burn - (this.night.mods.includes('hitze') && s.def.kind === 'pan' ? 0.09 : 0); }
    durOf(s) { return s.def.dur * (this.tut ? 1.35 : 1) * (this.night.mods.includes('hitze') && s.def.kind === 'pan' ? 0.9 : 1); }

    startStation(s) {
      const cands = [];
      this.tickets.filter((t) => t.slot !== null).forEach((t) => t.items.forEach((it) => { if (!it.done && !it.cooking && G.ITEMS[it.id].st === s.id) cands.push({ t, it }); }));
      if (!cands.length) {
        // Notfalls auch für wartende Bons vorkochen
        this.tickets.filter((t) => t.slot === null).forEach((t) => t.items.forEach((it) => { if (!it.done && !it.cooking && G.ITEMS[it.id].st === s.id) cands.push({ t, it }); }));
      }
      if (!cands.length) { s.shake = 0.35; this.pop('Nichts für hier', s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, C.muted, 0.8); G.Audio.bad(); return; }
      cands.sort((a, b) => (b.t.insp - a.t.insp) || (a.t.patience - b.t.patience));
      const { t, it } = cands[0];
      it.cooking = true;
      s.item = it.id; s.ticketId = t.id; s.p = 0; s.flipped = false; s.flipMissed = false;
      const k = s.def.kind;
      if (k === 'cold') { s.state = 'cutting'; s.cuts = 0; s.t0 = this.t; }
      else if (k === 'temper') { s.state = 'tempering'; s.gauge = 0; s.prog = 0; s.outT = 0; s.holding = false; s.entered = false; }
      else s.state = 'cooking';
      G.Audio.tap(); G.Audio.haptic(8);
      if (k === 'pan') { G.Audio.burst(0.4, 2400, 0.35, 'highpass'); for (let i = 0; i < 10; i++) this.part(s.r.x + s.r.w / 2, s.r.y + s.r.h * 0.45, 'spark'); }
      this.tutEvent('start', s);
    }

    tapStation(s) {
      const k = s.def.kind;
      if (s.state === 'idle') return this.startStation(s);
      if (s.state === 'burnt') {
        s.state = 'idle';
        for (let i = 0; i < 14; i++) this.part(s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, 'smoke');
        this.pop('Weg damit!', s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, C.muted);
        G.Audio.whoosh();
        return;
      }
      if (s.state !== 'cooking') return;
      if (k === 'pan' && this.flipOpen(s)) {
        s.flipped = true;
        s.flipAnim = 1;
        G.Audio.flip(); G.Audio.haptic(12);
        this.pop('FLIP!', s.r.x + s.r.w / 2, s.r.y + s.r.h * 0.3, C.ink, 0.7);
        for (let i = 0; i < 12; i++) this.part(s.r.x + s.r.w / 2, s.r.y + s.r.h * 0.45, 'spark');
        this.tutEvent('flip', s);
        return;
      }
      const [a, b] = this.win(s);
      if (s.p < a - 0.16) { s.shake = 0.3; this.pop('Noch nicht!', s.r.x + s.r.w / 2, s.r.y + s.r.h * 0.3, C.muted, 0.7); G.Audio.bad(); return; }
      let q, label, col;
      if (s.p >= a && s.p <= b) { q = 100; label = 'PERFEKT!'; col = C.gold; }
      else if (s.p >= a - 0.06 && s.p <= b + 0.06) { q = 82; label = 'Gut'; col = C.good; }
      else if (s.p < a) { q = 60; label = 'Etwas roh'; col = C.muted; }
      else { q = 48; label = 'Übergart'; col = C.bad; }
      if (k === 'pan' && !s.flipped) { q -= 25; label = 'Nicht gewendet!'; col = C.bad; }
      else if (s.flipMissed) { q -= 15; }
      this.finish(s, clamp(q, 20, 100), label, col);
    }

    flipOpen(s) { const f = s.def.flip; return s.def.kind === 'pan' && !s.flipped && s.p >= f - 0.06 && s.p <= f + 0.17; }

    finish(s, q, label, col) {
      const cx = s.r.x + s.r.w / 2, cy = s.r.y + s.r.h * 0.45;
      let tk = this.ticket(s.ticketId);
      let it = tk && tk.items.find((x) => x.id === s.item && x.cooking && !x.done);
      if (!it) {
        // Der Tisch ist weg – für einen anderen Bon nutzen
        tk = this.tickets.find((t) => t.items.some((x) => x.id === s.item && !x.done && !x.cooking));
        it = tk && tk.items.find((x) => x.id === s.item && !x.done && !x.cooking);
      }
      const itemId = s.item;
      s.state = 'idle'; s.item = null; s.ticketId = null; s.p = 0;
      if (!it) { this.pop('Für niemanden …', cx, cy, C.muted); this.addStress(3); return; }
      it.cooking = false; it.done = true; it.q = q;
      if (q >= 100) { this.perfects++; G.Audio.perfect(); G.Audio.haptic(18); for (let i = 0; i < 22; i++) this.part(cx, cy, 'gold'); }
      else if (q >= 80) G.Audio.good(); else { G.Audio.bad(); this.addStress(4); }
      this.pop(label, cx, cy - 10, col, q >= 100 ? 1.25 : 1);
      // Fliegt zum Teller
      const slot = tk.slot !== null ? this.slotR[tk.slot] : null;
      this.flyers.push({ item: itemId, x0: cx, y0: cy, x1: slot ? slot.x : cx, y1: slot ? slot.y : this.pass.y, t: 0, tk: tk.id });
      this.tutEvent('done', s);
    }

    /* ---------- Teller & Anrichten ---------- */
    ready(tk) { return tk.items.every((x) => x.done) && !this.flyers.some((f) => f.tk === tk.id); }

    openPlating(tk) {
      const p = pick(PATHS);
      this.plating = { tk: tk.id, path: p, stroke: [], phase: 'draw', t: 0, score: null, drawing: false };
      G.Audio.tap();
      this.tutEvent('plate');
    }

    scorePlating() {
      const pl = this.plating;
      const N = 40;
      const samples = Array.from({ length: N }, (_, i) => pl.path.pts(i / (N - 1)));
      if (pl.stroke.length < 3) return 50;
      let dSum = 0;
      pl.stroke.forEach(([x, y]) => { let m = 9; samples.forEach(([sx, sy]) => (m = Math.min(m, Math.hypot(sx - x, sy - y)))); dSum += m; });
      const mean = dSum / pl.stroke.length;
      const cov = samples.filter(([sx, sy]) => pl.stroke.some(([x, y]) => Math.hypot(sx - x, sy - y) < 0.13)).length / N;
      return clamp(Math.round(cov * 112 - mean * 260), 25, 100);
    }

    serve(tk, platingScore, auto) {
      const avgQ = tk.items.reduce((a, x) => a + x.q, 0) / tk.items.length;
      const q = Math.round(avgQ * 0.75 + platingScore * 0.25);
      const timeF = 0.6 + 0.4 * clamp(tk.patience / tk.max, 0, 1);
      if (q >= 90) this.combo++; else if (q < 75) this.combo = 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = 1 + 0.1 * Math.min(this.combo, 10);
      let pts = Math.round(tk.dish.value * (q / 100) * timeF * mult * (tk.blogger ? 2 : 1));
      if (tk.vip && q < 90) { pts = Math.round(pts * 0.4); this.pop('Herr B. ist beleidigt', this.w / 2, this.pass.y - 20, C.bad, 1); this.addStress(8); }
      if (tk.insp) this.insp.qs.push(q);
      this.score += pts;
      this.served++;
      this.addStress(q >= 90 ? -9 : q >= 75 ? -4 : 2);
      const slot = this.slotR[tk.slot];
      this.flyers.push({ serve: true, tkObj: tk, x0: slot.x, y0: slot.y, x1: this.w + 80, y1: slot.y - 120, t: 0 });
      this.tickets = this.tickets.filter((t) => t !== tk);
      this.tableBusy.delete(tk.table);
      this.slots[tk.slot] = null;
      tk.slot = null;
      G.Audio.bell(); G.Audio.haptic(25);
      const word = q >= 95 ? 'MAGNIFIQUE!' : q >= 88 ? pick(G.CALLS_GOOD) : q >= 75 ? 'Raus damit!' : 'Hmm …';
      this.callout(word, q >= 88 ? C.gold : q >= 75 ? C.ink : C.muted, 1.1);
      this.pop(`+${pts}`, slot.x, slot.y - 40, C.gold, 1.3);
      if (this.combo >= 3) this.pop(`FLOW ×${this.combo}`, this.w / 2, this.rail.y + this.rail.h + 30, C.heat, 1.1);
      if (auto) this.pop('Souschef', slot.x, slot.y - 66, C.muted, 0.7);
      this.tutEvent('served');
    }

    /* ---------- Stress ---------- */
    addStress(v) {
      const k = v > 0 ? 1 - 0.2 * this.up('ruhe') : 1;
      this.stress = clamp(this.stress + v * k, 0, 100);
      if (this.stress >= 100 && !this.weeds) { this.weeds = true; this.weedsT = 0; this.callout('IM WEEDS!', C.bad, 2); G.Audio.burn(); this.shake = 0.6; }
      if (this.weeds && this.stress < 70) { this.weeds = false; this.callout('Wieder Luft.', C.good, 1.2); }
    }

    /* ---------- Effekte ---------- */
    part(x, y, kind) {
      if (this.particles.length > 400) return;
      const p = { x, y, vx: rnd(-60, 60), vy: rnd(-120, -20), life: 1, max: 1, kind };
      if (kind === 'gold') Object.assign(p, { vx: rnd(-180, 180), vy: rnd(-240, -40), life: 0.9, max: 0.9, r: rnd(2, 4) });
      if (kind === 'spark') Object.assign(p, { vx: rnd(-140, 140), vy: rnd(-200, -60), life: 0.5, max: 0.5, r: rnd(1.2, 2.4) });
      if (kind === 'smoke') Object.assign(p, { vx: rnd(-25, 25), vy: rnd(-70, -30), life: 1.6, max: 1.6, r: rnd(8, 16) });
      if (kind === 'steam') Object.assign(p, { vx: rnd(-10, 10), vy: rnd(-45, -25), life: 1.4, max: 1.4, r: rnd(5, 10) });
      if (kind === 'fire') Object.assign(p, { vx: rnd(-30, 30), vy: rnd(-140, -70), life: 0.6, max: 0.6, r: rnd(5, 11) });
      if (kind === 'crumb') Object.assign(p, { vx: rnd(-160, 160), vy: rnd(-160, 20), life: 0.6, max: 0.6, r: rnd(1.5, 3) });
      if (kind === 'confetti') Object.assign(p, { vx: rnd(-200, 200), vy: rnd(-380, -120), life: 1.6, max: 1.6, r: rnd(3, 5), col: pick([C.gold, C.heat, C.paper, C.good]) });
      this.particles.push(p);
    }
    pop(text, x, y, col, scale = 1) { this.popups.push({ text, x, y, col, scale, life: 1.1, max: 1.1 }); }
    callout(text, col, dur = 1.2) { this.big = { text, col, life: dur, max: dur }; }

    /* ---------- Eingabe ---------- */
    pos(e) { const r = this.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    inR(r, x, y) { return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h; }

    onDown(e) {
      G.Audio.init();
      if (this.ended || this.paused) return;
      e.preventDefault();
      const [x, y] = this.pos(e);
      this.pointer = { x, y, sx: x, sy: y, id: e.pointerId };
      if (this.plating) return this.platingDown(x, y);
      if (this.inR(this.pauseR || { x: -1, y: -1, w: 0, h: 0 }, x, y)) { this.togglePause(); return; }
      for (const s of this.stations) {
        if (!this.inR(s.r, x, y)) continue;
        if (s.state === 'cutting') { this.pointer.cut = s; this.pointer.cutX = x; return; }
        if (s.state === 'tempering') { s.holding = true; this.pointer.hold = s; return; }
        return this.tapStation(s);
      }
      for (let i = 0; i < this.slots.length; i++) {
        const r = this.slotR[i];
        if (Math.hypot(x - r.x, y - r.y) > r.r * 1.15) continue;
        const tk = this.ticket(this.slots[i]);
        if (tk && this.ready(tk)) return this.openPlating(tk);
        if (tk) { this.pop('Noch nicht komplett', r.x, r.y - r.r, C.muted, 0.7); }
        return;
      }
    }

    onMove(e) {
      if (!this.pointer || this.ended) return;
      const [x, y] = this.pos(e);
      const p = this.pointer;
      if (this.plating && this.plating.drawing) return this.platingMove(x, y);
      if (p.cut) {
        const s = p.cut;
        if (s.state !== 'cutting') { p.cut = null; return; }
        if (Math.abs(x - p.cutX) > s.r.w * 0.42) {
          p.cutX = x;
          s.cuts++;
          s.slash = { y: y, life: 0.25 };
          G.Audio.cut(); G.Audio.haptic(10);
          for (let i = 0; i < 8; i++) this.part(x, y, 'crumb');
          const need = this.up('messer') ? 2 : s.def.cuts;
          if (s.cuts >= need) {
            const dt = this.t - s.t0;
            const q = clamp(Math.round(112 - dt * 9), 50, 100);
            this.finish(s, q, q >= 100 ? 'PERFEKT!' : q >= 80 ? 'Sauber!' : 'Langsam …', q >= 100 ? C.gold : q >= 80 ? C.good : C.muted);
            p.cut = null;
          }
        }
      }
    }

    onUp() {
      if (this.pointer && this.pointer.hold) this.pointer.hold.holding = false;
      if (this.plating && this.plating.drawing) this.platingUp();
      this.pointer = null;
    }

    plateGeom() { const r = Math.min(this.w * 0.36, this.h * 0.215); return { x: this.w / 2, y: this.h * 0.5, r }; }

    platingDown(x, y) {
      const pl = this.plating, g = this.plateGeom();
      if (pl.phase === 'bell') {
        const tk = this.ticket(pl.tk);
        this.plating = null;
        if (tk) this.serve(tk, pl.score);
        return;
      }
      if (Math.hypot(x - g.x, y - g.y) < g.r * 1.3) { pl.drawing = true; pl.stroke = [[(x - g.x) / g.r, (y - g.y) / g.r]]; G.Audio.swoosh(); }
    }
    platingMove(x, y) {
      const g = this.plateGeom();
      const pt = [(x - g.x) / g.r, (y - g.y) / g.r];
      const last = this.plating.stroke[this.plating.stroke.length - 1];
      if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 0.015) this.plating.stroke.push(pt);
    }
    platingUp() {
      const pl = this.plating;
      pl.drawing = false;
      if (pl.stroke.length < 4) return;
      pl.score = this.scorePlating();
      pl.phase = 'bell';
      pl.t = 0;
      const tk = this.ticket(pl.tk);
      if (tk) tk.sauce = pl.stroke.slice();
      const word = pl.score >= 90 ? 'Wie gemalt!' : pl.score >= 70 ? 'Schön.' : 'Naja …';
      this.pop(word, this.w / 2, this.plateGeom().y - this.plateGeom().r - 10, pl.score >= 90 ? C.gold : C.ink, 1.2);
      if (pl.score >= 90) G.Audio.perfect(); else G.Audio.good();
      this.tutEvent('drawn');
    }

    togglePause() {
      this.paused = !this.paused;
      if (this.onPause) this.onPause(this.paused);
    }

    /* ---------- Tutorial ---------- */
    tutEvent(ev) {
      const tt = this.tut;
      if (!tt) return;
      const go = (n) => { tt.step = n; tt.t = 0; };
      if (tt.step === 1 && ev === 'start') go(2);
      else if (tt.step === 2 && ev === 'flip') go(3);
      else if (tt.step === 3 && ev === 'done') go(4);
      else if (tt.step === 4 && ev === 'start') go(5);
      else if (tt.step === 5 && ev === 'done') go(6);
      else if (tt.step === 6 && ev === 'plate') go(7);
      else if (tt.step === 7 && ev === 'drawn') go(8);
      else if (tt.step === 8 && ev === 'served') { go(9); }
    }
    tutText() {
      const tt = this.tut;
      if (!tt) return null;
      const S = this.stations;
      const pan = S.find((s) => s.id === 'pfanne'), kalt = S.find((s) => s.id === 'kalt');
      const tk = this.tickets[0];
      switch (tt.step) {
        case 1: return { text: 'Ein Bon! Tisch 3 will Saibling mit Gurke.\nTippe die PFANNE.', r: pan.r };
        case 2: return { text: 'Gleich ruft die Pfanne FLIP.\nDann sofort tippen!', r: pan.r };
        case 3: return { text: 'Jetzt warten, bis der Ring GOLDEN leuchtet –\ndann tippen!', r: pan.r };
        case 4: return { text: 'Garde-manger: Tippe die Station …', r: kalt.r };
        case 5: return { text: '… und wisch 3× quer drüber. Schnell!', r: kalt.r };
        case 6: return tk && tk.slot !== null ? { text: 'Teller komplett! Tippe ihn zum Anrichten.', r: { x: this.slotR[tk.slot].x - this.slotR[tk.slot].r, y: this.slotR[tk.slot].y - this.slotR[tk.slot].r, w: this.slotR[tk.slot].r * 2, h: this.slotR[tk.slot].r * 2 } } : null;
        case 7: return { text: 'Zieh die Sauce mit dem Finger\nentlang der Linie.', r: null };
        case 8: return { text: 'Jetzt: SERVICE! Tipp auf die Glocke.', r: null };
        case 9: return tt.t < 4 ? { text: 'Genau so. Der Abend läuft –\nhalt bis 22 Uhr durch!', r: null } : null;
        default: return null;
      }
    }

    /* ---------- Spielschleife ---------- */
    loop(ts) {
      if (!this.running) return;
      const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
      this.last = ts;
      if (!this.paused) { this.rt += dt; this.update(dt); }
      this.draw();
      requestAnimationFrame(this._loop);
    }

    update(dt) {
      const nt = this.night;
      const tt = this.tut;
      if (tt) {
        tt.t += dt;
        if (tt.step === 0 && tt.t > 0.6) { this.spawn({ dish: G.DISHES.find((d) => d.id === 'saibling'), table: 3 }); tt.step = 1; tt.t = 0; }
        if (tt.step === 9 && tt.t > 4) { this.tut = null; this.save.tutDone = true; this.spawnT = 3; }
      }
      const frozen = tt && tt.step < 9;
      if (!frozen) this.t += dt;
      const t = this.t;
      // Ereignisse
      this.events.forEach((ev) => { if (!ev.done && t >= ev.at) { ev.done = true; ev.fn(); } });
      // Neue Bons
      if (!frozen && !this.lastCall && t >= nt.dur - 14 && !nt.legend) { this.lastCall = true; this.callout('Letzte Bestellungen!', C.gold, 1.6); }
      if (!frozen && t < nt.dur - 14) {
        this.spawnT -= dt;
        const maxOpen = this.slots.length + 4;
        if (this.spawnT <= 0) {
          if (this.tickets.length < maxOpen) this.spawn();
          this.spawnT = nt.interval * rnd(0.75, 1.25) * (this.tickets.length >= this.slots.length + 1 ? 1.25 : 1);
        }
      }
      this.assignSlots();
      // Geduld
      if (!frozen) {
        this.tickets.slice().forEach((tk) => {
          tk.patience -= dt * (this.weeds ? 1.35 : 1);
          if (tk.patience < tk.max * 0.25 && !tk.warned) { tk.warned = true; this.pop(`Tisch ${tk.table} wird ungeduldig!`, this.w / 2, this.rail.y + this.rail.h + 18, C.heat, 0.85); }
          if (tk.patience <= 0) this.lose(tk);
        });
      }
      // Stationen
      let sizzle = 0, bubble = 0;
      this.stations.forEach((s) => {
        s.shake = Math.max(0, s.shake - dt);
        if (s.flipAnim) s.flipAnim = Math.max(0, s.flipAnim - dt * 2.5);
        if (s.slash) { s.slash.life -= dt; if (s.slash.life <= 0) s.slash = null; }
        const k = s.def.kind;
        const cx = s.r.x + s.r.w / 2, cy = s.r.y + s.r.h * 0.45;
        if (s.state === 'cooking') {
          s.p += dt / this.durOf(s);
          if (k === 'pan') {
            sizzle += 1;
            if (this.up('commis') && !s.flipped && s.p >= s.def.flip) { s.flipped = true; s.flipAnim = 1; G.Audio.flip(); }
            if (!s.flipped && !s.flipMissed && s.p > s.def.flip + 0.17) { s.flipMissed = true; s.flipped = true; this.pop('Zu spät gewendet!', cx, cy - 20, C.bad, 0.8); this.addStress(5); }
            if (Math.random() < dt * 14) this.part(cx + rnd(-20, 20), cy, 'steam');
          }
          if (k === 'pot') { bubble += 1; if (Math.random() < dt * 8) this.part(cx + rnd(-16, 16), cy - 6, 'steam'); }
          if (k === 'oven' && Math.random() < dt * 3) this.part(cx + rnd(-20, 20), s.r.y + 14, 'steam');
          if (s.p >= this.burnAt(s)) {
            s.state = 'burnt'; s.burnT = 0;
            const tk = this.ticket(s.ticketId);
            if (tk) { const it = tk.items.find((x) => x.id === s.item && x.cooking); if (it) it.cooking = false; }
            this.burnt++; this.combo = 0;
            this.addStress(13);
            this.shake = 0.45; this.flash = 0.5; this.flashCol = C.bad;
            this.pop('BRENNT!', cx, cy - 10, C.bad, 1.3);
            G.Audio.burn(); G.Audio.haptic([40, 30, 40]);
          }
        }
        if (s.state === 'burnt') { s.burnT += dt; if (Math.random() < dt * 20) this.part(cx + rnd(-18, 18), cy, Math.random() < 0.5 ? 'fire' : 'smoke'); }
        if (s.state === 'cutting' && this.t - s.t0 > 9) {
          const q = 45;
          this.finish(s, q, 'Zu langsam', C.muted);
        }
        if (s.state === 'tempering') {
          s.gauge = clamp(s.gauge + (s.holding ? 0.55 : -0.42) * dt, 0, 1);
          const [a, b] = s.def.band;
          const inb = s.gauge >= a && s.gauge <= b;
          if (inb) { s.entered = true; s.prog += dt / 1.7; } else if (s.entered) s.outT += dt;
          if (s.gauge >= 0.99) s.outT += dt;
          if (s.prog >= 1) { const q = clamp(Math.round(104 - s.outT * 20), 40, 100); this.finish(s, q, q >= 100 ? 'PERFEKT!' : q >= 80 ? 'Glänzt!' : 'Matt …', q >= 100 ? C.gold : q >= 80 ? C.good : C.muted); }
        }
      });
      G.Audio.level('sizzle', Math.min(0.2, sizzle * 0.07) + (this.stations.some((s) => s.state === 'burnt') ? 0.08 : 0));
      G.Audio.level('bubble', Math.min(0.12, bubble * 0.06));
      // Fliegende Teile
      this.flyers.forEach((f) => (f.t += dt * (f.serve ? 1.6 : 2.6)));
      this.flyers = this.flyers.filter((f) => f.t < 1);
      // Souschef richtet an
      if (this.up('souschef') && !this.plating) {
        this.tickets.filter((tk) => tk.slot !== null && this.ready(tk)).forEach((tk) => { tk.readyT = (tk.readyT || 0) + dt; if (tk.readyT > 3.5) this.serve(tk, 85, true); });
      }
      // Anrichten: Zeitlimit
      if (this.plating) {
        const pl = this.plating;
        pl.t += dt;
        const tk = this.ticket(pl.tk);
        if (!tk) this.plating = null;
        else if (pl.phase === 'draw' && pl.t > 5 && !pl.drawing) { pl.score = 50; pl.phase = 'bell'; pl.t = 0; this.pop('Schnell, schnell!', this.w / 2, this.h * 0.2, C.muted); }
        else if (pl.phase === 'bell' && pl.t > 2.2 && !this.tut) { this.plating = null; this.serve(tk, pl.score); }
      }
      // Stress & Effekte
      this.stress = clamp(this.stress - dt * (this.tickets.some((x) => x.patience < x.max * 0.25) ? 0.2 : 1.1), 0, 100);
      if (this.weeds) { this.weedsT += dt; if (this.stress < 70) { this.weeds = false; this.callout('Wieder Luft.', C.good); } }
      G.Audio.beatTick(this.stress, dt);
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt * 1.5);
      this.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'gold' || p.kind === 'crumb' || p.kind === 'confetti' || p.kind === 'spark') p.vy += 420 * dt; p.life -= dt; });
      this.particles = this.particles.filter((p) => p.life > 0);
      this.popups.forEach((p) => (p.life -= dt));
      this.popups = this.popups.filter((p) => p.life > 0);
      if (this.big) { this.big.life -= dt; if (this.big.life <= 0) this.big = null; }
      // Ende
      if (!this.ended && !frozen && t >= nt.dur && !this.tickets.length && !this.plating) this.end();
      if (!this.ended && t >= nt.dur + 40) { this.tickets.slice().forEach((tk) => this.lose(tk)); this.plating = null; this.end(); }
    }

    lose(tk) {
      this.tickets = this.tickets.filter((t) => t !== tk);
      this.tableBusy.delete(tk.table);
      if (tk.slot !== null) this.slots[tk.slot] = null;
      tk.items.forEach((it) => (it.cooking = false));
      if (this.plating && this.plating.tk === tk.id) this.plating = null;
      this.lost++; this.combo = 0;
      this.score = Math.max(0, this.score - 40);
      if (tk.insp) this.insp.lost = true;
      this.addStress(20);
      this.flash = 0.6; this.flashCol = C.bad; this.shake = 0.3;
      this.callout(`Tisch ${tk.table} ist gegangen!`, C.bad, 1.4);
      G.Audio.fail(); G.Audio.haptic([60, 40, 60]);
    }

    end() {
      this.ended = true;
      G.Audio.level('sizzle', 0); G.Audio.level('bubble', 0);
      const sv = this.sumValue || 1;
      const th = [0.5, 0.9, 1.3].map((f) => Math.round(sv * f));
      const stars = th.filter((x) => this.score >= x).length;
      let inspPassed = null, inspAvg = null;
      if (this.insp) {
        inspAvg = this.insp.qs.length ? Math.round(this.insp.qs.reduce((a, b) => a + b, 0) / this.insp.qs.length) : 0;
        inspPassed = !this.insp.lost && this.insp.qs.length >= 3 && inspAvg >= 80 + this.night.ch * 3 && stars >= 1;
      }
      this.result = { score: this.score, stars, th, perfects: this.perfects, served: this.served, lost: this.lost, burnt: this.burnt, bestCombo: this.bestCombo, inspPassed, inspAvg, inspNeed: 80 + this.night.ch * 3 };
      setTimeout(() => this.onEnd(this.result), 700);
    }

    /* ---------- Zeichnen ---------- */
    rr(x, y, w, h, r) { const c = this.ctx; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

    draw() {
      const c = this.ctx, U = this.U;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = C.bg; c.fillRect(0, 0, this.w, this.h);
      // Wärmeglühen oben
      const glow = c.createRadialGradient(this.w / 2, -40, 10, this.w / 2, -40, this.h * 0.7);
      glow.addColorStop(0, `rgba(255,107,31,${0.14 + this.stress / 600})`); glow.addColorStop(1, 'rgba(255,107,31,0)');
      c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
      c.save();
      if (this.shake > 0) c.translate(rnd(-1, 1) * this.shake * 14, rnd(-1, 1) * this.shake * 10);
      this.drawHud();
      this.drawRail();
      this.stations.forEach((s) => this.drawStation(s));
      this.drawPass();
      this.drawFlyers();
      this.drawParticles();
      c.restore();
      if (this.plating) this.drawPlating();
      this.drawPopups();
      this.drawTutorial();
      // Stress-Vignette
      const v = this.weeds ? 0.45 + Math.sin(this.t * 8) * 0.12 : this.stress / 260;
      if (v > 0.02) {
        const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
        g.addColorStop(0, 'rgba(239,90,74,0)'); g.addColorStop(1, `rgba(239,90,74,${v})`);
        c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
      }
      if (this.flash > 0) { c.fillStyle = this.flashCol; c.globalAlpha = this.flash * 0.25; c.fillRect(0, 0, this.w, this.h); c.globalAlpha = 1; }
      if (this.big) {
        const b = this.big, k = 1 - b.life / b.max;
        const sc = k < 0.15 ? ease(k / 0.15) * 1.15 : 1.15 - Math.min(0.15, (k - 0.15) * 0.3);
        c.save();
        c.globalAlpha = Math.min(1, b.life * 3);
        c.translate(this.w / 2, this.h * 0.34);
        c.scale(sc, sc);
        c.font = font('callout', 46 * U);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 8; c.strokeStyle = 'rgba(10,8,6,0.85)'; c.strokeText(b.text.toUpperCase(), 0, 0);
        c.fillStyle = b.col; c.fillText(b.text.toUpperCase(), 0, 0);
        c.restore();
      }
    }

    drawHud() {
      const c = this.ctx, U = this.U, h = this.hud;
      const nt = this.night;
      const mins = 18 * 60 + 30 + Math.min(1, this.t / nt.dur) * 210;
      const clock = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`;
      c.font = font('callout', 30 * U); c.fillStyle = C.ink; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(clock, h.x + 4, h.y + h.h * 0.42);
      c.font = font('mono', 9.5 * U); c.fillStyle = C.muted;
      c.fillText(nt.boss ? 'INSPEKTOREN-ABEND' : nt.title.toUpperCase(), h.x + 4, h.y + h.h * 0.88);
      // Punkte & Sterne-Leiste
      const bx = h.x + 96 * U, bw = h.w - 96 * U - 52 * U, by = h.y + h.h * 0.55;
      const sv = this.sumValue || 1;
      const th = [0.5, 0.9, 1.3].map((f) => sv * f);
      const maxv = th[2] * 1.12;
      c.fillStyle = C.tile2; this.rr(bx, by - 5 * U, bw, 10 * U, 5 * U); c.fill();
      const fill = clamp(this.score / maxv, 0, 1);
      const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, C.heat); gr.addColorStop(1, C.gold);
      c.fillStyle = gr; this.rr(bx, by - 5 * U, Math.max(10 * U, bw * fill), 10 * U, 5 * U); c.fill();
      th.forEach((v, i) => {
        const x = bx + bw * (v / maxv);
        const got = this.score >= v;
        c.font = font('body', (got ? 17 : 14) * U); c.textAlign = 'center';
        c.fillStyle = got ? C.gold : C.line;
        c.fillText('★', x, by - 13 * U);
      });
      c.font = font('callout', 22 * U); c.fillStyle = C.ink; c.textAlign = 'left';
      c.fillText(String(this.score), bx, h.y + 9 * U);
      if (this.combo >= 2) { const sw = c.measureText(String(this.score)).width; c.font = font('callout', 16 * U); c.fillStyle = C.heat; c.textAlign = 'left'; c.fillText(`FLOW ×${this.combo}`, bx + sw + 10 * U, h.y + 11 * U); }
      // Druck
      const sx = h.x, sy = h.y + h.h + 2, sw = h.w;
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(sx, sy, sw, 3 * U);
      const sc = this.stress > 75 ? C.bad : this.stress > 45 ? C.heat : C.good;
      c.fillStyle = sc; c.fillRect(sx, sy, sw * this.stress / 100, 3 * U);
      // Pause
      this.pauseR = { x: h.x + h.w - 40 * U, y: h.y + 4, w: 40 * U, h: 38 * U };
      c.fillStyle = C.tile; this.rr(this.pauseR.x, this.pauseR.y, this.pauseR.w, this.pauseR.h, 10 * U); c.fill();
      c.fillStyle = C.ink;
      c.fillRect(this.pauseR.x + 14 * U, this.pauseR.y + 11 * U, 4 * U, 16 * U);
      c.fillRect(this.pauseR.x + 22 * U, this.pauseR.y + 11 * U, 4 * U, 16 * U);
    }

    tilePattern() {
      if (this._tiles) return this._tiles;
      const t = document.createElement('canvas');
      t.width = 48; t.height = 24;
      const g = t.getContext('2d');
      g.fillStyle = '#1b2025'; g.fillRect(0, 0, 48, 24);
      g.fillStyle = '#20262b'; g.fillRect(1, 1, 22, 10); g.fillRect(25, 1, 22, 10); g.fillRect(13, 13, 22, 10); g.fillRect(-11, 13, 22, 10); g.fillRect(37, 13, 22, 10);
      g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(1, 1, 22, 2); g.fillRect(25, 1, 22, 2); g.fillRect(13, 13, 22, 2);
      this._tiles = this.ctx.createPattern(t, 'repeat');
      return this._tiles;
    }

    drawRail() {
      const c = this.ctx, U = this.U, r = this.rail;
      c.save(); c.fillStyle = this.tilePattern(); c.globalAlpha = 0.9; c.fillRect(0, r.y - 4, this.w, r.h + 8); c.restore();
      // Schiene
      const g = c.createLinearGradient(0, r.y, 0, r.y + 8 * U);
      g.addColorStop(0, '#6a747c'); g.addColorStop(1, '#2b3238');
      c.fillStyle = g; this.rr(r.x, r.y, r.w, 8 * U, 4 * U); c.fill();
      const tks = this.tickets.slice().sort((a, b) => (a.slot === null) - (b.slot === null) || a.born - b.born);
      const n = 4, gap = 6 * U;
      const tw = (r.w - gap * (n - 1)) / n;
      tks.slice(0, n).forEach((tk, i) => {
        const x = r.x + i * (tw + gap), y = r.y + 6 * U;
        const age = this.rt - tk.bornRT;
        const drop = age < 0.4 ? (1 - ease(age / 0.4)) * -40 : 0;
        const th = r.h - 8 * U;
        const active = tk.slot !== null;
        const pr = clamp(tk.patience / tk.max, 0, 1);
        const crit = pr < 0.25;
        c.save();
        c.translate(x, y + drop + (active ? 4 * U : 0));
        if (crit) c.rotate(Math.sin(this.t * 22) * 0.025);
        c.globalAlpha = active ? 1 : 0.62;
        // Papier mit Zackenrand
        c.fillStyle = tk.insp ? '#f6e3a8' : C.paper;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(tw, 0); c.lineTo(tw, th - 5);
        for (let k = 0; k <= 10; k++) c.lineTo(tw - (tw / 10) * k, th - (k % 2 ? 0 : 5));
        c.closePath(); c.fill();
        if (tk.insp || tk.vip || tk.blogger) { c.strokeStyle = tk.insp ? '#b8892a' : tk.vip ? '#7a4ab0' : '#d24a8a'; c.lineWidth = 3; c.stroke(); }
        // Klammer
        c.fillStyle = '#8a949b'; c.fillRect(tw / 2 - 9 * U, -4 * U, 18 * U, 8 * U);
        c.fillStyle = C.paperInk; c.textAlign = 'left'; c.textBaseline = 'top';
        c.font = font('mono', 11 * U);
        c.fillText(`T${tk.table}${tk.insp ? ' ★' : tk.vip ? ' VIP' : tk.blogger ? ' ♥' : ''}`, 6 * U, 7 * U);
        if (!active) { c.textAlign = 'right'; c.font = font('mono', 8.5 * U); c.fillStyle = '#8a7d6c'; c.fillText('wartet', tw - 5 * U, 8 * U); c.textAlign = 'left'; }
        c.font = font('dish', 11.5 * U); c.fillStyle = C.paperInk;
        const words = tk.dish.name.split(' · ');
        words.slice(0, 3).forEach((wd, k) => c.fillText(wd, 6 * U, (23 + k * 13) * U, tw - 10 * U));
        // Zutaten-Punkte
        tk.items.forEach((it, k) => {
          const ix = 9 * U + k * 15 * U, iy = th - 24 * U;
          c.beginPath(); c.arc(ix, iy, 5.5 * U, 0, Math.PI * 2);
          c.fillStyle = G.ITEMS[it.id].col; c.fill();
          c.lineWidth = 1.5; c.strokeStyle = C.paperInk; c.stroke();
          if (it.done) { c.strokeStyle = '#2f7a3a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(ix - 3 * U, iy); c.lineTo(ix - 0.5 * U, iy + 3 * U); c.lineTo(ix + 4 * U, iy - 3.5 * U); c.stroke(); }
          else if (it.cooking) { c.fillStyle = C.heat; c.beginPath(); c.arc(ix + 5 * U, iy - 5 * U, 2.5 * U, 0, 7); c.fill(); }
        });
        // Geduld
        c.fillStyle = 'rgba(42,37,32,0.15)'; c.fillRect(6 * U, th - 13 * U, tw - 12 * U, 4 * U);
        c.fillStyle = pr < 0.25 ? '#d2400a' : pr < 0.5 ? '#d98a1a' : '#4a8a4a';
        c.fillRect(6 * U, th - 13 * U, (tw - 12 * U) * pr, 4 * U);
        c.restore();
      });
      if (tks.length > n) {
        c.font = font('callout', 15 * U); c.fillStyle = C.heat; c.textAlign = 'right';
        c.fillText(`+${tks.length - n} Bons`, r.x + r.w, r.y + r.h + 4 * U);
      }
    }

    drawStation(s) {
      const c = this.ctx, U = this.U, r = s.r, k = s.def.kind;
      c.save();
      if (s.shake > 0) c.translate(Math.sin(this.t * 60) * s.shake * 10, 0);
      // Kachel
      const g = c.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, C.tile2); g.addColorStop(1, C.tile);
      c.fillStyle = g; this.rr(r.x, r.y, r.w, r.h, 14 * U); c.fill();
      const busy = s.state !== 'idle';
      const needed = !busy && this.tickets.some((t) => t.slot !== null && t.items.some((it) => !it.done && !it.cooking && G.ITEMS[it.id].st === s.id));
      c.strokeStyle = s.state === 'burnt' ? C.bad : busy ? 'rgba(255,107,31,0.55)' : needed ? `rgba(232,196,106,${0.45 + Math.sin(this.rt * 6) * 0.35})` : C.line;
      c.lineWidth = busy || needed ? 2.5 : 1; c.stroke();
      if (needed) {
        c.fillStyle = C.gold; this.rr(r.x + 10, r.y + 10, 52 * U, 20 * U, 10 * U); c.fill();
        c.fillStyle = '#2a1a05'; c.font = font('callout', 13 * U); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('BON!', r.x + 10 + 26 * U, r.y + 10 + 10.5 * U);
      }
      const cx = r.x + r.w / 2, cy = r.y + r.h * 0.46;
      const size = Math.min(r.w * 0.42, r.h * 0.36);
      // Kochgeschirr
      if (k === 'pan') this.drawPan(s, cx, cy, size);
      else if (k === 'pot') this.drawPot(s, cx, cy, size);
      else if (k === 'oven') this.drawOven(s, cx, cy, size);
      else if (k === 'cold') this.drawBoard(s, cx, cy, size);
      else if (k === 'temper') this.drawTemper(s, cx, cy, size);
      // Ring
      if (s.state === 'cooking') {
        const [a, b] = this.win(s);
        const burn = this.burnAt(s);
        const R = size * 1.12;
        const A0 = -Math.PI / 2;
        const ang = (v) => A0 + (v / burn) * Math.PI * 2;
        c.lineWidth = 7 * U; c.lineCap = 'round';
        c.strokeStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = 'rgba(232,196,106,0.35)'; c.beginPath(); c.arc(cx, cy, R, ang(a), ang(b)); c.stroke();
        const inWin = s.p >= a && s.p <= b;
        c.strokeStyle = inWin ? C.gold : s.p > b ? C.bad : C.heat;
        c.beginPath(); c.arc(cx, cy, R, A0, ang(Math.min(s.p, burn))); c.stroke();
        if (inWin) {
          c.save(); c.globalAlpha = 0.35 + Math.sin(this.t * 18) * 0.25; c.lineWidth = 16 * U; c.strokeStyle = C.gold;
          c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke(); c.restore();
          c.font = font('callout', 22 * U); c.fillStyle = C.gold; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('JETZT!', cx, r.y + 16 * U);
        }
        if (k === 'pan') {
          const fa = ang(s.def.flip);
          c.fillStyle = s.flipped ? C.good : '#fff';
          c.beginPath(); c.arc(cx + Math.cos(fa) * R, cy + Math.sin(fa) * R, 5 * U, 0, 7); c.fill();
          if (this.flipOpen(s)) {
            const pulse = 1 + Math.sin(this.t * 20) * 0.08;
            c.save(); c.translate(cx, r.y + 18 * U); c.scale(pulse, pulse);
            c.font = font('callout', 26 * U); c.textAlign = 'center'; c.textBaseline = 'middle';
            c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText('FLIP!', 0, 0);
            c.fillStyle = '#fff'; c.fillText('FLIP!', 0, 0); c.restore();
          }
        }
        c.lineCap = 'butt';
      }
      // Beschriftung
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = font('mono', 9 * U); c.fillStyle = C.muted;
      c.fillText(s.def.name.toUpperCase(), cx, r.y + r.h - 22 * U);
      c.font = font('dish', 13 * U); c.fillStyle = C.ink;
      const tk = this.ticket(s.ticketId);
      const label = s.state === 'burnt' ? 'Verbrannt – tippen zum Wegwerfen' : s.item ? G.ITEMS[s.item].name + (tk ? `  ·  T${tk.table}` : '') : s.def.hint;
      c.fillStyle = s.state === 'burnt' ? C.bad : s.item ? C.ink : 'rgba(235,229,217,0.4)';
      c.font = s.item || s.state === 'burnt' ? font('dish', 13 * U) : font('body', 10 * U);
      c.fillText(label, cx, r.y + r.h - 8 * U, r.w - 16);
      if (s.state === 'cutting') {
        const need = this.up('messer') ? 2 : s.def.cuts;
        c.font = font('callout', 20 * U); c.fillStyle = '#fff';
        c.fillText(`WISCHEN ${s.cuts}/${need}`, cx, r.y + 22 * U);
        const ax = (this.t * 2) % 1;
        c.globalAlpha = 1 - ax; c.fillStyle = C.heat;
        c.beginPath(); const yy = cy + size * 0.95; c.moveTo(r.x + 20 + ax * (r.w - 60), yy - 7); c.lineTo(r.x + 34 + ax * (r.w - 60), yy); c.lineTo(r.x + 20 + ax * (r.w - 60), yy + 7); c.fill();
        c.globalAlpha = 1;
      }
      if (s.slash) {
        c.strokeStyle = `rgba(255,255,255,${s.slash.life * 3})`; c.lineWidth = 3;
        c.beginPath(); c.moveTo(r.x + 10, s.slash.y + 8); c.lineTo(r.x + r.w - 10, s.slash.y - 8); c.stroke();
      }
      c.restore();
    }

    flames(cx, cy, size, on) {
      const c = this.ctx;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const fl = on ? 1 + Math.sin(this.t * 30 + i * 2) * 0.25 : 0.3;
        c.fillStyle = on ? (i % 2 ? 'rgba(80,140,255,0.8)' : 'rgba(255,140,40,0.75)') : 'rgba(80,90,100,0.6)';
        c.beginPath(); c.arc(cx + Math.cos(a) * size * 0.85, cy + Math.sin(a) * size * 0.85, size * 0.09 * fl, 0, 7); c.fill();
      }
    }

    drawPan(s, cx, cy, size) {
      const c = this.ctx;
      this.flames(cx, cy, size, s.state === 'cooking');
      c.fillStyle = '#2b2b2b'; c.save(); c.translate(cx, cy); c.rotate(-0.4);
      c.fillRect(size * 0.9, -size * 0.1, size * 0.9, size * 0.2); c.restore();
      const g = c.createRadialGradient(cx - size * 0.3, cy - size * 0.3, 2, cx, cy, size);
      g.addColorStop(0, '#4a4a4a'); g.addColorStop(1, '#151515');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, size, 0, 7); c.fill();
      c.strokeStyle = '#5a5a5a'; c.lineWidth = 3; c.stroke();
      if (s.item) {
        const jump = s.flipAnim ? Math.sin(s.flipAnim * Math.PI) * size * 0.6 : 0;
        const sc = s.flipAnim ? 1 - Math.sin(s.flipAnim * Math.PI) * 0.3 : 1;
        this.food(s.item, cx, cy - jump, size * 0.62 * sc, s.state === 'burnt' ? 1.4 : s.p, s.flipped);
      }
    }

    drawPot(s, cx, cy, size) {
      const c = this.ctx;
      this.flames(cx, cy, size * 0.95, s.state === 'cooking');
      c.fillStyle = '#9aa3aa'; c.beginPath(); c.arc(cx, cy, size * 0.92, 0, 7); c.fill();
      c.fillStyle = '#c9d0d5'; c.fillRect(cx - size * 1.2, cy - size * 0.08, size * 0.3, size * 0.16); c.fillRect(cx + size * 0.9, cy - size * 0.08, size * 0.3, size * 0.16);
      c.fillStyle = '#6b737a'; c.beginPath(); c.arc(cx, cy, size * 0.8, 0, 7); c.fill();
      if (s.item) {
        const it = G.ITEMS[s.item];
        const p = s.state === 'burnt' ? 1.4 : s.p;
        c.fillStyle = it.shape === 'stalks' ? '#d9e7ec' : this.cookCol(it.col, '#2a1408', clamp((p - 0.85) * 2, 0, 1));
        c.beginPath(); c.arc(cx, cy, size * 0.72, 0, 7); c.fill();
        if (it.shape === 'stalks') this.food(s.item, cx, cy, size * 0.55, p, false);
        else if (s.state === 'cooking') for (let i = 0; i < 6; i++) { const a = this.t * 2 + i; const rr = (Math.sin(this.t * 5 + i * 3) * 0.5 + 0.5) * size * 0.4; c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size * 0.05, 0, 7); c.fill(); }
      }
    }

    drawOven(s, cx, cy, size) {
      const c = this.ctx;
      const w = size * 2.1, h = size * 1.7;
      c.fillStyle = '#2b2f33'; this.rr(cx - w / 2, cy - h / 2, w, h, 10); c.fill();
      c.fillStyle = '#9aa3aa'; c.fillRect(cx - w / 2 + 8, cy - h / 2 + 6, w - 16, 6);
      const on = s.state === 'cooking' || s.state === 'burnt';
      const g = c.createLinearGradient(0, cy - h * 0.3, 0, cy + h * 0.35);
      g.addColorStop(0, on ? '#ff8a3a' : '#1a1d20'); g.addColorStop(1, on ? '#7a2a0a' : '#111');
      c.fillStyle = g; this.rr(cx - w * 0.38, cy - h * 0.28, w * 0.76, h * 0.62, 6); c.fill();
      if (s.item) { const it = G.ITEMS[s.item]; for (let i = 0; i < 3; i++) this.food(s.item, cx - w * 0.22 + i * w * 0.22, cy + h * 0.05, size * 0.32, s.state === 'burnt' ? 1.4 : s.p, false); void it; }
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(cx - w * 0.38, cy - h * 0.28, w * 0.76, h * 0.08);
    }

    drawBoard(s, cx, cy, size) {
      const c = this.ctx;
      const w = size * 2.2, h = size * 1.4;
      c.fillStyle = '#b07a45'; this.rr(cx - w / 2, cy - h / 2, w, h, 12); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(cx - w / 2 + 10, cy - h / 2 + (h / 5) * i); c.lineTo(cx + w / 2 - 10, cy - h / 2 + (h / 5) * i); c.stroke(); }
      if (s.item) this.food(s.item, cx, cy, size * 0.6, 0.5 + s.cuts * 0.2, false, s.cuts);
      // Messer
      c.save(); c.translate(cx + w * 0.35, cy - h * 0.25); c.rotate(-0.5);
      c.fillStyle = '#d6dbe0'; c.fillRect(-size * 0.5, -4, size * 0.7, 8); c.fillStyle = '#2a1d16'; c.fillRect(size * 0.2, -5, size * 0.35, 10); c.restore();
    }

    drawTemper(s, cx, cy, size) {
      const c = this.ctx;
      c.fillStyle = '#e9e4dc'; this.rr(cx - size * 1.3, cy - size * 0.75, size * 2.1, size * 1.5, 10); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - size * 1.2, cy - size * 0.5 + i * 18); c.quadraticCurveTo(cx, cy - size * 0.7 + i * 22, cx + size * 0.7, cy - size * 0.3 + i * 14); c.stroke(); }
      if (s.item) this.food(s.item, cx - size * 0.25, cy, size * 0.62, 0.5, false);
      // Temperatur-Anzeige
      const gx = cx + size * 1.1, gy = cy - size * 0.9, gh = size * 1.8, gw = 14;
      c.fillStyle = '#1a1d20'; this.rr(gx, gy, gw, gh, 7); c.fill();
      const [a, b] = s.def.band;
      c.fillStyle = 'rgba(232,196,106,0.45)'; c.fillRect(gx, gy + gh * (1 - b), gw, gh * (b - a));
      if (s.state === 'tempering') {
        const inb = s.gauge >= a && s.gauge <= b;
        c.fillStyle = inb ? C.gold : s.gauge > b ? C.bad : C.heat;
        c.fillRect(gx + 3, gy + gh * (1 - s.gauge), gw - 6, gh * s.gauge);
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx - 4, gy + gh * (1 - s.gauge)); c.lineTo(gx + gw + 4, gy + gh * (1 - s.gauge)); c.stroke();
        // Fortschritt
        c.strokeStyle = C.gold; c.lineWidth = 5; c.beginPath(); c.arc(cx - size * 0.25, cy, size * 0.85, -Math.PI / 2, -Math.PI / 2 + s.prog * Math.PI * 2); c.stroke();
        c.font = font('callout', 18 * this.U); c.fillStyle = '#fff'; c.textAlign = 'center';
        c.fillText(s.holding ? 'HALTEN …' : 'GEDRÜCKT HALTEN', cx, s.r.y + 20 * this.U);
      }
    }

    cookCol(raw, done, t) {
      const h = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
      const a = h(raw), b = h(done);
      return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1))).join(',')})`;
    }

    // Essen zeichnen; p = Garstufe (0..1, >1.1 verbrannt)
    food(id, x, y, s, p, flipped, cuts) {
      const c = this.ctx, it = G.ITEMS[id];
      const burnt = p > 1.15;
      const sear = it.sear || '#3a1a0a';
      const col = burnt ? '#1d1410' : this.cookCol(it.col, sear, clamp((p - 0.2) * 0.9, 0, 0.75));
      c.save(); c.translate(x, y);
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(20,10,5,0.6)';
      switch (it.shape) {
        case 'fish':
          c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, s, s * 0.45, -0.2, 0, 7); c.fill(); c.stroke();
          if (flipped || p > 0.5) { c.strokeStyle = burnt ? '#000' : sear; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * s * 0.3 - s * 0.1, -s * 0.3); c.lineTo(i * s * 0.3 + s * 0.1, s * 0.3); c.stroke(); } }
          break;
        case 'scallop':
          [[-0.55, 0], [0.5, -0.2], [0.1, 0.45]].forEach(([dx, dy]) => { c.fillStyle = col; c.beginPath(); c.arc(dx * s, dy * s, s * 0.38, 0, 7); c.fill(); c.stroke(); c.fillStyle = burnt ? '#000' : 'rgba(201,138,58,' + clamp(p, 0, 0.9) + ')'; c.beginPath(); c.arc(dx * s, dy * s, s * 0.26, 0, 7); c.fill(); });
          break;
        case 'meat':
          c.fillStyle = col; this.rr(-s, -s * 0.5, s * 2, s, s * 0.35); c.fill(); c.stroke();
          c.fillStyle = burnt ? '#000' : 'rgba(255,240,230,0.25)'; c.fillRect(-s * 0.8, -s * 0.1, s * 1.6, s * 0.08);
          break;
        case 'nugget':
          [[-0.5, 0.1], [0.3, -0.3], [0.4, 0.35]].forEach(([dx, dy]) => { c.fillStyle = col; c.beginPath(); c.ellipse(dx * s, dy * s, s * 0.42, s * 0.32, dx, 0, 7); c.fill(); c.stroke(); });
          break;
        case 'stalks':
          for (let i = -2; i <= 2; i++) { c.fillStyle = col; this.rr(-s, i * s * 0.22 - s * 0.08, s * 2, s * 0.16, s * 0.08); c.fill(); c.fillStyle = '#b8c27a'; c.beginPath(); c.arc(s, i * s * 0.22, s * 0.1, 0, 7); c.fill(); }
          break;
        case 'roots':
          c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.5, 0.3, 0, 7); c.fill(); c.stroke();
          c.fillStyle = burnt ? '#000' : 'rgba(0,0,0,' + clamp(p * 0.3, 0, 0.3) + ')'; c.beginPath(); c.ellipse(s * 0.1, s * 0.1, s * 0.4, s * 0.28, 0.3, 0, 7); c.fill();
          break;
        case 'slices': {
          const n = 3 + (cuts || 0) * 2;
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const r = cuts ? s * 0.55 : s * 0.15; c.fillStyle = it.col; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r * 0.7, s * 0.3, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,230,0.6)'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r * 0.7, s * 0.17, 0, 7); c.fill(); }
          break;
        }
        case 'leaves':
          for (let i = 0; i < 7; i++) { const a = i * 0.9; c.fillStyle = i % 2 ? it.col : '#6aa84f'; c.beginPath(); c.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.4, s * 0.28, s * 0.12, a, 0, 7); c.fill(); }
          break;
        case 'mound':
          c.fillStyle = it.col; c.beginPath(); c.ellipse(0, 0, s * 0.7, s * 0.55, 0, 0, 7); c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-s * 0.2, -s * 0.18, s * 0.22, s * 0.12, -0.4, 0, 7); c.fill();
          if (cuts !== undefined && cuts > 0) for (let i = 0; i < cuts * 3; i++) { c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-s * 0.5 + i * s * 0.12, -s * 0.4, 1.5, s * 0.8); }
          break;
        case 'quenelle':
          c.fillStyle = it.col; c.beginPath(); c.ellipse(0, 0, s * 0.75, s * 0.42, -0.35, 0, 7); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(-s * 0.1, -s * 0.1, s * 0.5, s * 0.22, -0.35, Math.PI, Math.PI * 1.8); c.stroke();
          break;
        case 'sauce':
          c.fillStyle = it.col; c.beginPath(); c.ellipse(0, 0, s * 0.6, s * 0.35, 0, 0, 7); c.fill();
          break;
        default:
          c.fillStyle = col; c.beginPath(); c.arc(0, 0, s * 0.5, 0, 7); c.fill();
      }
      c.restore();
    }

    drawPlate(tk, x, y, r, opts = {}) {
      const c = this.ctx;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x + 3, y + 5, r, r * 0.96, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dcd6cb');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.72, 0, 7); c.stroke();
      if (!tk) return;
      // Sauce: der eigene Strich des Spielers
      const stroke = opts.stroke || tk.sauce;
      if (stroke && stroke.length > 1) {
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = tk.dish.sauce; c.lineWidth = r * 0.11;
        c.beginPath(); stroke.forEach(([sx, sy], i) => (i ? c.lineTo(x + sx * r, y + sy * r) : c.moveTo(x + sx * r, y + sy * r))); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = r * 0.03; c.stroke();
        c.restore();
      }
      const done = tk.items.filter((it) => it.done && G.ITEMS[it.id].shape !== 'sauce' && !this.flyers.some((f) => f.tk === tk.id && f.item === it.id));
      const pos = [[-0.22, -0.08], [0.25, 0.05], [0, 0.3]];
      done.forEach((it, i) => this.food(it.id, x + pos[i % 3][0] * r * 1.2, y + pos[i % 3][1] * r * 1.2, r * 0.32, 0.7, true, 3));
      tk.items.filter((it) => it.done && G.ITEMS[it.id].shape === 'sauce' && !stroke).forEach((it) => { c.fillStyle = G.ITEMS[it.id].col; c.beginPath(); c.ellipse(x - r * 0.05, y + r * 0.1, r * 0.4, r * 0.22, 0.2, 0, 7); c.fill(); });
    }

    drawPass() {
      const c = this.ctx, U = this.U, p = this.pass;
      // Edelstahl-Tresen
      const g = c.createLinearGradient(0, p.y, 0, p.y + p.h);
      g.addColorStop(0, '#3a4249'); g.addColorStop(0.15, '#59636b'); g.addColorStop(1, '#2b3238');
      c.fillStyle = g; this.rr(p.x, p.y, p.w, p.h, 14 * U); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(p.x + 10, p.y + 4, p.w - 20, 2);
      // Wärmelampen
      this.slotR.forEach((s) => {
        const lg = c.createRadialGradient(s.x, p.y, 2, s.x, s.y, s.r * 2);
        lg.addColorStop(0, `rgba(255,120,40,${0.45 + Math.sin(this.t * 3 + s.x) * 0.05})`); lg.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = lg; c.fillRect(s.x - s.r * 2, p.y, s.r * 4, p.h);
        c.fillStyle = '#1a1d20'; this.rr(s.x - 18 * U, p.y - 6 * U, 36 * U, 10 * U, 4); c.fill();
        c.fillStyle = '#ff8a3a'; c.fillRect(s.x - 14 * U, p.y + 2 * U, 28 * U, 2 * U);
      });
      c.font = font('mono', 9 * U); c.fillStyle = C.muted; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText('DER PASS', p.x + 12 * U, p.y + 8 * U);
      this.slots.forEach((id, i) => {
        const s = this.slotR[i];
        const tk = this.ticket(id);
        if (!tk) {
          c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2;
          c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.stroke(); c.setLineDash([]);
          return;
        }
        const ready = this.ready(tk);
        if (ready) {
          c.save(); c.globalAlpha = 0.5 + Math.sin(this.t * 10) * 0.3;
          c.strokeStyle = C.gold; c.lineWidth = 6 * U; c.beginPath(); c.arc(s.x, s.y, s.r + 6 * U, 0, 7); c.stroke(); c.restore();
        }
        this.drawPlate(tk, s.x, s.y, s.r);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font('mono', 10 * U);
        c.fillStyle = tk.insp ? C.gold : C.ink;
        c.fillText(`T${tk.table}`, s.x, s.y - s.r - 9 * U);
        if (ready) {
          c.font = font('callout', 15 * U);
          c.lineWidth = 4; c.strokeStyle = '#000'; c.strokeText('ANRICHTEN', s.x, s.y + s.r + 10 * U);
          c.fillStyle = C.gold; c.fillText('ANRICHTEN', s.x, s.y + s.r + 10 * U);
        }
      });
    }

    drawFlyers() {
      const c = this.ctx;
      this.flyers.forEach((f) => {
        const k = ease(f.t);
        const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 80;
        if (f.serve) {
          c.save(); c.globalAlpha = 1 - f.t; this.drawPlate(f.tkObj, x, y, this.slotR[0].r * (1 - f.t * 0.3)); c.restore();
        } else this.food(f.item, x, y, 18 * this.U, 0.7, true, 3);
      });
    }

    drawParticles() {
      const c = this.ctx;
      this.particles.forEach((p) => {
        const a = clamp(p.life / p.max, 0, 1);
        if (p.kind === 'smoke') { c.fillStyle = `rgba(60,60,60,${a * 0.5})`; c.beginPath(); c.arc(p.x, p.y, p.r * (2 - a), 0, 7); c.fill(); }
        else if (p.kind === 'steam') { c.fillStyle = `rgba(240,240,240,${a * 0.22})`; c.beginPath(); c.arc(p.x, p.y, p.r * (2 - a), 0, 7); c.fill(); }
        else if (p.kind === 'fire') { c.fillStyle = `rgba(255,${Math.round(120 + a * 100)},40,${a})`; c.beginPath(); c.arc(p.x, p.y, p.r * a, 0, 7); c.fill(); }
        else if (p.kind === 'gold') { c.fillStyle = `rgba(232,196,106,${a})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
        else if (p.kind === 'spark') { c.fillStyle = `rgba(255,200,120,${a})`; c.fillRect(p.x, p.y, p.r, p.r); }
        else if (p.kind === 'crumb') { c.fillStyle = `rgba(160,200,120,${a})`; c.fillRect(p.x, p.y, p.r, p.r); }
        else if (p.kind === 'confetti') { c.fillStyle = p.col; c.globalAlpha = a; c.fillRect(p.x, p.y, p.r, p.r * 1.6); c.globalAlpha = 1; }
      });
    }

    drawPopups() {
      const c = this.ctx, U = this.U;
      this.popups.forEach((p) => {
        const k = 1 - p.life / p.max;
        const sc = (k < 0.12 ? ease(k / 0.12) : 1) * p.scale;
        c.save(); c.globalAlpha = Math.min(1, p.life * 2.5);
        c.translate(p.x, p.y - k * 40); c.scale(sc, sc);
        c.font = font('callout', 22 * U); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 5; c.strokeStyle = 'rgba(10,8,6,0.85)'; c.strokeText(p.text, 0, 0);
        c.fillStyle = p.col; c.fillText(p.text, 0, 0);
        c.restore();
      });
    }

    drawPlating() {
      const c = this.ctx, U = this.U, pl = this.plating;
      const tk = this.ticket(pl.tk);
      if (!tk) return;
      c.fillStyle = 'rgba(8,10,12,0.62)'; c.fillRect(0, 0, this.w, this.h);
      const g = this.plateGeom();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font('dish', 22 * U); c.fillStyle = C.ink;
      c.fillText(tk.dish.name, g.x, g.y - g.r - 46 * U, this.w - 30);
      c.font = font('mono', 10 * U); c.fillStyle = C.muted;
      c.fillText(`TISCH ${tk.table}${tk.insp ? ' · EINZELGAST' : ''}`, g.x, g.y - g.r - 22 * U);
      this.drawPlate(tk, g.x, g.y, g.r, { stroke: pl.stroke.length ? pl.stroke : null });
      if (pl.phase === 'draw') {
        // Ziel-Linie
        c.save(); c.setLineDash([2, 9]); c.lineCap = 'round'; c.lineWidth = 6 * U; c.strokeStyle = `rgba(232,196,106,${0.6 + Math.sin(this.t * 6) * 0.3})`;
        c.beginPath();
        for (let i = 0; i <= 40; i++) { const [px, py] = pl.path.pts(i / 40); i ? c.lineTo(g.x + px * g.r, g.y + py * g.r) : c.moveTo(g.x + px * g.r, g.y + py * g.r); }
        c.stroke(); c.restore();
        const [sx, sy] = pl.path.pts(0);
        c.fillStyle = C.heat; c.beginPath(); c.arc(g.x + sx * g.r, g.y + sy * g.r, (9 + Math.sin(this.t * 8) * 3) * U, 0, 7); c.fill();
        const [ex, ey] = pl.path.pts(1);
        c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.arc(g.x + ex * g.r, g.y + ey * g.r, 8 * U, 0, 7); c.stroke();
        c.font = font('callout', 26 * U); c.fillStyle = C.ink;
        c.fillText('SAUCE ZIEHEN!', g.x, g.y + g.r + 34 * U);
        // Zeit
        const tl = clamp(1 - pl.t / 5, 0, 1);
        c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(g.x - 80 * U, g.y + g.r + 56 * U, 160 * U, 5 * U);
        c.fillStyle = tl < 0.3 ? C.bad : C.heat; c.fillRect(g.x - 80 * U, g.y + g.r + 56 * U, 160 * U * tl, 5 * U);
      } else {
        // Glocke
        const by = g.y + g.r + 58 * U, br = 38 * U * (1 + Math.sin(this.rt * 9) * 0.04);
        const bg = c.createRadialGradient(g.x - br * 0.3, by - br * 0.4, 4, g.x, by, br);
        bg.addColorStop(0, '#fff1c4'); bg.addColorStop(0.5, C.gold); bg.addColorStop(1, '#8a6a20');
        c.fillStyle = bg; c.beginPath(); c.arc(g.x, by, br, Math.PI, 0); c.lineTo(g.x + br * 1.15, by + 8 * U); c.lineTo(g.x - br * 1.15, by + 8 * U); c.closePath(); c.fill();
        c.fillStyle = '#5a4410'; c.beginPath(); c.arc(g.x, by - br - 4 * U, 7 * U, 0, 7); c.fill();
        c.font = font('callout', 30 * U); c.lineWidth = 6; c.strokeStyle = '#000';
        c.strokeText('SERVICE!', g.x, by + 34 * U); c.fillStyle = '#fff'; c.fillText('SERVICE!', g.x, by + 34 * U);
        c.font = font('mono', 11 * U); c.fillStyle = C.muted;
        c.fillText(`ANRICHTEN ${pl.score} / 100`, g.x, g.y - g.r - 70 * U);
      }
    }

    drawTutorial() {
      const tt = this.tutText();
      if (!tt) return;
      const c = this.ctx, U = this.U;
      if (tt.r) {
        const r = tt.r;
        c.save(); c.strokeStyle = C.heat; c.lineWidth = 4; c.globalAlpha = 0.55 + Math.sin(this.t * 6) * 0.35;
        this.rr(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 16); c.stroke(); c.restore();
        // Hand
        const hx = r.x + r.w * 0.62, hy = r.y + r.h * 0.62 + Math.sin(this.t * 5) * 6;
        c.font = `${Math.round(30 * U)}px system-ui`; c.textAlign = 'center'; c.fillText('👆', hx, hy + 20 * U);
      }
      const lines = tt.text.split('\n');
      const bw = Math.min(this.w - 24, 360 * U), bh = (22 + lines.length * 20) * U;
      const bx = (this.w - bw) / 2;
      const by = this.plating ? this.h - bh - 16 * U : (tt.r && tt.r.y > this.h * 0.5 ? this.rail.y + this.rail.h + 6 : this.h * 0.5 - bh / 2 + (tt.r && tt.r.y < this.h * 0.5 ? this.h * 0.18 : 0));
      c.fillStyle = 'rgba(243,234,216,0.96)'; this.rr(bx, by, bw, bh, 12); c.fill();
      c.strokeStyle = '#2b1e1a'; c.lineWidth = 3; c.stroke();
      c.fillStyle = C.paperInk; c.font = font('body', 14.5 * U); c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((l, i) => c.fillText(l, this.w / 2, by + 20 * U + i * 20 * U));
    }
  }

  G.Service = Service;
})();

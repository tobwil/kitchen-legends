/* Kitchen Legends – Die Welt
 * Isometrisches Restaurant: Grundriss, Möbel, Bau-Modus, Figuren und Rendering auf Canvas.
 * Alles wird prozedural gezeichnet, es gibt keine Bilddateien.
 */
(function () {
  const { clamp, rnd, pick } = KL.util;

  /* ---------- Grundriss ---------- */
  KL.GRID = {
    hinterhof: { w: 10, h: 9, cap: 30, startSeats: 20, wall: '#5b3a30', wall2: '#4a2f27', floorA: '#6b4a33', floorB: '#5f412d' },
    altbau: { w: 12, h: 10, cap: 42, startSeats: 24, wall: '#c9bda6', floorA: '#8a6644', floorB: '#7c5a3b' },
    hotel: { w: 14, h: 11, cap: 54, startSeats: 32, wall: '#2f3a3a', wall2: '#263030', floorA: '#3d2f29', floorB: '#352823' },
  };
  KL.KITCHEN_ROWS = 3; // y = 0..2 ist Küche

  // Möbelkatalog. zone: dining | kitchen. eq: verknüpftes Küchengerät aus KL.EQUIPMENT
  KL.FURN = {
    t2: { name: 'Zweiertisch', zone: 'dining', w: 1, d: 1, cost: 450, seats: 2 },
    t4: { name: 'Vierertisch', zone: 'dining', w: 2, d: 1, cost: 800, seats: 4 },
    t6: { name: 'Große Tafel', zone: 'dining', w: 3, d: 1, cost: 1300, seats: 6 },
    pflanze: { name: 'Olivenbaum', zone: 'dining', w: 1, d: 1, cost: 250, amb: 2 },
    lampe: { name: 'Stehleuchte', zone: 'dining', w: 1, d: 1, cost: 400, amb: 2 },
    skulptur: { name: 'Messing-Skulptur', zone: 'dining', w: 1, d: 1, cost: 1200, amb: 4 },
    weinregal: { name: 'Weinregal', zone: 'dining', w: 1, d: 1, cost: 900, amb: 3, wine: 3 },
    bar: { name: 'Bar-Tresen', zone: 'dining', w: 2, d: 1, cost: 2500, amb: 3, extras: 4 },
    pass: { name: 'Pass mit Wärmelampen', zone: 'kitchen', w: 2, d: 1, cost: 0, fixed: true },
    herd: { name: 'Herdblock', zone: 'kitchen', w: 2, d: 1, cost: 3000, stations: 2, minOne: true },
    spuele: { name: 'Spülstation', zone: 'kitchen', w: 1, d: 1, cost: 1200, minOne: true },
    posten: { name: 'Arbeitsposten', zone: 'kitchen', w: 1, d: 1, cost: 900, stations: 1 },
    sousvide: { name: 'Sous-vide-Station', zone: 'kitchen', w: 1, d: 1, eq: 'sousvide', stations: 1 },
    grill: { name: 'Holzkohle-Ofen', zone: 'kitchen', w: 1, d: 1, eq: 'grill', stations: 1 },
    raeucher: { name: 'Räucherschrank', zone: 'kitchen', w: 1, d: 1, eq: 'raeucher' },
    ferment: { name: 'Fermentationskammer', zone: 'kitchen', w: 1, d: 1, eq: 'ferment' },
    dryager: { name: 'Dry-Ager-Schrank', zone: 'kitchen', w: 1, d: 1, eq: 'dryager' },
    eismaschine: { name: 'Feinst-Eismaschine', zone: 'kitchen', w: 1, d: 1, eq: 'eismaschine', stations: 1 },
    kombi: { name: 'Kombidämpfer', zone: 'kitchen', w: 1, d: 1, eq: 'kombi', stations: 1 },
    kuehlhaus: { name: 'Begehbares Kühlhaus', zone: 'kitchen', w: 2, d: 1, eq: 'kuehlhaus' },
  };
  Object.values(KL.FURN).forEach((f) => {
    if (f.eq) { const e = KL.byId(KL.EQUIPMENT, f.eq); f.cost = e.cost; f.desc = e.desc; }
  });

  const occ = (s) => {
    const g = KL.GRID[s.location];
    const m = Array.from({ length: g.h }, () => Array(g.w).fill(null));
    s.layout.forEach((it) => {
      const f = KL.FURN[it.type];
      for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) if (m[it.y + j]) m[it.y + j][it.x + i] = it;
    });
    return m;
  };
  KL.occupancy = occ;

  KL.doorTile = (s) => { const g = KL.GRID[s.location]; return { x: g.w - 1, y: g.h - 1 }; };
  KL.passItem = (s) => s.layout.find((i) => i.type === 'pass');
  KL.passTile = (s) => { const p = KL.passItem(s); return { x: p.x, y: p.y + 1 }; };

  // Breitensuche über freie Felder einer Zone
  KL.bfs = function (s, from, zone, m) {
    m = m || occ(s);
    const g = KL.GRID[s.location];
    const inZone = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && (zone === 'kitchen' ? y < KL.KITCHEN_ROWS : y >= KL.KITCHEN_ROWS);
    const key = (x, y) => y * g.w + x;
    const prev = new Map([[key(from.x, from.y), null]]);
    const q = [from];
    while (q.length) {
      const c = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!inZone(nx, ny) || m[ny][nx] || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), c);
        q.push({ x: nx, y: ny });
      }
    }
    return {
      reach: (x, y) => prev.has(key(x, y)),
      path: (x, y) => {
        if (!prev.has(key(x, y))) return null;
        const out = [];
        let c = { x, y };
        while (c) { out.unshift(c); c = prev.get(key(c.x, c.y)); }
        return out;
      },
    };
  };

  // Freies, erreichbares Nachbarfeld eines Möbels
  KL.accessTile = function (s, it, reach, m) {
    const f = KL.FURN[it.type];
    const cands = [];
    for (let i = 0; i < f.w; i++) { cands.push({ x: it.x + i, y: it.y + f.d }); cands.push({ x: it.x + i, y: it.y - 1 }); }
    for (let j = 0; j < f.d; j++) { cands.push({ x: it.x - 1, y: it.y + j }); cands.push({ x: it.x + f.w, y: it.y + j }); }
    return cands.find((c) => m[c.y] && m[c.y][c.x] === null && reach(c.x, c.y)) || null;
  };

  KL.validateLayout = function (s) {
    const m = occ(s);
    const door = KL.doorTile(s);
    if (m[door.y][door.x]) return 'Der Eingang muss frei bleiben.';
    const dining = KL.bfs(s, door, 'dining', m);
    const pt = KL.passTile(s);
    if (m[pt.y] && m[pt.y][pt.x]) return 'Vor dem Pass muss ein Gang frei bleiben.';
    if (!dining.reach(pt.x, pt.y)) return 'Der Service kommt nicht mehr vom Pass zum Eingang.';
    for (const it of s.layout) {
      const f = KL.FURN[it.type];
      if (f.seats && !KL.accessTile(s, it, dining.reach, m)) return `Der ${f.name} ist eingemauert. Lass einen Gang frei.`;
    }
    return null;
  };

  KL.canPlace = function (s, type, x, y, ignore) {
    const f = KL.FURN[type];
    const g = KL.GRID[s.location];
    const m = occ(s);
    for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) {
      const tx = x + i, ty = y + j;
      if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return 'Außerhalb des Raums.';
      const inKitchen = ty < KL.KITCHEN_ROWS;
      if ((f.zone === 'kitchen') !== inKitchen) return f.zone === 'kitchen' ? 'Das gehört in die Küche.' : 'Das gehört in den Gastraum.';
      const o = m[ty][tx];
      if (o && o !== ignore) return 'Da steht schon etwas.';
    }
    // Probehalber platzieren und Wege prüfen
    const test = { ...s, layout: s.layout.filter((i) => i !== ignore).concat([{ type, x, y }]) };
    return KL.validateLayout(test);
  };

  KL.initLayout = function (s) {
    const g = KL.GRID[s.location];
    const mid = Math.floor(g.w / 2) - 1;
    s.layout = [
      { id: 'pass', type: 'pass', x: mid, y: 2 },
      { id: KL.util.uid(), type: 'herd', x: 1, y: 0 },
      { id: KL.util.uid(), type: 'spuele', x: g.w - 1, y: 0 },
      { id: KL.util.uid(), type: 'posten', x: 4, y: 0 },
    ];
    s.equipment.forEach((eq) => {
      const type = Object.keys(KL.FURN).find((k) => KL.FURN[k].eq === eq);
      if (type) KL.autoPlace(s, type);
    });
    let seats = 0;
    for (let y = KL.KITCHEN_ROWS + 1; y <= g.h - 2 && seats < g.startSeats; y += 2) {
      for (let x = 1; x + 1 <= g.w - 2 && seats < g.startSeats; x += 3) {
        s.layout.push({ id: KL.util.uid(), type: 't4', x, y });
        seats += 4;
      }
    }
    // Ein bisschen Grün
    const m = occ(s);
    if (!m[g.h - 1][0]) s.layout.push({ id: KL.util.uid(), type: 'pflanze', x: 0, y: g.h - 1 });
  };

  KL.autoPlace = function (s, type) {
    const g = KL.GRID[s.location];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!KL.canPlace(s, type, x, y)) { s.layout.push({ id: KL.util.uid(), type, x, y }); return true; }
    }
    return false;
  };

  KL.layoutStats = function (s) {
    const g = KL.GRID[s.location];
    let seats = 0, amb = 0, wine = 0, stations = 0, extras = 0, tables = 0;
    s.layout.forEach((it) => {
      const f = KL.FURN[it.type];
      seats += f.seats || 0; amb += f.amb || 0; wine += f.wine || 0; stations += f.stations || 0; extras += f.extras || 0;
      if (f.seats) tables++;
    });
    const diningTiles = g.w * (g.h - KL.KITCHEN_ROWS);
    const density = seats / diningTiles;
    const crowd = density > 0.62 ? Math.round((density - 0.62) * 60) : 0;
    return { seats: Math.min(seats, g.cap), rawSeats: seats, cap: g.cap, decor: Math.min(26, amb), wine: Math.min(12, wine), stations, extras, tables, crowd };
  };

  /* ---------- Figuren-Aussehen ---------- */
  const SKIN = ['#f1c9a5', '#d9a47c', '#b47a55', '#8a5638', '#5e3a26', '#efd2b8'];
  const HAIR = ['#2b1d16', '#5a3a22', '#a8743b', '#d8b46a', '#1b1b1b', '#8a8a8a', '#b2442e'];
  const CLOTH = ['#3f5d7a', '#7a3f4f', '#4f6b4a', '#6a5a8c', '#a0703a', '#2f4f4f', '#8c4a3a', '#3a3a52', '#9a8a6a'];
  const hash = (str) => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  KL.lookFor = (seed, role) => {
    const h = hash(seed);
    return { skin: SKIN[h % SKIN.length], hair: HAIR[(h >> 3) % HAIR.length], cloth: CLOTH[(h >> 6) % CLOTH.length], role, long: (h >> 9) % 3 === 0 };
  };

  /* ---------- Licht & Farbe: Gouache-Look mit Tageszeit ---------- */
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const toHex = (r) => '#' + r.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const isHex = (c) => typeof c === 'string' && c.length === 7 && c[0] === '#';
  // Tageszeit 0 = Nachmittag … 1 = Nacht. Licht kommt durch die Fenster der linken Wand.
  const TOD = [
    { t: 0, sun: '#fff0c8', shadow: '#5b6aa0', shadowA: 0.16, lit: 0.12, shaft: 0.2, len: 3.2, warm: '#ffd696', warmA: 0.12, coolA: 0, skyTop: '#8fc3e6', skyBot: '#f7e6b8', lamps: 0 },
    { t: 0.35, sun: '#ffc777', shadow: '#5c4c90', shadowA: 0.24, lit: 0.2, shaft: 0.3, len: 5, warm: '#ffb45c', warmA: 0.18, coolA: 0, skyTop: '#e7a56c', skyBot: '#ffe09c', lamps: 0.15 },
    { t: 0.6, sun: '#ff8a4c', shadow: '#4b3f80', shadowA: 0.3, lit: 0.16, shaft: 0.22, len: 7, warm: '#ff7a50', warmA: 0.16, coolA: 0.12, skyTop: '#5c4a8c', skyBot: '#ff995a', lamps: 0.6 },
    { t: 0.8, sun: '#c39cff', shadow: '#2e3566', shadowA: 0.36, lit: 0.05, shaft: 0.05, len: 7, warm: '#ff9a60', warmA: 0.06, coolA: 0.3, skyTop: '#1e2752', skyBot: '#7c5a8c', lamps: 1 },
    { t: 1, sun: '#8a96ff', shadow: '#1f2448', shadowA: 0.4, lit: 0, shaft: 0, len: 7, warm: '#ffb070', warmA: 0.04, coolA: 0.4, skyTop: '#0b1130', skyBot: '#25305a', lamps: 1 },
  ];
  KL.todPreset = function (tod) {
    tod = clamp(tod, 0, 1);
    let i = 0;
    while (i < TOD.length - 2 && tod > TOD[i + 1].t) i++;
    const a = TOD[i], b = TOD[i + 1];
    const k = (tod - a.t) / (b.t - a.t);
    const out = {};
    Object.keys(a).forEach((key) => { out[key] = isHex(a[key]) ? mix(a[key], b[key], k) : a[key] + (b[key] - a[key]) * k; });
    return out;
  };
  const INK = 'rgba(43,30,26,0.9)';

  /* ---------- Renderer ---------- */
  class World {
    constructor(canvas, state, opts = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.s = state;
      this.mode = opts.mode || 'idle'; // idle | build | evening
      this.maxH = opts.maxH || Infinity;
      this.tod = opts.tod ?? (opts.night ? 0.9 : 0.32);
      this.shadeCache = new Map();
      const gc = document.createElement('canvas');
      gc.width = gc.height = 160;
      const gx = gc.getContext('2d');
      const img = gx.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) { const v = 110 + Math.random() * 40; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      gx.putImageData(img, 0, 0);
      this.grain = gc;
      this.night = opts.night ?? false;
      this.agents = [];
      this.particles = [];
      this.bubbles = [];
      this.hover = null;
      this.ghost = null;
      this.selected = null;
      this.t = 0;
      this.speed = 1;
      this.onTile = null;
      this.platesOnTables = new Map();
      this.resize();
      this.spawnStaff();
      this._loop = this.loop.bind(this);
      this.running = true;
      requestAnimationFrame(this._loop);
      this._move = (e) => this.pointer(e, false);
      this._click = (e) => this.pointer(e, true);
      canvas.addEventListener('pointermove', this._move);
      canvas.addEventListener('click', this._click);
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas.parentElement);
    }

    destroy() {
      this.running = false;
      this.c.removeEventListener('pointermove', this._move);
      this.c.removeEventListener('click', this._click);
      this._ro.disconnect();
    }

    get g() { return KL.GRID[this.s.location]; }

    resize() {
      const g = this.g;
      const parent = this.c.parentElement;
      const cw = Math.max(280, parent.clientWidth);
      const byH = (2 * this.maxH) / ((g.w + g.h) / 2 + 4.2);
      const TW = clamp(Math.min((cw * 2) / (g.w + g.h + 1.2), byH), 24, 84);
      this.TW = TW; this.TH = TW / 2;
      this.wallH = this.TH * 2.6;
      const h = (g.w + g.h) * this.TH / 2 + this.wallH + this.TH * 1.6;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.cssW = cw; this.cssH = Math.round(h);
      this.c.width = Math.round(cw * dpr);
      this.c.height = Math.round(h * dpr);
      this.c.style.height = this.cssH + 'px';
      const isoW = (g.w + g.h) * TW / 2;
      this.ox = (cw - isoW) / 2 + g.h * TW / 2;
      this.oy = this.wallH + this.TH * 0.6;
    }

    P(x, y, z = 0) { return [this.ox + (x - y) * this.TW / 2, this.oy + (x + y) * this.TH / 2 - z * this.TH]; }

    tileAt(mx, my) {
      const X = mx - this.ox, Y = my - this.oy;
      const a = Y / (this.TH / 2), b = X / (this.TW / 2);
      return { x: Math.floor((a + b) / 2), y: Math.floor((a - b) / 2) };
    }

    pointer(e, click) {
      const r = this.c.getBoundingClientRect();
      const t = this.tileAt(e.clientX - r.left, e.clientY - r.top);
      this.hover = t;
      if (click && this.onTile) this.onTile(t);
    }

    /* --- Personal als Figuren --- */
    spawnStaff() {
      this.agents = this.agents.filter((a) => a.kind === 'guest');
      const s = this.s;
      const pt = KL.passTile(s);
      const pass = KL.passItem(s);
      // Chef*in steht hinter dem Pass, also in der Küche
      this.agents.push({ kind: 'chef', id: 'chef', x: pass.x + 1, y: pass.y - 0.35, look: { ...KL.lookFor(s.chef.name, 'chef') }, path: [], idle: 0 });
      let ki = 0, si = 0;
      s.team.forEach((m) => {
        const area = KL.ROLES[m.role].area;
        if (area === 'kueche') {
          const spot = this.kitchenSpot(ki++);
          this.agents.push({ kind: 'cook', id: m.id, name: m.name, role: m.role, x: spot.x + 0.5, y: spot.y + 0.5, look: KL.lookFor(m.name, m.role), path: [], idle: rnd(0, 3) });
        } else {
          const tx = clamp(pt.x + (si % 2 ? 2 : -1) - Math.floor(si / 2), 0, this.g.w - 1);
          si++;
          this.agents.push({ kind: 'waiter', id: m.id, name: m.name, role: m.role, x: tx + 0.5, y: pt.y + 0.5, home: { x: tx, y: pt.y }, look: KL.lookFor(m.name, m.role), path: [], idle: rnd(0, 3), busy: false });
        }
      });
    }

    kitchenSpot(i) {
      const s = this.s;
      const m = occ(s);
      const free = [];
      for (let y = 0; y < KL.KITCHEN_ROWS; y++) for (let x = 0; x < this.g.w; x++) if (!m[y][x]) free.push({ x, y });
      return free.length ? free[i % free.length] : { x: 0, y: 1 };
    }

    walkTo(a, tx, ty, zone, done) {
      const m = occ(this.s);
      const from = { x: clamp(Math.floor(a.x), 0, this.g.w - 1), y: clamp(Math.floor(a.y), 0, this.g.h - 1) };
      const r = KL.bfs(this.s, from, zone, m);
      const p = r.path(tx, ty);
      a.path = p ? p.slice(1).map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 })) : [{ x: tx + 0.5, y: ty + 0.5 }];
      a.done = done || null;
    }

    stepAgent(a, dt) {
      if (a.path && a.path.length) {
        const n = a.path[0];
        const dx = n.x - a.x, dy = n.y - a.y;
        const d = Math.hypot(dx, dy);
        const v = (a.speed || 2.4) * dt;
        a.walking = true;
        if (d <= v) { a.x = n.x; a.y = n.y; a.path.shift(); if (!a.path.length && a.done) { const f = a.done; a.done = null; f(a); } }
        else { a.x += (dx / d) * v; a.y += (dy / d) * v; a.face = dx - dy >= 0 ? 1 : -1; }
      } else a.walking = false;
    }

    idleAgents(dt) {
      const s = this.s;
      this.agents.forEach((a) => {
        if (a.kind === 'cook' && !a.path.length) {
          a.idle -= dt;
          if (a.idle <= 0) {
            a.idle = rnd(1.5, 4);
            const st = s.layout.filter((it) => KL.FURN[it.type].zone === 'kitchen' && it.type !== 'pass');
            const target = pick(st.length ? st : [KL.passItem(s)]);
            const m = occ(s);
            const r = KL.bfs(s, { x: Math.floor(a.x), y: Math.floor(a.y) }, 'kitchen', m);
            const acc = KL.accessTile(s, target, r.reach, m);
            if (acc) { this.walkTo(a, acc.x, acc.y, 'kitchen', () => (a.working = rnd(1.5, 3.5))); a.workAt = target; }
          }
        }
        if (a.kind === 'waiter' && !a.busy && !a.path.length && this.mode !== 'evening') {
          a.idle -= dt;
          if (a.idle <= 0) {
            a.idle = rnd(2, 5);
            const tables = s.layout.filter((it) => KL.FURN[it.type].seats);
            const m = occ(s);
            const r = KL.bfs(s, { x: Math.floor(a.x), y: Math.floor(a.y) }, 'dining', m);
            const t = pick(tables.length ? tables : [KL.passItem(s)]);
            const acc = t && KL.accessTile(s, t, r.reach, m);
            if (acc) this.walkTo(a, acc.x, acc.y, 'dining');
          }
        }
        if (a.working) a.working = Math.max(0, a.working - dt);
      });
    }

    bubble(x, y, text, color, life = 1.6) { this.bubbles.push({ x, y, text, color, life, max: life }); }

    loop(ts) {
      if (!this.running) return;
      const now = ts / 1000;
      const dt = Math.min(0.05, this.last ? now - this.last : 0) * this.speed;
      this.last = now;
      this.t += dt;
      if (this.update) this.update(dt);
      this.idleAgents(dt);
      this.agents.forEach((a) => this.stepAgent(a, dt));
      this.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.life -= dt; });
      this.particles = this.particles.filter((p) => p.life > 0);
      this.bubbles.forEach((b) => (b.life -= dt));
      this.bubbles = this.bubbles.filter((b) => b.life > 0);
      this.draw();
      requestAnimationFrame(this._loop);
    }

    /* --- Zeichnen --- */
    poly(pts, fill, stroke) {
      const c = this.ctx;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke === undefined) { c.strokeStyle = INK; c.lineWidth = Math.max(0.8, this.TW / 64); c.lineJoin = 'round'; c.stroke(); }
      else if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
    }

    // Quader: Grundfläche x..x+w, y..y+d, Höhe z..z+h (in Kachelhöhen)
    shade(col, kind) {
      if (!isHex(col)) return col;
      const L = this.light;
      const key = col + kind;
      let v = this.shadeCache.get(key);
      if (!v) {
        v = kind === 'top' ? mix(col, L.sun, L.lit) : kind === 'right' ? mix(col, L.shadow, L.shadowA) : mix(col, L.shadow, L.shadowA * 0.45);
        this.shadeCache.set(key, v);
      }
      return v;
    }

    box(x, y, w, d, z, h, top, left, right, stroke) {
      const P = (a, b, c) => this.P(a, b, c);
      top = this.shade(top, 'top'); left = this.shade(left, 'left'); right = this.shade(right, 'right');
      this.poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left, stroke);
      this.poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right, stroke);
      this.poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, stroke);
    }

    glow(x, y, z, r, color, alpha) {
      const c = this.ctx;
      const [sx, sy] = this.P(x, y, z);
      const R = r * this.TW;
      const gr = c.createRadialGradient(sx, sy, 0, sx, sy, R);
      gr.addColorStop(0, color.replace('A', alpha));
      gr.addColorStop(1, color.replace('A', 0));
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = gr;
      c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    draw() {
      const c = this.ctx, s = this.s, g = this.g;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.cssW, this.cssH);
      const L = KL.todPreset(this.tod);
      const todKey = Math.round(this.tod * 40);
      if (todKey !== this.todKey) { this.todKey = todKey; this.shadeCache.clear(); }
      this.light = L;
      const night = L.lamps > 0.5;
      const style = { linen: s.interior.includes('tische'), light: s.interior.includes('licht'), art: s.interior.includes('kunst'), open: s.interior.includes('kueche'), acoustic: s.interior.includes('akustik') };

      // Boden
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const kitchen = y < KL.KITCHEN_ROWS;
        let col;
        if (kitchen) col = (x + y) % 2 ? '#3a4249' : '#434c54';
        else col = (x + y) % 2 ? g.floorA : g.floorB;
        this.poly([this.P(x, y), this.P(x + 1, y), this.P(x + 1, y + 1), this.P(x, y + 1)], this.shade(col, 'top'), 'rgba(43,30,26,0.22)');
      }
      // Lichtbahnen der Fenster auf dem Boden
      this.windows = [];
      for (let y = KL.KITCHEN_ROWS; y < g.h - 1; y++) if (y % 2 === 1) this.windows.push(y);
      if (L.shaft > 0.01) {
        const k = 0.28;
        c.save();
        c.globalCompositeOperation = 'lighter';
        this.windows.forEach((y) => {
          const len = Math.min(L.len, g.w - 0.2);
          const pts = [this.P(0, y + 0.2), this.P(0, y + 0.8), this.P(len, Math.min(g.h, y + 0.8 + len * k)), this.P(len, Math.min(g.h, y + 0.2 + len * k))];
          const [ax, ay] = this.P(0, y + 0.5), [bx, by] = this.P(len, y + 0.5 + len * k);
          const gr = c.createLinearGradient(ax, ay, bx, by);
          const [r, gg, b] = hex(L.sun);
          gr.addColorStop(0, `rgba(${r},${gg},${b},${L.shaft})`);
          gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
          this.poly(pts, gr, null);
        });
        c.restore();
      }
      // Küchentrennung (halbhohe Wand), offen bei „Offene Küche“
      const pass = KL.passItem(s);
      if (!style.open) {
        for (let x = 0; x < g.w; x++) {
          if (x >= pass.x && x < pass.x + 2) continue;
          this.box(x, KL.KITCHEN_ROWS - 0.08, 1, 0.08, 0, 0.9, '#59636b', '#3d454c', '#4a535a');
        }
      } else {
        this.poly([this.P(0, KL.KITCHEN_ROWS), this.P(g.w, KL.KITCHEN_ROWS), this.P(g.w, KL.KITCHEN_ROWS + 0.06), this.P(0, KL.KITCHEN_ROWS + 0.06)], '#c9a45c');
      }
      // Eingang
      const door = KL.doorTile(s);
      this.poly([this.P(door.x + 0.15, door.y + 0.2), this.P(door.x + 0.85, door.y + 0.2), this.P(door.x + 0.85, door.y + 0.9), this.P(door.x + 0.15, door.y + 0.9)], '#7a2e22');

      // Rückwände
      const WH = this.wallH / this.TH;
      for (let y = 0; y < g.h; y++) {
        const kitchen = y < KL.KITCHEN_ROWS;
        this.poly([this.P(0, y), this.P(0, y + 1), this.P(0, y + 1, WH), this.P(0, y, WH)], this.shade(kitchen ? '#59636b' : g.wall, 'left'), 'rgba(43,30,26,0.35)');
        if (!kitchen && y % 2 === 1 && y < g.h - 1) {
          // Fenster
          const win = [this.P(0, y + 0.2, WH * 0.35), this.P(0, y + 0.8, WH * 0.35), this.P(0, y + 0.8, WH * 0.85), this.P(0, y + 0.2, WH * 0.85)];
          const [wx, wy1] = this.P(0, y + 0.5, WH * 0.85), [, wy2] = this.P(0, y + 0.5, WH * 0.35);
          const sky = c.createLinearGradient(wx, wy1, wx, wy2);
          sky.addColorStop(0, L.skyTop); sky.addColorStop(1, L.skyBot);
          this.poly(win, sky);
          // Fensterkreuz
          this.poly([this.P(0, y + 0.49, WH * 0.35), this.P(0, y + 0.51, WH * 0.35), this.P(0, y + 0.51, WH * 0.85), this.P(0, y + 0.49, WH * 0.85)], INK, null);
          this.poly([this.P(0, y + 0.2, WH * 0.6), this.P(0, y + 0.8, WH * 0.6), this.P(0, y + 0.8, WH * 0.62), this.P(0, y + 0.2, WH * 0.62)], INK, null);
          if (L.shaft > 0.05) this.glow(0.1, y + 0.5, WH * 0.6, 0.7, 'rgba(255,220,160,A)', L.shaft * 0.6);
        }
        if (!kitchen && style.art && y % 2 === 0 && y > KL.KITCHEN_ROWS) {
          this.poly([this.P(0, y + 0.25, WH * 0.4), this.P(0, y + 0.75, WH * 0.4), this.P(0, y + 0.75, WH * 0.8), this.P(0, y + 0.25, WH * 0.8)], ['#b2442e', '#2f5d7a', '#d4b06a'][y % 3], '#d4b06a');
        }
      }
      for (let x = 0; x < g.w; x++) {
        this.poly([this.P(x, 0), this.P(x + 1, 0), this.P(x + 1, 0, WH), this.P(x, 0, WH)], this.shade('#4e575f', 'top'), 'rgba(43,30,26,0.35)');
        // Fliesenspiegel in der Küche
        this.poly([this.P(x, 0, 0.6), this.P(x + 1, 0, 0.6), this.P(x + 1, 0, 1.6), this.P(x, 0, 1.6)], (x % 2 ? '#d9d6cf' : '#cfccc4'), 'rgba(0,0,0,0.1)');
      }
      // Schild an der Wand
      if (g.w > 6) {
        const [sx, sy] = this.P(g.w / 2 + 2, 0, WH * 0.8);
        c.save();
        c.font = `italic 700 ${Math.round(this.TW * 0.32)}px 'Bodoni Moda', Georgia, serif`;
        c.fillStyle = night ? '#ffb070' : '#2a2520';
        c.textAlign = 'center';
        c.setTransform(this.dpr, this.dpr * 0.5, 0, this.dpr, sx * this.dpr, sy * this.dpr);
        c.fillText(s.name, 0, 0);
        c.restore();
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }

      // Bau-Raster
      if (this.mode === 'build') {
        for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) this.poly([this.P(x, y), this.P(x + 1, y), this.P(x + 1, y + 1), this.P(x, y + 1)], null, 'rgba(255,255,255,0.10)');
      }

      // Tiefensortiert: Möbel und Figuren
      const items = [];
      s.layout.forEach((it) => {
        const f = KL.FURN[it.type];
        items.push({ depth: it.x + f.w - 0.5 + it.y + f.d - 0.5, draw: () => this.drawItem(it, style) });
      });
      this.agents.forEach((a) => { if (!a.seated && !a.hidden) items.push({ depth: a.x + a.y + 0.05, draw: () => this.drawPerson(a) }); });
      this.particles.forEach((p) => items.push({ depth: p.x + p.y + 0.2, draw: () => this.drawParticle(p) }));
      items.sort((a, b) => a.depth - b.depth).forEach((i) => i.draw());

      // Lichtschleier in der Luft (God Rays)
      if (L.shaft > 0.05) {
        const k = 0.28;
        c.save();
        c.globalCompositeOperation = 'lighter';
        const [r, gg, b] = hex(L.sun);
        this.windows.forEach((y) => {
          const len = Math.min(L.len, g.w - 0.2);
          const pts = [this.P(0, y + 0.2, WH * 0.85), this.P(0, y + 0.8, WH * 0.85), this.P(len, Math.min(g.h, y + 0.8 + len * k), 0), this.P(len, Math.min(g.h, y + 0.2 + len * k), 0)];
          this.poly(pts, `rgba(${r},${gg},${b},${L.shaft * 0.22})`, null);
          if (Math.random() < 0.25 * this.speed) this.emit(rnd(0.3, len), y + 0.5 + rnd(-0.3, 0.3), rnd(0.3, 2.2), 'mote');
        });
        c.restore();
      }
      // Abendgrade: kühl abdunkeln, dann die warmen Lichter darüber
      if (L.coolA > 0.01) {
        c.save();
        c.globalCompositeOperation = 'multiply';
        const [r, gg, b] = hex(L.shadow);
        c.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, gg + 60)},${Math.min(255, b + 90)},${L.coolA * 1.6})`;
        c.fillRect(0, 0, this.cssW, this.cssH);
        c.restore();
      }
      const lamp = Math.max(L.lamps, style.light ? 0.5 : 0);
      if (lamp > 0.05) {
        s.layout.forEach((it) => {
          if (it.type === 'lampe') this.glow(it.x + 0.5, it.y + 0.5, 1.6, 1.5, 'rgba(255,200,120,A)', 0.4 * lamp);
          if (KL.FURN[it.type].seats) this.glow(it.x + KL.FURN[it.type].w / 2, it.y + 0.5, 0.9, 0.95, 'rgba(255,170,80,A)', (style.light ? 0.28 : 0.16) * lamp);
        });
        this.windows.forEach((y) => this.glow(0.15, y + 0.5, WH * 0.4, 0.5, 'rgba(255,190,110,A)', 0.12 * lamp));
      }
      this.glow(pass.x + 1, pass.y + 0.5, 1.2, 1.3, 'rgba(255,110,30,A)', 0.2 + 0.25 * lamp);
      // Warmer Farbton + Papierkorn + Vignette
      c.save();
      c.globalCompositeOperation = 'soft-light';
      const [wr, wg, wb] = hex(L.warm);
      c.fillStyle = `rgba(${wr},${wg},${wb},${L.warmA * 2.2})`;
      c.fillRect(0, 0, this.cssW, this.cssH);
      c.globalCompositeOperation = 'overlay';
      c.globalAlpha = 0.16;
      c.fillStyle = c.createPattern(this.grain, 'repeat');
      c.fillRect(0, 0, this.cssW, this.cssH);
      c.restore();
      c.save();
      const vg = c.createRadialGradient(this.cssW / 2, this.cssH * 0.48, Math.min(this.cssW, this.cssH) * 0.35, this.cssW / 2, this.cssH * 0.5, Math.max(this.cssW, this.cssH) * 0.75);
      vg.addColorStop(0, 'rgba(20,14,12,0)');
      vg.addColorStop(1, 'rgba(20,14,12,0.45)');
      c.fillStyle = vg;
      c.fillRect(0, 0, this.cssW, this.cssH);
      c.restore();

      // Ghost im Bau-Modus
      if (this.mode === 'build' && this.ghost && this.hover) {
        const f = KL.FURN[this.ghost.type];
        const err = KL.canPlace(s, this.ghost.type, this.hover.x, this.hover.y, this.ghost.ignore);
        const col = err ? 'rgba(239,106,90,0.45)' : 'rgba(124,196,149,0.45)';
        this.poly([this.P(this.hover.x, this.hover.y), this.P(this.hover.x + f.w, this.hover.y), this.P(this.hover.x + f.w, this.hover.y + f.d), this.P(this.hover.x, this.hover.y + f.d)], col, err ? '#ef6a5a' : '#7cc495');
        this.ghostErr = err;
      }
      if (this.mode === 'build' && this.selected) {
        const it = this.selected, f = KL.FURN[it.type];
        this.poly([this.P(it.x, it.y), this.P(it.x + f.w, it.y), this.P(it.x + f.w, it.y + f.d), this.P(it.x, it.y + f.d)], 'rgba(212,176,106,0.25)', '#d4b06a');
      }

      // Sprechblasen
      this.bubbles.forEach((b) => {
        const [sx, sy] = this.P(b.x, b.y, 2.4 + (1 - b.life / b.max) * 0.6);
        c.save();
        c.globalAlpha = Math.min(1, b.life * 2);
        c.font = `700 ${Math.round(this.TW * 0.26)}px Figtree, system-ui, sans-serif`;
        const w = c.measureText(b.text).width + this.TW * 0.2;
        const h = this.TW * 0.36;
        c.fillStyle = 'rgba(14,16,19,0.85)';
        c.beginPath();
        c.roundRect ? c.roundRect(sx - w / 2, sy - h, w, h, 6) : c.rect(sx - w / 2, sy - h, w, h);
        c.fill();
        c.fillStyle = b.color;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(b.text, sx, sy - h / 2);
        c.restore();
      });
      if (this.overlay) this.overlay(c);
    }

    drawParticle(p) {
      const c = this.ctx;
      const [sx, sy] = this.P(p.x, p.y, p.z);
      c.save();
      c.globalAlpha = clamp(p.life / p.max, 0, 1) * (p.alpha || 0.8);
      c.fillStyle = p.color;
      c.beginPath(); c.arc(sx, sy, p.r * this.TW * (p.grow ? 1 + (1 - p.life / p.max) * 1.5 : 1), 0, Math.PI * 2); c.fill();
      c.restore();
    }

    emit(x, y, z, kind) {
      if (this.particles.length > 220) return;
      if (kind === 'steam') this.particles.push({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z, vx: 0, vy: 0, vz: rnd(0.6, 1), life: 1.4, max: 1.4, r: 0.05, color: '#e8e8e8', alpha: 0.35, grow: true });
      if (kind === 'fire') this.particles.push({ x: x + rnd(-0.25, 0.25), y: y + rnd(-0.15, 0.15), z, vx: 0, vy: 0, vz: rnd(0.8, 1.4), life: 0.5, max: 0.5, r: 0.04, color: pick(['#ff6b1f', '#ffb347', '#ffd27a']), alpha: 1 });
      if (kind === 'smoke') this.particles.push({ x: x + rnd(-0.1, 0.1), y: y + rnd(-0.1, 0.1), z, vx: 0.1, vy: -0.05, vz: rnd(0.3, 0.6), life: 2.2, max: 2.2, r: 0.06, color: '#6b6b6b', alpha: 0.3, grow: true });
      if (kind === 'mote') this.particles.push({ x, y, z, vx: rnd(0.02, 0.1), vy: rnd(-0.03, 0.03), vz: rnd(-0.04, 0.06), life: 3, max: 3, r: 0.012, color: '#fff2cc', alpha: 0.9 });
      if (kind === 'gold') this.particles.push({ x, y, z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(1, 2.2), life: 0.9, max: 0.9, r: 0.035, color: '#d4b06a', alpha: 1 });
    }

    drawItem(it, style) {
      const f = KL.FURN[it.type];
      const x = it.x, y = it.y, w = f.w, d = f.d;
      const steel = ['#aeb6bd', '#7d868d', '#939ba2'];
      const t = this.t;
      switch (it.type) {
        case 't2': case 't4': case 't6': {
          const occ = this.tableGuests && this.tableGuests.get(it.id);
          const chairCol = ['#3b2a20', '#2a1d16', '#33241b'];
          // Stühle hinten
          for (let i = 0; i < w; i++) this.box(x + i + 0.32, y + 0.02, 0.36, 0.18, 0, 0.9, ...chairCol);
          (occ || []).filter((gst) => gst.seat.side === 'n').forEach((gst) => this.drawPerson(gst, true));
          // Tisch
          const top = style.linen ? '#f4efe6' : '#a87a4f';
          const side = style.linen ? ['#e6dfd2', '#d8d0c2'] : ['#7a5536', '#8c623f'];
          this.box(x + 0.12, y + 0.24, w - 0.24, d - 0.48, 0.55, 0.12, top, side[0], side[1]);
          this.box(x + w / 2 - 0.05, y + 0.45, 0.1, 0.1, 0, 0.55, '#2a1d16', '#2a1d16', '#3a2a20');
          const plates = this.platesOnTables.get(it.id) || 0;
          for (let i = 0; i < Math.min(plates, w * 2); i++) {
            const [px, py] = this.P(x + 0.35 + (i % w) + (i >= w ? 0.3 : 0), y + (i >= w ? 0.62 : 0.38), 0.68);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath(); this.ctx.ellipse(px, py, this.TW * 0.09, this.TW * 0.045, 0, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.fillStyle = '#c14b0c';
            this.ctx.beginPath(); this.ctx.ellipse(px, py, this.TW * 0.035, this.TW * 0.018, 0, 0, Math.PI * 2); this.ctx.fill();
          }
          // Kerze
          const [cx, cy] = this.P(x + w / 2, y + 0.5, 0.7);
          this.ctx.fillStyle = '#f4efe6'; this.ctx.fillRect(cx - 1.5, cy - this.TW * 0.08, 3, this.TW * 0.08);
          this.ctx.fillStyle = '#ffb347'; this.ctx.beginPath(); this.ctx.arc(cx, cy - this.TW * 0.1 + Math.sin(t * 9 + x) * 0.6, 2, 0, Math.PI * 2); this.ctx.fill();
          (occ || []).filter((gst) => gst.seat.side === 's').forEach((gst) => this.drawPerson(gst, true));
          for (let i = 0; i < w; i++) this.box(x + i + 0.32, y + 0.8, 0.36, 0.18, 0, 0.45, ...chairCol);
          if (this.showNumbers) {
            const [nx, ny] = this.P(x + w / 2, y + 0.5, 1.5);
            this.ctx.font = `700 ${Math.round(this.TW * 0.22)}px 'IBM Plex Mono', monospace`;
            this.ctx.fillStyle = '#d4b06a';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(it.num || '', nx, ny);
          }
          break;
        }
        case 'pflanze':
          this.box(x + 0.3, y + 0.3, 0.4, 0.4, 0, 0.5, '#6b4a33', '#8c5a3a', '#a06a45');
          [[0.5, 0.5, 1.2, 0.28], [0.4, 0.55, 1.5, 0.22], [0.6, 0.45, 1.7, 0.2]].forEach(([a, b, z, r], i) => {
            const [sx, sy] = this.P(x + a, y + b, z);
            this.ctx.fillStyle = ['#4f6b4a', '#5f7d55', '#6f8f60'][i];
            this.ctx.beginPath(); this.ctx.arc(sx, sy, r * this.TW, 0, Math.PI * 2); this.ctx.fill();
          });
          break;
        case 'lampe': {
          this.box(x + 0.47, y + 0.47, 0.06, 0.06, 0, 2.2, '#222', '#222', '#333');
          this.box(x + 0.3, y + 0.3, 0.4, 0.4, 2.1, 0.4, '#f2ead9', '#d9cdb5', '#e8dcc4');
          break;
        }
        case 'skulptur':
          this.box(x + 0.25, y + 0.25, 0.5, 0.5, 0, 0.6, '#3a3a3a', '#222', '#2c2c2c');
          this.box(x + 0.35, y + 0.4, 0.3, 0.2, 0.6, 1.2, '#e5c27a', '#b08a40', '#c9a45c');
          this.box(x + 0.4, y + 0.3, 0.15, 0.35, 1.8, 0.5, '#e5c27a', '#b08a40', '#c9a45c');
          break;
        case 'weinregal':
          this.box(x + 0.1, y + 0.2, 0.8, 0.6, 0, 2.6, '#3b2a20', '#2a1d16', '#33241b');
          for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) {
            const [bx, by] = this.P(x + 0.22 + k * 0.25, y + 0.8, 0.4 + r * 0.45);
            this.ctx.fillStyle = (r + k) % 3 ? '#5a1424' : '#c9b46a';
            this.ctx.beginPath(); this.ctx.arc(bx, by, this.TW * 0.035, 0, Math.PI * 2); this.ctx.fill();
          }
          break;
        case 'bar':
          this.box(x + 0.05, y + 0.25, w - 0.1, 0.5, 0, 1.1, '#2b2b2b', '#5a3a28', '#6b4a33');
          this.box(x, y + 0.2, w, 0.6, 1.1, 0.1, '#c9a45c', '#a8843e', '#b8944e');
          break;
        case 'pass': {
          this.box(x + 0.05, y + 0.2, w - 0.1, 0.6, 0, 1.0, '#cfd5da', ...steel.slice(1));
          // Wärmelampen
          for (let i = 0; i < 3; i++) {
            const lx = x + 0.35 + i * 0.65;
            this.box(lx - 0.02, y + 0.48, 0.04, 0.04, 1.0, 1.0, '#555', '#444', '#555');
            this.box(lx - 0.18, y + 0.35, 0.36, 0.3, 2.0, 0.15, '#3a3a3a', '#2a2a2a', '#333');
            this.glow(lx, y + 0.5, 1.15, 0.45, 'rgba(255,110,30,A)', 0.55 + Math.sin(t * 3 + i) * 0.08);
          }
          const waiting = this.passPlates || 0;
          for (let i = 0; i < Math.min(waiting, 6); i++) {
            const [px, py] = this.P(x + 0.3 + i * 0.3, y + 0.5, 1.05);
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath(); this.ctx.ellipse(px, py, this.TW * 0.1, this.TW * 0.05, 0, 0, Math.PI * 2); this.ctx.fill();
          }
          break;
        }
        case 'herd': {
          this.box(x + 0.05, y + 0.1, w - 0.1, 0.8, 0, 0.95, '#2b2f33', ...steel.slice(1));
          for (let i = 0; i < 4; i++) {
            const [bx, by] = this.P(x + 0.4 + (i % 2) * 0.9, y + 0.3 + Math.floor(i / 2) * 0.4, 0.96);
            const hot = this.mode === 'evening' || (Math.sin(t * 0.7 + i) > 0.2);
            this.ctx.fillStyle = hot ? '#ff6b1f' : '#555';
            this.ctx.beginPath(); this.ctx.ellipse(bx, by, this.TW * 0.12, this.TW * 0.06, 0, 0, Math.PI * 2); this.ctx.fill();
            if (hot && Math.random() < 0.15 * this.speed) this.emit(x + 0.4 + (i % 2) * 0.9, y + 0.3 + Math.floor(i / 2) * 0.4, 1.1, 'steam');
          }
          break;
        }
        case 'spuele':
          this.box(x + 0.05, y + 0.1, 0.9, 0.8, 0, 0.95, '#cfd5da', ...steel.slice(1));
          this.box(x + 0.2, y + 0.25, 0.6, 0.5, 0.95, 0.02, '#6f9fb8', '#5a8aa2', '#5a8aa2');
          if (Math.random() < 0.05) this.emit(x + 0.5, y + 0.5, 1.0, 'steam');
          break;
        case 'posten':
          this.box(x + 0.05, y + 0.1, 0.9, 0.8, 0, 0.95, '#d6dbe0', ...steel.slice(1));
          this.box(x + 0.25, y + 0.3, 0.5, 0.35, 0.95, 0.04, '#e8d6b0', '#c9b48a', '#d4bf95');
          break;
        case 'grill':
          this.box(x + 0.05, y + 0.1, 0.9, 0.8, 0, 1.1, '#1d1d1d', '#141414', '#1a1a1a');
          if (Math.random() < 0.6) this.emit(x + 0.5, y + 0.5, 1.15, 'fire');
          break;
        case 'kombi':
          this.box(x + 0.1, y + 0.1, 0.8, 0.8, 0, 2.0, '#aeb6bd', ...steel.slice(1));
          this.poly([this.P(x + 0.25, y + 0.9, 0.5), this.P(x + 0.75, y + 0.9, 0.5), this.P(x + 0.75, y + 0.9, 1.6), this.P(x + 0.25, y + 0.9, 1.6)], '#2a3a44');
          if (Math.random() < 0.05) this.emit(x + 0.5, y + 0.5, 2.1, 'steam');
          break;
        case 'sousvide':
          this.box(x + 0.1, y + 0.1, 0.8, 0.8, 0, 0.95, '#d6dbe0', ...steel.slice(1));
          this.box(x + 0.25, y + 0.25, 0.5, 0.5, 0.95, 0.35, 'rgba(120,190,230,0.6)', 'rgba(120,190,230,0.45)', 'rgba(120,190,230,0.5)');
          break;
        case 'raeucher':
          this.box(x + 0.1, y + 0.1, 0.8, 0.8, 0, 2.0, '#6b4a33', '#4f3524', '#5f412d');
          if (Math.random() < 0.08) this.emit(x + 0.5, y + 0.5, 2.1, 'smoke');
          break;
        case 'ferment':
          this.box(x + 0.1, y + 0.1, 0.8, 0.8, 0, 2.0, '#3a4249', '#2b3238', '#333b42');
          for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) {
            const [jx, jy] = this.P(x + 0.35 + k * 0.35, y + 0.9, 0.4 + r * 0.55);
            this.ctx.fillStyle = ['#c9a45c', '#8c4a3a', '#7a8a3a'][r];
            this.ctx.fillRect(jx - this.TW * 0.04, jy - this.TW * 0.09, this.TW * 0.08, this.TW * 0.09);
          }
          break;
        case 'dryager':
          this.box(x + 0.1, y + 0.1, 0.8, 0.8, 0, 2.1, '#2a2a2a', '#1d1d1d', '#252525');
          this.poly([this.P(x + 0.2, y + 0.9, 0.2), this.P(x + 0.8, y + 0.9, 0.2), this.P(x + 0.8, y + 0.9, 1.9), this.P(x + 0.2, y + 0.9, 1.9)], 'rgba(200,50,60,0.55)');
          break;
        case 'eismaschine':
          this.box(x + 0.2, y + 0.2, 0.6, 0.6, 0, 0.95, '#eaeef1', '#c9d0d5', '#d6dbe0');
          this.box(x + 0.35, y + 0.35, 0.3, 0.3, 0.95, 0.35, '#c9d0d5', '#aeb6bd', '#b8c0c6');
          break;
        case 'kuehlhaus':
          this.box(x + 0.05, y + 0.05, w - 0.1, 0.9, 0, 2.3, '#cfd5da', ...steel.slice(1));
          this.poly([this.P(x + 0.6, y + 0.95, 0.1), this.P(x + 1.4, y + 0.95, 0.1), this.P(x + 1.4, y + 0.95, 2.0), this.P(x + 0.6, y + 0.95, 2.0)], '#8a949b');
          break;
        default:
          this.box(x + 0.1, y + 0.1, w - 0.2, d - 0.2, 0, 1, '#888', '#666', '#777');
      }
    }

    drawPerson(a, seated) {
      const c = this.ctx;
      const look = a.look;
      let px = a.x, py = a.y;
      if (seated) { px = a.seat.x; py = a.seat.y; }
      const bob = a.walking ? Math.abs(Math.sin(this.t * 10 + (a.phase || 0))) * 0.08 : 0;
      const [sx, sy] = this.P(px, py, seated ? 0.35 : bob);
      const U = this.TW;
      // Schatten
      if (!seated) {
        const [hx, hy] = this.P(px, py, 0);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.ellipse(hx, hy, U * 0.13, U * 0.06, 0, 0, Math.PI * 2); c.fill();
        // Beine
        const step = a.walking ? Math.sin(this.t * 10 + (a.phase || 0)) * U * 0.03 : 0;
        c.fillStyle = look.role === 'guest' || look.role === 'inspector' ? '#2a2a33' : '#222';
        c.fillRect(sx - U * 0.06 + step, sy - U * 0.16, U * 0.045, U * 0.16);
        c.fillRect(sx + U * 0.015 - step, sy - U * 0.16, U * 0.045, U * 0.16);
      }
      // Körper
      let body = look.cloth, apron = null;
      const r = look.role;
      if (r === 'chef') { body = '#f4f1ea'; }
      else if (['souschef', 'partie', 'patissier', 'commis'].includes(r)) body = '#ecebe6';
      else if (r === 'spueler') { body = '#5a6b7a'; apron = '#2f3a44'; }
      else if (['service', 'maitre', 'sommelier'].includes(r)) { body = '#1e1f22'; apron = r === 'sommelier' ? '#5a1424' : '#ecebe6'; }
      else if (r === 'inspector') body = '#4a4d52';
      const top = sy - U * (seated ? 0.3 : 0.48);
      c.fillStyle = this.shade(body, 'left');
      c.beginPath();
      if (c.roundRect) c.roundRect(sx - U * 0.1, top, U * 0.2, U * 0.32, U * 0.06); else c.rect(sx - U * 0.1, top, U * 0.2, U * 0.32);
      c.fill();
      c.strokeStyle = INK; c.lineWidth = Math.max(0.8, U / 70); c.stroke();
      if (apron) { c.fillStyle = apron; c.fillRect(sx - U * 0.07, top + U * 0.14, U * 0.14, U * 0.18); }
      if (r === 'chef') { c.fillStyle = '#d4b06a'; c.fillRect(sx - U * 0.1, top, U * 0.2, U * 0.03); }
      // Kopf
      const hy = top - U * 0.08;
      c.fillStyle = look.skin;
      c.beginPath(); c.arc(sx, hy, U * 0.075, 0, Math.PI * 2); c.fill();
      c.strokeStyle = INK; c.lineWidth = Math.max(0.8, U / 70); c.stroke();
      c.fillStyle = look.hair;
      c.beginPath(); c.arc(sx, hy - U * 0.02, U * 0.078, Math.PI, Math.PI * 2); c.fill();
      if (look.long && !['chef', 'souschef', 'partie', 'patissier', 'commis'].includes(r)) c.fillRect(sx - U * 0.078, hy - U * 0.02, U * 0.03, U * 0.12);
      // Kochmütze
      if (['chef', 'souschef', 'partie', 'patissier', 'commis'].includes(r)) {
        const hh = r === 'chef' ? 0.2 : r === 'souschef' ? 0.15 : 0.08;
        c.fillStyle = '#ffffff';
        c.fillRect(sx - U * 0.065, hy - U * (0.06 + hh), U * 0.13, U * hh);
        c.beginPath(); c.arc(sx, hy - U * (0.06 + hh), U * 0.08, Math.PI, Math.PI * 2); c.fill();
      }
      if (r === 'inspector') {
        c.fillStyle = '#25272b';
        c.fillRect(sx - U * 0.1, hy - U * 0.085, U * 0.2, U * 0.025);
        c.fillRect(sx - U * 0.06, hy - U * 0.15, U * 0.12, U * 0.07);
      }
      // Teller in der Hand
      if (a.carry) {
        c.fillStyle = '#fff';
        c.beginPath(); c.ellipse(sx + U * 0.14, top + U * 0.06, U * 0.09, U * 0.04, 0, 0, Math.PI * 2); c.fill();
      }
      if (a.working && Math.random() < 0.3) this.emit(a.x + 0.2, a.y - 0.3, 1.0, 'steam');
    }
  }

  KL.World = World;
})();

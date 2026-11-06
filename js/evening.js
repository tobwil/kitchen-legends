/* Kitchen Legends – Der Abend
 * Der Service als lebendige Szene: Gäste kommen, sitzen, essen, gehen.
 * Unten steht der Pass: Du holst dir Bons und triffst den Garpunkt.
 * Was du nicht selbst anrichtest, macht die Brigade – so gut sie eben ist.
 */
(function () {
  const { clamp, rnd, pick } = KL.util;

  /* --- Kleiner Synthesizer, startet erst nach Nutzerinteraktion --- */
  const Sound = {
    ctx: null,
    on: true,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    },
    tone(freq, dur, type = 'sine', vol = 0.15, slide = 0) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur);
    },
    bell() { this.tone(1760, 0.4, 'sine', 0.08); setTimeout(() => this.tone(2350, 0.3, 'sine', 0.04), 40); },
    perfect() { this.tone(880, 0.12, 'triangle', 0.14); setTimeout(() => this.tone(1320, 0.22, 'triangle', 0.12), 70); },
    good() { this.tone(660, 0.16, 'triangle', 0.12); },
    miss() { this.tone(160, 0.3, 'sawtooth', 0.12, -80); },
    coin() { this.tone(1200, 0.08, 'square', 0.04); setTimeout(() => this.tone(1600, 0.12, 'square', 0.04), 60); },
    door() { this.tone(520, 0.15, 'sine', 0.05); },
  };
  KL.Sound = Sound;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  KL.Evening = {
    start(s, opts, onDone) {
      Sound.init();
      const auto = !!opts.auto;
      const f = KL.forecast(s);
      const dishes = KL.menuDishes(s);
      const inspectorWeek = s.inspections.planned.includes(KL.weekOfYear(s));

      const root = el('div', 'evening');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', 'Service-Abend');
      root.innerHTML = `
        <header class="ev-head">
          <div class="ev-title"><span class="eyebrow">Service · Woche ${KL.weekOfYear(s)} · ${esc(s.name)}</span><strong id="ev-clock">18:30</strong></div>
          <div class="ev-stats">
            <div><span class="eyebrow">Gäste</span><b id="ev-guests">0</b></div>
            <div><span class="eyebrow">Teller</span><b id="ev-plates">0</b></div>
            <div><span class="eyebrow">Schnitt</span><b id="ev-avg">–</b></div>
            <div><span class="eyebrow">Flow</span><b id="ev-combo">×0</b></div>
          </div>
          <div class="ev-ctrl">
            <div class="seg" role="group" aria-label="Tempo">
              <button type="button" data-speed="1" class="${auto ? '' : 'on'}">×1</button>
              <button type="button" data-speed="2">×2</button>
              <button type="button" data-speed="4" class="${auto ? 'on' : ''}">×4</button>
            </div>
            <button class="btn ghost small" id="ev-skip" type="button">Vorspulen</button>
            <button class="btn ghost small" id="ev-sound" type="button">${Sound.on ? 'Ton an' : 'Ton aus'}</button>
          </div>
        </header>
        <div class="ev-stage"><canvas id="ev-canvas" aria-label="Dein Restaurant während des Service"></canvas>
          <div class="ev-tell" id="ev-tell" hidden></div>
          <div class="ev-call" id="ev-call"></div>
        </div>
        <div class="ev-hud">
          <section class="rail" aria-label="Bon-Schiene">
            <div class="rail-bar" aria-hidden="true"></div>
            <div class="rail-tickets" id="ev-rail"></div>
            <p class="rail-help">${auto ? 'Der Souschef führt heute den Pass.' : 'Bon antippen (oder 1–5) holt ihn an den Pass. Nicht abgeholte Bons kocht die Brigade.'}</p>
          </section>
          <section class="station" aria-live="polite">
            <div class="station-dish" id="ev-dish"><span class="muted">${auto ? 'Du schaust heute nur zu.' : 'Wähle einen Bon von der Schiene.'}</span></div>
            <div class="gauge" id="ev-gauge">
              <div class="gauge-good" id="ev-good"></div>
              <div class="gauge-perfect" id="ev-perfect"></div>
              <div class="gauge-needle" id="ev-needle"></div>
              <div class="gauge-scale" aria-hidden="true"><span>roh</span><span>Garpunkt</span><span>verkocht</span></div>
            </div>
            <button class="btn heat big" id="ev-fire" type="button" disabled>Anrichten <kbd>Leertaste</kbd></button>
          </section>
        </div>`;
      document.body.appendChild(root);
      document.body.classList.add('no-scroll');
      const $ = (id) => root.querySelector('#' + id);

      const world = new KL.World($('ev-canvas'), s, { mode: 'evening', tod: 0.52, maxH: Math.max(260, window.innerHeight * 0.5) });
      world.showNumbers = true;
      world.speed = auto ? 4 : 1;
      world.tableGuests = new Map();
      world.passPlates = 0;

      /* --- Gäste planen --- */
      const tables = s.layout.filter((it) => KL.FURN[it.type].seats).sort((a, b) => a.y - b.y || a.x - b.x);
      tables.forEach((t, i) => (t.num = i + 1));
      const seatsFor = (t) => {
        const fw = KL.FURN[t.type].w;
        const out = [];
        for (let i = 0; i < fw; i++) { out.push({ x: t.x + i + 0.5, y: t.y + 0.14, side: 'n' }); out.push({ x: t.x + i + 0.5, y: t.y + 0.86, side: 's' }); }
        return out;
      };
      const perDay = clamp(Math.round(f.covers / Math.max(1, f.days)), 2, KL.layoutStats(s).seats);
      let remaining = perDay;
      const groups = [];
      const order = tables.slice().sort(() => Math.random() - 0.5);
      order.forEach((t) => {
        if (remaining <= 0) return;
        const cap = KL.FURN[t.type].seats;
        const size = Math.min(remaining, cap, cap > 2 && Math.random() < 0.35 ? cap - 2 : cap);
        remaining -= size;
        groups.push({ table: t, size, seats: seatsFor(t).slice(0, size), guests: [], state: 'planned', course: 0, timer: 0, inspector: false });
      });
      if (inspectorWeek && groups.length) {
        const gI = pick(groups);
        gI.inspector = true;
        gI.size = 1;
        gI.seats = gI.seats.slice(0, 1);
      }
      groups.sort(() => Math.random() - 0.5).forEach((g, i) => (g.spawnAt = 0.8 + i * rnd(2.2, 3.4)));
      const totalGuests = groups.reduce((n, g) => n + g.size, 0);

      // Ohne Servicekräfte springt eine Aushilfe ein
      if (!world.agents.some((a) => a.kind === 'waiter')) {
        const pt = KL.passTile(s);
        world.agents.push({ kind: 'waiter', id: 'aushilfe', name: 'Aushilfe', role: 'service', x: pt.x + 0.5, y: pt.y + 0.5, home: pt, look: KL.lookFor('Aushilfe', 'service'), path: [], idle: 0, busy: false, speed: 1.8 });
      }
      world.agents.filter((a) => a.kind === 'waiter').forEach((a) => (a.speed = a.speed || 2.6));

      /* --- Spielzustand --- */
      const door = KL.doorTile(s);
      const pt = KL.passTile(s);
      const tickets = [];
      const plates = []; // fertige Teller, die auf Kellner warten
      const results = [];
      const stats = { perfect: 0, good: 0, miss: 0, late: 0, brigade: 0 };
      let active = null, needle = 0, dir = 1, combo = 0, lock = 0;
      let seated = 0, finished = false, ticketSeq = 0;
      const patienceMax = 11 * (KL.hasPerk(s, 'adrenalin') ? 1.3 : 1);
      const brigadeRate = 0.35 + f.kitchen.strength / 120; // Teller pro Sekunde, grob
      let brigadeClock = 0;
      const brigadeQueue = [];

      const brigadeQuality = (tk) => clamp(f.kitchen.strength * 0.72 + tk.maturity * 0.22 + rnd(-12, 10) - (tk.difficulty - 2) * 4 - (s.chef.energy < 30 && !KL.hasPerk(s, 'unkaputtbar') ? 6 : 0), 20, 94);

      const call = (text, cls) => {
        const c = $('ev-call');
        c.textContent = text;
        c.className = 'ev-call show ' + (cls || '');
        clearTimeout(call.t);
        call.t = setTimeout(() => (c.className = 'ev-call'), 900);
      };

      const updateStats = () => {
        $('ev-guests').textContent = `${seated}/${totalGuests}`;
        $('ev-plates').textContent = results.length;
        $('ev-avg').textContent = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : '–';
        $('ev-combo').textContent = '×' + combo;
      };

      const newTicket = (g) => {
        const d = dishes[g.course];
        const e = KL.evalDish(s, d);
        const tk = { id: ++ticketSeq, group: g, course: g.course, dish: d, name: KL.dishName(d), difficulty: e.difficulty, maturity: d.maturity, patience: 0, inspector: g.inspector, tries: 0 };
        tickets.push(tk);
        Sound.bell();
        if (auto) setTimeout(() => toBrigade(tk), 50);
      };

      const toBrigade = (tk) => {
        const i = tickets.indexOf(tk);
        if (i < 0) return;
        tickets.splice(i, 1);
        brigadeQueue.push(tk);
        if (active === tk) active = null;
      };

      const plateReady = (tk, score, byChef) => {
        tk.score = score;
        tk.byChef = byChef;
        tk.readyAt = world.t;
        plates.push(tk);
        world.passPlates = plates.length;
      };

      /* --- Gauge (läuft in Echtzeit) --- */
      const zoneFor = (tk) => {
        const energyF = s.chef.energy < 30 && !KL.hasPerk(s, 'unkaputtbar') ? 0.75 : s.chef.energy < 55 ? 0.9 : 1;
        const flow = 1 + Math.min(combo, 8) * 0.025;
        const perk = KL.hasPerk(s, 'garpunkt') ? 1.25 : 1;
        const base = 0.05 + f.kitchen.strength / 1100;
        const w = base * (1 + tk.maturity / 160) / (1 + (tk.difficulty - 1) * 0.2) * energyF * flow * perk;
        return { perfect: clamp(w, 0.035, 0.22), good: clamp(w * 2.8, 0.1, 0.45) };
      };

      const take = (tk) => {
        if (auto || active || finished || !tickets.includes(tk)) return;
        active = tk;
        tk.zone = zoneFor(tk);
        tk.center = rnd(0.32, 0.78);
        needle = rnd(0, 0.15); dir = 1;
        $('ev-dish').innerHTML = `<span class="eyebrow">Tisch ${tk.group.table.num} · Gang ${tk.course + 1}/${dishes.length}${tk.inspector ? ' · Einzelgast' : ''}</span><strong>${esc(tk.name)}</strong><span class="muted">Schwierigkeit ${tk.difficulty}/5 · Reife ${Math.round(tk.maturity)} %</span>`;
        $('ev-good').style.left = (tk.center - tk.zone.good / 2) * 100 + '%';
        $('ev-good').style.width = tk.zone.good * 100 + '%';
        $('ev-perfect').style.left = (tk.center - tk.zone.perfect / 2) * 100 + '%';
        $('ev-perfect').style.width = tk.zone.perfect * 100 + '%';
        $('ev-gauge').classList.add('live');
        $('ev-fire').disabled = false;
        const chef = world.agents.find((a) => a.kind === 'chef');
        if (chef) chef.working = 99;
        renderRail();
      };

      const releaseStation = () => {
        active = null;
        $('ev-gauge').classList.remove('live');
        $('ev-fire').disabled = true;
        $('ev-dish').innerHTML = '<span class="muted">Nächster Bon!</span>';
        const chef = world.agents.find((a) => a.kind === 'chef');
        if (chef) chef.working = 0;
      };

      const fire = () => {
        if (!active || lock > 0 || finished) return;
        const tk = active;
        const d = Math.abs(needle - tk.center);
        lock = 0.18;
        const pass = KL.passItem(s);
        if (d <= tk.zone.perfect / 2) {
          stats.perfect++; combo++;
          Sound.perfect();
          for (let i = 0; i < 14; i++) world.emit(pass.x + 1, pass.y + 0.5, 1.2, 'gold');
          call(combo >= 5 ? `Flow ×${combo}! ${pick(KL.KITCHEN_CALLS)}` : pick(KL.KITCHEN_CALLS), 'perfect');
          tickets.splice(tickets.indexOf(tk), 1);
          releaseStation();
          plateReady(tk, clamp(100 - tk.tries * 12, 30, 100), true);
        } else if (d <= tk.zone.good / 2) {
          stats.good++; combo = Math.max(0, combo - 1);
          Sound.good();
          call('Passt. Raus damit.', 'good');
          tickets.splice(tickets.indexOf(tk), 1);
          releaseStation();
          plateReady(tk, clamp(78 - tk.tries * 12, 30, 100), true);
        } else {
          stats.miss++; tk.tries++; combo = 0;
          Sound.miss();
          call(needle < tk.center ? 'Noch roh! Neu!' : 'Verkocht! Neu!', 'miss');
          root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
          tk.center = rnd(0.3, 0.8);
          $('ev-good').style.left = (tk.center - tk.zone.good / 2) * 100 + '%';
          $('ev-perfect').style.left = (tk.center - tk.zone.perfect / 2) * 100 + '%';
        }
        root.classList.toggle('flow', combo >= 5);
        updateStats();
      };
      $('ev-fire').onclick = fire;

      /* --- Bon-Schiene --- */
      const ticketEls = new Map();
      const emptyMsg = el('p', 'muted rail-empty', 'Schiene leer.');
      const renderRail = () => {
        const rail = $('ev-rail');
        const waiting = tickets.filter((t) => t !== active).slice(0, 5);
        ticketEls.forEach((node, id) => { if (!waiting.some((t) => t.id === id)) { node.remove(); ticketEls.delete(id); } });
        waiting.forEach((tk, i) => {
          let n = ticketEls.get(tk.id);
          if (!n) {
            n = el('button', 'ticket' + (tk.inspector ? ' suspicious' : ''));
            n.type = 'button';
            n.innerHTML = `<span class="t-key"></span><span class="t-table">Tisch ${tk.group.table.num} · Gang ${tk.course + 1}</span><span class="t-dish">${esc(tk.name)}</span><span class="t-diff" aria-label="Schwierigkeit ${tk.difficulty} von 5">${'●'.repeat(tk.difficulty)}${'○'.repeat(5 - tk.difficulty)}</span><span class="t-patience"><i></i></span>`;
            n.addEventListener('pointerdown', () => take(tk));
            n.addEventListener('click', () => take(tk));
            rail.appendChild(n);
            ticketEls.set(tk.id, n);
          }
          const p = clamp(1 - tk.patience / patienceMax, 0, 1);
          n.querySelector('.t-key').textContent = i + 1;
          const bar = n.querySelector('.t-patience i');
          bar.style.width = p * 100 + '%';
          bar.classList.toggle('hot', p < 0.3);
        });
        if (!waiting.length) { if (!emptyMsg.isConnected) rail.appendChild(emptyMsg); } else emptyMsg.remove();
      };

      /* --- Gäste-Logik (läuft in Spielzeit) --- */
      const spawnGroup = (g) => {
        g.state = 'arriving';
        Sound.door();
        const m = KL.occupancy(s);
        const r = KL.bfs(s, door, 'dining', m);
        const acc = KL.accessTile(s, g.table, r.reach, m) || door;
        for (let i = 0; i < g.size; i++) {
          const look = g.inspector ? { ...KL.lookFor('insp' + s.week, 'inspector') } : KL.lookFor(Math.random(), 'guest');
          const a = { kind: 'guest', x: door.x + 1.4 + i * 0.35, y: door.y + 0.5, look, path: [], phase: rnd(0, 6), speed: 1.7, seat: g.seats[i], group: g };
          a.path = [{ x: door.x + 0.5, y: door.y + 0.5 }].concat((r.path(acc.x, acc.y) || []).slice(1).map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 })));
          a.done = () => {
            a.seated = true;
            const list = world.tableGuests.get(g.table.id) || [];
            list.push(a);
            world.tableGuests.set(g.table.id, list);
            seated++;
            updateStats();
            if (g.guests.every((x) => x.seated)) { g.state = 'ordering'; g.timer = 2.2; }
          };
          g.guests.push(a);
          world.agents.push(a);
        }
        if (g.inspector) {
          const tell = $('ev-tell');
          tell.hidden = false;
          tell.innerHTML = `<b>Tisch ${g.table.num}:</b> ${esc(pick(KL.INSPECTOR_TELLS))}`;
        }
      };

      const reaction = (g, score) => {
        const t = g.table, fw = KL.FURN[t.type].w;
        const [txt, col] = score >= 90 ? ['★ Wow', '#d4b06a'] : score >= 74 ? ['♥ Lecker', '#ef9a8a'] : score >= 55 ? ['Ganz gut', '#ebe5d9'] : ['✗ Hm …', '#ef6a5a'];
        world.bubble(t.x + fw / 2, t.y + 0.5, txt, col, 1.8);
      };

      const leave = (g) => {
        g.state = 'leaving';
        const bill = g.size * (s.price + s.pairingPrice * f.pairingTake);
        world.bubble(g.table.x + KL.FURN[g.table.type].w / 2, g.table.y + 0.5, `+${Math.round(bill)} €`, '#7cc495', 2);
        Sound.coin();
        const list = world.tableGuests.get(g.table.id) || [];
        world.tableGuests.set(g.table.id, list.filter((a) => a.group !== g));
        world.platesOnTables.delete(g.table.id);
        const m = KL.occupancy(s);
        const acc = KL.accessTile(s, g.table, KL.bfs(s, door, 'dining', m).reach, m) || door;
        g.guests.forEach((a, i) => {
          a.seated = false;
          a.x = acc.x + 0.5 + i * 0.05; a.y = acc.y + 0.5;
          const r = KL.bfs(s, acc, 'dining', m);
          a.path = (r.path(door.x, door.y) || []).slice(1).map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 })).concat([{ x: door.x + 1.6, y: door.y + 0.5 }]);
          a.done = () => { a.hidden = true; if (g.guests.every((x) => x.hidden)) g.state = 'gone'; };
        });
      };

      const dispatchWaiters = () => {
        if (!plates.length) return;
        const free = world.agents.filter((a) => a.kind === 'waiter' && !a.busy);
        free.forEach((w) => {
          const tk = plates.shift();
          if (!tk) return;
          world.passPlates = plates.length;
          w.busy = true;
          w.walkingToPass = true;
          world.walkTo(w, pt.x, pt.y, 'dining', () => {
            w.carry = true;
            const m = KL.occupancy(s);
            const r = KL.bfs(s, pt, 'dining', m);
            const acc = KL.accessTile(s, tk.group.table, r.reach, m) || pt;
            world.walkTo(w, acc.x, acc.y, 'dining', () => {
              w.carry = false;
              const wait = world.t - tk.readyAt;
              const penalty = Math.max(0, wait - 6) * 1.2;
              const score = clamp(tk.score - penalty, 10, 100);
              if (penalty > 8) stats.late++;
              results.push({ score, inspector: tk.inspector, byChef: tk.byChef });
              world.platesOnTables.set(tk.group.table.id, tk.group.size);
              reaction(tk.group, score);
              tk.group.state = 'eating';
              tk.group.timer = rnd(4.5, 6.5);
              updateStats();
              world.walkTo(w, pt.x, pt.y, 'dining', () => { w.busy = false; });
            });
          });
        });
      };

      world.update = (dt) => {
        if (finished) return;
        world.tod = 0.52 + Math.min(1, world.t / 70) * 0.48; // Sonnenuntergang bis Nacht
        // Ankunft
        groups.forEach((g) => {
          if (g.state === 'planned' && world.t >= g.spawnAt) spawnGroup(g);
          if (g.state === 'ordering') { g.timer -= dt; if (g.timer <= 0) { g.state = 'waiting'; newTicket(g); } }
          if (g.state === 'eating') {
            g.timer -= dt;
            if (g.timer <= 0) {
              world.platesOnTables.delete(g.table.id);
              g.course++;
              if (g.course >= dishes.length) leave(g);
              else { g.state = 'between'; g.timer = rnd(1, 2.2); }
            }
          }
          if (g.state === 'between') { g.timer -= dt; if (g.timer <= 0) { g.state = 'waiting'; newTicket(g); } }
        });
        // Geduld der Bons
        tickets.slice().forEach((tk) => {
          if (tk === active) return;
          tk.patience += dt;
          if (tk.patience >= patienceMax) toBrigade(tk);
        });
        // Brigade kocht
        brigadeClock += dt * brigadeRate;
        while (brigadeClock >= 1 && brigadeQueue.length) {
          brigadeClock -= 1;
          const tk = brigadeQueue.shift();
          stats.brigade++;
          plateReady(tk, brigadeQuality(tk), false);
        }
        if (!brigadeQueue.length) brigadeClock = Math.min(brigadeClock, 1);
        dispatchWaiters();
        // Uhr
        const mins = 18 * 60 + 30 + world.t * 4;
        $('ev-clock').textContent = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`;
        renderRail();
        if (groups.every((g) => g.state === 'gone')) end();
      };

      /* --- Eingaben --- */
      root.querySelectorAll('[data-speed]').forEach((b) => (b.onclick = () => {
        world.speed = +b.dataset.speed;
        root.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      $('ev-sound').onclick = () => { Sound.on = !Sound.on; $('ev-sound').textContent = Sound.on ? 'Ton an' : 'Ton aus'; };
      $('ev-skip').onclick = () => {
        // Rest des Abends übernimmt die Brigade sofort
        if (active) { tickets.splice(tickets.indexOf(active), 1); brigadeQueue.push(active); releaseStation(); }
        tickets.splice(0).forEach((tk) => brigadeQueue.push(tk));
        const remainingCourses = groups.reduce((n, g) => n + (g.state === 'gone' ? 0 : dishes.length - g.course - (g.state === 'eating' ? 1 : 0)), 0);
        brigadeQueue.forEach((tk) => results.push({ score: brigadeQuality(tk), inspector: tk.inspector, byChef: false }));
        plates.forEach((tk) => results.push({ score: tk.score, inspector: tk.inspector, byChef: tk.byChef }));
        groups.forEach((g) => {
          if (g.state === 'gone') return;
          const left = dishes.length - g.course - (g.state === 'eating' ? 1 : 0) - (g.state === 'waiting' ? 1 : 0);
          for (let i = 0; i < left; i++) results.push({ score: brigadeQuality({ maturity: dishes[0].maturity, difficulty: 2 }), inspector: g.inspector, byChef: false });
        });
        stats.brigade += remainingCourses;
        end();
      };
      const onKey = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') { if (active) { e.preventDefault(); fire(); } }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 5) { const w = tickets.filter((t) => t !== active); if (w[n - 1]) take(w[n - 1]); }
      };
      window.addEventListener('keydown', onKey);

      let last = null;
      const gaugeLoop = (ts) => {
        if (finished) return;
        const dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
        last = ts;
        lock = Math.max(0, lock - dt);
        if (active) {
          const speed = 0.5 + active.difficulty * 0.13;
          needle += dir * speed * dt;
          if (needle >= 1) { needle = 1; dir = -1; }
          if (needle <= 0) { needle = 0; dir = 1; }
          $('ev-needle').style.left = needle * 100 + '%';
        }
        requestAnimationFrame(gaugeLoop);
      };
      requestAnimationFrame(gaugeLoop);

      const end = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener('keydown', onKey);
        world.destroy();
        const all = results.length ? results : [{ score: 50, inspector: false }];
        const avg = all.reduce((a, r) => a + r.score, 0) / all.length;
        const insp = all.filter((r) => r.inspector);
        const inspectorAvg = insp.length ? insp.reduce((a, r) => a + r.score, 0) / insp.length : avg;
        const byChef = all.filter((r) => r.byChef).length;
        const lows = all.filter((r) => r.score < 55).length;
        const result = { delegated: auto || byChef < all.length * 0.2, avg, inspectorAvg, missRate: clamp((stats.miss + lows) / (all.length + stats.miss), 0, 1), perfect: stats.perfect, good: stats.good, miss: stats.miss, late: stats.late, brigade: stats.brigade, plates: all.length, byChef, guests: totalGuests };
        const verdict = avg >= 88 ? 'Weltklasse-Abend. Das Team klatscht am Pass.' : avg >= 75 ? 'Starker Service. Kleine Wackler, große Teller.' : avg >= 60 ? 'Durchwachsen. Morgen wird besser.' : 'Ein Abend zum Vergessen. Kopf hoch, Messer schärfen.';
        const sum = el('div', 'ev-summary');
        sum.innerHTML = `
          <span class="eyebrow">Küche ist durch · ${totalGuests} Gäste</span>
          <h2>${verdict}</h2>
          <div class="sum-grid">
            <div><b>${Math.round(avg)}</b><span>Teller-Schnitt</span></div>
            <div><b>${byChef}</b><span>Von dir</span></div>
            <div><b>${stats.perfect}</b><span>Perfekt</span></div>
            <div><b>${stats.miss}</b><span>Neu gemacht</span></div>
            <div><b>${stats.late}</b><span>Zu lange am Pass</span></div>
          </div>
          ${insp.length ? `<p class="muted">Der Einzelgast an Tisch ${groups.find((g) => g.inspector).table.num} bekam im Schnitt <b>${Math.round(inspectorAvg)}</b>. Wer das wohl war?</p>` : ''}
          ${result.delegated && !auto ? '<p class="muted">Du hast weniger als ein Fünftel selbst angerichtet. Für die Inspektoren zählt das als „Chef*in nicht am Pass“.</p>' : ''}
          <button class="btn heat big" type="button" id="ev-close">Zur Wochenabrechnung</button>`;
        root.querySelector('.ev-hud').replaceWith(sum);
        root.querySelector('.ev-stage').classList.add('done');
        sum.querySelector('#ev-close').focus();
        sum.querySelector('#ev-close').onclick = () => {
          root.remove();
          document.body.classList.remove('no-scroll');
          onDone(result);
        };
      };

      updateStats();
      renderRail();
    },
  };
})();

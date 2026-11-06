/* Kitchen Legends – Der Pass (Service-Minispiel)
 * Bons laufen ein, du feuerst sie an den Pass und triffst den Garpunkt.
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
    bell() { this.tone(1760, 0.5, 'sine', 0.12); setTimeout(() => this.tone(2350, 0.4, 'sine', 0.06), 40); },
    perfect() { this.tone(880, 0.12, 'triangle', 0.14); setTimeout(() => this.tone(1320, 0.22, 'triangle', 0.12), 70); },
    good() { this.tone(660, 0.16, 'triangle', 0.12); },
    miss() { this.tone(160, 0.3, 'sawtooth', 0.12, -80); },
    late() { this.tone(300, 0.4, 'square', 0.06, -150); },
  };
  KL.Sound = Sound;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  KL.Service = {
    start(state, setup, onDone) {
      Sound.init();
      const root = el('div', 'pass-overlay');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', 'Service am Pass');
      root.innerHTML = `
        <div class="pass-lamp" aria-hidden="true"></div>
        <header class="pass-head">
          <div class="pass-title"><span class="eyebrow">Service · Woche ${state.week}</span><strong>Der Pass</strong></div>
          <div class="pass-stats">
            <div><span class="eyebrow">Teller</span><b id="ps-done">0/${setup.plates.length}</b></div>
            <div><span class="eyebrow">Flow</span><b id="ps-combo">×0</b></div>
            <div><span class="eyebrow">Schnitt</span><b id="ps-avg">–</b></div>
          </div>
          <button class="btn ghost small" id="ps-sound" type="button">${Sound.on ? 'Ton an' : 'Ton aus'}</button>
        </header>
        ${setup.tell ? `<div class="pass-tell"><b>Auffällig:</b> Tisch ${setup.inspTable} – ${setup.tell}</div>` : ''}
        <div class="pass-body">
          <section class="rail" aria-label="Bon-Schiene">
            <div class="rail-bar" aria-hidden="true"></div>
            <div class="rail-tickets" id="ps-rail"></div>
            <p class="rail-help">Bon antippen (oder Taste 1–4) holt ihn an den Pass.</p>
          </section>
          <section class="station" aria-live="polite">
            <div class="station-dish" id="ps-dish"><span class="muted">Wähle einen Bon von der Schiene.</span></div>
            <div class="gauge" id="ps-gauge">
              <div class="gauge-good" id="ps-good"></div>
              <div class="gauge-perfect" id="ps-perfect"></div>
              <div class="gauge-needle" id="ps-needle"></div>
              <div class="gauge-scale" aria-hidden="true"><span>roh</span><span>Garpunkt</span><span>verkocht</span></div>
            </div>
            <button class="btn heat big" id="ps-fire" type="button" disabled>Anrichten <kbd>Leertaste</kbd></button>
            <div class="station-call" id="ps-call"></div>
          </section>
        </div>`;
      document.body.appendChild(root);
      document.body.classList.add('no-scroll');
      const $ = (id) => root.querySelector('#' + id);

      const plates = setup.plates.map((p) => ({ ...p, spawned: false, done: false, patience: 0, maxPatience: 15 + rnd(0, 3), tries: 0, score: null }));
      let spawnIdx = 0;
      let nextSpawn = 0.4;
      let active = null;
      let needle = 0, dir = 1;
      let combo = 0;
      let lastTs = null;
      let elapsed = 0;
      let lock = 0; // kurze Sperre nach einem Treffer
      const stats = { perfect: 0, good: 0, miss: 0, late: 0 };
      let finished = false;

      $('ps-sound').onclick = () => { Sound.on = !Sound.on; $('ps-sound').textContent = Sound.on ? 'Ton an' : 'Ton aus'; };

      const zoneFor = (p) => {
        const energyF = setup.energy < 30 ? 0.75 : setup.energy < 55 ? 0.9 : 1;
        const flow = 1 + Math.min(combo, 8) * 0.025;
        const w = setup.base * (1 + p.maturity / 160) / (1 + (p.difficulty - 1) * 0.2) * energyF * flow;
        return { perfect: clamp(w, 0.035, 0.2), good: clamp(w * 2.8, 0.1, 0.42) };
      };

      // Bons werden nur einmal erzeugt und danach in place aktualisiert,
      // damit ein Tipp nicht durch ein Neu-Rendern verloren geht.
      const ticketEls = new Map();
      const emptyMsg = el('p', 'muted rail-empty', 'Schiene leer. Durchatmen.');
      const renderRail = () => {
        const rail = $('ps-rail');
        const waiting = plates.filter((p) => p.spawned && !p.done && p !== active).slice(0, 4);
        ticketEls.forEach((t, id) => {
          if (!waiting.some((p) => p.id === id)) { t.remove(); ticketEls.delete(id); }
        });
        waiting.forEach((p, i) => {
          let t = ticketEls.get(p.id);
          if (!t) {
            t = el('button', 'ticket' + (p.inspector ? ' suspicious' : ''));
            t.type = 'button';
            t.innerHTML = `<span class="t-key"></span><span class="t-table">Tisch ${p.table}</span><span class="t-dish">${p.name}</span><span class="t-diff" aria-label="Schwierigkeit ${p.difficulty} von 5">${'●'.repeat(p.difficulty)}${'○'.repeat(5 - p.difficulty)}</span><span class="t-patience"><i></i></span>`;
            t.addEventListener('pointerdown', () => take(p));
            t.addEventListener('click', () => take(p));
            rail.appendChild(t);
            ticketEls.set(p.id, t);
          }
          const pct = clamp(1 - p.patience / p.maxPatience, 0, 1);
          t.querySelector('.t-key').textContent = i + 1;
          const bar = t.querySelector('.t-patience i');
          bar.style.width = pct * 100 + '%';
          bar.classList.toggle('hot', pct < 0.3);
        });
        if (!waiting.length) { if (!emptyMsg.isConnected) rail.appendChild(emptyMsg); } else emptyMsg.remove();
      };

      const take = (p) => {
        if (active || p.done || finished) return;
        active = p;
        needle = rnd(0, 0.15);
        dir = 1;
        const z = zoneFor(p);
        p.zone = z;
        p.center = rnd(0.32, 0.78);
        $('ps-dish').innerHTML = `<span class="eyebrow">Tisch ${p.table}${p.inspector ? ' · auffällig' : ''}</span><strong>${p.name}</strong><span class="muted">Schwierigkeit ${p.difficulty}/5 · Reife ${Math.round(p.maturity)} %</span>`;
        const good = $('ps-good'), perf = $('ps-perfect');
        good.style.left = (p.center - z.good / 2) * 100 + '%';
        good.style.width = z.good * 100 + '%';
        perf.style.left = (p.center - z.perfect / 2) * 100 + '%';
        perf.style.width = z.perfect * 100 + '%';
        $('ps-gauge').classList.add('live');
        $('ps-fire').disabled = false;
        renderRail();
      };

      const call = (text, cls) => {
        const c = $('ps-call');
        c.textContent = text;
        c.className = 'station-call show ' + (cls || '');
        clearTimeout(call.t);
        call.t = setTimeout(() => (c.className = 'station-call'), 900);
      };

      const burst = (cls) => {
        const g = $('ps-gauge');
        for (let i = 0; i < 14; i++) {
          const sp = el('i', 'spark ' + cls);
          sp.style.left = needle * 100 + '%';
          sp.style.setProperty('--dx', rnd(-90, 90) + 'px');
          sp.style.setProperty('--dy', rnd(-90, -20) + 'px');
          g.appendChild(sp);
          setTimeout(() => sp.remove(), 700);
        }
      };

      const finishPlate = (p, score) => {
        p.done = true;
        p.score = score;
        if (active === p) {
          active = null;
          $('ps-gauge').classList.remove('live');
          $('ps-fire').disabled = true;
          $('ps-dish').innerHTML = '<span class="muted">Nächster Bon!</span>';
        }
        const done = plates.filter((x) => x.done);
        $('ps-done').textContent = `${done.length}/${plates.length}`;
        $('ps-avg').textContent = Math.round(done.reduce((s, x) => s + x.score, 0) / done.length);
        renderRail();
        if (done.length === plates.length) end();
      };

      const fire = () => {
        if (!active || lock > 0 || finished) return;
        const p = active;
        const d = Math.abs(needle - p.center);
        lock = 0.18;
        if (d <= p.zone.perfect / 2) {
          stats.perfect++;
          combo++;
          Sound.perfect();
          burst('gold');
          call(combo >= 5 ? `Flow ×${combo}! ${pick(KL.KITCHEN_CALLS)}` : pick(KL.KITCHEN_CALLS), 'perfect');
          finishPlate(p, clamp(100 - p.tries * 12, 30, 100));
        } else if (d <= p.zone.good / 2) {
          stats.good++;
          combo = Math.max(0, combo - 1);
          Sound.good();
          burst('ember');
          call('Passt. Raus damit.', 'good');
          finishPlate(p, clamp(76 - p.tries * 12, 30, 100));
        } else {
          stats.miss++;
          p.tries++;
          combo = 0;
          Sound.miss();
          call(needle < p.center ? 'Noch roh! Neu!' : 'Verkocht! Neu!', 'miss');
          root.classList.remove('shake');
          void root.offsetWidth;
          root.classList.add('shake');
          p.center = rnd(0.3, 0.8);
          $('ps-good').style.left = (p.center - p.zone.good / 2) * 100 + '%';
          $('ps-perfect').style.left = (p.center - p.zone.perfect / 2) * 100 + '%';
        }
        $('ps-combo').textContent = '×' + combo;
        root.classList.toggle('flow', combo >= 5);
      };

      $('ps-fire').onclick = fire;
      const onKey = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fire(); }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) {
          const waiting = plates.filter((p) => p.spawned && !p.done && p !== active);
          if (waiting[n - 1]) take(waiting[n - 1]);
        }
      };
      window.addEventListener('keydown', onKey);

      const loop = (ts) => {
        if (finished) return;
        if (lastTs == null) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        elapsed += dt;
        lock = Math.max(0, lock - dt);

        // Bons drucken
        nextSpawn -= dt;
        const waitingCount = plates.filter((p) => p.spawned && !p.done).length;
        if (spawnIdx < plates.length && (nextSpawn <= 0 || waitingCount === 0)) {
          plates[spawnIdx].spawned = true;
          spawnIdx++;
          nextSpawn = rnd(2.6, 3.8);
          Sound.bell();
          renderRail();
        }
        // Geduld läuft ab
        let railDirty = false;
        plates.forEach((p) => {
          if (!p.spawned || p.done) return;
          p.patience += dt * (p === active ? 0.6 : 1);
          if (p.patience >= p.maxPatience) {
            stats.late++;
            combo = 0;
            $('ps-combo').textContent = '×0';
            root.classList.remove('flow');
            Sound.late();
            call(`Tisch ${p.table} wartet zu lange!`, 'miss');
            finishPlate(p, 35);
          }
          railDirty = true;
        });
        if (railDirty && !finished) renderRail();

        // Nadel
        if (active) {
          const speed = 0.5 + active.difficulty * 0.13;
          needle += dir * speed * dt;
          if (needle >= 1) { needle = 1; dir = -1; }
          if (needle <= 0) { needle = 0; dir = 1; }
          $('ps-needle').style.left = needle * 100 + '%';
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      const end = () => {
        finished = true;
        window.removeEventListener('keydown', onKey);
        const scores = plates.map((p) => p.score);
        const avgQ = scores.reduce((a, b) => a + b, 0) / scores.length;
        const insp = plates.filter((p) => p.inspector);
        const inspectorAvg = insp.length ? insp.reduce((a, p) => a + p.score, 0) / insp.length : avgQ;
        const attempts = plates.length + stats.miss;
        const result = { delegated: false, avg: avgQ, inspectorAvg, missRate: (stats.miss + stats.late) / attempts, ...stats };
        const verdict = avgQ >= 88 ? 'Weltklasse-Service. Das Team klatscht am Pass.' : avgQ >= 75 ? 'Starker Abend. Kleine Wackler, große Teller.' : avgQ >= 60 ? 'Durchwachsen. Morgen wird besser.' : 'Ein Abend zum Vergessen. Kopf hoch, Messer schärfen.';
        const sum = el('div', 'pass-summary');
        sum.innerHTML = `
          <span class="eyebrow">Küche ist durch</span>
          <h2>${verdict}</h2>
          <div class="sum-grid">
            <div><b>${Math.round(avgQ)}</b><span>Teller-Schnitt</span></div>
            <div><b>${stats.perfect}</b><span>Perfekt</span></div>
            <div><b>${stats.good}</b><span>Gut</span></div>
            <div><b>${stats.miss}</b><span>Neu gemacht</span></div>
            <div><b>${stats.late}</b><span>Zu spät</span></div>
          </div>
          ${setup.inspTable ? `<p class="muted">Tisch ${setup.inspTable} hat im Schnitt <b>${Math.round(inspectorAvg)}</b> bekommen. Wer das wohl war?</p>` : ''}
          <button class="btn heat big" type="button" id="ps-close">Zur Wochenabrechnung</button>`;
        root.querySelector('.pass-body').replaceWith(sum);
        sum.querySelector('#ps-close').focus();
        sum.querySelector('#ps-close').onclick = () => {
          root.remove();
          document.body.classList.remove('no-scroll');
          onDone(result);
        };
      };
      renderRail();
    },
  };
})();

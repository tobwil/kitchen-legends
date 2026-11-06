/* Oui, Chef! – Karriere, Karte, Laden, Ergebnis, Verleihung */
(function () {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eur = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
  const key = (ch, i) => `${ch}-${i}`;

  const M = {
    save: null,
    app: null,

    load() {
      let s = null;
      try { s = JSON.parse(localStorage.getItem('oui-chef-v1') || 'null'); } catch (e) { s = null; }
      return s && s.v === 1 ? s : { v: 1, name: '', money: 0, up: {}, nights: {}, awards: [], tutDone: false, sound: true, legend: 0 };
    },
    persist() { try { localStorage.setItem('oui-chef-v1', JSON.stringify(this.save)); } catch (e) { /* privat */ } },

    stars(ch, i) { const n = this.save.nights[key(ch, i)]; return n ? n.stars : 0; },
    chapterStars(ch) { let s = 0; for (let i = 0; i < G.NIGHTS_PER_CH - 1; i++) s += this.stars(ch, i); return s; },
    totalStars() { return Object.values(this.save.nights).reduce((a, n) => a + n.stars, 0); },
    unlocked(ch, i) {
      if (ch > 0 && !this.save.awards[ch - 1]) return false;
      if (i === 0) return true;
      if (i === G.NIGHTS_PER_CH - 1) return this.stars(ch, i - 1) >= 1 && this.chapterStars(ch) >= G.BOSS_STARS;
      return this.stars(ch, i - 1) >= 1;
    },
    guideLevel() { let l = 0; this.save.awards.forEach((a, i) => { if (a) l = G.CHAPTERS[i].awardStars; }); return l; },
    guideGlyph(l) { return l === 0.5 ? '◆ Empfehlung' : l >= 1 ? '✦'.repeat(l) : 'noch keine Sterne'; },

    mount(app) {
      this.app = app;
      this.save = this.load();
      G.Audio.setOn(this.save.sound !== false);
      this.title();
    },

    screen(html, cls) {
      if (this.svc) { this.svc.destroy(); this.svc = null; }
      this.app.innerHTML = `<div class="screen ${cls || ''}">${html}</div>`;
      return this.app.firstElementChild;
    },

    /* ---------- Titel ---------- */
    title() {
      const el = this.screen(`
        <canvas class="embers" aria-hidden="true"></canvas>
        <div class="title-wrap">
          <p class="kicker">Kitchen Legends</p>
          <h1 class="logo"><span>Oui,</span><em>Chef!</em></h1>
          <p class="tag">Der Bon druckt. Die Pfanne zischt. Tisch 9 sitzt allein und macht sich Notizen.</p>
          ${this.save.name ? '' : '<label class="name-field"><span>Wie heißt dein Restaurant?</span><input id="rname" maxlength="24" value="Glut &amp; Gold" autocomplete="off"></label>'}
          <button class="big-btn" id="go" type="button">${this.save.name ? 'Weiter kochen' : 'Schürze an'}</button>
          ${this.save.name ? `<p class="sub">${esc(this.save.name)} · ${this.guideGlyph(this.guideLevel())} · ${this.totalStars()} ★</p>` : '<p class="sub">Am besten mit Ton. Hochformat. Daumen bereit.</p>'}
        </div>`, 'title');
      this.embers(el.querySelector('.embers'));
      el.querySelector('#go').onclick = () => {
        G.Audio.init(); G.Audio.bell();
        const n = el.querySelector('#rname');
        if (n) { this.save.name = n.value.trim() || 'Glut & Gold'; this.persist(); }
        if (!this.save.tutDone) this.briefing(0, 0); else this.map();
      };
    },

    embers(cv) {
      const c = cv.getContext('2d');
      const ps = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.06, r: 0.6 + Math.random() * 2.2, ph: Math.random() * 6 }));
      const loop = (ts) => {
        if (!cv.isConnected) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        const t = ts / 1000;
        ps.forEach((p) => {
          p.y -= p.v / 60; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
          const x = (p.x + Math.sin(t * 0.8 + p.ph) * 0.02) * w, y = p.y * h;
          const a = 0.35 + Math.sin(t * 3 + p.ph) * 0.3;
          c.fillStyle = `rgba(255,${120 + Math.round(p.r * 30)},50,${a})`;
          c.beginPath(); c.arc(x, y, p.r, 0, 7); c.fill();
        });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    /* ---------- Karriere-Karte ---------- */
    map(scrollTo) {
      const s = this.save;
      const gl = this.guideLevel();
      const chapters = G.CHAPTERS.map((chp, ch) => {
        const open = ch === 0 || s.awards[ch - 1];
        const nodes = Array.from({ length: G.NIGHTS_PER_CH }, (_, i) => {
          const un = this.unlocked(ch, i);
          const st = this.stars(ch, i);
          const boss = i === G.NIGHTS_PER_CH - 1;
          const cur = un && st === 0;
          const side = ['l', 'c', 'r', 'c', 'l', 'c'][i];
          return `<button type="button" class="node ${side} ${boss ? 'boss' : ''} ${un ? '' : 'locked'} ${cur ? 'cur' : ''} ${st ? 'done' : ''}" data-ch="${ch}" data-i="${i}" ${un ? '' : 'disabled'}>
            <span class="disc">${boss ? '<b class="insp">★</b>' : `<b>${i + 1}</b>`}</span>
            <span class="nstars">${[1, 2, 3].map((k) => `<i class="${k <= st ? 'on' : ''}">★</i>`).join('')}</span>
            <span class="nlabel">${boss ? (un ? 'Inspektoren-Abend' : `Inspektoren ab ${G.BOSS_STARS} ★`) : G.night(ch, i).title}</span>
          </button>`;
        }).join('');
        return `<section class="chapter ${open ? '' : 'closed'}" id="ch${ch}" style="--cc:${chp.color}">
          <header><span class="eyebrow">Kapitel ${ch + 1}</span><h2>${chp.name}</h2><p>${chp.sub}</p>
          <span class="award ${s.awards[ch] ? 'got' : ''}">${s.awards[ch] ? '✓ ' : ''}${chp.award}</span>
          ${open ? `<span class="chstars">${this.chapterStars(ch)} / 15 ★</span>` : '<span class="chstars">Gesperrt</span>'}</header>
          <div class="path">${nodes}</div>
        </section>`;
      }).join('');
      const legendOpen = s.awards[3];
      const el = this.screen(`
        <header class="topbar">
          <div class="plq"><span class="eyebrow">Dein Restaurant</span><b>${esc(s.name || 'Glut & Gold')}</b><span class="guide">${this.guideGlyph(gl)}</span></div>
          <div class="chips"><span class="chip">${this.totalStars()} ★</span><span class="chip gold">${eur(s.money)}</span>
          <button class="chip btn-chip" id="snd" type="button">${s.sound !== false ? 'Ton an' : 'Ton aus'}</button></div>
        </header>
        <div class="scroller" id="scroller">
          ${(() => { const dn = this.dailyNight(); const dd = s.daily && s.daily.date === dn.daily ? s.daily : null; return `<section class="daily"><div><span class="eyebrow">Heute · ${dn.daily}</span><h2>Tagesservice</h2><p>Spezial: <b>${esc(dn.special.name)}</b> · ${dn.mods.map((m) => G.MODS[m].name).join(' + ')}</p>${dd ? `<p class="sub">Heute: ${dd.best} Punkte · Bonus kassiert</p>` : '<p class="sub">Erster Abend heute: +300 € Bonus</p>'}</div><button type="button" class="buy" id="daily">${dd ? 'Nochmal' : 'Spielen'}</button></section>`; })()}
          ${chapters}
          <section class="chapter legend ${legendOpen ? '' : 'closed'}" style="--cc:#e8c46a">
            <header><span class="eyebrow">Endlos</span><h2>Legenden-Service</h2><p>Kein Ende, nur Druck. Wie lange hältst du?</p><span class="chstars">Rekord: ${s.legend || 0}</span></header>
            <div class="path"><button type="button" class="node c boss ${legendOpen ? 'cur' : 'locked'}" data-legend="1" ${legendOpen ? '' : 'disabled'}><span class="disc"><b>∞</b></span><span class="nlabel">${legendOpen ? 'Los' : 'Nach drei Sternen'}</span></button></div>
          </section>
        </div>
        <nav class="bottombar">
          <button type="button" class="nav-btn" id="shop">Mise en place<small>Upgrades</small></button>
          <button type="button" class="nav-btn primary" id="play">Nächster Abend</button>
        </nav>`, 'map');
      el.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => { G.Audio.init(); G.Audio.tap(); this.briefing(+b.dataset.ch, +b.dataset.i); }));
      el.querySelector('#daily').onclick = () => { G.Audio.init(); G.Audio.tap(); this.briefing(0, 98); };
      const lg = el.querySelector('[data-legend]'); if (lg && legendOpen) lg.onclick = () => this.briefing(3, 99);
      el.querySelector('#shop').onclick = () => { G.Audio.init(); G.Audio.tap(); this.shop(); };
      el.querySelector('#snd').onclick = () => { s.sound = s.sound === false; G.Audio.setOn(s.sound !== false); this.persist(); this.map(); };
      const next = this.nextNight();
      el.querySelector('#play').onclick = () => { G.Audio.init(); G.Audio.tap(); this.briefing(next.ch, next.i); };
      const cur = el.querySelector('.node.cur') || el.querySelector(`#ch${scrollTo ?? next.ch}`);
      if (cur) setTimeout(() => cur.scrollIntoView({ block: 'nearest' }), 30);
    },

    today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
    dailyNight() {
      const day = this.today();
      let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      let maxCh = 0; this.save.awards.forEach((a, i) => { if (a) maxCh = Math.min(3, i + 1); });
      const base = G.night(maxCh, 3);
      const mods = Object.keys(G.MODS);
      const m1 = mods[h % mods.length], m2 = mods[(h >> 4) % mods.length];
      const pool = G.DISHES.filter((d) => d.ch <= maxCh);
      const star = pool[(h >> 8) % pool.length];
      return { ...base, i: 98, daily: day, title: 'Tagesservice', mods: [...new Set([m1, m2])], dishes: [star, star, ...pool], dur: 150, special: star };
    },

    nextNight() {
      for (let ch = 0; ch < G.CHAPTERS.length; ch++) for (let i = 0; i < G.NIGHTS_PER_CH; i++) if (this.unlocked(ch, i) && this.stars(ch, i) < 3) return { ch, i };
      return { ch: 0, i: 0 };
    },

    /* ---------- Briefing ---------- */
    briefing(ch, i) {
      const legend = i === 99;
      const daily = i === 98;
      const nt = legend ? this.legendNight() : daily ? this.dailyNight() : G.night(ch, i);
      const best = legend ? this.save.legend || 0 : daily ? ((this.save.daily && this.save.daily.date === nt.daily && this.save.daily.best) || 0) : (this.save.nights[key(ch, i)] || {}).best || 0;
      const el = this.screen(`
        <div class="brief">
          <span class="eyebrow">${legend ? 'Legenden-Service' : daily ? `Heute · ${nt.daily}` : `Kapitel ${ch + 1} · ${G.CHAPTERS[ch].name}`}</span>
          <h2>${nt.boss ? 'Inspektoren-Abend' : legend ? 'Kein Ende in Sicht' : nt.title}</h2>
          ${nt.boss ? `<p class="boss-text">Heute isst jemand vom Guide Céleste bei dir. Tisch 9, allein, drei Gänge. Schnitt ab <b>${80 + ch * 3}</b> und kein Gang darf zu spät kommen – dann gibt es <b>${G.CHAPTERS[ch].award}</b>.</p>` : ''}
          ${nt.mods.length ? `<div class="mods">${nt.mods.map((m) => `<div class="mod"><b>${G.MODS[m].name}</b><span>${G.MODS[m].text}</span></div>`).join('')}</div>` : ''}
          <span class="eyebrow">Auf der Karte</span>
          <div class="dishes">${[...new Set(nt.dishes)].map((d) => `<span class="dish-chip">${d.items.map((x) => `<i style="background:${G.ITEMS[x].col}"></i>`).join('')}${esc(d.name)}</span>`).join('')}</div>
          <span class="eyebrow">Linie</span>
          <div class="dishes">${nt.stations.map((sid) => `<span class="st-chip"><b>${G.STATIONS[sid].name}</b><small>${G.STATIONS[sid].hint}</small></span>`).join('')}</div>
          <p class="sub">${best ? `Bestwert: ${best}` : 'Noch nie gekocht.'} · Service ca. ${Math.round(nt.dur / 60 * 10) / 10} Minuten</p>
          <div class="row">
            <button type="button" class="ghost-btn" id="back">Zurück</button>
            <button type="button" class="big-btn" id="start">Feuer frei!</button>
          </div>
        </div>`, 'briefing');
      el.querySelector('#back').onclick = () => this.map(ch);
      el.querySelector('#start').onclick = () => { G.Audio.init(); this.play(nt, ch, i); };
    },

    legendNight() {
      const nt = G.night(3, 4);
      return { ...nt, n: 30, i: 99, boss: false, title: 'Legenden-Service', dur: 600, interval: 4.2, patience: 30, mods: ['rush', 'hitze'], dishes: G.DISHES, legend: true };
    },

    /* ---------- Spielen ---------- */
    play(nt, ch, i) {
      const el = this.screen('<div class="svc-host" id="svc"></div><div class="countdown" id="cd"></div>', 'service');
      const host = el.querySelector('#svc');
      const cd = el.querySelector('#cd');
      const steps = ['Mise en place …', 'Bons auf die Schiene …', 'SERVICE!'];
      let k = 0;
      const tick = () => {
        cd.textContent = steps[k];
        cd.className = 'countdown show' + (k === 2 ? ' go' : '');
        if (k === 2) G.Audio.bell(); else G.Audio.tap();
        k++;
        if (k < 3) setTimeout(tick, 650);
        else setTimeout(() => { cd.className = 'countdown'; start(); }, 650);
      };
      const start = () => {
        this.svc = new G.Service(host, nt, this.save, (res) => this.results(res, nt, ch, i));
        this.svc.onPause = (p) => this.pause(p);
        this.persist();
      };
      if (nt.n === 0 && !this.save.tutDone) start(); else tick();
    },

    pause(on) {
      const old = this.app.querySelector('.pause');
      if (old) old.remove();
      if (!on) return;
      const d = document.createElement('div');
      d.className = 'pause';
      d.innerHTML = `<div class="card"><h2>Pause</h2><p>Die Gäste warten. Die Pfannen auch.</p>
        <button type="button" class="big-btn" id="res">Weiter</button>
        <button type="button" class="ghost-btn" id="quit">Abend abbrechen</button></div>`;
      this.app.firstElementChild.appendChild(d);
      d.querySelector('#res').onclick = () => this.svc.togglePause();
      d.querySelector('#quit').onclick = () => this.map();
    },

    /* ---------- Ergebnis ---------- */
    results(res, nt, ch, i) {
      const s = this.save;
      const legend = !!nt.legend;
      const daily = !!nt.daily;
      let tips = Math.round(res.score / 8 * (1 + 0.15 * (s.up.salon || 0)));
      let bonus = 0;
      if (daily && !(s.daily && s.daily.date === nt.daily)) { bonus = 300 + res.stars * 100; s.daily = { date: nt.daily, best: 0 }; }
      tips += bonus;
      s.money += tips;
      let newBest = false;
      if (legend) { if (res.score > (s.legend || 0)) { s.legend = res.score; newBest = true; } }
      else if (daily) { if (res.score > s.daily.best) { s.daily.best = res.score; newBest = true; } }
      else {
        const k = key(ch, i);
        const prev = s.nights[k] || { stars: 0, best: 0 };
        if (res.score > prev.best) newBest = true;
        let stars = res.stars;
        if (nt.boss && !res.inspPassed) stars = Math.min(stars, prev.stars);
        s.nights[k] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, res.score) };
      }
      const awardNow = nt.boss && res.inspPassed && !s.awards[ch];
      if (nt.boss && res.inspPassed) s.awards[ch] = true;
      this.persist();
      const shownStars = nt.boss && !res.inspPassed ? 0 : res.stars;
      const review = G.REVIEWS[shownStars][Math.floor(Math.random() * G.REVIEWS[shownStars].length)];
      const el = this.screen(`
        <div class="results">
          <span class="eyebrow">${legend ? 'Legenden-Service' : nt.title} · Küche ist durch${bonus ? ` · Tagesbonus +${eur(bonus)}` : ''}</span>
          <div class="bigstars">${[0, 1, 2].map((k) => `<i class="${k < shownStars ? 'on' : ''}" style="animation-delay:${0.3 + k * 0.45}s">★</i>`).join('')}</div>
          <div class="score"><b id="cnt">0</b><span>Punkte${newBest ? ' · <em>Neuer Rekord!</em>' : ''}</span></div>
          ${nt.boss ? `<div class="insp-res ${res.inspPassed ? 'ok' : 'no'}"><b>${res.inspPassed ? 'Der Einzelgast an Tisch 9 hat gelächelt.' : 'Der Einzelgast an Tisch 9 war nicht überzeugt.'}</b><span>Schnitt seiner Teller: ${res.inspAvg} (nötig: ${res.inspNeed})${res.inspPassed ? '' : ' · Probier es nochmal.'}</span></div>` : ''}
          <dl class="stats">
            <div><dt>Teller</dt><dd>${res.served}</dd></div>
            <div><dt>Perfekt</dt><dd>${res.perfects}</dd></div>
            <div><dt>Bester Flow</dt><dd>×${res.bestCombo}</dd></div>
            <div><dt>Verbrannt</dt><dd>${res.burnt}</dd></div>
            <div><dt>Gegangen</dt><dd>${res.lost}</dd></div>
            <div><dt>Trinkgeld</dt><dd class="gold">+${eur(tips)}</dd></div>
          </dl>
          <blockquote>${review}</blockquote>
          ${legend ? '' : `<p class="sub">Sterne bei ${res.th.join(' · ')} Punkten</p>`}
          <div class="row">
            <button type="button" class="ghost-btn" id="again">Nochmal</button>
            <button type="button" class="big-btn" id="next">${awardNow ? 'Das Telefon klingelt …' : 'Weiter'}</button>
          </div>
        </div>`, 'resultscreen');
      // Hochzählen
      const cnt = el.querySelector('#cnt');
      const t0 = performance.now();
      const up = (ts) => { const k = Math.min(1, (ts - t0) / 1100); cnt.textContent = Math.round(res.score * (1 - Math.pow(1 - k, 3))); if (k < 1 && cnt.isConnected) requestAnimationFrame(up); };
      requestAnimationFrame(up);
      for (let k = 0; k < shownStars; k++) setTimeout(() => G.Audio.star(k), 300 + k * 450);
      if (newBest) setTimeout(() => G.Audio.coin(), 1200);
      el.querySelector('#again').onclick = () => (legend ? this.briefing(3, 99) : daily ? this.briefing(0, 98) : this.briefing(ch, i));
      el.querySelector('#next').onclick = () => (awardNow ? this.ceremony(ch) : this.map(ch));
    },

    /* ---------- Der Anruf ---------- */
    ceremony(ch) {
      const chp = G.CHAPTERS[ch];
      const lvl = chp.awardStars;
      const el = this.screen(`
        <div class="phone-stage" id="ps">
          <div class="phone"><span class="eyebrow">Eingehender Anruf</span><b>Unbekannte Nummer</b><span>Guide Céleste · Redaktion</span><div class="ring"></div></div>
          <button type="button" class="big-btn" id="pick">Abheben</button>
        </div>
        <div class="reveal" id="rv" hidden>
          <span class="eyebrow">Guide Céleste</span>
          <h2>${esc(this.save.name)}</h2>
          <div class="cstars">${lvl >= 1 ? Array.from({ length: lvl }, (_, k) => `<i style="animation-delay:${0.4 + k * 0.7}s">✦</i>`).join('') : '<i class="rec" style="animation-delay:.4s">◆</i>'}</div>
          <p class="award-name">${chp.award}</p>
          <p class="quote">${lvl >= 3 ? '„Eine einzigartige Küche. Eine eigene Reise wert.“' : lvl >= 2 ? '„Eine herausragende Küche. Einen Umweg wert.“' : lvl >= 1 ? '„Eine Küche voller Finesse. Einen Stopp wert.“' : '„Ein Haus, das man im Auge behalten sollte.“'}</p>
          ${ch + 1 < G.CHAPTERS.length ? `<p class="sub">Neu: Kapitel ${ch + 2} · ${G.CHAPTERS[ch + 1].name}${G.CHAPTERS[ch + 1].stations.length > G.CHAPTERS[ch].stations.length ? ' · neue Station: ' + G.STATIONS[G.CHAPTERS[ch + 1].stations.slice(-1)[0]].name : ''}</p>` : '<p class="sub">Der Legenden-Service ist offen.</p>'}
          <button type="button" class="big-btn" id="go">Zurück an den Herd</button>
        </div>
        <canvas class="confetti" aria-hidden="true"></canvas>`, 'ceremony');
      let ringT = setInterval(() => G.Audio.phone(), 1100);
      G.Audio.phone();
      el.querySelector('#pick').onclick = () => {
        clearInterval(ringT);
        el.querySelector('#ps').hidden = true;
        el.querySelector('#rv').hidden = false;
        for (let k = 0; k < Math.max(1, lvl); k++) setTimeout(() => { G.Audio.star(k); G.Audio.haptic(30); }, 400 + k * 700);
        this.confetti(el.querySelector('.confetti'));
      };
      el.querySelector('#go').onclick = () => { clearInterval(ringT); this.map(ch + 1); };
    },

    confetti(cv) {
      const c = cv.getContext('2d');
      const cols = ['#e8c46a', '#ff6b1f', '#f3ead8', '#7cc495'];
      const ps = Array.from({ length: 160 }, () => ({ x: Math.random(), y: -Math.random() * 0.6, vx: (Math.random() - 0.5) * 0.15, vy: 0.15 + Math.random() * 0.3, r: Math.random() * 6, col: cols[Math.floor(Math.random() * 4)], rot: Math.random() * 6 }));
      let last = performance.now();
      const loop = (ts) => {
        if (!cv.isConnected) return;
        const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
        ps.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4; c.save(); c.translate(p.x * w, p.y * h); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r / 2, -p.r, p.r, p.r * 2); c.restore(); });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    /* ---------- Laden ---------- */
    shop() {
      const s = this.save;
      const el = this.screen(`
        <header class="topbar"><div class="plq"><span class="eyebrow">Mise en place</span><b>Upgrades</b></div><div class="chips"><span class="chip gold">${eur(s.money)}</span></div></header>
        <div class="scroller shop-list">
          <p class="sub">Trinkgeld aus jedem Abend investierst du hier. Jedes Upgrade macht den Druck beherrschbarer.</p>
          ${G.UPGRADES.map((u) => {
            const lvl = s.up[u.id] || 0;
            const max = lvl >= u.costs.length;
            const cost = max ? 0 : u.costs[lvl];
            return `<article class="upg ${max ? 'max' : ''}">
              <div><b>${u.name}</b><span>${u.desc}</span><span class="pips">${u.costs.map((_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('')}</span></div>
              ${max ? '<span class="chip">Voll</span>' : `<button type="button" class="buy" data-u="${u.id}" ${s.money < cost ? 'disabled' : ''}>${eur(cost)}</button>`}
            </article>`;
          }).join('')}
        </div>
        <nav class="bottombar"><button type="button" class="nav-btn primary" id="back">Zurück zur Karte</button></nav>`, 'shop');
      el.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => {
        const u = G.UPGRADES.find((x) => x.id === b.dataset.u);
        const lvl = s.up[u.id] || 0;
        if (s.money < u.costs[lvl]) return;
        s.money -= u.costs[lvl];
        s.up[u.id] = lvl + 1;
        this.persist();
        G.Audio.coin(); G.Audio.haptic(15);
        this.shop();
      }));
      el.querySelector('#back').onclick = () => this.map();
    },
  };

  G.Meta = M;
})();

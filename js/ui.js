/* Kitchen Legends – Oberfläche */
(function () {
  const { clamp, avg } = KL.util;
  const eur = (n) => (Math.round(n) < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('de-DE') + ' €';
  const pct = (n) => Math.round(n * 100) + ' %';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const starGlyphs = (lvl, big) => {
    if (lvl === 0.5) return `<span class="stars rec${big ? ' big' : ''}" aria-label="Empfehlung">◆</span>`;
    if (!lvl) return `<span class="stars none${big ? ' big' : ''}" aria-label="keine Sterne">–</span>`;
    return `<span class="stars${big ? ' big' : ''}" aria-label="${lvl} Sterne">${'✦'.repeat(lvl)}</span>`;
  };
  KL.fmt = { eur, pct, esc, starGlyphs };

  const TABS = [
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'chef', label: 'Chef*in' },
    { id: 'zentrale', label: 'Büro & Guide' },
    { id: 'testkueche', label: 'Testküche' },
    { id: 'menue', label: 'Menü & Preise' },
    { id: 'einkauf', label: 'Einkauf & Logistik' },
    { id: 'wein', label: 'Weinkeller' },
    { id: 'team', label: 'Brigade' },
    { id: 'raum', label: 'Renovierung' },
  ];

  const UI = {
    s: null,
    tab: 'restaurant',
    build: { on: false, type: null, moving: null, sel: null },
    lab: { product: 'saibling', technique: 'gebeizt', accent: 'fichte', texture: 'chip' },

    mount(state) {
      this.s = state;
      try { const t = localStorage.getItem('kl-tab'); if (t && TABS.some((x) => x.id === t)) this.tab = t; } catch (e) { /* egal */ }
      this.render();
    },

    save() {
      const done = KL.checkQuests(this.s);
      done.forEach((q, i) => setTimeout(() => this.toast(`Quest erfüllt: ${q.name} · +${q.xp} XP`, 'good'), i * 400));
      KL.save(this.s);
      if (this.s.levelUps && !this.busy) setTimeout(() => this.showLevelUp(), 300);
    },
    setTab(id) {
      this.tab = id;
      try { localStorage.setItem('kl-tab', id); } catch (e) { /* egal */ }
      this.render();
      const main = document.getElementById('main');
      if (main) main.scrollTop = 0;
      window.scrollTo({ top: 0 });
    },

    toast(text, kind) {
      const t = document.createElement('div');
      t.className = 'toast ' + (kind || '');
      t.textContent = text;
      document.body.appendChild(t);
      setTimeout(() => t.classList.add('out'), 2200);
      setTimeout(() => t.remove(), 2700);
    },

    render() {
      const s = this.s;
      const app = document.getElementById('app');
      const f = KL.forecast(s);
      this.f = f;
      const wiy = KL.weekOfYear(s);
      app.innerHTML = `
        <header class="topbar">
          <div class="brand">
            <span class="eyebrow">${esc(s.chef.name)} · ${esc(KL.byId(KL.LOCATIONS, s.location).name)}</span>
            <h1>${esc(s.name)} ${starGlyphs(s.stars)}${s.green ? '<span class="green-star" title="Grüner Stern">✦</span>' : ''}</h1>
            <button type="button" class="lvl" data-tab-go="chef" title="Charakter öffnen">Level ${s.chef.level}${s.chef.points ? ` · <b>${s.chef.points} Talentpunkt${s.chef.points > 1 ? 'e' : ''}</b>` : ''}<span class="xpbar"><i style="width:${(s.chef.xp / KL.xpFor(s.chef.level)) * 100}%"></i></span></button>
          </div>
          <dl class="kpis">
            <div><dt>Konto</dt><dd class="${s.money < 0 ? 'neg' : ''}">${eur(s.money)}</dd></div>
            <div><dt>Ruf</dt><dd>${Math.round(s.rep)}<small>/100</small></dd></div>
            <div><dt>Buzz</dt><dd>${Math.round(s.buzz)}</dd></div>
            <div><dt>Energie</dt><dd class="${s.chef.energy < 30 ? 'neg' : ''}">${Math.round(s.chef.energy)}<small>%</small></dd></div>
            <div><dt>Jahr ${s.year} · ${KL.season(s).name}</dt><dd>Woche ${wiy}<small>/${KL.WEEKS_PER_YEAR}</small></dd></div>
          </dl>
        </header>
        <nav class="tabs" aria-label="Bereiche">
          ${TABS.map((t) => `<button type="button" class="tab ${t.id === this.tab ? 'on' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
          <button type="button" class="tab service-cta" data-act="service">Service starten →</button>
        </nav>
        <main id="main" class="main">${this[this.tab](s, f)}</main>
        <footer class="foot"><span>Kitchen Legends · Prototyp</span><button class="linkish" type="button" data-act="newgame">Neues Spiel</button></footer>`;
      app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.setTab(b.dataset.tab)));
      this.bind(app);
      this.mountWorld();
      this.mountPortrait();
      if (s.pendingEvent && !this.busy) this.showEvent();
    },

    /* ---------------- ZENTRALE ---------------- */
    zentrale(s, f) {
      const wiy = KL.weekOfYear(s);
      const insp = f.insp;
      const visitsDone = s.inspections.visits.length;
      const next = KL.STAR_LEVELS.find((l) => l.level > s.stars) || KL.STAR_LEVELS[4];
      const weeks = Array.from({ length: KL.WEEKS_PER_YEAR }, (_, i) => {
        const w = i + 1;
        const v = s.inspections.visits.find((x) => x.week === w);
        const cls = w < wiy ? 'past' : w === wiy ? 'now' : '';
        return `<li class="${cls}${v ? ' visited' : ''}" title="Woche ${w}${v ? ' – Inspektion' : ''}"><span>${w}</span></li>`;
      }).join('');
      const checklist = this.checklist(s, f);
      const last = s.lastReport;
      return `
      <section class="hero-card">
        <div class="hero-left">
          <span class="eyebrow">Guide Céleste · Prognose aus dem Branchenflüstern</span>
          <div class="score-ring" style="--p:${clamp(insp.score, 0, 100)}">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" pathLength="100" stroke-dasharray="${clamp(insp.score, 0, 100)} 100"/></svg>
            <div><b>${Math.round(insp.score)}</b><span>Inspektor-Score</span></div>
          </div>
          <p class="hero-goal">Nächstes Ziel: <b>${next.name}</b> ab ${next.min} Punkten.</p>
        </div>
        <div class="hero-right">
          ${KL.CRITERIA.map((c) => this.bar(c.name, insp.crit[c.id], next.min)).join('')}
          <p class="fine">Die Sterne gibt es nur für den Teller. Raum, Wein und Service bringen Gäste und Geld, aber keine Sterne.</p>
        </div>
      </section>

      <section class="year">
        <div class="year-head"><h2>Guide-Jahr ${s.year}</h2><span class="muted">${visitsDone ? `${visitsDone} Inspektion${visitsDone > 1 ? 'en' : ''} bestätigt` : 'Noch keine Inspektion bemerkt'} · Verleihung nach Woche ${KL.WEEKS_PER_YEAR}</span></div>
        <ol class="weeks">${weeks}</ol>
      </section>

      <div class="grid-2">
        <section class="panel">
          <h2>Diese Woche</h2>
          ${checklist}
          <dl class="mini">
            <div><dt>Erwartete Gäste</dt><dd>${f.covers}</dd></div>
            <div><dt>Erwarteter Gewinn</dt><dd class="${f.profit < 0 ? 'neg' : 'pos'}">${eur(f.profit)}</dd></div>
            <div><dt>Gästezufriedenheit</dt><dd>${Math.round(f.sat)}</dd></div>
            <div><dt>Küchenstärke</dt><dd>${f.kitchen.strength}</dd></div>
          </dl>
          <div class="row gap">
            <button class="btn heat" type="button" data-act="service">Service am Pass spielen</button>
            <button class="btn ghost" type="button" data-act="delegate">Souschef übernimmt</button>
            <button class="btn ghost" type="button" data-act="close">Betriebsferien</button>
          </div>
          <p class="fine">Selbst am Pass: bessere Teller und die Reife der Gerichte steigt schneller. Delegieren schont deine Energie. Betriebsferien kosten Fixkosten, bringen +45 Energie.</p>
        </section>
        <section class="panel">
          <h2>Letzte Woche</h2>
          ${last ? this.reportSummary(last) : '<p class="muted">Noch kein Service gelaufen. Die Gäste warten.</p>'}
        </section>
      </div>

      <div class="grid-2">
        <section class="panel">
          <h2>Kassenbuch</h2>
          ${this.chart(s)}
        </section>
        <section class="panel">
          <h2>Was die Leute sagen</h2>
          <ul class="feed">${s.reviews.slice(0, 5).map((r) => `<li><span class="eyebrow">${r.src} · Woche ${r.week} · ${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>„${esc(r.text)}“</li>`).join('') || '<li class="muted">Noch keine Rezensionen.</li>'}</ul>
          <h3>Chronik</h3>
          <ul class="feed small">${s.news.slice(0, 5).map((n) => `<li><span class="eyebrow">Woche ${n.week}</span>${esc(n.text)}</li>`).join('')}</ul>
        </section>
      </div>`;
    },

    checklist(s, f) {
      const items = [];
      if (f.menu.courses < 4) items.push(['warn', 'Menü hat weniger als 4 Gänge.', 'menue']);
      f.menu.issues.forEach((i) => items.push(['warn', i, 'menue']));
      if (f.menu.outOfSeason.length) items.push(['warn', `Außerhalb der Saison: ${f.menu.outOfSeason.join(', ')}`, 'einkauf']);
      f.kitchen.notes.forEach((n) => items.push(['warn', n, 'team']));
      if (!f.pairing.nonAlc && !f.pairing.hasWine) items.push(['warn', 'Weinkeller leer. Keine Weinbegleitung möglich.', 'wein']);
      if (f.foodCostPct > 38) items.push(['warn', `Wareneinsatz bei ${Math.round(f.foodCostPct)} % – Profis zielen auf 25–33 %.`, 'menue']);
      if (f.priceFactor < 0.55) items.push(['warn', 'Der Menüpreis schreckt Gäste ab.', 'menue']);
      if (f.covers && Math.abs(s.orderCovers - f.covers) / f.covers > 0.25) items.push(['info', `Bestellmenge (${s.orderCovers}) weicht stark von der Prognose (${f.covers}) ab.`, 'einkauf']);
      if (s.chef.energy < 35) items.push(['warn', 'Du läufst auf Reserve. Denk an Betriebsferien.', null]);
      if (!items.length) items.push(['ok', 'Alles bereit. Feuer frei.', null]);
      return `<ul class="checklist">${items.map(([k, t, tab]) => `<li class="${k}">${tab ? `<button type="button" class="linkish" data-tab-go="${tab}">${esc(t)}</button>` : esc(t)}</li>`).join('')}</ul>`;
    },

    bar(label, v, mark) {
      return `<div class="cbar"><span class="cbar-label">${label}</span><span class="cbar-track"><i style="width:${clamp(v, 0, 100)}%"></i>${mark ? `<em style="left:${mark}%" title="Ziel"></em>` : ''}</span><b>${Math.round(v)}</b></div>`;
    },

    reportSummary(r) {
      if (r.closed) return `<p>Betriebsferien. Fixkosten: <b>${eur(r.costTotal)}</b>.</p>${r.hints.map((h) => `<p class="hint">${esc(h)}</p>`).join('')}`;
      return `
        <dl class="mini">
          <div><dt>Gäste</dt><dd>${r.covers}</dd></div>
          <div><dt>Umsatz</dt><dd>${eur(r.revenue)}</dd></div>
          <div><dt>Gewinn</dt><dd class="${r.profit < 0 ? 'neg' : 'pos'}">${eur(r.profit)}</dd></div>
          <div><dt>Zufriedenheit</dt><dd>${r.sat}</dd></div>
        </dl>
        ${r.hints.map((h) => `<p class="hint">${esc(h)}</p>`).join('')}
        ${r.events.map((h) => `<p class="hint warn">${esc(h)}</p>`).join('')}`;
    },

    chart(s) {
      const h = s.history.slice(-16);
      if (h.length < 2) return '<p class="muted">Ab der zweiten Woche siehst du hier Kontostand und Wochengewinn.</p>';
      const W = 520, H = 180, P = { l: 52, r: 12, t: 12, b: 26 };
      const vals = h.map((x) => x.money).concat(h.map((x) => x.profit)).concat([0]);
      let lo = Math.min(...vals), hi = Math.max(...vals);
      const span = hi - lo || 1;
      lo -= span * 0.08; hi += span * 0.08;
      const x = (i) => P.l + (i * (W - P.l - P.r)) / (h.length - 1);
      const y = (v) => P.t + ((hi - v) * (H - P.t - P.b)) / (hi - lo);
      const line = h.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.money).toFixed(1)}`).join('');
      const area = `${line}L${x(h.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`;
      const bw = Math.max(4, (W - P.l - P.r) / h.length - 6);
      const bars = h.map((d, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${Math.min(y(0), y(d.profit)).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y(0) - y(d.profit)).toFixed(1)}" class="${d.profit < 0 ? 'b-neg' : 'b-pos'}"><title>Woche ${d.week}: ${eur(d.profit)}</title></rect>`).join('');
      const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1].map((v) => `<g><line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v / 1000)}k</text></g>`).join('');
      const lastP = h[h.length - 1];
      return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Kontostand und Wochengewinn">
        ${ticks}
        <line x1="${P.l}" x2="${W - P.r}" y1="${y(0)}" y2="${y(0)}" class="zero"/>
        ${bars}
        <path d="${area}" class="area"/>
        <path d="${line}" class="line"/>
        <circle cx="${x(h.length - 1)}" cy="${y(lastP.money)}" r="4" class="dot"/>
        <text x="${P.l}" y="${H - 6}">Woche ${h[0].week}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end">Woche ${lastP.week}</text>
      </svg></div><p class="legend"><span class="lg-line"></span>Kontostand <span class="lg-bar"></span>Wochengewinn</p>`;
    },

    /* ---------------- TESTKÜCHE ---------------- */
    testkueche(s) {
      const L = this.lab;
      const d = { product: L.product, technique: L.technique, accent: L.accent, texture: L.texture, maturity: 0 };
      const e = KL.evalDish(s, d);
      const p = KL.byId(KL.PRODUCTS, L.product);
      const target = KL.TARGETS[p.type];
      const sea = KL.season(s).id;
      const opt = (arr, key, label, extra) => `
        <fieldset class="picker">
          <legend>${label}</legend>
          <div class="chips">${arr.map((x) => {
            const locked = x.eq && !s.equipment.includes(x.eq) && !(x.id === 'fermentiert' && KL.hasPerk(s, 'fermentation'));
            const off = x.seasons && x.seasons.length && !x.seasons.includes(sea);
            return `<button type="button" class="chip ${L[key] === x.id ? 'on' : ''} ${off ? 'offseason' : ''}" data-lab="${key}" data-id="${x.id}" ${locked ? 'disabled title="Benötigt ' + esc(KL.byId(KL.EQUIPMENT, x.eq).name) + '"' : ''}>${esc(x.name)}${locked ? ' 🔒' : ''}${extra ? extra(x) : ''}</button>`;
          }).join('')}</div>
        </fieldset>`;
      const known = s.dishes.some((x) => x.product === L.product && x.technique === L.technique && x.accent === L.accent && x.texture === L.texture);
      const comboTag = e.bold ? `<span class="tag bold">Mutige Kombi: ${e.bold}</span>` : e.classic ? `<span class="tag classic">Klassiker: ${e.classic}</span>` : '';
      return `
      <div class="lab">
        <div class="lab-pickers">
          ${opt(KL.PRODUCTS, 'product', 'Hauptprodukt', (x) => `<small>${x.type === 'dessert' ? 'süß' : ''}${x.seasons.length ? ' · ' + x.seasons.map((id) => KL.byId(KL.SEASONS, id).name.slice(0, 3)).join('/') : ''}</small>`)}
          ${opt(KL.TECHNIQUES, 'technique', 'Technik')}
          ${opt(KL.ACCENTS, 'accent', 'Begleiter & Sauce')}
          ${opt(KL.TEXTURES, 'texture', 'Textur-Element')}
        </div>
        <aside class="lab-plate">
          <div class="plate-card">
            <span class="eyebrow">Neuer Teller · ${p.type === 'dessert' ? 'Dessert' : 'Herzhaft'}</span>
            <h2 class="dish-title">${esc(KL.dishName(d))}</h2>
            <p class="muted">${esc(KL.byId(KL.TECHNIQUES, L.technique).name)}</p>
            ${comboTag}
            <div class="flavor">
              ${KL.FLAVORS.map((fl, i) => {
                const [lo, hi] = target[i];
                const v = e.flav[i];
                const ok = v >= lo && v <= hi;
                return `<div class="fl"><span>${fl}</span><span class="fl-track"><em style="left:${(lo / 7) * 100}%;width:${((hi - lo) / 7) * 100}%"></em><i class="${ok ? '' : 'off'}" style="width:${(v / 7) * 100}%"></i></span><b>${v}</b></div>`;
              }).join('')}
              <p class="fine">Helles Band = Zielkorridor für ${p.type === 'dessert' ? 'Desserts' : 'herzhafte Gänge'}.</p>
            </div>
            <div class="plate-stats">
              <div><b>${e.harmony}</b><span>Harmonie</span></div>
              <div><b>${e.creativity}</b><span>Kreativität</span></div>
              <div><b>${e.difficulty}/5</b><span>Schwierigkeit</span></div>
              <div><b>${e.baseCost.toFixed(2).replace('.', ',')} €</b><span>Ware/Teller</span></div>
            </div>
            <p class="small">Texturen: ${e.texes.join(', ')} · Wein: ${KL.WINE_STYLES[e.wine]}${e.inSeason ? '' : ' · <b class="neg">außerhalb der Saison</b>'}</p>
            ${e.notes.length ? `<p class="hint warn">${e.notes.map(esc).join(' · ')}</p>` : ''}
            <button class="btn heat" type="button" data-act="cook" ${known ? 'disabled' : ''}>${known ? 'Schon im Rezeptbuch' : 'Probekochen & ins Rezeptbuch (−150 €)'}</button>
          </div>
        </aside>
      </div>
      <section class="panel">
        <h2>Rezeptbuch <span class="muted">(${s.dishes.length})</span></h2>
        <div class="book">${s.dishes.map((x) => this.dishCard(s, x)).join('')}</div>
      </section>`;
    },

    dishCard(s, d) {
      const e = KL.evalDish(s, d);
      const onMenu = s.menu.includes(d.id);
      return `<article class="dish ${onMenu ? 'onmenu' : ''}">
        <header><span class="eyebrow">${e.type === 'dessert' ? 'Dessert' : 'Herzhaft'} · ${esc(KL.byId(KL.TECHNIQUES, d.technique).name)}</span><h3>${esc(KL.dishName(d))}</h3></header>
        <div class="dish-stats"><span>Harmonie <b>${e.harmony}</b></span><span>Kreativ <b>${e.creativity}</b></span><span>Reife <b>${Math.round(d.maturity)} %</b></span></div>
        <div class="mat"><i style="width:${d.maturity}%"></i></div>
        ${e.bold ? `<span class="tag bold">${e.bold}</span>` : e.classic ? `<span class="tag classic">${e.classic}</span>` : ''}
        <div class="row gap">
          ${onMenu ? '<span class="pill">Auf der Karte</span>' : `<button type="button" class="btn small" data-act="addmenu" data-id="${d.id}">Auf die Karte</button><button type="button" class="btn small ghost" data-act="deldish" data-id="${d.id}">Streichen</button>`}
        </div>
      </article>`;
    },

    /* ---------------- MENÜ ---------------- */
    menue(s, f) {
      const dishes = KL.menuDishes(s);
      const options = (sel) => s.dishes.map((d) => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(KL.dishName(d))}</option>`).join('');
      const courseNames = ['Amuse-Bouche', 'Erster Gang', 'Zweiter Gang', 'Fischgang', 'Zwischengang', 'Hauptgang', 'Pré-Dessert', 'Dessert'];
      const label = (i, n) => (i === n - 1 ? 'Finale' : i === 0 ? 'Auftakt' : `Gang ${i + 1}`);
      const exp = f.expected;
      return `
      <div class="grid-2">
        <section class="panel menu-card">
          <span class="eyebrow">Degustationsmenü · ${dishes.length} Gänge</span>
          <h2 class="menu-title">${esc(s.name)}</h2>
          <ol class="courses">
            ${dishes.map((d, i) => {
              const e = KL.evalDish(s, d);
              return `<li>
                <span class="c-no">${label(i, dishes.length)}</span>
                <label class="sr" for="course-${i}">Gang ${i + 1}</label>
                <select id="course-${i}" data-course="${i}">${options(d.id)}</select>
                <span class="c-meta">H ${e.harmony} · K ${e.creativity} · Reife ${Math.round(d.maturity)} %${e.inSeason ? '' : ' · <b class="neg">Saison!</b>'}</span>
                <span class="c-ctrl">
                  <button type="button" class="icon" data-act="up" data-i="${i}" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>↑</button>
                  <button type="button" class="icon" data-act="down" data-i="${i}" aria-label="Nach unten" ${i === dishes.length - 1 ? 'disabled' : ''}>↓</button>
                  <button type="button" class="icon" data-act="rm" data-i="${i}" aria-label="Entfernen">×</button>
                </span>
              </li>`;
            }).join('')}
          </ol>
          <div class="row gap">
            <button type="button" class="btn small" data-act="addcourse" ${dishes.length >= 8 || s.dishes.length <= dishes.length ? 'disabled' : ''}>+ Gang hinzufügen</button>
            <span class="muted small">Max. 8 Gänge. Neue Gerichte entstehen in der Testküche.</span>
          </div>
          ${f.menu.issues.length ? `<ul class="checklist">${f.menu.issues.map((i) => `<li class="warn">${esc(i)}</li>`).join('')}</ul>` : ''}
          <div class="menu-scores">
            ${this.bar('Produktqualität', f.menu.product)}
            ${this.bar('Harmonie', f.menu.harmony)}
            ${this.bar('Handschrift', f.menu.creativity)}
            ${this.bar('Reife (Ø)', f.menu.maturity)}
          </div>
          ${f.menu.signature ? `<p class="hint">Signature-Gericht: <b>${esc(KL.dishName(f.menu.signature))}</b> (+Handschrift)</p>` : '<p class="fine">Ein Gericht mit Reife ≥ 80 % und Kreativität ≥ 70 wird zum Signature-Gericht.</p>'}
        </section>
        <section class="panel">
          <h2>Preise & Öffnung</h2>
          <div class="field">
            <label for="price">Menüpreis <b>${eur(s.price)}</b></label>
            <input type="range" id="price" min="39" max="420" step="1" value="${s.price}" data-set="price">
            <p class="fine">Gäste erwarten heute etwa <b>${eur(exp)}</b>. Darüber sinkt die Nachfrage spürbar.</p>
          </div>
          <div class="field">
            <label for="pairing">Weinbegleitung <b>${eur(s.pairingPrice)}</b></label>
            <input type="range" id="pairing" min="19" max="320" step="1" value="${s.pairingPrice}" data-set="pairingPrice">
            <p class="fine">Quote heute: ${pct(f.pairingTake)} der Gäste. Faustregel: 50–70 % des Menüpreises.</p>
          </div>
          <div class="field">
            <span class="label">Öffnungstage pro Woche</span>
            <div class="seg">${[4, 5, 6].map((n) => `<button type="button" class="${s.openDays === n ? 'on' : ''}" data-act="days" data-n="${n}">${n} Tage</button>`).join('')}</div>
            <p class="fine">Mehr Tage = mehr Umsatz, weniger Energie und Moral.</p>
          </div>
          <dl class="mini">
            <div><dt>Wareneinsatz/Gast</dt><dd>${eur(f.menu.foodCost)}</dd></div>
            <div><dt>Wareneinsatz-Quote</dt><dd class="${f.foodCostPct > 38 ? 'neg' : f.foodCostPct < 34 ? 'pos' : ''}">${Math.round(f.foodCostPct)} %</dd></div>
            <div><dt>Gäste/Woche (Prognose)</dt><dd>${f.covers} <small>von ${f.seats * f.days}</small></dd></div>
            <div><dt>Umsatz (Prognose)</dt><dd>${eur(f.revenue)}</dd></div>
            <div><dt>Kosten (Prognose)</dt><dd>${eur(f.costTotal)}</dd></div>
            <div><dt>Gewinn (Prognose)</dt><dd class="${f.profit < 0 ? 'neg' : 'pos'}">${eur(f.profit)}</dd></div>
          </dl>
        </section>
      </div>`;
    },

    /* ---------------- EINKAUF ---------------- */
    einkauf(s, f) {
      const menuCats = new Set(f.menu.evals.map(({ e }) => e.cat));
      return `
      <section class="panel">
        <h2>Lieferanten</h2>
        <p class="muted">Produktqualität ist eines der fünf Kriterien der Inspektoren. Regionale Lieferanten zählen für den Grünen Stern.</p>
        <div class="supplier-grid">
          ${KL.CATEGORIES.map((c) => `
            <fieldset class="supplier ${menuCats.has(c.id) ? '' : 'idle'}">
              <legend>${c.name}${menuCats.has(c.id) ? '' : ' <small>(nicht auf der Karte)</small>'}</legend>
              ${KL.SUPPLIERS.map((sp) => {
                const locked = s.rep < sp.minRep && !KL.hasPerk(s, 'netzwerk');
                return `<label class="radio ${locked ? 'locked' : ''}">
                  <input type="radio" name="sup-${c.id}" value="${sp.id}" ${s.suppliers[c.id] === sp.id ? 'checked' : ''} ${locked ? 'disabled' : ''} data-sup="${c.id}">
                  <span><b>${sp.name}</b><small>Qualität ${sp.q} · Preis ×${sp.cost.toString().replace('.', ',')} · Zuverlässig ${Math.round(sp.rel * 100)} %${sp.regional ? ' · regional' : ''}${locked ? ` · ab Ruf ${sp.minRep}` : ''}</small></span>
                </label>`;
              }).join('')}
            </fieldset>`).join('')}
        </div>
      </section>
      <div class="grid-2">
        <section class="panel">
          <h2>Bestellung & Lager</h2>
          <div class="field">
            <label for="order">Ware für <b>${s.orderCovers}</b> Gedecke bestellen</label>
            <input type="range" id="order" min="0" max="${Math.max(60, f.seats * 6)}" step="1" value="${s.orderCovers}" data-set="orderCovers">
            <p class="fine">Prognose: ${f.covers} Gäste. Zu wenig = Gerichte aus („86“), teure Nachkäufe, Frust. Zu viel = Verderb (${s.equipment.includes('kuehlhaus') ? '35' : '70'} % des Überschusses).</p>
          </div>
          <dl class="mini">
            <div><dt>Wareneinsatz/Gast</dt><dd>${eur(f.menu.foodCost)}</dd></div>
            <div><dt>Bestellwert</dt><dd>${eur(s.orderCovers * f.menu.foodCost)}</dd></div>
            <div><dt>Regionalanteil</dt><dd>${pct(f.menu.regional)}</dd></div>
            <div><dt>Verderb (Prognose)</dt><dd>${pct(f.wasteRate)}</dd></div>
          </dl>
        </section>
        <section class="panel">
          <h2>Saisonkalender</h2>
          <p class="muted">Jetzt ist <b>${KL.season(s).name}</b>. Produkte außerhalb ihrer Saison verlieren 14 Qualitätspunkte und kosten 40 % mehr.</p>
          <div class="season-table-wrap"><table class="season-table">
            <thead><tr><th>Produkt</th>${KL.SEASONS.map((x) => `<th class="${x.id === KL.season(s).id ? 'now' : ''}">${x.name.slice(0, 3)}</th>`).join('')}</tr></thead>
            <tbody>${KL.PRODUCTS.filter((p) => p.seasons.length).map((p) => `<tr><td>${p.name}</td>${KL.SEASONS.map((x) => `<td class="${x.id === KL.season(s).id ? 'now' : ''}">${p.seasons.includes(x.id) ? '●' : ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;
    },

    /* ---------------- WEIN ---------------- */
    wein(s, f) {
      const foh = f.foh;
      const stock = Object.entries(s.cellar).filter(([, n]) => n > 0);
      const bottles = stock.reduce((a, [, n]) => a + n, 0);
      const value = stock.reduce((a, [id, n]) => a + KL.byId(KL.WINES, id).price * n, 0);
      return `
      <div class="grid-2">
        <section class="panel">
          <h2>Weinbegleitung heute</h2>
          <p class="muted">Sommelier-Können: <b>${Math.round(foh.sommSkill)}</b>${s.team.some((m) => m.role === 'sommelier') ? '' : ' (ohne Sommelier*e schenkt die Restaurantleitung ein)'} · Score <b>${f.pairing.score}</b> · Quote ${pct(f.pairingTake)}</p>
          <label class="switch"><input type="checkbox" id="nonalc" data-act="nonalc" ${s.nonAlc ? 'checked' : ''}><span>Alkoholfreie Begleitung (Kombucha, Säfte, Tee-Fermente)</span></label>
          ${s.nonAlc ? '<p class="fine">Kein Keller nötig, kostet 6 € pro Gast in der Herstellung. Gute Sommeliers machen daraus Kunst.</p>' : `
          <ol class="pours">${f.menu.evals.map(({ d, e }, i) => {
            const p = f.pairing.pours[i];
            return `<li class="${p && p.match ? 'match' : 'nomatch'}"><span class="p-dish">${esc(KL.dishName(d))}</span><span class="p-want">sucht: ${KL.WINE_STYLES[e.wine]}</span><span class="p-wine">${p && p.wine ? esc(p.wine.name) : '— nichts im Keller —'}${p && p.wine && !p.match ? ' <small>(Notlösung)</small>' : ''}</span></li>`;
          }).join('')}</ol>`}
        </section>
        <section class="panel">
          <h2>Keller <span class="muted">${bottles} Flaschen · ${eur(value)}</span></h2>
          <ul class="cellar">${stock.map(([id, n]) => { const w = KL.byId(KL.WINES, id); return `<li><span><b>${esc(w.name)}</b><small>${w.region} · ${KL.WINE_STYLES[w.style]}</small></span><span class="pill">${n} Fl.</span></li>`; }).join('') || '<li class="muted">Leer. Gähnend leer.</li>'}</ul>
          <p class="fine">Pro Flasche etwa 7 Gläser Begleitung. Ein leerer Stil führt zu Notlösungen.</p>
        </section>
      </div>
      <section class="panel">
        <h2>Weinhändler</h2>
        <div class="wine-table-wrap"><table class="wine-table">
          <thead><tr><th>Wein</th><th>Stil</th><th class="num">Qualität</th><th class="num">EK/Fl.</th><th></th></tr></thead>
          <tbody>${KL.WINES.map((w) => `<tr><td><b>${esc(w.name)}</b><small>${w.region}</small></td><td>${KL.WINE_STYLES[w.style]}</td><td class="num">${w.q}</td><td class="num">${eur(w.price)}</td><td class="buy"><button type="button" class="btn small" data-act="buywine" data-id="${w.id}" data-n="6">+6</button><button type="button" class="btn small ghost" data-act="buywine" data-id="${w.id}" data-n="12">+12</button></td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
    },

    /* ---------------- TEAM ---------------- */
    team(s, f) {
      const staffCard = (m, hire) => {
        const r = KL.ROLES[m.role];
        const tr = m.trait ? KL.byId(KL.TRAITS, m.trait) : null;
        return `<article class="staff ${hire ? 'cand' : ''}">
          <header><span class="eyebrow">${r.name}</span><h3>${esc(m.name)}</h3></header>
          <div class="skill"><span>Können</span><span class="cbar-track"><i style="width:${m.skill}%"></i></span><b>${m.skill}</b></div>
          ${hire ? '' : `<div class="skill"><span>Moral</span><span class="cbar-track ${m.morale < 35 ? 'low' : ''}"><i style="width:${m.morale}%"></i></span><b>${Math.round(m.morale)}</b></div>`}
          ${tr ? `<p class="trait" title="${esc(tr.desc)}">${tr.name}<small>${tr.desc}</small></p>` : '<p class="trait none">Keine Besonderheit</p>'}
          <div class="row between"><span class="muted">${eur(m.wage)}/Woche</span>
          ${hire ? `<button type="button" class="btn small" data-act="hire" data-id="${m.id}">Einstellen (${eur(m.wage)} Antritt)</button>` : `<span class="row gap"><button type="button" class="btn small ghost" data-act="bonus" data-id="${m.id}">Bonus 300 €</button><button type="button" class="btn small ghost" data-act="fire" data-id="${m.id}">Entlassen</button></span>`}</div>
        </article>`;
      };
      const wages = s.team.reduce((n, m) => n + m.wage, 0);
      return `
      <section class="panel">
        <div class="row between wrap"><h2>Deine Brigade</h2><span class="muted">Löhne ${eur(wages)}/Woche</span></div>
        <dl class="mini">
          <div><dt>Küchenstärke</dt><dd>${f.kitchen.strength}</dd></div>
          <div><dt>Hände am Herd</dt><dd>${f.kitchen.hands.toFixed(1)} <small>/ ${f.kitchen.needed.toFixed(1)} nötig</small></dd></div>
          <div><dt>Service-Stärke</dt><dd>${f.foh.strength}</dd></div>
          <div><dt>Du</dt><dd>T ${Math.round(s.chef.tech)} · K ${Math.round(s.chef.crea)} · F ${Math.round(s.chef.lead)}</dd></div>
        </dl>
        ${f.kitchen.notes.length ? `<ul class="checklist">${f.kitchen.notes.map((n) => `<li class="warn">${esc(n)}</li>`).join('')}</ul>` : ''}
        <div class="staff-grid">${s.team.map((m) => staffCard(m)).join('') || '<p class="muted">Du stehst allein in der Küche.</p>'}</div>
      </section>
      <section class="panel">
        <h2>Bewerbungen diese Woche</h2>
        <p class="muted">Mit wachsendem Ruf und Sternen bewerben sich bessere Leute.</p>
        <div class="staff-grid">${s.candidates.map((m) => staffCard(m, true)).join('')}</div>
      </section>`;
    },

    /* ---------------- RAUM ---------------- */
    raum(s, f) {
      const card = (x, owned, kind) => `<article class="upgrade ${owned ? 'owned' : ''}">
        <h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p>
        <div class="row between"><span class="muted">${x.amb ? `Ambiente +${x.amb} · ` : ''}Unterhalt ${eur(x.upkeep)}/Wo.</span>
        ${owned ? '<span class="pill">Vorhanden</span>' : `<button type="button" class="btn small" data-act="buy" data-kind="${kind}" data-id="${x.id}" ${s.money < x.cost ? 'disabled' : ''}>${eur(x.cost)}</button>`}</div>
      </article>`;
      return `
      <section class="panel">
        <div class="row between wrap"><h2>Gastraum</h2><span class="muted">Ambiente <b>${f.amb}</b>/100 · ${f.seats} Plätze</span></div>
        <p class="muted">Ambiente hebt die Preisbereitschaft und die Zufriedenheit. Für Sterne zählt es nicht.</p>
        <div class="upgrade-grid">${KL.INTERIOR.map((x) => card(x, s.interior.includes(x.id), 'interior')).join('')}</div>
      </section>
      <section class="panel">
        <h2>Küchengeräte</h2>
        <p class="muted">Geräte wie Holzkohle-Ofen, Kombidämpfer oder Fermentationskammer stellst du direkt im Restaurant auf: Tab „Restaurant“ → Bauen → Küche.</p>
        <div class="row gap"><button type="button" class="btn small" data-tab-go="restaurant">Zum Restaurant</button></div>
      </section>
      <section class="panel">
        <h2>Finanzen</h2>
        <dl class="mini">
          <div><dt>Kredit offen</dt><dd>${eur(s.debt)}</dd></div>
          <div><dt>Zinsen/Woche</dt><dd>${eur(s.debt * 0.006)}</dd></div>
          <div><dt>Miete/Woche</dt><dd>${eur(KL.byId(KL.LOCATIONS, s.location).rent)}</dd></div>
        </dl>
        <div class="row gap"><button type="button" class="btn small" data-act="repay" ${s.debt <= 0 || s.money < 5000 ? 'disabled' : ''}>5.000 € tilgen</button></div>
      </section>`;
    },

    /* ---------------- RESTAURANT (Welt + Bau-Modus) ---------------- */
    restaurant(s, f) {
      const ls = KL.layoutStats(s);
      const b = this.build;
      const workers = 1 + s.team.filter((m) => KL.ROLES[m.role].area === 'kueche' && m.role !== 'spueler').length;
      const group = (zone, title) => `<h3>${title}</h3><div class="palette">${Object.entries(KL.FURN).filter(([, x]) => x.zone === zone && !x.fixed).map(([id, x]) => {
        const owned = x.eq && s.equipment.includes(x.eq);
        return `<button type="button" class="pal ${b.type === id && !b.moving ? 'on' : ''}" data-act="pickfurn" data-id="${id}" ${owned || s.money < x.cost ? 'disabled' : ''}>
          <b>${esc(x.name)}</b><small>${owned ? 'steht schon' : eur(x.cost)}${x.seats ? ` · ${x.seats} Plätze` : ''}${x.amb ? ` · Ambiente +${x.amb}` : ''}${x.stations ? ` · ${x.stations} Arbeitsplatz${x.stations > 1 ? 'e' : ''}` : ''}${x.wine ? ' · +Wein' : ''}${x.extras ? ' · +Barumsatz' : ''}</small></button>`;
      }).join('')}</div>`;
      const sel = b.sel ? KL.FURN[b.sel.type] : null;
      return `
      <div class="resto">
        <section class="resto-stage ${b.on ? 'building' : ''}">
          <div class="stage-top">
            <div><span class="eyebrow">${esc(KL.byId(KL.LOCATIONS, s.location).name)} · ${KL.season(s).name}</span><h2>${b.on ? (b.type ? `Platzieren: ${esc(KL.FURN[b.type].name)}${b.moving ? ' (verschieben)' : ''}` : 'Bau-Modus: Möbel antippen oder aus der Liste wählen') : 'Dein Restaurant am Nachmittag'}</h2></div>
            <div class="row gap">
              ${b.on && (b.type || b.sel) ? '<button type="button" class="btn small ghost" data-act="cancelbuild">Abbrechen</button>' : ''}
              <button type="button" class="btn small ${b.on ? 'heat' : ''}" data-act="buildtoggle">${b.on ? 'Fertig' : 'Bauen'}</button>
            </div>
          </div>
          <div class="world-wrap"><canvas id="world-canvas" aria-label="Isometrische Ansicht deines Restaurants"></canvas></div>
          ${sel ? `<div class="selbar"><span><b>${esc(sel.name)}</b> ${sel.fixed ? '· fest eingebaut' : `· Wiederverkauf ${eur(sel.cost * 0.5)}`}</span><span class="row gap"><button type="button" class="btn small" data-act="movefurn">Verschieben</button>${sel.fixed ? '' : '<button type="button" class="btn small ghost" data-act="sellfurn">Verkaufen</button>'}</span></div>` : ''}
          <div class="row gap stage-cta">
            <button class="btn heat big" type="button" data-act="service">Service am Pass spielen</button>
            <button class="btn ghost" type="button" data-act="delegate">Souschef übernimmt (zuschauen)</button>
          </div>
        </section>
        <aside class="resto-side">
          <section class="panel">
            <h2>Grundriss</h2>
            <dl class="mini">
              <div><dt>Plätze</dt><dd>${ls.seats}<small>/${ls.cap}</small></dd></div>
              <div><dt>Ambiente</dt><dd>${f.amb}</dd></div>
              <div><dt>Arbeitsplätze</dt><dd class="${workers > ls.stations ? 'neg' : ''}">${ls.stations}<small> für ${workers}</small></dd></div>
              <div><dt>Gäste/Abend</dt><dd>${Math.round(f.covers / Math.max(1, f.days))}</dd></div>
            </dl>
            ${ls.crowd ? `<p class="hint warn">Zu eng gestellt: Ambiente −${ls.crowd}. Gäste wollen Luft.</p>` : ''}
            ${ls.rawSeats > ls.cap ? `<p class="hint warn">Brandschutz: Mehr als ${ls.cap} Plätze sind hier nicht erlaubt.</p>` : ''}
            ${workers > ls.stations ? '<p class="hint warn">Mehr Köch*innen als Arbeitsplätze. Bau Posten oder Geräte in die Küche.</p>' : ''}
          </section>
          ${b.on ? `<section class="panel build-panel">${group('dining', 'Gastraum')}${group('kitchen', 'Küche')}<p class="fine">Tische brauchen einen freien Gang zum Eingang. Verkauf bringt 50 % zurück.</p></section>` : `
          <section class="panel">
            <h2>Heute Abend</h2>
            ${this.checklist(s, f)}
            <p class="fine">Beim Service siehst du jede*n Gast. Bons, die du nicht selbst anrichtest, kocht die Brigade.</p>
          </section>`}
        </aside>
      </div>`;
    },

    mountWorld() {
      if (this.world) { this.world.destroy(); this.world = null; }
      const cv = document.getElementById('world-canvas');
      if (!cv) return;
      const s = this.s;
      const w = new KL.World(cv, s, { mode: this.build.on ? 'build' : 'idle', night: false, maxH: Math.max(300, window.innerHeight * 0.66) });
      this.world = w;
      if (this.build.type) w.ghost = { type: this.build.type, ignore: this.build.moving };
      w.selected = this.build.sel;
      w.onTile = (t) => {
        if (!this.build.on) { this.build.on = true; this.render(); return; }
        const b = this.build;
        if (b.type) {
          const err = KL.canPlace(s, b.type, t.x, t.y, b.moving);
          if (err) return this.toast(err, 'bad');
          if (b.moving) {
            b.moving.x = t.x; b.moving.y = t.y;
            b.moving = null; b.type = null;
            this.toast('Verschoben.', 'good');
          } else {
            const fz = KL.FURN[b.type];
            if (s.money < fz.cost) return this.toast('Dafür reicht das Konto nicht.', 'bad');
            s.money -= fz.cost;
            s.layout.push({ id: KL.util.uid(), type: b.type, x: t.x, y: t.y });
            if (fz.eq) { s.equipment.push(fz.eq); b.type = null; }
            if (fz.buzz) s.buzz += fz.buzz;
            this.toast(`${fz.name} aufgestellt (−${eur(fz.cost)}).`, 'good');
          }
          this.save();
          return this.render();
        }
        const m = KL.occupancy(s);
        const it = m[t.y] && m[t.y][t.x];
        b.sel = it || null;
        this.render();
      };
    },

    /* ---------------- CHEF*IN (Charakter) ---------------- */
    chef(s) {
      const c = s.chef;
      const arch = KL.byId(KL.ARCHETYPES, c.archetype);
      const need = KL.xpFor(c.level);
      const attr = (name, v) => `<div class="cbar"><span class="cbar-label">${name}</span><span class="cbar-track"><i style="width:${clamp(v, 0, 100)}%"></i></span><b>${Math.round(v)}</b></div>`;
      return `
      <div class="sheet">
        <section class="panel sheet-id">
          <canvas id="portrait" width="220" height="260" aria-label="Porträt von ${esc(c.name)}"></canvas>
          <div class="sheet-meta">
            <span class="eyebrow">${esc(arch.name)}</span>
            <h2 class="sheet-name">${esc(c.name)}</h2>
            <p class="sheet-level">Level ${c.level}</p>
            <div class="xp"><span class="cbar-track"><i style="width:${(c.xp / need) * 100}%"></i></span><small>${c.xp} / ${need} XP bis Level ${c.level + 1}</small></div>
            ${attr('Technik', c.tech)}${attr('Kreativität', c.crea)}${attr('Führung', c.lead)}${attr('Energie', c.energy)}
            <p class="fine">XP gibt es für jeden Service (mehr, wenn du selbst am Pass stehst), neue Gerichte, mutige Kombinationen, Inspektionen und Quests. Jedes Level: +1 auf alle Werte und ein Talentpunkt.</p>
          </div>
        </section>
        <section class="panel">
          <div class="row between wrap"><h2>Talente</h2><span class="pill ${c.points ? 'hot' : ''}">${c.points} Punkt${c.points === 1 ? '' : 'e'} frei</span></div>
          <div class="tree">${KL.PERK_TREES.map((t) => `
            <div class="branch"><span class="eyebrow">${t.name} · ${t.stat}</span>
              ${KL.PERKS.filter((p) => p.tree === t.id).map((p) => {
                const st = KL.perkState(s, p);
                return `<button type="button" class="perk ${st}" data-act="perk" data-id="${p.id}" ${st === 'available' ? '' : 'disabled'}><b>${p.name}</b><small>${p.desc}</small><em>${st === 'owned' ? 'Gelernt' : st === 'locked' ? 'Vorheriges Talent nötig' : st === 'available' ? 'Lernen' : 'Kein Punkt frei'}</em></button>`;
              }).join('')}
            </div>`).join('')}</div>
        </section>
        <section class="panel">
          <h2>Quests <span class="muted">${s.quests.length}/${KL.QUESTS.length}</span></h2>
          <ul class="quests">${KL.QUESTS.map((q) => `<li class="${s.quests.includes(q.id) ? 'done' : ''}"><span><b>${q.name}</b><small>${q.desc}</small></span><span class="pill">${s.quests.includes(q.id) ? 'Erledigt' : `+${q.xp} XP`}</span></li>`).join('')}</ul>
        </section>
      </div>`;
    },

    mountPortrait() {
      const cv = document.getElementById('portrait');
      if (!cv) return;
      const c = cv.getContext('2d');
      const s = this.s;
      const look = KL.lookFor(s.chef.name, 'chef');
      const W = cv.width, H = cv.height;
      const g = c.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.4, W * 0.8);
      g.addColorStop(0, 'rgba(255,107,31,0.35)');
      g.addColorStop(1, 'rgba(18,22,25,1)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Jacke
      c.fillStyle = '#f4f1ea';
      c.beginPath(); c.moveTo(30, H); c.quadraticCurveTo(40, 170, W / 2, 165); c.quadraticCurveTo(W - 40, 170, W - 30, H); c.fill();
      c.fillStyle = '#d4b06a'; c.fillRect(W / 2 - 34, 168, 68, 8);
      c.fillStyle = '#2a2520'; [195, 220, 245].forEach((y) => { c.beginPath(); c.arc(W / 2 - 14, y, 4, 0, 7); c.arc(W / 2 + 14, y, 4, 0, 7); c.fill(); });
      // Hals + Kopf
      c.fillStyle = look.skin; c.fillRect(W / 2 - 16, 140, 32, 30);
      c.beginPath(); c.ellipse(W / 2, 115, 42, 50, 0, 0, 7); c.fill();
      c.fillStyle = look.hair;
      c.beginPath(); c.ellipse(W / 2, 92, 44, 28, 0, Math.PI, 0); c.fill();
      if (look.long) { c.fillRect(W / 2 - 44, 90, 14, 70); c.fillRect(W / 2 + 30, 90, 14, 70); }
      // Kochmütze
      c.fillStyle = '#ffffff';
      c.fillRect(W / 2 - 40, 40, 80, 42);
      [[-30, 38], [0, 28], [30, 38]].forEach(([dx, y]) => { c.beginPath(); c.arc(W / 2 + dx, y, 26, 0, 7); c.fill(); });
      c.fillStyle = '#e6e2d8'; c.fillRect(W / 2 - 40, 74, 80, 8);
      // Gesicht
      c.fillStyle = '#2a2520';
      c.beginPath(); c.arc(W / 2 - 15, 118, 4, 0, 7); c.arc(W / 2 + 15, 118, 4, 0, 7); c.fill();
      c.strokeStyle = '#2a2520'; c.lineWidth = 3;
      c.beginPath(); c.arc(W / 2, 132, 12, 0.2, Math.PI - 0.2); c.stroke();
      if (s.chef.archetype === 'punk') { c.strokeStyle = '#8c4a3a'; c.beginPath(); c.moveTo(W / 2 + 22, 100); c.lineTo(W / 2 + 30, 128); c.stroke(); }
      // Sterne
      c.fillStyle = '#d4b06a'; c.font = '700 26px Figtree, sans-serif'; c.textAlign = 'center';
      if (s.stars >= 1) c.fillText('✦'.repeat(s.stars), W / 2, H - 12);
    },

    showLevelUp() {
      const s = this.s;
      if (!s.levelUps || this.busy || document.querySelector('.modal-wrap, .evening, .ceremony')) return;
      const n = s.levelUps;
      s.levelUps = 0;
      KL.save(s);
      KL.Sound && KL.Sound.init && (KL.Sound.init(), KL.Sound.perfect());
      const m = this.modal(`<span class="eyebrow">Level-Aufstieg</span><h2 class="lvlup">Level ${s.chef.level}</h2><p>${n > 1 ? `${n} Stufen auf einmal! ` : ''}+1 auf Technik, Kreativität und Führung. Du hast <b>${s.chef.points} Talentpunkt${s.chef.points === 1 ? '' : 'e'}</b> frei.</p><div class="row end"><button type="button" class="btn ghost" data-x>Später</button><button type="button" class="btn heat" data-ok>Talente ansehen</button></div>`, 'levelup');
      m.wrap.querySelector('[data-x]').onclick = m.close;
      m.wrap.querySelector('[data-ok]').onclick = () => { m.close(); this.setTab('chef'); };
    },

    /* ---------------- Interaktion ---------------- */
    bind(root) {
      const s = this.s;
      root.querySelectorAll('[data-tab-go]').forEach((b) => (b.onclick = () => this.setTab(b.dataset.tabGo)));
      root.querySelectorAll('[data-lab]').forEach((b) => (b.onclick = () => { this.lab[b.dataset.lab] = b.dataset.id; this.render(); }));
      root.querySelectorAll('[data-set]').forEach((inp) => {
        inp.oninput = () => {
          const lab = inp.previousElementSibling && inp.previousElementSibling.querySelector('b');
          const v = +inp.value;
          if (lab) lab.textContent = inp.dataset.set === 'orderCovers' ? v : eur(v);
        };
        inp.onchange = () => { s[inp.dataset.set] = +inp.value; this.save(); this.render(); };
      });
      root.querySelectorAll('[data-course]').forEach((sel) => (sel.onchange = () => { s.menu[+sel.dataset.course] = sel.value; this.save(); this.render(); }));
      root.querySelectorAll('[data-sup]').forEach((r) => (r.onchange = () => { s.suppliers[r.dataset.sup] = r.value; this.save(); this.render(); }));
      root.querySelectorAll('[data-act]').forEach((b) => {
        const act = b.dataset.act;
        const handler = () => this.act(act, b.dataset, b);
        if (b.type === 'checkbox') b.onchange = handler; else b.onclick = handler;
      });
    },

    act(act, ds, elx) {
      const s = this.s;
      const find = (arr) => arr.find((x) => x.id === ds.id);
      switch (act) {
        case 'cook': {
          if (s.dishes.length >= 16) return this.toast('Rezeptbuch voll (16). Streich erst ein Gericht.', 'bad');
          const L = this.lab;
          const d = KL.makeDish(s, L.product, L.technique, L.accent, L.texture);
          s.money -= 150;
          s.chef.crea = Math.min(100, s.chef.crea + 0.4);
          s.dishes.push(d);
          s.stats.dishesCreated++;
          KL.gainXP(s, 15);
          const e = KL.evalDish(s, d);
          const key = `${d.product}+${d.accent}`;
          if (e.bold && !s.discovered.includes(key)) { s.discovered.push(key); s.buzz += 3; KL.gainXP(s, 40); this.toast(`Neue Kombination entdeckt: ${e.bold}! +Buzz +40 XP`, 'good'); }
          else this.toast('Ab ins Rezeptbuch. +15 XP', 'good');
          break;
        }
        case 'perk':
          if (KL.unlockPerk(s, ds.id)) this.toast(`Talent gelernt: ${KL.byId(KL.PERKS, ds.id).name}`, 'good');
          break;
        case 'buildtoggle':
          this.build.on = !this.build.on; this.build.type = null; this.build.moving = null; this.build.sel = null;
          break;
        case 'pickfurn':
          this.build.on = true; this.build.type = ds.id; this.build.moving = null; this.build.sel = null;
          break;
        case 'cancelbuild':
          this.build.type = null; this.build.moving = null; this.build.sel = null;
          break;
        case 'movefurn':
          this.build.moving = this.build.sel; this.build.type = this.build.sel.type; this.build.sel = null;
          break;
        case 'sellfurn': {
          const it = this.build.sel;
          const fz = KL.FURN[it.type];
          if (fz.fixed) return this.toast('Der Pass bleibt. Ohne Pass kein Service.', 'bad');
          if (fz.minOne && s.layout.filter((x) => x.type === it.type).length <= 1) return this.toast(`Mindestens ein ${fz.name} muss bleiben.`, 'bad');
          s.layout = s.layout.filter((x) => x !== it);
          if (fz.eq) s.equipment = s.equipment.filter((e) => e !== fz.eq);
          s.money += Math.round(fz.cost * 0.5);
          this.build.sel = null;
          this.toast(`${fz.name} verkauft (+${eur(fz.cost * 0.5)}).`);
          break;
        }
        case 'addmenu':
          if (s.menu.length >= 8) return this.toast('Mehr als 8 Gänge schafft keine Küche.', 'bad');
          s.menu.push(ds.id);
          break;
        case 'deldish':
          s.dishes = s.dishes.filter((d) => d.id !== ds.id);
          break;
        case 'addcourse': {
          const free = s.dishes.find((d) => !s.menu.includes(d.id));
          if (free) s.menu.push(free.id);
          break;
        }
        case 'up': case 'down': {
          const i = +ds.i, j = act === 'up' ? i - 1 : i + 1;
          [s.menu[i], s.menu[j]] = [s.menu[j], s.menu[i]];
          break;
        }
        case 'rm': s.menu.splice(+ds.i, 1); break;
        case 'days': s.openDays = +ds.n; break;
        case 'nonalc': s.nonAlc = elx.checked; break;
        case 'buywine': {
          const w = KL.byId(KL.WINES, ds.id);
          const n = +ds.n;
          const cost = w.price * n;
          if (s.money < cost) return this.toast('Dafür reicht das Konto nicht.', 'bad');
          s.money -= cost;
          s.cellar[w.id] = (s.cellar[w.id] || 0) + n;
          this.toast(`${n} Flaschen ${w.name} eingelagert.`, 'good');
          break;
        }
        case 'hire': {
          const m = find(s.candidates);
          if (!m) return;
          if (s.team.length >= 14) return this.toast('Mehr passen nicht in die Küche.', 'bad');
          s.money -= m.wage;
          s.team.push(m);
          s.candidates = s.candidates.filter((x) => x !== m);
          this.toast(`${m.name} fängt Montag an.`, 'good');
          break;
        }
        case 'fire': {
          const m = find(s.team);
          if (!m) return;
          s.money -= m.wage * 2;
          s.team = s.team.filter((x) => x !== m);
          s.team.forEach((x) => (x.morale = Math.max(0, x.morale - 4)));
          this.toast(`${m.name} ist raus. Abfindung: ${eur(m.wage * 2)}.`);
          break;
        }
        case 'bonus': {
          const m = find(s.team);
          if (!m || s.money < 300) return;
          s.money -= 300;
          m.morale = Math.min(100, m.morale + 14);
          this.toast(`${m.name} freut sich. +Moral`, 'good');
          break;
        }
        case 'buy': {
          const list = ds.kind === 'interior' ? KL.INTERIOR : KL.EQUIPMENT;
          const x = KL.byId(list, ds.id);
          if (s.money < x.cost) return;
          s.money -= x.cost;
          (ds.kind === 'interior' ? s.interior : s.equipment).push(x.id);
          if (x.buzz) s.buzz += x.buzz;
          this.toast(`${x.name} ist da.`, 'good');
          break;
        }
        case 'repay':
          s.money -= 5000; s.debt = Math.max(0, s.debt - 5000);
          break;
        case 'service': return this.startService();
        case 'delegate': return this.startService(true);
        case 'close': return this.confirm('Betriebsferien?', 'Eine Woche zu: Fixkosten laufen weiter, du tankst 45 Energie, das Team erholt sich.', 'Laden zusperren', () => { const r = KL.closeWeek(s); this.afterWeek(r); });
        case 'newgame': return this.confirm('Neues Spiel?', 'Der aktuelle Spielstand wird gelöscht.', 'Neu anfangen', () => { KL.wipe(); KL.boot(true); });
        default: return;
      }
      this.save();
      this.render();
    },

    startService(auto) {
      const s = this.s;
      if (KL.menuDishes(s).length < 1) return this.toast('Ohne Menü kein Service. Ab in die Testküche!', 'bad');
      if (KL.layoutStats(s).seats < 2) return this.toast('Ohne Tische keine Gäste. Bau erst Tische im Restaurant.', 'bad');
      if (this.world) { this.world.destroy(); this.world = null; }
      KL.Evening.start(s, { auto: !!auto }, (result) => this.finishWeek(result));
    },

    finishWeek(service) {
      const r = KL.runWeek(this.s, service);
      this.afterWeek(r);
    },

    afterWeek(r) {
      this.busy = true;
      this.save();
      this.render();
      const done = () => { this.busy = false; this.save(); this.render(); if (this.s.levelUps) this.showLevelUp(); };
      this.showReport(r, () => {
        const s = this.s;
        if (s.gameOver) return this.showGameOver();
        if (s.ceremony) return this.showCeremony(s.ceremony, () => { s.ceremony = null; done(); });
        done();
      });
    },

    modal(html, cls) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
      document.body.appendChild(wrap);
      document.body.classList.add('no-scroll');
      const close = () => { wrap.remove(); if (!document.querySelector('.modal-wrap, .evening')) document.body.classList.remove('no-scroll'); };
      const first = wrap.querySelector('button');
      if (first) setTimeout(() => first.focus(), 30);
      return { wrap, close };
    },

    confirm(title, text, ok, fn) {
      const m = this.modal(`<h2>${title}</h2><p>${text}</p><div class="row gap end"><button type="button" class="btn ghost" data-x>Abbrechen</button><button type="button" class="btn heat" data-ok>${ok}</button></div>`);
      m.wrap.querySelector('[data-x]').onclick = m.close;
      m.wrap.querySelector('[data-ok]').onclick = () => { m.close(); fn(); };
    },

    showReport(r, next) {
      const costRows = r.costs ? [['Ware', r.costs.ingredients], ['Löhne', r.costs.wages], ['Miete', r.costs.rent], ['Unterhalt', r.costs.upkeep], ['Energie & Sonstiges', r.costs.misc], ['Zinsen', r.costs.interest], ['Steuern & Abgaben', r.costs.taxes]] : [];
      const svc = r.service && !r.service.delegated ? `<p class="small">Am Pass: ${r.service.perfect} perfekt, ${r.service.good} gut, ${r.service.miss} neu gemacht, ${r.service.late} zu spät. Schnitt ${Math.round(r.service.avg)}.</p>` : r.closed ? '' : '<p class="small">Der Souschef hat den Pass geführt.</p>';
      const html = r.closed ? `
        <span class="eyebrow">Woche ${r.wiy} · Betriebsferien</span>
        <h2>Laden zu, Akku auf.</h2>
        <p>Fixkosten: <b>${eur(r.costTotal)}</b>. Energie +45, Team erholt.</p>
        ${r.hints.map((h) => `<p class="hint">${esc(h)}</p>`).join('')}` : `
        <span class="eyebrow">Wochenabrechnung · Woche ${r.wiy} · ${r.season}</span>
        <h2 class="${r.profit >= 0 ? 'pos' : 'neg'}">${r.profit >= 0 ? 'Plus' : 'Minus'} ${eur(Math.abs(r.profit))}</h2>
        ${svc}
        <div class="report-grid">
          <dl class="mini">
            <div><dt>Gäste</dt><dd>${r.covers}</dd></div>
            <div><dt>Zufriedenheit</dt><dd>${r.sat}</dd></div>
            <div><dt>Ruf</dt><dd class="${r.repDelta >= 0 ? 'pos' : 'neg'}">${r.repDelta >= 0 ? '+' : ''}${r.repDelta.toFixed(1)}</dd></div>
            <div><dt>Weinbegleitung</dt><dd>${pct(r.pairingTake)}</dd></div>
          </dl>
          <table class="ledger">
            <tr><td>Menüs</td><td class="num">${eur(r.menuRevenue)}</td></tr>
            <tr><td>Weinbegleitung</td><td class="num">${eur(r.pairingRevenue)}</td></tr>
            <tr><td>Getränke & Extras</td><td class="num">${eur(r.extras)}</td></tr>
            ${costRows.map(([k, v]) => `<tr class="cost"><td>${k}</td><td class="num">${eur(-v)}</td></tr>`).join('')}
            <tr class="total"><td>Ergebnis</td><td class="num">${eur(r.profit)}</td></tr>
          </table>
        </div>
        ${r.short ? `<p class="hint warn">${r.short} Gäste mehr als bestellt – Notkäufe und gestrichene Gänge.</p>` : ''}
        ${r.wasteRate > 0.15 ? `<p class="hint warn">${pct(r.wasteRate)} der Ware im Müll. Bestellmenge senken oder Kühlhaus kaufen.</p>` : ''}
        ${r.events.map((h) => `<p class="hint warn">${esc(h)}</p>`).join('')}
        ${r.hints.map((h) => `<p class="hint insp">${esc(h)}</p>`).join('')}
        ${r.xp ? `<p class="xp-line">+${r.xp} XP${(r.quests || []).map((q) => ` · Quest „${esc(q.name)}“ +${q.xp} XP`).join('')}</p>` : ''}
        ${r.reviews.length ? `<ul class="feed">${r.reviews.map((x) => `<li><span class="eyebrow">${x.src} · ${'★'.repeat(x.stars)}${'☆'.repeat(5 - x.stars)}</span>„${esc(x.text)}“</li>`).join('')}</ul>` : ''}`;
      const m = this.modal(`${html}<div class="row end"><button type="button" class="btn heat" data-ok>Weiter</button></div>`, 'report');
      m.wrap.querySelector('[data-ok]').onclick = () => { m.close(); next(); };
    },

    showEvent() {
      const s = this.s;
      if (document.querySelector('.modal-wrap')) return;
      const ev = KL.byId(KL.EVENTS, s.pendingEvent);
      if (!ev) { s.pendingEvent = null; return; }
      const m = this.modal(`<span class="eyebrow">Ereignis · Woche ${KL.weekOfYear(s)}</span><h2>${ev.title}</h2><p>${ev.text}</p><div class="choices">${ev.choices.map((c, i) => `<button type="button" class="btn choice" data-c="${i}">${c.label}</button>`).join('')}</div>`, 'event');
      m.wrap.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
        const text = KL.applyEvent(s, +b.dataset.c);
        m.wrap.querySelector('.modal').innerHTML = `<span class="eyebrow">${ev.title}</span><h2>So kam's.</h2><p>${esc(text)}</p><div class="row end"><button type="button" class="btn heat" data-ok>Weiter</button></div>`;
        m.wrap.querySelector('[data-ok]').focus();
        m.wrap.querySelector('[data-ok]').onclick = () => { m.close(); this.save(); this.render(); };
      }));
    },

    showCeremony(c, next) {
      const wrap = document.createElement('div');
      wrap.className = 'ceremony';
      const up = c.gained > 0, down = c.gained < 0;
      const headline = c.score == null ? 'Kein Besuch, kein Urteil.' : up ? (c.level === 3 ? 'Drei Sterne. Eine eigene Reise wert.' : c.level >= 1 ? 'Der Anruf ist gekommen.' : 'Du stehst im Guide.') : down ? 'Ein Stern ist gefallen.' : 'Alles bleibt, wie es ist.';
      wrap.innerHTML = `
        <div class="cer-stage" id="cer-phone">
          <div class="phone"><span class="eyebrow">Eingehender Anruf</span><b>Unbekannte Nummer</b><span class="muted">Guide Céleste · Redaktion</span><div class="ring"></div></div>
          <button type="button" class="btn heat big" id="cer-pick">Abheben</button>
        </div>
        <div class="cer-stage" id="cer-reveal" hidden>
          <span class="eyebrow">Guide Céleste · Jahr ${c.year}</span>
          <h2 class="cer-name">${esc(this.s.name)}</h2>
          <div class="cer-stars">${c.level >= 1 ? Array.from({ length: c.level }, (_, i) => `<span style="animation-delay:${0.5 + i * 0.7}s">✦</span>`).join('') : c.level === 0.5 ? '<span class="rec" style="animation-delay:.5s">◆</span>' : '<span class="none">–</span>'}</div>
          <p class="cer-headline">${headline}</p>
          <p class="cer-level">${KL.starLabel(c.level)}${c.green ? ' · <span class="green">Grüner Stern für Nachhaltigkeit</span>' : ''}</p>
          ${c.score != null ? `<blockquote>„${esc(c.quote)}“</blockquote>
          <div class="cer-crit">${KL.CRITERIA.map((k) => this.bar(k.name, c.crit[k.id])).join('')}</div>
          <p class="fine">${c.visits} Besuche · Endwert ${c.score} (Schnitt ${c.mean}, Schwankung ±${c.sd}).${c.computed > c.level ? ' Die Inspektoren hätten mehr gegeben – aber Sterne wachsen nur einen pro Jahr.' : ''}</p>` : ''}
          <button type="button" class="btn heat big" id="cer-go">${c.level === 3 && up ? 'Legende. Weiter kochen.' : 'Neues Guide-Jahr beginnen'}</button>
        </div>`;
      document.body.appendChild(wrap);
      document.body.classList.add('no-scroll');
      KL.Sound.init();
      let ringing = setInterval(() => KL.Sound.bell(), 1300);
      KL.Sound.bell();
      wrap.querySelector('#cer-pick').focus();
      wrap.querySelector('#cer-pick').onclick = () => {
        clearInterval(ringing);
        wrap.querySelector('#cer-phone').hidden = true;
        wrap.querySelector('#cer-reveal').hidden = false;
        wrap.classList.add(up ? 'up' : down ? 'down' : 'same');
        if (up) for (let i = 0; i < Math.max(1, c.level); i++) setTimeout(() => KL.Sound.perfect(), 500 + i * 700);
        wrap.querySelector('#cer-go').focus();
      };
      wrap.querySelector('#cer-go').onclick = () => { clearInterval(ringing); wrap.remove(); document.body.classList.remove('no-scroll'); next(); };
    },

    showGameOver() {
      const s = this.s;
      const best = s.awards.reduce((m, a) => Math.max(m, a.level), 0);
      const m = this.modal(`<span class="eyebrow">Woche ${s.gameOver.week}</span><h2>Insolvenz.</h2><p>${s.gameOver.reason}</p><p>Beste Auszeichnung: <b>${KL.starLabel(best)}</b>. Viele große Köche sind einmal gescheitert. Die meisten haben danach erst richtig angefangen.</p><div class="row end"><button type="button" class="btn heat" data-ok>Neu anfangen</button></div>`);
      m.wrap.querySelector('[data-ok]').onclick = () => { m.close(); KL.wipe(); KL.boot(true); };
    },
  };

  KL.UI = UI;
})();

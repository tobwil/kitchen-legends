/* Kitchen Legends – Start */
(function () {
  const { esc } = KL.fmt;

  // Titelbild + Stadtkarte: erst Figur anlegen, dann Standort auf der 3D-Karte wählen
  const startScreen = () => {
    const app = document.getElementById('app');
    const st = { step: 'title', archetype: 'punk', chef: 'Kim Falkner', resto: 'Glut & Gold', site: null, district: null };
    app.innerHTML = '<div class="title-screen"><div class="stage" id="map-stage"></div><div class="ui" id="title-ui"></div></div>';
    const stage = app.querySelector('#map-stage');
    const ui = app.querySelector('#title-ui');
    let map = null;
    if (KL.CityMap && KL.has3D) {
      map = new KL.CityMap(stage, {
        idleSpin: true,
        onDistrict: (d) => { st.district = d; st.site = null; if (st.step === 'map') draw(); },
        onSite: (site, d) => { st.site = site; st.district = d; if (st.step === 'map') draw(); },
      });
      KL.titleMap = map;
    }
    const bars = (d) => [['Laufkundschaft', 'foot'], ['Kaufkraft', 'spend'], ['Szene', 'scene'], ['Konkurrenz', 'compete'], ['Miete', 'rent']].map(([l, k]) => `<div class="sbar"><span>${l}</span><span class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= d.stats[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
    const typeName = (t) => ({ hinterhof: 'klein · bis 30 Plätze', altbau: 'mittel · bis 42 Plätze', hotel: 'groß · bis 54 Plätze' })[t];
    const draw = () => {
      if (st.step === 'title') {
        ui.innerHTML = `
          <section class="title-card">
            <span class="eyebrow">Eine Aufbau-Simulation über Feuer, Schulden und Sterne</span>
            <h1 class="logo">Kitchen<br><em>Legends</em></h1>
            <p class="lede">Such dir ein Viertel, unterschreib den Mietvertrag, bau dein Restaurant Tisch für Tisch und koch dich bis zu drei Sternen im Guide Céleste.</p>
            <form id="start-form" class="title-form">
              <div class="row2">
                <label class="field"><span>Dein Name</span><input id="chef" required maxlength="28" value="${KL.fmt.esc(st.chef)}" autocomplete="off"></label>
                <label class="field"><span>Name des Restaurants</span><input id="resto" required maxlength="28" value="${KL.fmt.esc(st.resto)}" autocomplete="off"></label>
              </div>
              <span class="eyebrow">Wer bist du am Herd?</span>
              <div class="arch">${KL.ARCHETYPES.map((a) => `<button type="button" class="pick ${st.archetype === a.id ? 'on' : ''}" data-arch="${a.id}"><b>${a.name}</b><span>${a.desc}</span><small>Technik ${a.tech} · Kreativität ${a.crea} · Führung ${a.lead}</small></button>`).join('')}</div>
              <button class="btn heat big" type="submit">Standort suchen</button>
            </form>
          </section>`;
        ui.querySelectorAll('[data-arch]').forEach((b) => (b.onclick = () => { st.chef = ui.querySelector('#chef').value; st.resto = ui.querySelector('#resto').value; st.archetype = b.dataset.arch; draw(); }));
        ui.querySelector('#start-form').onsubmit = (e) => {
          e.preventDefault();
          st.chef = ui.querySelector('#chef').value.trim() || 'Chef*in';
          st.resto = ui.querySelector('#resto').value.trim() || 'Namenlos';
          st.step = 'map';
          if (map) { map.opts.idleSpin = false; }
          if (!map) { st.district = KL.DISTRICTS[0]; st.site = st.district.sites[0]; }
          draw();
        };
        return;
      }
      const d = st.district;
      ui.innerHTML = `
        <header class="map-head">
          <div class="plaque"><span class="eyebrow">${KL.fmt.esc(st.chef)} sucht ein Ladenlokal</span><h1>${KL.fmt.esc(st.resto)}</h1></div>
          <div class="map-legend">${KL.DISTRICTS.map((x) => `<button type="button" class="res dist-btn ${d === x ? 'on' : ''}" data-dist="${x.id}" style="--dc:${x.color}"><span>${x.vibe}</span><b>${x.name}</b></button>`).join('')}</div>
        </header>
        ${d ? `<aside class="card left dist-card">
          <span class="eyebrow">${d.vibe}</span>
          <h2 class="dist-name" style="color:${d.color}">${d.name}</h2>
          <p class="small">${d.desc}</p>
          ${bars(d)}
          <span class="eyebrow">Freie Ladenlokale</span>
          <div class="site-list">${d.sites.map((x) => `<button type="button" class="pick ${st.site === x ? 'on' : ''}" data-site="${x.id}"><b>${x.name}</b><span>${x.note}</span><small>${typeName(x.type)} · Miete ${KL.fmt.eur(x.rent)}/Woche</small></button>`).join('')}</div>
        </aside>` : '<p class="hint-chip map-hint">Klick ein Viertel oder eine orange Markierung an. Ziehen dreht, Rad zoomt.</p>'}
        ${st.site ? `<aside class="card right site-card">
          <span class="eyebrow">Mietvertrag · ${d.name}</span>
          <h2>${st.site.name}</h2>
          <p class="small">${st.site.note}</p>
          <dl class="mini">
            <div><dt>Miete</dt><dd>${KL.fmt.eur(st.site.rent)}<small>/Wo.</small></dd></div>
            <div><dt>Größe</dt><dd>${typeName(st.site.type).split(' · ')[0]}</dd></div>
            <div><dt>Ansehen</dt><dd>+${st.site.prestige}</dd></div>
          </dl>
          <p class="fine">${[d.supQ && Object.keys(d.supQ).length ? 'Lieferanten-Bonus: ' + Object.keys(d.supQ).map((k) => KL.byId(KL.CATEGORIES, k).name).join(', ') : '', d.starPull > 1.1 ? 'Sterne ziehen hier besonders viele Gäste an.' : '', d.repSlow ? 'Viele Einmal-Gäste: Der Ruf wächst langsamer.' : '', d.growth ? 'Das Viertel wird jedes Jahr wohlhabender.' : '', d.green ? 'Grüner Stern leichter erreichbar.' : ''].filter(Boolean).join(' ')}</p>
          <button type="button" class="btn heat big" data-go>Mietvertrag unterschreiben</button>
        </aside>` : ''}
        <button type="button" class="btn ghost small back-btn" data-back>Zurück</button>`;
      ui.querySelectorAll('[data-dist]').forEach((b) => (b.onclick = () => { const x = KL.byId(KL.DISTRICTS, b.dataset.dist); if (map) map.focusDistrict(x); else { st.district = x; st.site = null; draw(); } }));
      ui.querySelectorAll('[data-site]').forEach((b) => (b.onclick = () => {
        const sd = KL.siteById(b.dataset.site);
        const spot = map && map.sites.find((x) => x.site === sd.site);
        if (spot) map.select(spot); else { st.site = sd.site; draw(); }
      }));
      const back = ui.querySelector('[data-back]');
      back.onclick = () => { st.step = 'title'; st.site = null; st.district = null; if (map) { map.district = null; map.selected = null; map.opts.idleSpin = true; } draw(); };
      const go = ui.querySelector('[data-go]');
      if (go) go.onclick = () => {
        const s = KL.newGame({ chefName: st.chef, restaurantName: st.resto, archetype: st.archetype, location: st.site.type, site: st.site.id, district: d.id });
        if (map) map.destroy();
        KL.titleMap = null;
        app.innerHTML = '';
        KL.save(s);
        KL.UI.mount(s);
        KL.UI.toast(`Mietvertrag unterschrieben: ${st.site.name}. Willkommen im ${st.resto}!`, 'good');
      };
    };
    draw();
  };

  KL.boot = function (fresh, hotData) {
    document.querySelectorAll('.modal-wrap, .evening, .ceremony, .dlg-wrap').forEach((n) => n.remove());
    if (KL.UI && KL.UI.unmountWorld) KL.UI.unmountWorld();
    if (KL.titleMap) { KL.titleMap.destroy(); KL.titleMap = null; }
    const app = document.getElementById('app');
    if (app) app.innerHTML = '';
    document.body.classList.remove('no-scroll');
    const saved = fresh ? null : (hotData && hotData.state) || KL.load();
    if (saved && saved.v === 2 && !saved.gameOver) {
      if (!saved.layout) KL.initLayout(saved);
      if (!saved.layout.some((i) => i.type === 'buero')) { if (!KL.canPlace(saved, 'buero', 0, 2)) saved.layout.push({ id: 'buero', type: 'buero', x: 0, y: 2 }); else KL.autoPlace(saved, 'buero'); }
      KL.UI.mount(saved);
      if (saved.ceremony) KL.UI.showCeremony(saved.ceremony, () => { saved.ceremony = null; KL.save(saved); KL.UI.render(); });
    } else {
      startScreen();
    }
  };

  // Für den Artifact-Viewer: Spielstand über Updates hinweg behalten
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ state: KL.UI.s }));
  const start = (data) => KL.boot(false, data);
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});

  KL.escape = esc;
})();

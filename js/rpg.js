/* Kitchen Legends – Rollenspiel-Ebene
 * Du steuerst deine Köchin oder deinen Koch selbst: im Restaurant und draußen im Kiez.
 * Hier liegen Dialoge, Porträts, die Steuerung und die Kiez-Karte mit ihren Figuren.
 */
(function () {
  const { clamp, rnd, pick } = KL.util;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eur = (n) => KL.fmt.eur(n);

  /* ---------- Porträts ---------- */
  KL.drawPortrait = function (cv, look, o = {}) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const k = W / 220;
    c.save();
    c.scale(k, k);
    const w = 220, h = H / k;
    const g = c.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.4, w * 0.8);
    g.addColorStop(0, o.glow || 'rgba(255,170,90,0.45)');
    g.addColorStop(1, '#16191d');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const ink = '#2b1e1a';
    c.lineWidth = 3; c.strokeStyle = ink; c.lineJoin = 'round';
    // Oberkörper
    c.fillStyle = o.cloth || look.cloth;
    c.beginPath(); c.moveTo(28, h); c.quadraticCurveTo(38, 172, w / 2, 166); c.quadraticCurveTo(w - 38, 172, w - 28, h); c.closePath(); c.fill(); c.stroke();
    if (o.apron) { c.fillStyle = o.apron; c.beginPath(); c.moveTo(70, h); c.lineTo(78, 196); c.lineTo(w - 78, 196); c.lineTo(w - 70, h); c.closePath(); c.fill(); c.stroke(); }
    if (o.collar) { c.fillStyle = o.collar; c.fillRect(w / 2 - 34, 168, 68, 8); }
    if (o.buttons) { c.fillStyle = ink; [195, 220, 245].forEach((y) => { c.beginPath(); c.arc(w / 2 - 14, y, 4, 0, 7); c.arc(w / 2 + 14, y, 4, 0, 7); c.fill(); }); }
    // Kopf
    c.fillStyle = look.skin;
    c.fillRect(w / 2 - 16, 138, 32, 32); c.strokeRect(w / 2 - 16, 138, 32, 32);
    c.beginPath(); c.ellipse(w / 2, 112, 42, 50, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = look.hair;
    c.beginPath(); c.ellipse(w / 2, 90, 44, 28, 0, Math.PI, 0); c.fill(); c.stroke();
    if (look.long) { c.fillRect(w / 2 - 46, 88, 14, 72); c.fillRect(w / 2 + 32, 88, 14, 72); }
    if (o.toque) {
      c.fillStyle = '#ffffff';
      c.beginPath(); c.rect(w / 2 - 40, 40, 80, 40); c.fill(); c.stroke();
      [[-30, 38], [0, 26], [30, 38]].forEach(([dx, y]) => { c.beginPath(); c.arc(w / 2 + dx, y, 26, 0, 7); c.fill(); c.stroke(); });
      c.fillStyle = '#ffffff'; c.fillRect(w / 2 - 38, 40, 76, 34);
    }
    if (o.hat) { c.fillStyle = o.hat; c.beginPath(); c.ellipse(w / 2, 72, 62, 12, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.rect(w / 2 - 36, 34, 72, 38); c.fill(); c.stroke(); }
    if (o.cap) { c.fillStyle = o.cap; c.beginPath(); c.ellipse(w / 2, 76, 48, 22, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillRect(w / 2, 70, 56, 8); }
    if (o.glasses) { c.beginPath(); c.arc(w / 2 - 16, 114, 11, 0, 7); c.arc(w / 2 + 16, 114, 11, 0, 7); c.stroke(); c.beginPath(); c.moveTo(w / 2 - 5, 114); c.lineTo(w / 2 + 5, 114); c.stroke(); }
    // Gesicht
    c.fillStyle = ink;
    c.beginPath(); c.arc(w / 2 - 15, 116, 4, 0, 7); c.arc(w / 2 + 15, 116, 4, 0, 7); c.fill();
    c.beginPath();
    const mood = o.mood ?? 0.5;
    if (mood > 0.6) c.arc(w / 2, 128, 12, 0.2, Math.PI - 0.2);
    else if (mood < 0.35) c.arc(w / 2, 142, 11, Math.PI + 0.3, -0.3);
    else { c.moveTo(w / 2 - 10, 134); c.lineTo(w / 2 + 10, 134); }
    c.stroke();
    if (o.beard) { c.fillStyle = look.hair; c.beginPath(); c.ellipse(w / 2, 146, 30, 18, 0, 0, Math.PI); c.fill(); }
    if (o.scar) { c.strokeStyle = '#8c4a3a'; c.beginPath(); c.moveTo(w / 2 + 22, 98); c.lineTo(w / 2 + 30, 126); c.stroke(); }
    c.restore();
    // Papierkorn
    c.save();
    c.globalAlpha = 0.06;
    for (let i = 0; i < 400; i++) { c.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; c.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    c.restore();
  };

  KL.chefPortraitOpts = (s) => ({ toque: true, cloth: '#f4f1ea', collar: '#d4b06a', buttons: true, scar: s.chef.archetype === 'punk', mood: 0.7 });

  /* ---------- Dialoge ---------- */
  const Dialog = {
    el: null,
    open(factory) {
      this.close(true);
      const node = typeof factory === 'function' ? factory() : factory;
      if (!node) return;
      const wrap = document.createElement('div');
      wrap.className = 'dlg-wrap';
      wrap.innerHTML = `
        <div class="dlg" role="dialog" aria-label="Gespräch mit ${esc(node.name)}">
          <canvas class="dlg-portrait" width="220" height="250" aria-hidden="true"></canvas>
          <div class="dlg-body">
            <span class="eyebrow">${esc(node.role || '')}</span>
            <h3 class="dlg-name">${esc(node.name)}</h3>
            <p class="dlg-text"></p>
            <div class="dlg-opts"></div>
          </div>
          <button type="button" class="dlg-x" aria-label="Gespräch beenden">×</button>
        </div>`;
      document.body.appendChild(wrap);
      this.el = wrap;
      KL.drawPortrait(wrap.querySelector('canvas'), node.look, node.portrait || {});
      const textEl = wrap.querySelector('.dlg-text');
      const optsEl = wrap.querySelector('.dlg-opts');
      const showOptions = (opts) => {
        optsEl.innerHTML = '';
        opts.forEach((o, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'dlg-opt' + (o.primary ? ' primary' : '');
          b.disabled = !!o.disabled;
          b.innerHTML = `<kbd>${i + 1}</kbd><span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>`;
          b.onclick = () => choose(o);
          optsEl.appendChild(b);
        });
        const first = optsEl.querySelector('button:not(:disabled)');
        if (first) first.focus({ preventScroll: true });
      };
      const say = (text, opts) => {
        // Schreibmaschine
        clearInterval(this.tw);
        textEl.textContent = '';
        let i = 0;
        const full = String(text);
        this.tw = setInterval(() => {
          i += 2;
          textEl.textContent = full.slice(0, i);
          if (i >= full.length) clearInterval(this.tw);
        }, 14);
        textEl.onclick = () => { clearInterval(this.tw); textEl.textContent = full; };
        showOptions(opts);
      };
      const choose = (o) => {
        const r = o.run ? o.run() : null;
        if (KL.UI && KL.UI.afterDialogAction) KL.UI.afterDialogAction();
        if (r === null || r === undefined) return this.close();
        if (typeof r === 'function') return this.open(r);
        say(r, [{ label: 'Zurück', run: () => factory }, { label: 'Tschüss', run: () => null }]);
      };
      say(node.text, node.options.concat(node.noBye ? [] : [{ label: 'Tschüss', run: () => null }]));
      wrap.querySelector('.dlg-x').onclick = () => this.close();
      this.key = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 9) { const b = optsEl.querySelectorAll('button')[n - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); } }
      };
      window.addEventListener('keydown', this.key);
    },
    close(silent) {
      clearInterval(this.tw);
      if (this.key) window.removeEventListener('keydown', this.key);
      this.key = null;
      if (this.el) { this.el.remove(); this.el = null; if (!silent && KL.UI && KL.UI.afterDialogClose) KL.UI.afterDialogClose(); }
    },
    get isOpen() { return !!this.el; },
  };
  KL.Dialog = Dialog;

  /* ---------- Gespräche mit der Brigade ---------- */
  KL.staffTalk = function (s, m) {
    const fac = () => {
      const r = KL.ROLES[m.role];
      const tr = m.trait ? KL.byId(KL.TRAITS, m.trait) : null;
      const f = KL.forecast(s);
      const fair = m.wage / (r.wage * (0.55 + m.skill / 100));
      let text;
      if (m.morale >= 75) text = pick([`Läuft, Chef*in! Ich hab richtig Bock auf heute Abend.`, `Ich glaube, wir sind auf dem Weg zu was Großem.`, `Danke, dass du mich hier machen lässt.`]);
      else if (m.morale >= 45) text = pick(['Alles okay. Viel zu tun, aber okay.', 'Geht so. Der Montag war hart.', 'Ich komm klar. Frag mich nächste Woche nochmal.']);
      else if (s.openDays >= 6) text = 'Sechs Tage die Woche … ich seh meine Freunde nur noch auf Instagram.';
      else if (fair < 0.95) text = `Ehrlich? Für ${eur(m.wage)} die Woche reiß ich mir hier den Arsch auf. Woanders zahlen sie mehr.`;
      else if (f.kitchen.load > 1.15) text = 'Wir sind zu wenige. Jeden Abend schwimmen wir.';
      else text = 'Ich bin müde. Einfach nur müde.';
      if (tr && Math.random() < 0.5) text += ` (${tr.name}: ${tr.desc})`;
      const cook = KL.ROLES[m.role].area === 'kueche';
      return {
        name: m.name,
        role: `${r.name} · Können ${m.skill} · Moral ${Math.round(m.morale)}`,
        look: KL.lookFor(m.name, m.role),
        portrait: cook ? { toque: m.role !== 'spueler', cloth: m.role === 'spueler' ? '#5a6b7a' : '#ecebe6', mood: m.morale / 100 } : { cloth: '#1e1f22', apron: m.role === 'sommelier' ? '#5a1424' : '#ecebe6', mood: m.morale / 100 },
        text,
        options: [
          { label: 'Lob aussprechen', hint: m.praised === s.week ? 'Diese Woche schon gelobt' : '+Moral', disabled: m.praised === s.week, run: () => { m.praised = s.week; m.morale = Math.min(100, m.morale + 8); return pick(['Echt jetzt? Danke. Das bedeutet mir was.', 'Hör auf, ich werd rot.', 'Merk ich mir. Heute Abend hau ich alles raus.']); } },
          cook ? { label: 'Gemeinsam an der Technik feilen', hint: m.trained === s.week ? 'Diese Woche schon trainiert' : '+2 Können, −6 Energie', disabled: m.trained === s.week || s.chef.energy < 10, run: () => { m.trained = s.week; m.skill = Math.min(95, m.skill + 2); s.chef.energy = Math.max(0, s.chef.energy - 6); KL.gainXP(s, 10); return 'Eine Stunde Messerarbeit, dann Saucen. Sie*er wird besser, und du merkst, wie viel du weißt. +10 XP'; } } : { label: 'Den Gastraum durchgehen', hint: m.trained === s.week ? 'Diese Woche schon gemacht' : '+2 Können, −4 Energie', disabled: m.trained === s.week, run: () => { m.trained = s.week; m.skill = Math.min(95, m.skill + 2); s.chef.energy = Math.max(0, s.chef.energy - 4); KL.gainXP(s, 10); return 'Ihr geht jeden Tisch durch: Abstände, Licht, wer wann was nachschenkt. +10 XP'; } },
          { label: `Gehalt erhöhen (+10 % auf ${eur(m.wage * 1.1)})`, run: () => { m.wage = Math.round(m.wage * 1.1 / 10) * 10; m.morale = Math.min(100, m.morale + 12); return 'Ernsthaft? … Danke. Ich bleib dir treu, versprochen.'; } },
          { label: 'Was sollten wir besser machen?', run: () => {
            const issues = [...f.kitchen.notes, ...f.menu.issues];
            if (f.menu.outOfSeason.length) issues.push(`${f.menu.outOfSeason[0]} ist gerade nicht in Saison.`);
            if (f.foodCostPct > 38) issues.push(`Der Wareneinsatz liegt bei ${Math.round(f.foodCostPct)} %. Das frisst uns auf.`);
            if (!issues.length) issues.push(pick(['Ehrlich? Mehr Mut auf dem Teller. Die Inspektoren lieben eine Handschrift.', 'Neue Gerichte brauchen Wochen, bis sie sitzen. Lass sie auf der Karte reifen.', 'Geh mal raus in den Kiez. Die Bäuerin in der Markthalle hat Zeug, das du nicht glaubst.']));
            return pick(issues);
          } },
          { label: 'Kündigen', hint: `Abfindung ${eur(m.wage * 2)}`, run: () => () => ({
            name: m.name, role: 'Bist du sicher?', look: KL.lookFor(m.name, m.role), portrait: { mood: 0.2 },
            text: 'Du willst mich rausschmeißen? Nach allem?', noBye: true,
            options: [
              { label: 'Ja. Es tut mir leid.', run: () => { s.money -= m.wage * 2; s.team = s.team.filter((x) => x !== m); s.team.forEach((x) => (x.morale = Math.max(0, x.morale - 4))); return null; } },
              { label: 'Nein, vergiss es.', run: () => fac },
            ],
          }) },
        ],
      };
    };
    return fac;
  };

  /* ---------- Kiez ---------- */
  const CITY = { w: 16, h: 12 };
  const BUILDINGS = [
    { id: 'home', x: 1, y: 1, w: 3, d: 3, h: 2.8, wall: '#8c4a3a', roof: '#3a2a24', door: { x: 2, y: 4 }, sign: null },
    { id: 'bank', x: 5, y: 2, w: 2, d: 2, h: 3.4, wall: '#cfc6b4', roof: '#5a5f66', door: { x: 5, y: 4 }, sign: 'Bank' },
    { id: 'kneipe', x: 8, y: 1, w: 2, d: 3, h: 2.4, wall: '#5a3a28', roof: '#2a1d16', door: { x: 8, y: 4 }, sign: 'Zum Kochlöffel' },
    { id: 'grossmarkt', x: 10, y: 0, w: 4, d: 4, h: 2.2, wall: '#8a949b', roof: '#5a646c', door: { x: 11, y: 4 }, sign: 'Großmarkt' },
    { id: 'markthalle', x: 1, y: 8, w: 3, d: 3, h: 2.6, wall: '#b07a45', roof: '#6b4a33', door: { x: 2, y: 7 }, sign: 'Markthalle' },
    { id: 'wein', x: 5, y: 8, w: 2, d: 2, h: 2.4, wall: '#6b2030', roof: '#2a1d16', door: { x: 5, y: 7 }, sign: 'Weinhandlung' },
    { id: 'cafe', x: 8, y: 8, w: 2, d: 2, h: 2.2, wall: '#3f6d8a', roof: '#24343f', door: { x: 8, y: 7 }, sign: 'Café Feder' },
  ];
  const TREES = [{ x: 12, y: 9 }, { x: 14, y: 11 }, { x: 11, y: 11 }, { x: 14, y: 8 }, { x: 0, y: 6 }];
  const tileType = (x, y) => {
    if (x === 15) return 'water';
    if (y === 5 || y === 6) return 'road';
    if (y === 4 || y === 7) return 'walk';
    if (x >= 11 && y >= 8) return 'grass';
    return 'plaza';
  };

  KL.NPCS = {
    ralf: { name: 'Ralf', role: 'Großmarkt · Händler seit 1987', seed: 'ralf-gm', portrait: { cap: '#2f5d7a', cloth: '#3a5a7a', apron: '#d9d6cf', beard: true } },
    hanne: { name: 'Hanne Brandt', role: 'Bio-Hof aus der Uckermark · Markthalle', seed: 'hanne-bio', portrait: { cloth: '#4f6b4a', hat: null, mood: 0.7 } },
    clement: { name: 'Clément', role: 'Feinkost-Lieferwagen · Premium-Händler', seed: 'clement-pr', portrait: { cloth: '#1e1f22', glasses: true, mood: 0.6 } },
    jens: { name: 'Jens', role: 'Kutterfischer · Hafen', seed: 'jens-fisch', portrait: { cap: '#b2442e', cloth: '#d9b23a', beard: true, mood: 0.5 } },
    greta: { name: 'Greta', role: 'Försterin · Wildkräuter & Pilze', seed: 'greta-wald', portrait: { hat: '#4f6b4a', cloth: '#5f7d55', mood: 0.65 } },
    ines: { name: 'Ines Vogel', role: 'Weinhandlung Vogel', seed: 'ines-wein', portrait: { cloth: '#5a1424', glasses: true, mood: 0.6 } },
    kalle: { name: 'Kalle', role: 'Wirt · Zum Kochlöffel', seed: 'kalle-kneipe', portrait: { cloth: '#3a3a52', apron: '#ecebe6', beard: true, mood: 0.6 } },
    albers: { name: 'Frau Albers', role: 'Firmenkundenberaterin · Bank', seed: 'albers-bank', portrait: { cloth: '#2f3a44', glasses: true, mood: 0.45 } },
    mira: { name: 'Mira Haddad', role: 'Food-Journalistin · Café Feder', seed: 'mira-cafe', portrait: { cloth: '#7a3f4f', mood: 0.6 } },
  };
  const npcLook = (id) => KL.lookFor(KL.NPCS[id].seed, 'guest');
  const npc = (id, text, options) => ({ name: KL.NPCS[id].name, role: KL.NPCS[id].role, look: npcLook(id), portrait: KL.NPCS[id].portrait, text, options });

  const setSup = (s, cats, sup) => { cats.forEach((c) => (s.suppliers[c] = sup)); };
  const supNames = (s, sup) => KL.CATEGORIES.filter((c) => s.suppliers[c.id] === sup).map((c) => c.name);
  const inSeasonNow = (s) => KL.PRODUCTS.filter((p) => p.seasons.includes(KL.season(s).id)).map((p) => p.name);
  const questBtn = (s, qid, label) => {
    const q = KL.byId(KL.QUESTS, qid);
    if (s.quests.includes(qid)) return null;
    if (s.flags[qid]) return { label: `Wegen „${q.name}“ …`, hint: q.desc, run: () => 'Läuft noch. Ich merk, wenn du es geschafft hast.' };
    return { label, hint: `Quest: ${q.desc} (+${q.xp} XP)`, primary: true, run: () => { s.flags[qid] = true; return `Abgemacht. ${q.desc}`; } };
  };

  KL.cityDialog = function (s, id) {
    const f = () => {
      switch (id) {
        case 'ralf': return npc('ralf', pick(['Moin! Billig, schnell, zuverlässig. Mehr braucht keiner. Na gut, die Sterneköche vielleicht.', 'Na, Chef*in? Heute Rinderhüfte im Angebot, Kiste Zitronen geschenkt.']), [
          { label: 'Alles beim Großmarkt bestellen', hint: 'Qualität 55 · Preis ×0,85', run: () => { setSup(s, ['fisch', 'fleisch', 'gemuese', 'feinkost'], 'grossmarkt'); return 'Gute Wahl. Der Laster kommt jeden Morgen um sechs.'; } },
          { label: 'Nur Milch & Feinkost hier', run: () => { setSup(s, ['feinkost'], 'grossmarkt'); return 'Butter, Sahne, Mehl – kriegst du.'; } },
          { label: 'Was ist gerade in Saison?', run: () => `${KL.season(s).name}! Gerade gut: ${inSeasonNow(s).join(', ') || 'eigentlich alles aus dem Kühlhaus'}. Außer der Saison zahlst du drauf, und schmecken tut’s auch nicht.` },
        ]);
        case 'hanne': return npc('hanne', s.flags.q_hanne && !s.quests.includes('q_hanne') ? 'Und? Steht mein Gemüse schon auf deiner Karte?' : 'Schau dir diese Rote Bete an. Die hat mehr Charakter als die meisten Menschen.', [
          { label: 'Gemüse & Obst von deinem Hof', hint: 'Qualität 74 · regional', run: () => { setSup(s, ['gemuese'], 'biohof'); return 'Handschlag. Wenn’s hagelt, kommt weniger. Dafür schmeckt’s nach was.'; } },
          { label: 'Alles von dir, so weit es geht', hint: 'Alle Gruppen Bio-Hof', run: () => { setSup(s, ['fisch', 'fleisch', 'gemuese', 'feinkost'], 'biohof'); return 'Fisch hab ich keinen, aber ich kenn Leute. Wird regional, versprochen.'; } },
          questBtn(s, 'q_hanne', 'Hast du eine Aufgabe für mich?'),
        ].filter(Boolean));
        case 'clement': {
          const ok = s.rep >= 15 || KL.hasPerk(s, 'netzwerk');
          return npc('clement', ok ? 'Bonjour! Trüffel aus dem Périgord, Butter aus der Bretagne. Für eine Küche wie Ihre.' : 'Pardon, ich liefere nur an Häuser mit … Renommee. Kommen Sie wieder, wenn man von Ihnen spricht.', [
            { label: 'Fisch & Fleisch bei dir', hint: 'Qualität 84 · Preis ×1,35', disabled: !ok, run: () => { setSup(s, ['fisch', 'fleisch'], 'premium'); return 'Très bien. Die erste Kiste Steinbutt kommt morgen.'; } },
            { label: 'Feinkost bei dir', hint: 'Qualität 84', disabled: !ok, run: () => { setSup(s, ['feinkost'], 'premium'); return 'Sie werden die Butter schmecken. Alle werden die Butter schmecken.'; } },
          ]);
        }
        case 'jens': {
          const ok = s.rep >= 35 || KL.hasPerk(s, 'netzwerk') || s.flags.jensDeal;
          return npc('jens', ok ? 'Fang von heute Nacht. Der Saibling hat vor sechs Stunden noch gezappelt.' : 'Ich verkauf nicht an jeden. Zeig mir erst, dass du mit Fisch umgehen kannst.', [
            { label: 'Fisch direkt vom Kutter', hint: 'Qualität 95 · regional · nicht immer zuverlässig', disabled: !ok, run: () => { setSup(s, ['fisch'], 'direkt'); return 'Wenn Sturm ist, kommt nix. Dann musst du improvisieren. Das ist der Deal.'; } },
            questBtn(s, 'q_jens', 'Wie überzeuge ich dich?'),
          ].filter(Boolean));
        }
        case 'greta': return npc('greta', 'Fichtenspitzen, Sauerampfer, Bärlauch. Der Wald ist die beste Speisekammer der Stadt.', [
          s.flags.forager ? { label: 'Unser Deal läuft', disabled: true, run: () => '' } : { label: 'Wildkräuter-Deal anbieten', hint: '+5 Kreativität dauerhaft', run: () => { s.flags.forager = true; s.chef.crea = Math.min(100, s.chef.crea + 5); KL.gainXP(s, 30); return 'Jeden Dienstag ein Korb. Wenn du sie verschwendest, sind wir geschiedene Leute. +30 XP'; } },
          questBtn(s, 'q_greta', 'Kann ich dir helfen?'),
          { label: 'Was wächst gerade?', run: () => ({ fruehling: 'Bärlauch, Waldmeister, junge Fichtenspitzen. Und Rhabarber in jedem zweiten Garten.', sommer: 'Holunderblüten, Walderdbeeren. Wenn du schnell bist.', herbst: 'Steinpilze! Und Sanddorn an der Küste. Herbst ist Erntezeit.', winter: 'Wenig. Wurzeln, Sellerie, eingelegtes Zeug. Winter ist Fermentierzeit.' })[KL.season(s).id] },
        ].filter(Boolean));
        case 'ines': {
          const f2 = KL.forecast(s);
          const missing = f2.pairing.pours ? f2.pairing.pours.map((p, i) => (!p.match ? KL.WINE_STYLES[f2.menu.evals[i].e.wine] : null)).filter(Boolean) : [];
          return npc('ines', missing.length ? `Ich hab mir deine Karte angesehen. Dir fehlt: ${[...new Set(missing)].join(', ')}.` : 'Deine Begleitung passt. Jetzt geht es um Tiefe, nicht um Breite.', [
            { label: 'Weinregal ansehen', primary: true, run: () => { KL.UI.openTab('wein'); return null; } },
            { label: 'Was macht eine gute Begleitung aus?', run: () => pick(['Säure gegen Fett, Süße gegen Salz, nie Tannin gegen Fisch. Den Rest erzählst du mit Geschichten.', 'Eine gute Sommelière kann aus einem 16-Euro-Riesling ein Erlebnis machen. Eine schlechte macht aus einem Meursault Wasser.', 'Alkoholfrei ist kein Verzicht mehr. Kombucha mit Fichtenspitze zur Taube – trau dich.']) },
          ]);
        }
        case 'kalle': {
          const cand = s.candidates;
          return npc('kalle', cand.length ? `Hier hängen immer ein paar Köche rum, die gerade nix haben. Heute: ${cand.length}. Willste mal schnacken?` : 'Heute ist keiner da. Komm nächste Woche wieder.', [
            ...cand.map((m) => ({ label: `${m.name} · ${KL.ROLES[m.role].name} · Können ${m.skill}`, hint: `${eur(m.wage)}/Woche${m.trait ? ' · ' + KL.byId(KL.TRAITS, m.trait).name : ''}`, run: () => () => ({
              name: m.name, role: `${KL.ROLES[m.role].name} · sucht Arbeit`, look: KL.lookFor(m.name, m.role), portrait: { mood: 0.55, cloth: KL.lookFor(m.name, m.role).cloth },
              text: pick([`Ich hab bei den Großen gelernt. Ich brauch nur ’ne Chance.`, `Ich bin schnell, ich bin sauber, ich trink nicht vor Feierabend.`, `Mein letzter Laden hat dichtgemacht. Ich will wieder an den Herd.`]) + (m.trait ? ` (${KL.byId(KL.TRAITS, m.trait).desc})` : ''),
              options: [
                { label: `Einstellen (${eur(m.wage)} Antrittsgeld)`, primary: true, disabled: s.money < m.wage || s.team.length >= 14, run: () => { s.money -= m.wage; s.team.push(m); s.candidates = s.candidates.filter((x) => x !== m); KL.gainXP(s, 10); return `Montag, 9 Uhr. Bring deine Messer mit. (${m.name} ist jetzt in deiner Brigade.)`; } },
                { label: 'Vielleicht ein andermal', run: () => f },
              ],
            }) })),
          ]);
        }
        case 'albers': return npc('albers', `Ihr Kredit steht bei ${eur(s.debt)}. Kontostand ${eur(s.money)}. ${s.money < 5000 ? 'Das macht mir Sorgen.' : 'Solide.'}`, [
          { label: 'Kredit über 30.000 € aufnehmen', hint: 'Zinsen 0,6 % pro Woche', disabled: s.debt >= 120000, run: () => { s.money += 30000; s.debt += 30000; return 'Unterschreiben Sie hier. Und hier. Und hier.'; } },
          { label: '5.000 € tilgen', disabled: s.debt <= 0 || s.money < 5000, run: () => { s.money -= 5000; s.debt = Math.max(0, s.debt - 5000); return 'Sehr vernünftig.'; } },
          { label: 'Alles tilgen', disabled: s.debt <= 0 || s.money < s.debt, run: () => { s.money -= s.debt; s.debt = 0; KL.gainXP(s, 50); return 'Schuldenfrei. Das sieht man in Ihrer Branche selten. +50 XP'; } },
        ]);
        case 'mira': {
          const wiy = KL.weekOfYear(s);
          const next = s.inspections.planned.find((w) => w >= wiy);
          return npc('mira', pick(['Setz dich. Der Flat White hier ist der beste der Stadt, und die Gerüchte sind gratis.', 'Ich schreibe gerade über die neue Generation. Bist du eine davon?']), [
            { label: 'Gibt es Gerüchte über die Inspektoren? (Kaffee ausgeben, −20 €)', disabled: s.flags.miraTip === s.year, run: () => {
              s.flags.miraTip = s.year; s.money -= 20;
              if (!next) return 'Dieses Jahr waren sie wohl schon überall. Mach einfach gut weiter.';
              const told = Math.random() < 0.7 ? next : clamp(next + pick([-1, 1, 2]), wiy, KL.WEEKS_PER_YEAR);
              return `Unter uns: Eine Kollegin hat gehört, dass in Woche ${told} jemand vom Guide in deiner Ecke isst. Aber du weißt ja … Gerüchte.`;
            } },
            questBtn(s, 'q_mira', 'Willst du über uns schreiben?'),
            { label: 'Was macht einen Stern aus?', run: () => 'Fünf Dinge: Produkt, Technik, Harmonie, Handschrift, Beständigkeit. Die Deko ist denen egal. Und ein einziger schwacher Gang kann alles kosten.' },
          ].filter(Boolean));
        }
        default: return null;
      }
    };
    return f;
  };

  /* ---------- Kiez-Karte ---------- */
  class City extends KL.World {
    get g() { return CITY; }
    spawnStaff() {
      this.agents = [];
      this.npcs = [
        { id: 'ralf', x: 12.5, y: 4.5 }, { id: 'hanne', x: 3.5, y: 7.5 }, { id: 'clement', x: 9.5, y: 7.5 },
        { id: 'jens', x: 14.5, y: 5.5 }, { id: 'greta', x: 13.5, y: 9.5 }, { id: 'ines', x: 6.5, y: 7.5 },
        { id: 'kalle', x: 9.5, y: 4.5 }, { id: 'albers', x: 6.5, y: 4.5 }, { id: 'mira', x: 10.5, y: 8.5 },
      ];
      this.npcs.forEach((n) => this.agents.push({ kind: 'npc', npc: n.id, x: n.x, y: n.y, look: { ...npcLook(n.id), role: 'guest' }, path: [], idle: 0, home: { x: n.x, y: n.y } }));
      for (let i = 0; i < 5; i++) this.agents.push({ kind: 'walker', x: rnd(1, 14) + 0.5, y: pick([4.5, 7.5]), look: KL.lookFor(Math.random(), 'guest'), path: [], idle: rnd(0, 3), phase: rnd(0, 6), speed: 1.2 });
      const d = BUILDINGS[0].door;
      this.player = { kind: 'chef', id: 'player', x: d.x + 0.5, y: d.y + 0.5, look: { ...KL.lookFor(this.s.chef.name, 'chef') }, path: [], speed: 3 };
      this.agents.push(this.player);
      this.cars = [{ x: -1, y: 5.5, v: 2.2, col: '#b2442e' }, { x: 9, y: 6.5, v: -1.8, col: '#3f6d8a' }];
    }
    blocked() {
      const m = Array.from({ length: CITY.h }, (_, y) => Array.from({ length: CITY.w }, (_, x) => (tileType(x, y) === 'water' ? 'w' : null)));
      BUILDINGS.forEach((b) => { for (let i = 0; i < b.w; i++) for (let j = 0; j < b.d; j++) m[b.y + j][b.x + i] = b; });
      TREES.forEach((t) => (m[t.y][t.x] = 't'));
      this.npcs.forEach((n) => (m[Math.floor(n.y)][Math.floor(n.x)] = m[Math.floor(n.y)][Math.floor(n.x)] || null));
      return m;
    }
    path(from, to) {
      const m = this.blocked();
      const key = (x, y) => y * CITY.w + x;
      const prev = new Map([[key(from.x, from.y), null]]);
      const q = [from];
      while (q.length) {
        const c = q.shift();
        if (c.x === to.x && c.y === to.y) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c.x + dx, ny = c.y + dy;
          if (nx < 0 || ny < 0 || nx >= CITY.w || ny >= CITY.h || m[ny][nx] || prev.has(key(nx, ny))) continue;
          prev.set(key(nx, ny), c); q.push({ x: nx, y: ny });
        }
      }
      if (!prev.has(key(to.x, to.y))) return null;
      const out = []; let c = { x: to.x, y: to.y };
      while (c) { out.unshift(c); c = prev.get(key(c.x, c.y)); }
      return out;
    }
    walkTo(a, tx, ty, zone, done) {
      const p = this.path({ x: Math.floor(a.x), y: Math.floor(a.y) }, { x: tx, y: ty });
      a.path = p ? p.slice(1).map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 })) : [];
      a.done = p ? done || null : null;
      return !!p;
    }
    idleAgents(dt) {
      this.agents.forEach((a) => {
        if (a.kind === 'walker' && !a.path.length) {
          a.idle -= dt;
          if (a.idle <= 0) { a.idle = rnd(1, 4); this.walkTo(a, Math.floor(rnd(0, 15)), pick([4, 7]), null); }
        }
      });
      this.cars.forEach((c) => { c.x += c.v * dt; if (c.x > 17) c.x = -2; if (c.x < -2) c.x = 17; });
    }
    draw() {
      const c = this.ctx;
      const L = KL.todPreset(this.tod);
      const todKey = Math.round(this.tod * 40);
      if (todKey !== this.todKey) { this.todKey = todKey; this.shadeCache.clear(); }
      this.light = L;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.cssW, this.cssH);
      const bg = c.createLinearGradient(0, 0, 0, this.cssH);
      bg.addColorStop(0, L.skyTop); bg.addColorStop(1, L.skyBot);
      c.fillStyle = bg; c.fillRect(0, 0, this.cssW, this.cssH);
      const COL = { road: ['#4a4d52', '#45484d'], walk: ['#b8ad9a', '#aea38f'], plaza: ['#c9bda6', '#bfb39b'], grass: ['#6f8f60', '#678757'], water: ['#3f6d8a', '#3a6782'] };
      for (let y = 0; y < CITY.h; y++) for (let x = 0; x < CITY.w; x++) {
        const t = tileType(x, y);
        let col = COL[t][(x + y) % 2];
        if (t === 'water') col = Math.sin(this.t * 2 + x + y) > 0.6 ? '#4f7d9a' : col;
        this.poly([this.P(x, y), this.P(x + 1, y), this.P(x + 1, y + 1), this.P(x, y + 1)], this.shade(col, 'top'), 'rgba(43,30,26,0.15)');
        if (t === 'road' && y === 5 && x % 2 === 0) this.poly([this.P(x + 0.2, 5.95), this.P(x + 0.8, 5.95), this.P(x + 0.8, 6.05), this.P(x + 0.2, 6.05)], '#e8dcc4', null);
      }
      // Türen markieren
      BUILDINGS.forEach((b) => this.poly([this.P(b.door.x + 0.2, b.door.y + 0.2), this.P(b.door.x + 0.8, b.door.y + 0.2), this.P(b.door.x + 0.8, b.door.y + 0.8), this.P(b.door.x + 0.2, b.door.y + 0.8)], 'rgba(212,176,106,0.45)', null));
      const items = [];
      BUILDINGS.forEach((b) => items.push({ depth: b.x + b.w + b.y + b.d - 1, draw: () => this.drawBuilding(b, L) }));
      TREES.forEach((t) => items.push({ depth: t.x + t.y + 0.5, draw: () => this.drawTree(t) }));
      this.cars.forEach((car) => items.push({ depth: car.x + car.y, draw: () => { this.box(car.x - 0.45, car.y - 0.25, 0.9, 0.5, 0.1, 0.45, car.col, car.col, car.col); this.box(car.x - 0.25, car.y - 0.2, 0.5, 0.4, 0.55, 0.3, '#cfe0ea', '#9fb8c6', '#b3cad6'); } }));
      // Steg
      items.push({ depth: 14 + 5.5, draw: () => this.box(14.9, 5.2, 0.9, 0.6, 0, 0.12, '#8c6a48', '#6b4a33', '#7a5a3d') });
      this.agents.forEach((a) => items.push({ depth: a.x + a.y + 0.05, draw: () => this.drawPerson(a) }));
      this.particles.forEach((p) => items.push({ depth: p.x + p.y + 0.2, draw: () => this.drawParticle(p) }));
      items.sort((a, b) => a.depth - b.depth).forEach((i) => i.draw());
      // Namen über den Figuren
      c.save();
      c.font = `600 ${Math.max(10, Math.round(this.TW * 0.19))}px Figtree, system-ui, sans-serif`;
      c.textAlign = 'center';
      this.agents.filter((a) => a.kind === 'npc').forEach((a) => {
        const [sx, sy] = this.P(a.x, a.y, 1.55);
        const name = KL.NPCS[a.npc].name;
        const w = c.measureText(name).width + 10;
        c.fillStyle = 'rgba(20,16,14,0.7)';
        c.fillRect(sx - w / 2, sy - 13, w, 16);
        c.fillStyle = '#f2ead9';
        c.fillText(name, sx, sy);
      });
      c.restore();
      if (L.coolA > 0.01) { c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(90,100,170,${L.coolA * 1.4})`; c.fillRect(0, 0, this.cssW, this.cssH); c.restore(); }
      c.save();
      c.globalCompositeOperation = 'soft-light';
      c.fillStyle = `rgba(255,190,110,${L.warmA * 2})`; c.fillRect(0, 0, this.cssW, this.cssH);
      c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.14; c.fillStyle = c.createPattern(this.grain, 'repeat'); c.fillRect(0, 0, this.cssW, this.cssH);
      c.restore();
      if (this.overlay) this.overlay(c);
    }
    drawBuilding(b, L) {
      const lamps = L.lamps > 0.4;
      this.box(b.x, b.y, b.w, b.d, 0, b.h, b.roof, b.wall, b.wall);
      // Fenster
      for (let i = 0; i < b.w; i++) for (let z = 0; z < Math.floor(b.h) - 0; z++) {
        if (z === 0 && b.x + i === b.door.x) continue;
        const y = b.y + b.d;
        this.poly([this.P(b.x + i + 0.25, y, z + 0.35), this.P(b.x + i + 0.75, y, z + 0.35), this.P(b.x + i + 0.75, y, z + 0.85), this.P(b.x + i + 0.25, y, z + 0.85)], lamps ? '#f2c46a' : '#9fc4d6');
      }
      for (let j = 0; j < b.d; j++) for (let z = 0; z < Math.floor(b.h); z++) {
        const x = b.x + b.w;
        this.poly([this.P(x, b.y + j + 0.25, z + 0.35), this.P(x, b.y + j + 0.75, z + 0.35), this.P(x, b.y + j + 0.75, z + 0.85), this.P(x, b.y + j + 0.25, z + 0.85)], lamps ? '#e2b45a' : '#86aec2');
      }
      // Tür
      const dx = b.door.x;
      this.poly([this.P(dx + 0.25, b.y + b.d, 0), this.P(dx + 0.75, b.y + b.d, 0), this.P(dx + 0.75, b.y + b.d, 0.9), this.P(dx + 0.25, b.y + b.d, 0.9)], '#2a1d16');
      // Schild
      const sign = b.id === 'home' ? this.s.name : b.sign;
      const c = this.ctx;
      const [sx, sy] = this.P(b.x + b.w / 2, b.y + b.d, b.h + 0.45);
      c.save();
      c.font = `italic 700 ${Math.round(this.TW * 0.27)}px 'Bodoni Moda', Georgia, serif`;
      const w = c.measureText(sign).width + 14;
      c.fillStyle = b.id === 'home' ? '#c14b0c' : 'rgba(242,234,217,0.95)';
      c.strokeStyle = '#2b1e1a'; c.lineWidth = 2;
      c.beginPath(); c.rect(sx - w / 2, sy - this.TW * 0.3, w, this.TW * 0.4); c.fill(); c.stroke();
      c.fillStyle = b.id === 'home' ? '#fff3e0' : '#2a2520';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(sign, sx, sy - this.TW * 0.1);
      c.restore();
      if (lamps) this.glow(b.door.x + 0.5, b.y + b.d + 0.3, 1, 0.8, 'rgba(255,190,110,A)', 0.3);
    }
    drawTree(t) {
      this.box(t.x + 0.45, t.y + 0.45, 0.1, 0.1, 0, 0.9, '#5a3a28', '#4f3524', '#5f412d');
      [[0.5, 0.5, 1.4, 0.36, '#4f6b4a'], [0.35, 0.6, 1.7, 0.28, '#5f7d55'], [0.62, 0.42, 2, 0.24, '#6f8f60']].forEach(([a, b, z, r, col]) => {
        const [sx, sy] = this.P(t.x + a, t.y + b, z);
        this.ctx.fillStyle = this.shade(col, 'top');
        this.ctx.beginPath(); this.ctx.arc(sx, sy, r * this.TW, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(43,30,26,0.8)'; this.ctx.lineWidth = 1; this.ctx.stroke();
      });
    }
  }
  KL.City = City;
  KL.CITY_BUILDINGS = BUILDINGS;

  /* ---------- Steuerung: Laufen, Ansprechen, Benutzen ---------- */
  // targets(): [{ x, y, w, d, label, act, door? }]
  KL.Roam = {
    attach(world, opts) {
      const player = opts.player;
      world.player = player;
      const rawTargets = opts.targets;
      opts = { ...opts, targets: () => rawTargets().map((t) => (t.person ? { ...t, x: Math.floor(t.px), y: Math.floor(t.py), w: 1, d: 1 } : t)) };
      player.speed = player.speed || 3;
      let near = null;
      const inFoot = (t, x, y) => x >= t.x && y >= t.y && x < t.x + (t.w || 1) && y < t.y + (t.d || 1);
      const ptile = () => ({ x: Math.floor(player.x), y: Math.floor(player.y) });
      const adjacent = (t, p) => {
        if (t.door) return p.x === t.door.x && p.y === t.door.y;
        for (let i = 0; i < (t.w || 1); i++) for (let j = 0; j < (t.d || 1); j++) {
          if (Math.abs(t.x + i - p.x) + Math.abs(t.y + j - p.y) === 1) return true;
        }
        return false;
      };
      const approach = (t) => {
        const p = ptile();
        if (adjacent(t, p)) { player.path = []; return t.act(); }
        const cands = [];
        if (t.door) cands.push(t.door);
        else for (let i = -1; i <= (t.w || 1); i++) for (let j = -1; j <= (t.d || 1); j++) {
          const x = t.x + i, y = t.y + j;
          const edge = (i === -1 || i === (t.w || 1)) !== (j === -1 || j === (t.d || 1));
          if (edge) cands.push({ x, y });
        }
        cands.sort((a, b) => Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)));
        for (const c of cands) {
          if (world.walkTo(player, c.x, c.y, opts.zone, () => t.act()) !== false && (player.path.length || (c.x === p.x && c.y === p.y))) return;
        }
        KL.UI.toast('Da komm ich nicht hin.', 'bad');
      };
      world.onTile = (tile) => {
        if (KL.Dialog.isOpen) return;
        const list = opts.targets();
        // Personen haben Vorrang
        const person = list.find((t) => t.person && Math.abs(t.px - (tile.x + 0.5)) < 0.8 && Math.abs(t.py - (tile.y + 0.5)) < 0.8);
        const t = person || list.find((x) => inFoot(x, tile.x, tile.y) || (x.door && x.door.x === tile.x && x.door.y === tile.y));
        if (t) return approach(t);
        if (world.walkTo(player, tile.x, tile.y, opts.zone) === false) KL.UI.toast('Da komm ich nicht hin.', 'bad');
      };
      const dirs = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
      const onKey = (e) => {
        if (KL.Dialog.isOpen || document.querySelector('.modal-wrap, .evening, .ceremony')) return;
        if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        const d = dirs[e.code];
        if (d) {
          e.preventDefault();
          const p = ptile();
          const nx = p.x + d[0], ny = p.y + d[1];
          if (!player.path.length || player.path.length < 2) world.walkTo(player, nx, ny, opts.zone);
          return;
        }
        if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && near) { e.preventDefault(); near.act(); }
      };
      window.addEventListener('keydown', onKey);
      const prevDestroy = world.destroy.bind(world);
      world.destroy = () => { window.removeEventListener('keydown', onKey); prevDestroy(); };
      world.overlay = (c) => {
        const p = ptile();
        const list = opts.targets();
        near = list.find((t) => (t.person ? Math.abs(t.px - player.x) + Math.abs(t.py - player.y) < 1.3 : adjacent(t, p))) || null;
        // Markierung unter der Spielfigur
        const [hx, hy] = world.P(player.x, player.y, 0);
        c.save();
        c.strokeStyle = 'rgba(255,107,31,0.9)'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(hx, hy, world.TW * 0.2, world.TW * 0.1, 0, 0, Math.PI * 2); c.stroke();
        c.restore();
        if (near && !player.path.length) {
          const [sx, sy] = near.person ? world.P(near.px, near.py, 1.9) : world.P(near.x + (near.w || 1) / 2, near.y + (near.d || 1) / 2, near.h || 1.9);
          const text = `E · ${near.label}`;
          c.save();
          c.font = `700 ${Math.max(11, Math.round(world.TW * 0.2))}px Figtree, system-ui, sans-serif`;
          const w = c.measureText(text).width + 16;
          const bob = Math.sin(world.t * 4) * 2;
          c.fillStyle = '#ff6b1f';
          c.beginPath(); (c.roundRect ? c.roundRect(sx - w / 2, sy - 22 + bob, w, 22, 11) : c.rect(sx - w / 2, sy - 22 + bob, w, 22)); c.fill();
          c.fillStyle = '#1b0d03'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(text, sx, sy - 11 + bob);
          c.restore();
        }
        if (opts.overlay) opts.overlay(c);
      };
    },
  };
})();

/* Kitchen Legends – Start */
(function () {
  const { esc } = KL.fmt;

  const startScreen = () => {
    const app = document.getElementById('app');
    const pick = { archetype: 'punk', location: 'hinterhof' };
    const draw = () => {
      app.innerHTML = `
      <section class="intro">
        <div class="intro-hero">
          <span class="eyebrow">Eine Simulation über Feuer, Schulden und Sterne</span>
          <h1 class="logo">Kitchen<br><em>Legends</em></h1>
          <p class="lede">Vom Hinterhof mit Kredit und kaputter Spülmaschine bis zu drei Sternen im Guide Céleste. Bau dein Restaurant Tisch für Tisch, entwickle Teller, führe eine Brigade, kauf Wein, rechne knallhart – und triff am Pass den Garpunkt, während die Gäste vor deinen Augen essen und irgendwo ein Inspektor sitzt.</p>
          <ul class="intro-facts">
            <li><b>5</b> Kriterien der Inspektoren</li>
            <li><b>12</b> Wochen pro Guide-Jahr</li>
            <li><b>16</b> Talente für deine Köchin oder deinen Koch</li>
            <li><b>1</b> Anruf, der alles ändert</li>
          </ul>
        </div>
        <form class="intro-form" id="start-form">
          <div class="field">
            <label for="chef">Dein Name</label>
            <input id="chef" name="chef" required maxlength="28" value="Kim Falkner" autocomplete="off">
          </div>
          <div class="field">
            <label for="resto">Name des Restaurants</label>
            <input id="resto" name="resto" required maxlength="28" value="Glut & Gold" autocomplete="off">
          </div>
          <fieldset class="field">
            <legend>Wer bist du am Herd?</legend>
            <div class="cards">${KL.ARCHETYPES.map((a) => `
              <button type="button" class="pick ${pick.archetype === a.id ? 'on' : ''}" data-k="archetype" data-v="${a.id}">
                <b>${a.name}</b><span>${a.desc}</span>
                <small>Technik ${a.tech} · Kreativität ${a.crea} · Führung ${a.lead}</small>
              </button>`).join('')}</div>
          </fieldset>
          <fieldset class="field">
            <legend>Wo schließt du auf?</legend>
            <div class="cards">${KL.LOCATIONS.map((l) => `
              <button type="button" class="pick ${pick.location === l.id ? 'on' : ''}" data-k="location" data-v="${l.id}">
                <b>${l.name}</b><span>${l.desc}</span>
                <small>${l.seats} Plätze · Miete ${KL.fmt.eur(l.rent)}/Woche</small>
              </button>`).join('')}</div>
          </fieldset>
          <p class="fine">Start: 42.000 € auf dem Konto, 60.000 € Kredit, ein Commis, ein*e Spüler*in, eine Servicekraft und vier brave Gerichte.</p>
          <button class="btn heat big" type="submit">Schlüssel umdrehen</button>
        </form>
      </section>`;
      app.querySelectorAll('.pick').forEach((b) => (b.onclick = () => {
        const chef = app.querySelector('#chef').value, resto = app.querySelector('#resto').value;
        pick[b.dataset.k] = b.dataset.v;
        draw();
        app.querySelector('#chef').value = chef;
        app.querySelector('#resto').value = resto;
      }));
      app.querySelector('#start-form').onsubmit = (e) => {
        e.preventDefault();
        const chefName = app.querySelector('#chef').value.trim() || 'Chef*in';
        const restaurantName = app.querySelector('#resto').value.trim() || 'Namenlos';
        const s = KL.newGame({ chefName, restaurantName, archetype: pick.archetype, location: pick.location });
        KL.save(s);
        KL.UI.mount(s);
        KL.UI.toast(`Willkommen im ${restaurantName}. Schau dich um.`, 'good');
      };
    };
    draw();
  };

  KL.boot = function (fresh, hotData) {
    document.querySelectorAll('.modal-wrap, .evening, .ceremony').forEach((n) => n.remove());
    document.body.classList.remove('no-scroll');
    const saved = fresh ? null : (hotData && hotData.state) || KL.load();
    if (saved && saved.v === 2 && !saved.gameOver) {
      if (!saved.layout) KL.initLayout(saved);
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

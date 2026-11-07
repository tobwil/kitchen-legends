/* Oui, Chef! – Die Menschen und ihre Geschichte
 * Figuren werden prozedural gezeichnet. Vor jedem Abend gibt es eine kurze Szene,
 * im Service ruft die Brigade dazwischen, nach dem Service kommentiert Mo.
 */
(function () {
  const INK = '#2b1e1a';

  /* ---------- Figuren ---------- */
  // Jede Figur zeichnet ihre Büste in ein 220×260-Feld. mood: 0 (sauer) … 1 (strahlend)
  const bust = (c, o) => {
    const w = 220;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = INK;
    // Körper
    c.fillStyle = o.body;
    c.beginPath(); c.moveTo(24, 262); c.quadraticCurveTo(30, 178, w / 2, 172); c.quadraticCurveTo(w - 30, 178, w - 24, 262); c.closePath(); c.fill(); c.stroke();
    if (o.under) o.under(c);
    // Hals
    c.fillStyle = o.skin;
    c.beginPath(); c.rect(w / 2 - 17, 140, 34, 36); c.fill(); c.stroke();
    if (o.neck) o.neck(c);
    // Kopf
    c.beginPath(); c.ellipse(w / 2, 112, o.headW || 44, o.headH || 52, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    // Ohren
    [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(w / 2 + s * ((o.headW || 44) + 2), 116, 8, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke(); });
    if (o.hair) o.hair(c);
    // Gesicht
    const m = o.mood ?? 0.6;
    c.fillStyle = INK;
    if (!o.hideEyes) {
      [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(w / 2 + s * 16, 112, 4.5, m > 0.85 ? 2 : 5, 0, 0, Math.PI * 2); c.fill(); });
      c.lineWidth = o.browW || 4;
      [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(w / 2 + s * 8, 98 - (m < 0.3 ? -3 * s : 0)); c.lineTo(w / 2 + s * 26, 98 + (m < 0.3 ? 3 : 0)); c.stroke(); });
    }
    c.lineWidth = 4;
    c.strokeStyle = o.lips || INK;
    c.beginPath();
    if (m > 0.65) c.arc(w / 2, 130, 13, 0.25, Math.PI - 0.25);
    else if (m < 0.35) c.arc(w / 2, 146, 12, Math.PI + 0.35, -0.35);
    else { c.moveTo(w / 2 - 11, 136); c.lineTo(w / 2 + 11, 136); }
    c.stroke();
    c.strokeStyle = INK;
    if (o.face) o.face(c);
    if (o.top) o.top(c);
  };

  const CAST = {
    mo: {
      name: 'Mo', role: 'Souschef', color: '#ff6b1f',
      draw: (c, mood) => bust(c, {
        mood, skin: '#b9825a', body: '#f4f1ea', browW: 6,
        under: (c) => { c.fillStyle = INK; [200, 228].forEach((y) => { c.beginPath(); c.arc(96, y, 4, 0, 7); c.arc(124, y, 4, 0, 7); c.fill(); }); },
        neck: (c) => { c.strokeStyle = '#2f4f5f'; c.lineWidth = 2; c.beginPath(); c.moveTo(98, 150); c.lineTo(104, 166); c.moveTo(104, 150); c.lineTo(98, 166); c.stroke(); c.strokeStyle = INK; },
        hair: (c) => {
          // Bandana
          c.fillStyle = '#1d1f22'; c.beginPath(); c.ellipse(110, 80, 46, 26, 0, Math.PI, 0); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(150, 74); c.lineTo(170, 64); c.lineTo(164, 84); c.closePath(); c.fill(); c.stroke();
        },
        face: (c) => { c.fillStyle = '#3a2a20'; c.beginPath(); c.ellipse(110, 150, 34, 20, 0, 0, Math.PI); c.fill(); c.beginPath(); c.moveTo(80, 128); c.quadraticCurveTo(110, 160, 140, 128); c.lineTo(140, 140); c.quadraticCurveTo(110, 175, 80, 140); c.closePath(); c.fill(); },
      }),
    },
    lina: {
      name: 'Lina', role: 'Patissière', color: '#e8c46a',
      draw: (c, mood) => bust(c, {
        mood, skin: '#f1c9a5', body: '#fbf8f1', headW: 40,
        under: (c) => { c.fillStyle = '#d24a8a'; c.beginPath(); c.moveTo(92, 176); c.lineTo(110, 200); c.lineTo(128, 176); c.closePath(); c.fill(); c.stroke(); },
        hair: (c) => {
          c.fillStyle = '#a8562a';
          c.beginPath(); c.ellipse(110, 84, 44, 30, 0, Math.PI, 0); c.fill(); c.stroke();
          c.beginPath(); c.arc(110, 50, 18, 0, 7); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(68, 92); c.quadraticCurveTo(64, 120, 72, 132); c.lineTo(76, 96); c.fill();
        },
        face: (c) => { c.fillStyle = 'rgba(180,90,60,0.55)'; [[94, 124], [100, 128], [120, 128], [126, 124]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); }); },
      }),
    },
    brandt: {
      name: 'Herr Brandt', role: 'Stammgast, 3. Stock', color: '#b2442e',
      draw: (c, mood) => bust(c, {
        mood, skin: '#ecc8ac', body: '#6b5a48',
        under: (c) => { c.fillStyle = '#b2442e'; c.beginPath(); c.moveTo(70, 182); c.quadraticCurveTo(110, 200, 150, 182); c.lineTo(146, 196); c.quadraticCurveTo(110, 212, 74, 196); c.closePath(); c.fill(); c.stroke(); c.fillRect(124, 194, 14, 40); c.strokeRect(124, 194, 14, 40); },
        hair: (c) => { c.fillStyle = '#d6d2c8'; [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(110 + s * 40, 100, 10, 20, 0, 0, 7); c.fill(); c.stroke(); }); },
        face: (c) => { c.lineWidth = 2; c.beginPath(); c.moveTo(86, 104); c.lineTo(94, 106); c.moveTo(134, 104); c.lineTo(126, 106); c.moveTo(96, 146); c.quadraticCurveTo(110, 152, 124, 146); c.stroke(); c.fillStyle = '#d6d2c8'; c.beginPath(); c.ellipse(110, 128, 18, 6, 0, 0, 7); c.fill(); c.lineWidth = 4; },
        top: (c) => { c.fillStyle = '#7a5a3d'; c.beginPath(); c.ellipse(110, 70, 50, 20, 0, Math.PI, 0); c.lineTo(166, 76); c.quadraticCurveTo(110, 66, 58, 76); c.closePath(); c.fill(); c.stroke(); },
      }),
    },
    mira: {
      name: 'Mira Haddad', role: 'Food-Journalistin', color: '#d24a8a',
      draw: (c, mood) => bust(c, {
        mood, skin: '#8a5638', body: '#e0b43a', lips: '#b2243a', headW: 40,
        under: (c) => { c.fillStyle = '#2a2a33'; c.beginPath(); c.moveTo(94, 176); c.lineTo(110, 220); c.lineTo(126, 176); c.closePath(); c.fill(); c.fillStyle = '#1d1f22'; c.save(); c.translate(160, 214); c.rotate(-0.3); c.fillRect(-12, -22, 24, 44); c.strokeRect(-12, -22, 24, 44); c.restore(); },
        hair: (c) => { c.fillStyle = '#121214'; c.beginPath(); c.moveTo(64, 140); c.quadraticCurveTo(58, 56, 110, 56); c.quadraticCurveTo(162, 56, 156, 140); c.lineTo(146, 140); c.quadraticCurveTo(150, 90, 124, 80); c.quadraticCurveTo(94, 96, 74, 140); c.closePath(); c.fill(); c.stroke(); },
      }),
    },
    albers: {
      name: 'Frau Albers', role: 'Bank, Firmenkunden', color: '#3f6d8a',
      draw: (c, mood) => bust(c, {
        mood, skin: '#f1d1b8', body: '#2f3a52',
        under: (c) => { c.fillStyle = '#f4f1ea'; c.beginPath(); c.moveTo(96, 176); c.lineTo(110, 204); c.lineTo(124, 176); c.closePath(); c.fill(); c.fillStyle = '#f4efe6'; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(84 + k * 6.5, 170 + Math.sin(k / 8 * Math.PI) * 10, 3, 0, 7); c.fill(); } },
        hair: (c) => { c.fillStyle = '#d9b46a'; c.beginPath(); c.ellipse(110, 82, 48, 30, 0, Math.PI, 0); c.fill(); c.stroke(); c.beginPath(); c.moveTo(62, 86); c.quadraticCurveTo(60, 116, 70, 126); c.lineTo(72, 90); c.fill(); },
        face: (c) => { c.lineWidth = 3; [-1, 1].forEach((s) => { c.beginPath(); c.arc(110 + s * 16, 112, 12, 0, 7); c.stroke(); }); c.beginPath(); c.moveTo(104, 112); c.lineTo(116, 112); c.stroke(); c.lineWidth = 4; },
      }),
    },
    inspektorin: {
      name: 'Die Inspektorin', role: 'Tisch 9', color: '#e8c46a',
      draw: (c, mood) => bust(c, {
        mood, skin: '#e8c8b0', body: '#4a4d52', hideEyes: true,
        under: (c) => { c.fillStyle = '#7a1a2c'; c.beginPath(); c.moveTo(72, 180); c.quadraticCurveTo(110, 196, 148, 180); c.lineTo(144, 192); c.quadraticCurveTo(110, 206, 76, 192); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#f2ead9'; c.save(); c.translate(58, 222); c.rotate(0.2); c.fillRect(-14, -18, 28, 36); c.strokeRect(-14, -18, 28, 36); c.restore(); },
        top: (c) => {
          c.fillStyle = '#25272b';
          c.beginPath(); c.ellipse(110, 92, 78, 16, 0, 0, 7); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(72, 92); c.quadraticCurveTo(70, 44, 110, 42); c.quadraticCurveTo(150, 44, 148, 92); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#b8892a'; c.fillRect(74, 80, 72, 7);
          c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(110, 112, 40, 16, 0, 0, Math.PI); c.fill();
        },
      }),
    },
  };
  G.CAST = CAST;

  const cache = new Map();
  G.portrait = (id, mood = 0.6, size = 220) => {
    const k = `${id}|${mood}|${size}`;
    if (cache.has(k)) return cache.get(k);
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * (260 / 220) * dpr;
    const c = cv.getContext('2d');
    c.scale((size * dpr) / 220, (size * dpr) / 220);
    CAST[id].draw(c, mood);
    cache.set(k, cv);
    return cv;
  };

  /* ---------- Szenen vor den Abenden ---------- */
  // [Figur, Stimmung, Text]
  G.SCENES = {
    '0-0': [['mo', 0.7, 'Na, Chef. Eigener Laden. Hinterhof, Kredit, und eine Spülmaschine, die nur bei Vollmond läuft.'], ['mo', 0.8, 'Heute ist Eröffnung. Zwölf Reservierungen. Drei davon sind deine Mutter.'], ['mo', 0.6, 'Ich steh am Garde-manger, du am Pass. Wenn ich „Hände!“ rufe, holst du ab. Ça marche?']],
    '0-1': [['albers', 0.4, 'Frau Albers, von der Bank. Ich will Ihnen den Abend nicht verderben.'], ['albers', 0.3, 'Aber die erste Rate ist am Ersten fällig. Das Erste ist in neun Tagen.'], ['mo', 0.7, 'Dann kochen wir die Rate eben rein. Tatar ist neu auf der Karte, Chef.']],
    '0-2': [['mira', 0.7, 'Mira Haddad, Stadtmagazin. Ich hab gehört, im Hinterhof zischt es. Darf ich heute in der Ecke sitzen?'], ['mo', 0.5, 'Die mit dem Handy? Die hat zwanzigtausend Follower. Kein Druck, Chef. Gar kein Druck.']],
    '0-3': [['brandt', 0.3, 'Brandt. Dritter Stock. Ihr Abzug pustet mir seit zwei Wochen Rosmarin ins Schlafzimmer.'], ['brandt', 0.6, 'Ich wollte endlich mal probieren, was ich da jede Nacht rieche.'], ['mo', 0.8, 'Gib ihm den besten Tisch. Und Chef – guck mal, was im Hof steht.'], ['mo', 0.95, 'Ein Ofen! Gebraucht, aus einer Kantine. Heißer als mein Temperament. Rote Bete kommt auf die Karte.']],
    '0-4': [['mo', 0.4, 'Vorne an der Ecke hat einer einen Burgerladen aufgemacht. Mit Neonschild.'], ['mo', 0.7, 'Wir verlieren keinen einzigen Gast an ein Brötchen. Nicht heute.']],
    '0-5': [['mo', 0.4, 'Chef. Tisch 9. Allein. Leitungswasser, großes Menü. Schreibt mit.'], ['inspektorin', 0.5, '…'], ['mo', 0.5, 'Ich glaub, das ist sie. Die vom Guide. Atmen. Kochen wie immer. Nur besser.']],
    '1-0': [['mo', 0.9, 'Wir stehen im Guide! Mit Empfehlung! Meine Mutter hat die Seite eingerahmt.'], ['mo', 0.8, 'Und die Karte wird größer: Taube, Lamm, Sellerie mit Nussbutter. Der Ofen hat ab heute Dauerschicht.']],
    '1-1': [['brandt', 0.7, 'Ich habe meinen Bridge-Club mitgebracht. Wir sind alle über achtzig und sehr direkt.'], ['mo', 0.6, 'Die Taube ist neu, Chef. Die Herren lieben Taube. Sagen sie.']],
    '1-2': [['mira', 0.8, 'Mein Artikel geht morgen online. Die Überschrift steht schon. Mir fehlt nur noch das Ende.'], ['mira', 0.6, 'Heute Abend schreib ich es. Überrasch mich.']],
    '1-3': [['mo', 0.4, 'Ich hab ein Angebot bekommen. Hotelküche in Hamburg. Doppeltes Gehalt.'], ['mo', 0.5, '…'], ['mo', 0.8, 'Ich hab nein gesagt. Hier riecht’s besser.']],
    '1-4': [['albers', 0.6, 'Ich war gestern privat hier. Der Saibling …'], ['albers', 0.7, 'Nun ja. Die nächste Rate stunden wir. Ausnahmsweise.']],
    '1-5': [['mo', 0.5, 'Sie ist wieder da. Gleicher Tisch. Neuer Notizblock.'], ['inspektorin', 0.5, 'Das große Menü, bitte. Und Leitungswasser.'], ['mo', 0.6, 'Für einen Stern, Chef. Einen echten.']],
    '2-0': [['mo', 0.95, 'Ein Stern. EIN STERN. Ich hab heute Nacht nicht geschlafen.'], ['lina', 0.7, 'Lina. Patissière. Ich hab in Paris Schokolade temperiert, bis meine Finger es im Schlaf konnten.'], ['lina', 0.8, 'Ab heute gibt es hier Desserts. Mit mir.']],
    '2-1': [['lina', 0.6, 'Kleiner Tipp: halten, nicht drücken. Schokolade spürt Angst.'], ['mo', 0.7, 'Ich hab Angst vor ihr. Vor Lina, nicht vor der Schokolade.']],
    '2-2': [['mira', 0.8, 'Ihr seid auf der Liste der zehn besten Küchen der Stadt. Platz sieben.'], ['mira', 0.7, 'Willst du Platz eins? Heute isst die halbe Redaktion bei euch.']],
    '2-3': [['mo', 0.4, 'Chef, du hast seit drei Wochen nicht richtig geschlafen. Ich sag’s nur.'], ['lina', 0.7, 'Nach dem Service mach ich dir einen Kakao. Mit Salz. Keine Widerrede.']],
    '2-4': [['brandt', 0.8, 'Wissen Sie, meine Frau hatte hier früher eine Bäckerei. Genau hier, in diesem Hof.'], ['brandt', 0.9, 'Seit Sie da sind, riecht es wieder richtig.']],
    '2-5': [['mo', 0.4, 'Zwei Inspektoren diesmal. Tisch 9 und … nein, nur Tisch 9. Ich seh schon Gespenster.'], ['inspektorin', 0.6, 'Guten Abend. Ich freue mich auf das Dessert.'], ['lina', 0.8, 'Sie freut sich auf das Dessert. Hast du das gehört? Sie freut sich!']],
    '3-0': [['mo', 0.95, 'Zwei Sterne. Die Leute fahren aus München hierher. In einen Hinterhof. Zu uns.'], ['lina', 0.8, 'Und wir haben ein neues Gericht: Kalbsbries mit Dashi. Mo hat geweint.'], ['mo', 0.6, 'Das war der Dampf.']],
    '3-1': [['mira', 0.7, 'Ein Fernsehsender will eine Doku über euch drehen. Ich hab gesagt: nur, wenn sie nicht im Weg stehen.'], ['mo', 0.5, 'Sie stehen im Weg, Chef. Sie stehen genau vor dem Ofen.']],
    '3-2': [['lina', 0.8, 'Mein neues Dessert heißt „Montag“. Weil alles mit einem Montag angefangen hat.'], ['mo', 0.9, 'Weißt du noch? Zwölf Reservierungen. Drei davon deine Mutter.']],
    '3-3': [['mo', 0.6, 'Weißt du, was mein Traum ist? Irgendwann ein eigener Laden. Klein. Mit dir als Stammgast.'], ['mo', 0.8, 'Aber erst holen wir den dritten.']],
    '3-4': [['brandt', 0.9, 'Nächste Woche werde ich neunzig. Ich möchte hier feiern.'], ['brandt', 0.95, 'Mit drei Sternen, wenn es sich einrichten lässt.']],
    '3-5': [['inspektorin', 0.6, 'Ich komme seit drei Jahren hierher. Heute zum letzten Mal beruflich.'], ['inspektorin', 0.7, 'Kochen Sie für mich so, als wäre ich niemand.'], ['mo', 0.6, 'Chef. Alles, was wir haben. Jetzt.']],
  };

  // Mos Kommentar nach dem Service, je nach Sternen
  G.AFTER = {
    0: [['mo', 0.3, 'Das war … ein Montag. Morgen wird’s besser.'], ['mo', 0.25, 'Wir haben überlebt. Mehr nicht. Nochmal?']],
    1: [['mo', 0.5, 'Hat gehalten. Knapp, aber gehalten.'], ['mo', 0.5, 'Nicht schön, aber ehrlich. Da geht mehr.']],
    2: [['mo', 0.75, 'Sauber, Chef. Fast sauber.'], ['mo', 0.75, 'Die Gäste haben geklatscht. Zweimal.'], ['lina', 0.75, 'Gute Nacht für einen Dienstag. Oder welcher Tag ist heute?']],
    3: [['mo', 0.95, 'Das war Musik.'], ['mo', 0.95, 'So hab ich mir das vorgestellt, als ich hier angefangen hab.'], ['brandt', 0.95, 'Junger Mensch, das war der beste Abend seit 1974.']],
  };

  // Küchenfunk während des Service
  G.CHATTER = {
    first: [['mo', 'Erster Teller raus. Jetzt läuft’s!']],
    critical: [['mo', 'Tisch {t} wird nervös, Chef!'], ['mo', 'Die {t} guckt schon auf die Uhr!']],
    burn: [['mo', 'Es brennt! Wegwerfen, neu!'], ['mo', 'Riechst du das? Das sind wir.']],
    weeds: [['mo', 'Wir sind im Weeds! Einer nach dem anderen!'], ['mo', 'Atmen, Chef. Atmen. Und kochen.']],
    flow: [['mo', 'Läuft, Chef! Läuft!'], ['mo', 'So geht das! Weiter so!']],
    lost: [['mo', 'Die {t} ist weg. Nicht nachdenken – weiter!']],
    insp: [['mo', 'Tisch 9 sitzt. Das ist sie.']],
    last: [['mo', 'Letzte Bons! Gleich ist es geschafft!']],
    open: [['mo', 'Türen auf. Die ersten Gäste kommen.'], ['mo', 'Ruhig anfangen, Chef. Es wird noch voll.']],
    peak: [['mo', 'Jetzt kommt alles auf einmal. Hände!'], ['mo', 'Acht Uhr. Hauptzeit. Los geht’s!']],
    finale: [['mo', 'Noch ein paar Tische. Halt durch!'], ['mo', 'Die Desserts warten schon, Chef.']],
    rush: [['mo', 'Ein ganzer Bus! Alle Hände an Deck!']],
    temper: [['lina', 'Halten, nicht drücken!'], ['lina', 'Sanft. Die Schokolade merkt alles.']],
    brandt: [['mo', 'Herr Brandt ist da. Unter 90 ist er beleidigt.']],
    mira: [['mo', 'Mira sitzt an der 4. Alles, was rausgeht, landet im Netz.']],
  };

  /* ---------- Szenen-Player ---------- */
  G.Story = {
    play(lines, done, opts = {}) {
      const wrap = document.createElement('div');
      wrap.className = 'story';
      wrap.innerHTML = `
        <canvas class="story-bg" aria-hidden="true"></canvas>
        <div class="story-stage"><div class="story-portrait"></div></div>
        <div class="story-box" role="dialog" aria-live="polite">
          <span class="who"></span>
          <p class="line"></p>
          <span class="tap">Tippen ▸</span>
        </div>
        <button type="button" class="story-skip">Überspringen</button>
        ${opts.title ? `<div class="story-title"><span class="eyebrow">${opts.kicker || ''}</span><b>${opts.title}</b></div>` : ''}`;
      document.getElementById('app').appendChild(wrap);
      this.backdrop(wrap.querySelector('.story-bg'), opts.ch || 0);
      const pBox = wrap.querySelector('.story-portrait');
      const who = wrap.querySelector('.who');
      const line = wrap.querySelector('.line');
      let k = -1, typing = null, full = '';
      const finish = () => { clearInterval(typing); wrap.classList.add('out'); setTimeout(() => { wrap.remove(); done && done(); }, 220); };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; line.textContent = full; return; }
        k++;
        if (k >= lines.length) return finish();
        const [id, mood, text] = lines[k];
        const ch = CAST[id];
        if (pBox.dataset.id !== id + mood) {
          pBox.dataset.id = id + mood;
          pBox.innerHTML = '';
          const cv = G.portrait(id, mood, 260);
          const img = document.createElement('canvas');
          img.width = cv.width; img.height = cv.height;
          img.getContext('2d').drawImage(cv, 0, 0);
          pBox.appendChild(img);
          pBox.classList.remove('in'); void pBox.offsetWidth; pBox.classList.add('in');
          pBox.style.setProperty('--cc', ch.color);
        }
        who.innerHTML = `<b>${ch.name}</b> · ${ch.role}`;
        who.style.color = ch.color;
        full = text;
        line.textContent = '';
        let n = 0;
        G.Audio.tone && G.Audio.tone(440 + Math.random() * 60, 0.03, 'triangle', 0.03);
        typing = setInterval(() => {
          n += 2;
          line.textContent = full.slice(0, n);
          if (n % 8 === 0 && G.Audio.ctx) G.Audio.tone(320 + Math.random() * 120, 0.02, 'triangle', 0.02);
          if (n >= full.length) { clearInterval(typing); typing = null; }
        }, 22);
      };
      wrap.addEventListener('click', (e) => { if (e.target.closest('.story-skip')) return; G.Audio.init(); next(); });
      wrap.querySelector('.story-skip').onclick = (e) => { e.stopPropagation(); finish(); };
      next();
    },

    // Hintergrund: die Küche am Nachmittag vor dem Service, mit Wärmelampen und Dampf
    backdrop(cv, ch) {
      const c = cv.getContext('2d');
      const steam = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 20 + Math.random() * 50, v: 0.01 + Math.random() * 0.02 }));
      const wall = ['#3a201a', '#2a2a22', '#1f3a2e', '#2a1e2e'][ch] || '#3a201a';
      const loop = (ts) => {
        if (!cv.isConnected) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t = ts / 1000;
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, wall); g.addColorStop(0.6, '#15181b'); g.addColorStop(1, '#0b0d0f');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        // Fliesen
        c.fillStyle = 'rgba(255,255,255,0.025)';
        for (let y = 0; y < h * 0.55; y += 22) for (let x = (y / 22) % 2 ? -22 : 0; x < w; x += 44) c.fillRect(x + 1, y + 1, 42, 20);
        // Wärmelampen
        [0.2, 0.5, 0.8].forEach((fx, i) => {
          const x = w * fx, y = h * 0.12;
          const lg = c.createRadialGradient(x, y, 4, x, y + h * 0.25, h * 0.45);
          lg.addColorStop(0, `rgba(255,120,40,${0.42 + Math.sin(t * 2 + i) * 0.04})`); lg.addColorStop(1, 'rgba(255,120,40,0)');
          c.fillStyle = lg; c.fillRect(0, 0, w, h);
          c.fillStyle = '#111'; c.fillRect(x - 26, y - 8, 52, 12);
          c.fillStyle = '#ff8a3a'; c.fillRect(x - 20, y + 4, 40, 3);
          c.fillStyle = '#333'; c.fillRect(x - 1, 0, 2, y - 8);
        });
        // Pass-Tresen
        c.fillStyle = '#4a535a'; c.fillRect(0, h * 0.62, w, h * 0.05);
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, h * 0.62, w, 2);
        // Dampf
        steam.forEach((p) => {
          p.y -= p.v / 60; if (p.y < -0.1) { p.y = 0.7; p.x = Math.random(); }
          c.fillStyle = `rgba(240,240,240,${0.035 * (1 - Math.abs(p.y - 0.35))})`;
          c.beginPath(); c.arc(p.x * w + Math.sin(t + p.r) * 10, p.y * h, p.r, 0, 7); c.fill();
        });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
  };
})();

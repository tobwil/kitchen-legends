/* Oui, Chef! – Spieldaten
 * Stationen, Zutaten, Gerichte, Abende, Upgrades. Alles fiktiv.
 */
window.G = window.G || {};

// Stationen der Küchenlinie. kind bestimmt die Mechanik.
G.STATIONS = {
  pfanne: { name: 'Pfanne', kind: 'pan', dur: 6.2, win: [0.7, 0.86], flip: 0.42, burn: 1.18, hint: 'Tippen · FLIP · im Gold ziehen' },
  topf: { name: 'Saucier', kind: 'pot', dur: 5.2, win: [0.68, 0.88], burn: 1.22, hint: 'Tippen · im Gold ziehen' },
  kalt: { name: 'Garde-manger', kind: 'cold', cuts: 3, hint: 'Tippen · 3× wischen' },
  ofen: { name: 'Ofen', kind: 'oven', dur: 8.5, win: [0.66, 0.9], burn: 1.2, hint: 'Tippen · im Gold ziehen' },
  patisserie: { name: 'Pâtisserie', kind: 'temper', band: [0.56, 0.76], hint: 'Halten · im Band bleiben' },
};

// Zutaten: Aussehen und Station
G.ITEMS = {
  saibling: { name: 'Saibling', st: 'pfanne', shape: 'fish', col: '#f0a582', sear: '#c0612e' },
  muschel: { name: 'Jakobsmuschel', st: 'pfanne', shape: 'scallop', col: '#f6ecda', sear: '#c98a3a' },
  taube: { name: 'Taube', st: 'pfanne', shape: 'meat', col: '#9a3434', sear: '#4a1a12' },
  reh: { name: 'Rehrücken', st: 'pfanne', shape: 'meat', col: '#8a2a2a', sear: '#3a140e' },
  bries: { name: 'Kalbsbries', st: 'pfanne', shape: 'nugget', col: '#efd2a8', sear: '#b8742e' },
  jus: { name: 'Jus', st: 'topf', shape: 'sauce', col: '#5a2614' },
  beurre: { name: 'Beurre blanc', st: 'topf', shape: 'sauce', col: '#f1dfa0' },
  dashi: { name: 'Dashi', st: 'topf', shape: 'sauce', col: '#d6a95a' },
  karamell: { name: 'Salzkaramell', st: 'topf', shape: 'sauce', col: '#c3742a' },
  spargel: { name: 'Spargel', st: 'topf', shape: 'stalks', col: '#efe6c2' },
  gurke: { name: 'Gurke', st: 'kalt', shape: 'slices', col: '#86b85e' },
  kraeuter: { name: 'Kräuter', st: 'kalt', shape: 'leaves', col: '#4f8c3c' },
  tatar: { name: 'Tatar', st: 'kalt', shape: 'mound', col: '#b3323c' },
  apfel: { name: 'Apfel', st: 'kalt', shape: 'slices', col: '#dfe27a' },
  ziege: { name: 'Ziegenkäse', st: 'kalt', shape: 'mound', col: '#f6f2e8' },
  bete: { name: 'Rote Bete', st: 'ofen', shape: 'roots', col: '#9a1d42' },
  sellerie: { name: 'Sellerie', st: 'ofen', shape: 'roots', col: '#ddd2ae' },
  karotte: { name: 'Karotte', st: 'ofen', shape: 'roots', col: '#e47f2c' },
  schoko: { name: 'Schokolade', st: 'patisserie', shape: 'quenelle', col: '#4a2616' },
  eis: { name: 'Heumilch-Eis', st: 'patisserie', shape: 'quenelle', col: '#f7f0da' },
};

// Gerichte. ch = ab welchem Kapitel sie auf der Karte stehen
G.DISHES = [
  { id: 'saibling', name: 'Saibling · Gurke', items: ['saibling', 'gurke'], value: 120, ch: 0, sauce: '#7fae5a' },
  { id: 'spargel', name: 'Spargel · Beurre blanc', items: ['spargel', 'beurre'], value: 120, ch: 0, sauce: '#f1dfa0' },
  { id: 'tatar', name: 'Tatar · Kräuter', items: ['tatar', 'kraeuter'], value: 110, ch: 0, sauce: '#4f8c3c' },
  { id: 'muschel', name: 'Jakobsmuschel · Beurre blanc', items: ['muschel', 'beurre'], value: 140, ch: 0, sauce: '#f1dfa0' },
  { id: 'bete', name: 'Rote Bete · Ziegenkäse', items: ['bete', 'ziege'], value: 130, ch: 1, sauce: '#9a1d42' },
  { id: 'taube', name: 'Taube · Jus · Sellerie', items: ['taube', 'jus', 'sellerie'], value: 210, ch: 1, sauce: '#5a2614' },
  { id: 'karotte', name: 'Karotte · Dashi · Kräuter', items: ['karotte', 'dashi', 'kraeuter'], value: 180, ch: 1, sauce: '#d6a95a' },
  { id: 'schoko', name: 'Schokolade · Salzkaramell', items: ['schoko', 'karamell'], value: 170, ch: 2, sauce: '#c3742a' },
  { id: 'apfel', name: 'Heumilch-Eis · Apfel', items: ['eis', 'apfel'], value: 160, ch: 2, sauce: '#dfe27a' },
  { id: 'reh', name: 'Reh · Jus · Rote Bete', items: ['reh', 'jus', 'bete'], value: 230, ch: 2, sauce: '#5a2614' },
  { id: 'bries', name: 'Kalbsbries · Dashi · Gurke', items: ['bries', 'dashi', 'gurke'], value: 220, ch: 3, sauce: '#d6a95a' },
  { id: 'muschel2', name: 'Muschel · Dashi · Apfel', items: ['muschel', 'dashi', 'apfel'], value: 220, ch: 3, sauce: '#d6a95a' },
];

G.CHAPTERS = [
  { name: 'Hinterhof', sub: 'Kredit, kaputte Spülmaschine, große Träume', stations: ['pfanne', 'topf', 'kalt'], award: 'Empfehlung im Guide', awardStars: 0.5, color: '#c4553b' },
  { name: 'Der erste Stern', sub: 'Der Ofen glüht, die Stadt redet', stations: ['pfanne', 'topf', 'kalt', 'ofen'], award: 'Ein Stern', awardStars: 1, color: '#d4a24c' },
  { name: 'Zwei Sterne', sub: 'Eine Küche, für die man einen Umweg fährt', stations: ['pfanne', 'topf', 'kalt', 'ofen', 'patisserie'], award: 'Zwei Sterne', awardStars: 2, color: '#7aa0c4' },
  { name: 'Drei Sterne', sub: 'Eine eigene Reise wert', stations: ['pfanne', 'topf', 'kalt', 'ofen', 'patisserie'], award: 'Drei Sterne', awardStars: 3, color: '#e8c46a' },
];
G.NIGHTS_PER_CH = 6;
G.BOSS_STARS = 10; // Sterne im Kapitel, um den Inspektoren-Abend freizuschalten

G.MODS = {
  blogger: { name: 'Food-Bloggerin', text: 'Tisch 4 postet alles. Ihre Teller zählen doppelt.' },
  rush: { name: 'Busladung', text: 'Um 20:30 kommt eine Reisegruppe. Alles auf einmal.' },
  spueler: { name: 'Spüler krank', text: 'Ein Platz weniger am Pass.' },
  hitze: { name: 'Hitzewelle', text: 'Die Pfannen brennen schneller an.' },
  vip: { name: 'Stammgast', text: 'Herr B. will alles perfekt. Unter 90 ist er beleidigt.' },
  hochzeit: { name: 'Hochzeit', text: 'Große Gesellschaft, große Bons.' },
};

// Abende generieren
G.night = (ch, i) => {
  const n = ch * G.NIGHTS_PER_CH + i;
  const boss = i === G.NIGHTS_PER_CH - 1;
  const modsPool = ['blogger', 'rush', 'spueler', 'hitze', 'vip', 'hochzeit'];
  const mods = [];
  if (!boss && n >= 2) mods.push(modsPool[(n * 7 + ch) % modsPool.length]);
  if (!boss && n >= 14) mods.push(modsPool[(n * 3 + 2) % modsPool.length]);
  const dur = Math.min(185, 120 + n * 3 + (boss ? 25 : 0));
  return {
    ch, i, n, boss, mods: [...new Set(mods)],
    dur,
    interval: Math.max(3.9, 8.2 - n * 0.2),
    patience: Math.max(25, 46 - n * 0.85),
    dishes: G.DISHES.filter((d) => d.ch <= ch),
    stations: G.CHAPTERS[ch].stations,
    title: boss ? 'Inspektoren-Abend' : ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][i] + 'abend',
  };
};

G.UPGRADES = [
  { id: 'pfannen', name: 'Kupferpfannen', desc: 'Goldenes Fenster an allen Stationen +12 %.', costs: [300, 700, 1500] },
  { id: 'lampen', name: 'Wärmelampen', desc: 'Gäste warten 10 % länger.', costs: [250, 600, 1200] },
  { id: 'ruhe', name: 'Kräutertee im Kühlhaus', desc: 'Stress steigt 20 % langsamer.', costs: [400, 900] },
  { id: 'messer', name: 'Japanisches Messer', desc: 'Garde-manger: zwei Schnitte statt drei.', costs: [500] },
  { id: 'commis', name: 'Commis an der Pfanne', desc: 'Wendet die Pfannen automatisch.', costs: [800] },
  { id: 'pass', name: 'Größerer Pass', desc: 'Vier Teller gleichzeitig statt drei.', costs: [1100] },
  { id: 'souschef', name: 'Souschef', desc: 'Richtet an, wenn du keine Zeit hast (gute 85 %).', costs: [1600] },
  { id: 'salon', name: 'Salon-Einrichtung', desc: 'Mehr Trinkgeld, +15 % pro Stufe.', costs: [600, 1400, 3000] },
];

G.CALLS_GOOD = ['Oui, Chef!', 'Ça marche!', 'Hände!', 'Abholen!', 'Läuft!', 'Heiß von hinten!', 'Sauber!'];
G.REVIEWS = {
  3: ['„Ich habe am Tisch kurz die Augen geschlossen.“', '„Präzise, mutig, warm. Wir kommen wieder.“', '„Hier kocht jemand, der etwas zu sagen hat.“'],
  2: ['„Großartige Ideen, ein, zwei Wackler.“', '„Schöner Abend. Der Fisch war ein Gedicht.“', '„Viel Herz, noch nicht ganz rund.“'],
  1: ['„Lange gewartet, aber der Hauptgang …“', '„Ambitioniert. Die Küche wirkte gestresst.“', '„Charmant, aber chaotisch.“'],
  0: ['„Wir sind nach dem zweiten Gang gegangen.“', '„Lauwarm und spät. Schade.“'],
};
G.INSPECTOR_TELLS = ['Bestellt das große Menü und Leitungswasser.', 'Fragt, woher die Butter kommt.', 'Macht sich Notizen auf dem Handy.', 'Hat unter falschem Namen reserviert.', 'Isst jeden Gang in exakt gleichem Tempo.'];

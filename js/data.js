/* Kitchen Legends – Spieldaten
 * Alle Inhalte sind fiktiv. Der "Guide Céleste" ist ein erfundener Restaurantführer.
 * Geschmacksvektor: [süß, sauer, salzig, bitter, umami, fett] auf einer Skala von 0–6.
 */
window.KL = window.KL || {};

KL.FLAVORS = ['süß', 'sauer', 'salzig', 'bitter', 'umami', 'fett'];

KL.SEASONS = [
  { id: 'fruehling', name: 'Frühling' },
  { id: 'sommer', name: 'Sommer' },
  { id: 'herbst', name: 'Herbst' },
  { id: 'winter', name: 'Winter' },
];
KL.WEEKS_PER_YEAR = 12; // Ein Guide-Jahr, danach Verleihung

// Zielkorridore für die Aromen-Harmonie
KL.TARGETS = {
  herzhaft: [[0, 3], [1, 3.5], [1.5, 4], [0, 2.5], [2, 6], [1.5, 5]],
  dessert: [[2.5, 6], [1, 4], [0, 1.5], [0, 3], [0, 1.5], [1, 4]],
};

// Hauptprodukte. cat = Einkaufskategorie, seasons = beste Saison (leer = ganzjährig)
KL.PRODUCTS = [
  { id: 'saibling', name: 'Saibling', cat: 'fisch', type: 'herzhaft', cost: 6, f: [0, 0, 1, 0, 2, 2], tex: 'zart', wow: 2, seasons: [], body: 'leicht' },
  { id: 'jakobsmuschel', name: 'Jakobsmuschel', cat: 'fisch', type: 'herzhaft', cost: 9, f: [2, 0, 1, 0, 3, 1], tex: 'zart', wow: 3, seasons: ['winter', 'herbst'], body: 'leicht' },
  { id: 'kaisergranat', name: 'Kaisergranat', cat: 'fisch', type: 'herzhaft', cost: 13, f: [2, 0, 2, 0, 3, 1], tex: 'zart', wow: 4, seasons: ['sommer', 'fruehling'], body: 'leicht' },
  { id: 'steinbutt', name: 'Steinbutt', cat: 'fisch', type: 'herzhaft', cost: 11, f: [0, 0, 1, 0, 2, 2], tex: 'zart', wow: 3, seasons: [], body: 'mittel' },
  { id: 'kaviar', name: 'Kaviar', cat: 'fisch', type: 'herzhaft', cost: 24, f: [0, 0, 4, 0, 4, 2], tex: 'zart', wow: 3, seasons: [], body: 'leicht' },
  { id: 'taube', name: 'Taube', cat: 'fleisch', type: 'herzhaft', cost: 10, f: [0, 0, 1, 1, 3, 2], tex: 'zart', wow: 4, seasons: ['herbst'], body: 'kraeftig' },
  { id: 'reh', name: 'Rehrücken', cat: 'fleisch', type: 'herzhaft', cost: 11, f: [0, 0, 1, 1, 3, 1], tex: 'zart', wow: 3, seasons: ['herbst', 'winter'], body: 'kraeftig' },
  { id: 'faerse', name: 'Färse vom Weiderind', cat: 'fleisch', type: 'herzhaft', cost: 12, f: [0, 0, 2, 1, 4, 4], tex: 'zart', wow: 2, seasons: [], body: 'kraeftig' },
  { id: 'schweinebauch', name: 'Schweinebauch', cat: 'fleisch', type: 'herzhaft', cost: 4, f: [1, 0, 2, 0, 3, 5], tex: 'zart', wow: 1, seasons: [], body: 'kraeftig' },
  { id: 'kalbsbries', name: 'Kalbsbries', cat: 'fleisch', type: 'herzhaft', cost: 8, f: [0, 0, 1, 0, 2, 4], tex: 'cremig', wow: 4, seasons: [], body: 'mittel' },
  { id: 'rotebete', name: 'Rote Bete', cat: 'gemuese', type: 'herzhaft', cost: 2, f: [3, 0, 0, 1, 1, 0], tex: 'zart', wow: 2, seasons: ['herbst', 'winter'], body: 'mittel' },
  { id: 'spargel', name: 'Weißer Spargel', cat: 'gemuese', type: 'herzhaft', cost: 5, f: [1, 0, 0, 2, 1, 0], tex: 'zart', wow: 2, seasons: ['fruehling'], body: 'leicht' },
  { id: 'karotte', name: 'Karotte', cat: 'gemuese', type: 'herzhaft', cost: 1.5, f: [3, 0, 0, 0, 1, 0], tex: 'zart', wow: 1, seasons: [], body: 'leicht' },
  { id: 'sellerie', name: 'Knollensellerie', cat: 'gemuese', type: 'herzhaft', cost: 1.5, f: [1, 0, 1, 1, 2, 0], tex: 'zart', wow: 2, seasons: ['winter', 'herbst'], body: 'mittel' },
  { id: 'tomate', name: 'Ochsenherz-Tomate', cat: 'gemuese', type: 'herzhaft', cost: 3, f: [2, 3, 0, 0, 3, 0], tex: 'frisch', wow: 1, seasons: ['sommer'], body: 'leicht' },
  { id: 'steinpilz', name: 'Steinpilz', cat: 'gemuese', type: 'herzhaft', cost: 7, f: [0, 0, 1, 1, 4, 1], tex: 'zart', wow: 2, seasons: ['herbst'], body: 'mittel' },
  { id: 'schokolade', name: 'Grand-Cru-Schokolade', cat: 'feinkost', type: 'dessert', cost: 3, f: [3, 0, 0, 4, 0, 3], tex: 'cremig', wow: 1, seasons: [], body: 'kraeftig' },
  { id: 'erdbeere', name: 'Walderdbeere', cat: 'gemuese', type: 'dessert', cost: 3.5, f: [4, 3, 0, 0, 0, 0], tex: 'frisch', wow: 2, seasons: ['sommer'], body: 'leicht' },
  { id: 'rhabarber', name: 'Rhabarber', cat: 'gemuese', type: 'dessert', cost: 2, f: [1, 4, 0, 1, 0, 0], tex: 'frisch', wow: 2, seasons: ['fruehling'], body: 'leicht' },
  { id: 'apfel', name: 'Alte Apfelsorte', cat: 'gemuese', type: 'dessert', cost: 1.5, f: [3, 3, 0, 0, 0, 0], tex: 'frisch', wow: 1, seasons: ['herbst', 'winter'], body: 'leicht' },
  { id: 'sanddorn', name: 'Sanddorn', cat: 'gemuese', type: 'dessert', cost: 3, f: [1, 4, 0, 1, 0, 0], tex: 'frisch', wow: 3, seasons: ['herbst'], body: 'leicht' },
  { id: 'milchreis', name: 'Heumilch', cat: 'feinkost', type: 'dessert', cost: 2, f: [2, 0, 0, 0, 0, 3], tex: 'cremig', wow: 2, seasons: [], body: 'mittel' },
];

// Techniken. eq = benötigtes Küchengerät
KL.TECHNIQUES = [
  { id: 'gebraten', name: 'Gebraten', diff: 1, f: [0, 0, 1, 1, 1, 1], tex: 'kross', wow: 0, eq: null },
  { id: 'pochiert', name: 'Pochiert', diff: 1, f: [0, 0, 0, 0, 0, 0], tex: 'zart', wow: 0, eq: null },
  { id: 'roh', name: 'Roh / Crudo', diff: 2, f: [0, 1, 0, 0, 0, 0], tex: 'frisch', wow: 1, eq: null },
  { id: 'gebeizt', name: 'Gebeizt', diff: 1, f: [0, 1, 2, 0, 1, 0], tex: 'zart', wow: 1, eq: null },
  { id: 'confiert', name: 'Confiert', diff: 2, f: [0, 0, 0, 0, 0, 2], tex: 'zart', wow: 0, eq: null },
  { id: 'salzkruste', name: 'In der Salzkruste', diff: 2, f: [0, 0, 2, 0, 1, 0], tex: 'zart', wow: 1, eq: null },
  { id: 'glasiert', name: 'Glasiert', diff: 1, f: [2, 0, 0, 1, 0, 0], tex: 'kross', wow: 0, eq: null },
  { id: 'sousvide', name: 'Sous-vide', diff: 2, f: [0, 0, 0, 0, 0, 0], tex: 'zart', wow: 1, eq: 'sousvide', consistency: 12 },
  { id: 'holzkohle', name: 'Über Holzkohle', diff: 3, f: [0, 0, 1, 2, 2, 0], tex: 'kross', wow: 2, eq: 'grill' },
  { id: 'geraeuchert', name: 'Kalt geräuchert', diff: 2, f: [0, 0, 1, 2, 2, 0], tex: 'zart', wow: 2, eq: 'raeucher' },
  { id: 'fermentiert', name: 'Fermentiert', diff: 3, f: [0, 3, 1, 0, 3, 0], tex: 'zart', wow: 3, eq: 'ferment' },
  { id: 'dryaged', name: 'Dry-Aged', diff: 2, f: [0, 0, 1, 1, 3, 1], tex: 'zart', wow: 2, eq: 'dryager' },
  { id: 'eis', name: 'Als Eis / Sorbet', diff: 3, f: [1, 0, 0, 0, 0, 1], tex: 'cremig', wow: 2, eq: 'eismaschine' },
];

KL.ACCENTS = [
  { id: 'beurreblanc', name: 'Beurre blanc', f: [0, 2, 1, 0, 0, 4], wow: 0, cost: 1.2 },
  { id: 'jus', name: 'Kalbsjus', f: [1, 1, 2, 1, 4, 1], wow: 0, cost: 1.5 },
  { id: 'nussbutter', name: 'Nussbutter', f: [1, 0, 1, 1, 1, 4], wow: 1, cost: 0.8 },
  { id: 'kraeuteroel', name: 'Kräuteröl', f: [0, 0, 0, 1, 0, 2], wow: 1, cost: 0.6 },
  { id: 'buttermilch', name: 'Buttermilch-Sud', f: [0, 3, 1, 0, 0, 1], wow: 1, cost: 0.5 },
  { id: 'dashi', name: 'Dashi', f: [0, 0, 2, 0, 4, 0], wow: 2, cost: 1.4 },
  { id: 'miso', name: 'Miso', f: [1, 0, 3, 0, 4, 0], wow: 2, cost: 0.9 },
  { id: 'yuzu', name: 'Yuzu', f: [1, 5, 0, 1, 0, 0], wow: 2, cost: 1.8 },
  { id: 'sauerampfer', name: 'Sauerampfer', f: [0, 4, 0, 1, 0, 0], wow: 2, cost: 0.6 },
  { id: 'wildkraeuter', name: 'Wildkräuter', f: [0, 1, 0, 2, 0, 0], wow: 2, cost: 0.7 },
  { id: 'fichte', name: 'Fichtennadel', f: [0, 1, 0, 2, 0, 0], wow: 3, cost: 0.5 },
  { id: 'kaffee', name: 'Kaffee', f: [0, 1, 0, 4, 1, 0], wow: 3, cost: 0.5 },
  { id: 'garum', name: 'Hausgemachtes Garum', f: [0, 0, 4, 0, 5, 0], wow: 4, cost: 1.0 },
  { id: 'vanille', name: 'Bourbon-Vanille', f: [3, 0, 0, 0, 0, 1], wow: 0, cost: 1.2 },
  { id: 'holunder', name: 'Holunderblüte', f: [3, 2, 0, 0, 0, 0], wow: 1, cost: 0.7 },
  { id: 'salzkaramell', name: 'Salzkaramell', f: [4, 0, 2, 0, 0, 2], wow: 0, cost: 0.6 },
  { id: 'kakaonibs', name: 'Kakaonibs', f: [0, 0, 0, 4, 0, 1], wow: 2, cost: 0.9 },
  { id: 'trueffel', name: 'Périgord-Trüffel', f: [0, 0, 1, 1, 4, 1], wow: 2, cost: 9 },
];

KL.TEXTURES = [
  { id: 'keine', name: 'Ohne Textur-Element', f: [0, 0, 0, 0, 0, 0], tex: null, diff: 0, cost: 0 },
  { id: 'chip', name: 'Hauchdünner Chip', f: [0, 0, 1, 0, 0, 1], tex: 'kross', diff: 1, cost: 0.3 },
  { id: 'crumble', name: 'Nuss-Crumble', f: [1, 0, 1, 0, 0, 1], tex: 'kross', diff: 0, cost: 0.4 },
  { id: 'gepufft', name: 'Gepuffter Reis', f: [0, 0, 1, 0, 0, 0], tex: 'kross', diff: 1, cost: 0.2 },
  { id: 'espuma', name: 'Espuma', f: [0, 0, 0, 0, 0, 1], tex: 'luftig', diff: 1, cost: 0.4 },
  { id: 'gel', name: 'Gel', f: [0, 1, 0, 0, 0, 0], tex: 'gel', diff: 1, cost: 0.3 },
  { id: 'pueree', name: 'Seidiges Püree', f: [0, 0, 0, 0, 0, 2], tex: 'cremig', diff: 0, cost: 0.4 },
  { id: 'granite', name: 'Granité', f: [1, 1, 0, 0, 0, 0], tex: 'frisch', diff: 1, cost: 0.3 },
];

// Kombinationen aus Produkt + Begleiter
KL.CLASSICS = {
  'jakobsmuschel+beurreblanc': 'Bretonischer Klassiker',
  'steinbutt+beurreblanc': 'Grande Cuisine',
  'taube+jus': 'Klassische Wildküche',
  'reh+jus': 'Klassische Wildküche',
  'faerse+jus': 'Brasserie-Herz',
  'spargel+beurreblanc': 'Frühlingsklassiker',
  'erdbeere+vanille': 'Sommerklassiker',
  'schokolade+salzkaramell': 'Patisserie-Klassiker',
  'tomate+kraeuteroel': 'Sommer pur',
  'saibling+buttermilch': 'Nordische Schule',
  'apfel+nussbutter': 'Omas Küche, verfeinert',
  'kaviar+beurreblanc': 'Luxus-Klassiker',
  'steinpilz+jus': 'Herbstklassiker',
};
KL.BOLD = {
  'rotebete+kaffee': 'Erdig trifft geröstet',
  'sellerie+miso': 'Gemüse als Fleisch gedacht',
  'sellerie+trueffel': 'Der ganze Knollensellerie',
  'schweinebauch+yuzu': 'Fett trifft Zitrus-Blitz',
  'saibling+fichte': 'Waldboden & Bergbach',
  'kalbsbries+kaffee': 'Mut zum Röstaroma',
  'schokolade+miso': 'Salzig-süßes Umami',
  'rhabarber+wildkraeuter': 'Wiese im Mai',
  'sanddorn+nussbutter': 'Ostsee-Herbst',
  'karotte+garum': 'Gemüse mit Meerestiefe',
  'kaisergranat+dashi': 'Fernost an der Nordsee',
  'milchreis+fichte': 'Alm & Wald',
  'jakobsmuschel+sauerampfer': 'Säure-Schnitt',
  'taube+kakaonibs': 'Bitter-süße Tiefe',
  'tomate+garum': 'Umami-Explosion',
};

KL.EQUIPMENT = [
  { id: 'sousvide', name: 'Sous-vide-Station', cost: 3500, upkeep: 15, desc: 'Präzise Garung. +Beständigkeit, schaltet Sous-vide frei.' },
  { id: 'grill', name: 'Holzkohle-Ofen', cost: 9000, upkeep: 60, desc: 'Echtes Feuer. Schaltet „Über Holzkohle“ frei.' },
  { id: 'raeucher', name: 'Räucherschrank', cost: 4500, upkeep: 20, desc: 'Schaltet „Kalt geräuchert“ frei.' },
  { id: 'ferment', name: 'Fermentationskammer', cost: 6000, upkeep: 25, desc: 'Koji, Garum, Lakto. Schaltet „Fermentiert“ frei.' },
  { id: 'dryager', name: 'Dry-Ager-Schrank', cost: 7000, upkeep: 30, desc: 'Reifung am Knochen. Schaltet „Dry-Aged“ frei.' },
  { id: 'eismaschine', name: 'Feinst-Eismaschine', cost: 5500, upkeep: 15, desc: 'Samtiges Eis à la minute. Schaltet „Als Eis / Sorbet“ frei.' },
  { id: 'kombi', name: 'Kombidämpfer', cost: 12000, upkeep: 40, desc: 'Arbeitstier der Profiküche. +12 Küchenstärke.', power: 12 },
  { id: 'kuehlhaus', name: 'Begehbares Kühlhaus', cost: 8000, upkeep: 35, desc: 'Weniger Verderb, größere Lieferungen. −50 % Warenverlust.' },
];

KL.INTERIOR = [
  { id: 'licht', name: 'Lichtkonzept vom Designer', cost: 6000, amb: 10, upkeep: 10, desc: 'Jeder Teller im Spot. Kein Gast im Halbdunkel.' },
  { id: 'akustik', name: 'Akustikdecke', cost: 5000, amb: 8, upkeep: 0, desc: 'Gespräche statt Lärm.' },
  { id: 'tische', name: 'Massivholztische, Leinen', cost: 9000, amb: 12, upkeep: 40, desc: 'Weißes Leinen oder blanke Eiche – Haltung zeigen.' },
  { id: 'geschirr', name: 'Handgetöpfertes Geschirr', cost: 7000, amb: 10, upkeep: 25, desc: 'Unikate aus einer Werkstatt in der Uckermark.' },
  { id: 'glaeser', name: 'Mundgeblasene Gläser', cost: 4500, amb: 6, upkeep: 30, desc: 'Der Sommelier wird dich lieben. +10 Weinbegleitung.', wine: 10 },
  { id: 'kunst', name: 'Kunst an der Wand', cost: 3000, amb: 6, upkeep: 0, desc: 'Leihgaben einer Kiez-Galerie. Gesprächsstoff.' },
  { id: 'kueche', name: 'Offene Küche', cost: 15000, amb: 14, upkeep: 0, desc: 'Gäste sehen das Feuer. +Buzz, aber jeder Fehler ist öffentlich.', buzz: 6 },
  { id: 'chefstable', name: "Chef's Table", cost: 18000, amb: 8, upkeep: 0, desc: '+6 Plätze an der Küche zu 140 % Menüpreis.', seats: 6 },
  { id: 'weinklima', name: 'Weinklimaschrank im Gastraum', cost: 6500, amb: 6, upkeep: 15, desc: 'Flaschen als Bühne. +8 Weinbegleitung.', wine: 8 },
  { id: 'terrasse', name: 'Hofterrasse', cost: 8000, amb: 5, upkeep: 10, desc: 'Im Sommer +20 % Nachfrage.', summer: 0.2 },
];

KL.LOCATIONS = [
  { id: 'hinterhof', name: 'Hinterhof im Kiez', rent: 1100, seats: 26, base: 0.85, prestige: 0, desc: 'Billige Miete, Graffiti im Treppenhaus, Nachbarn mit Meinung. Die Underdog-Route.' },
  { id: 'altbau', name: 'Altbau-Eckladen', rent: 2200, seats: 36, base: 1.0, prestige: 8, desc: 'Stuck, hohe Fenster, Laufkundschaft. Solide Mitte.' },
  { id: 'hotel', name: 'Hotel-Dependance', rent: 3800, seats: 44, base: 1.15, prestige: 16, desc: 'Reiche Gäste, hohe Erwartungen, die Hoteldirektion schaut zu.' },
];

KL.ARCHETYPES = [
  { id: 'punk', name: 'Punk am Herd', tech: 48, crea: 78, lead: 40, desc: 'Autodidakt*in, Narben am Unterarm, null Respekt vor Regeln. Kreativ wie Sau, Führung lernst du noch.' },
  { id: 'klassiker', name: 'Die Klassik-Schule', tech: 78, crea: 48, lead: 55, desc: 'Zehn Jahre bei den Großen, Saucen im Schlaf. Präzise – aber traust du dich auch mal was?' },
  { id: 'heimkehrer', name: 'Heimkehrer*in', tech: 62, crea: 62, lead: 62, desc: 'Weltreise durch die Küchen von Tokio bis Kopenhagen. Ausgewogen, mit Fernweh im Teller.' },
];

KL.SUPPLIERS = [
  { id: 'grossmarkt', name: 'Großmarkt', q: 55, cost: 0.85, rel: 0.99, regional: 0, minRep: 0, desc: 'Günstig, verlässlich, austauschbar.' },
  { id: 'biohof', name: 'Bio-Hof aus der Region', q: 74, cost: 1.1, rel: 0.94, regional: 1, minRep: 0, desc: 'Ehrliche Ware, abhängig vom Wetter.' },
  { id: 'premium', name: 'Premium-Händler', q: 84, cost: 1.35, rel: 0.97, regional: 0, minRep: 15, desc: 'Was die Spitzenküchen kaufen. Kostet.' },
  { id: 'direkt', name: 'Direkt vom Erzeuger', q: 95, cost: 1.55, rel: 0.86, regional: 1, minRep: 35, desc: 'Fischer, Jäger, Gärtnerin per Handschlag. Beste Ware – wenn sie kommt.' },
];
KL.CATEGORIES = [
  { id: 'fisch', name: 'Fisch & Meer' },
  { id: 'fleisch', name: 'Fleisch & Wild' },
  { id: 'gemuese', name: 'Gemüse, Obst & Kräuter' },
  { id: 'feinkost', name: 'Milch, Feinkost & Saucen-Basis' },
];

KL.WINE_STYLES = {
  schaum: 'Schaumwein',
  weissleicht: 'Weiß, leicht & mineralisch',
  weisskraeftig: 'Weiß, kräftig & cremig',
  aromatisch: 'Aromatisch / Riesling mit Restsüße',
  orange: 'Orange / Naturwein',
  rotelegant: 'Rot, elegant',
  rotkraeftig: 'Rot, kräftig',
  suess: 'Süßwein',
};

KL.WINES = [
  { id: 'w1', name: 'Pinot Brut Nature, Weingut Kesselfeld', region: 'Pfalz', style: 'schaum', price: 19, q: 72 },
  { id: 'w2', name: 'Blanc de Blancs Grand Cru, Maison Arvelle', region: 'Champagne', style: 'schaum', price: 58, q: 92 },
  { id: 'w3', name: 'Riesling „Blauschiefer“, Hollerbach', region: 'Mosel', style: 'weissleicht', price: 16, q: 78 },
  { id: 'w4', name: 'Grüner Veltliner Ried Kalkstein', region: 'Wachau', style: 'weissleicht', price: 24, q: 85 },
  { id: 'w5', name: 'Chablis Premier Cru, Domaine Feuillet', region: 'Burgund', style: 'weissleicht', price: 38, q: 89 },
  { id: 'w6', name: 'Weißburgunder Große Lage, Ebersbach', region: 'Baden', style: 'weisskraeftig', price: 29, q: 84 },
  { id: 'w7', name: 'Meursault „Les Narvaux“, Domaine Ollier', region: 'Burgund', style: 'weisskraeftig', price: 72, q: 94 },
  { id: 'w8', name: 'Riesling Spätlese, Weingut Steinreb', region: 'Rheingau', style: 'aromatisch', price: 18, q: 80 },
  { id: 'w9', name: 'Gewürztraminer Vendanges, Kuhn', region: 'Elsass', style: 'aromatisch', price: 27, q: 83 },
  { id: 'w10', name: 'Maischevergorener Silvaner „Amphore“', region: 'Franken', style: 'orange', price: 26, q: 82 },
  { id: 'w11', name: 'Spätburgunder Alte Reben, Marwitz', region: 'Ahr', style: 'rotelegant', price: 34, q: 86 },
  { id: 'w12', name: 'Nebbiolo Langhe, Cascina Morra', region: 'Piemont', style: 'rotelegant', price: 28, q: 82 },
  { id: 'w13', name: 'Blaufränkisch Reserve, Gut Pannon', region: 'Burgenland', style: 'rotkraeftig', price: 22, q: 80 },
  { id: 'w14', name: 'Syrah „Granit“, Domaine Vallière', region: 'Nördliche Rhône', style: 'rotkraeftig', price: 46, q: 90 },
  { id: 'w15', name: 'Riesling Beerenauslese, Hollerbach', region: 'Mosel', style: 'suess', price: 44, q: 91 },
  { id: 'w16', name: 'Tokaji Aszú 5 Puttonyos', region: 'Tokaj', style: 'suess', price: 36, q: 88 },
];

KL.ROLES = {
  souschef: { name: 'Souschef', area: 'kueche', wage: 1000, weight: 1.6 },
  partie: { name: 'Chef de Partie', area: 'kueche', wage: 780, weight: 1.0 },
  patissier: { name: 'Patissier*e', area: 'kueche', wage: 800, weight: 1.0 },
  commis: { name: 'Commis', area: 'kueche', wage: 520, weight: 0.6 },
  spueler: { name: 'Spüler*in', area: 'kueche', wage: 460, weight: 0.4 },
  sommelier: { name: 'Sommelier*e', area: 'service', wage: 880, weight: 1.0 },
  maitre: { name: 'Restaurantleitung', area: 'service', wage: 920, weight: 1.3 },
  service: { name: 'Servicekraft', area: 'service', wage: 600, weight: 0.8 },
};

KL.TRAITS = [
  { id: 'perfektion', name: 'Perfektionist*in', desc: '+Beständigkeit, leidet unter Chaos.' },
  { id: 'tempo', name: 'Schnelle Hände', desc: '+Küchenstärke im Service.' },
  { id: 'kreativ', name: 'Kreativkopf', desc: '+Kreativität bei neuen Gerichten.' },
  { id: 'loyal', name: 'Loyal', desc: 'Lässt sich nicht abwerben.' },
  { id: 'sterne', name: 'Ex-Sterneküche', desc: 'Kennt den Druck. +Technik.' },
  { id: 'party', name: 'Feierbiest', desc: 'Großartig – wenn pünktlich.' },
  { id: 'gastgeber', name: 'Geborener Gastgeber', desc: '+Gästezufriedenheit.' },
];

KL.FIRST_NAMES = ['Lena', 'Kemal', 'Ana', 'Jonas', 'Mira', 'Tariq', 'Sophie', 'Ilja', 'Noor', 'Mats', 'Giulia', 'Ben', 'Yuki', 'Ole', 'Fatma', 'Piet', 'Chiara', 'Emre', 'Frieda', 'Luca', 'Dana', 'Kofi', 'Hanna', 'Vito', 'Zoe', 'Malik', 'Ines', 'Arne', 'Selin', 'Tom'];
KL.LAST_NAMES = ['Brandt', 'Yilmaz', 'Kovač', 'Hoffmann', 'Okafor', 'Lindqvist', 'Moreau', 'Schulte', 'Nakamura', 'Petersen', 'Rossi', 'Wójcik', 'Haddad', 'Vogel', 'Achterberg', 'Demir', 'Krüger', 'Santos', 'Albers', 'Novak'];

KL.REVIEW_GOOD = [
  'Ich habe am Tisch kurz die Augen geschlossen. Das passiert mir sonst nie.',
  'Mutig, präzise, und trotzdem mit Herz. Wir kommen wieder.',
  'Der Service war so warm, als würde man bei Freunden essen – nur besser.',
  'Ein Gang hat mich ehrlich zum Lachen gebracht. So soll Essen sein.',
  'Die Weinbegleitung hat Geschichten erzählt. Großes Kino.',
  'Hier kocht jemand, der etwas zu sagen hat.',
];
KL.REVIEW_MID = [
  'Gute Ideen, nicht alles saß auf den Punkt.',
  'Schöner Abend, aber für den Preis hatte ich mehr erwartet.',
  'Ein, zwei Gänge brillant, der Rest solide.',
  'Charmant, aber die Küche wirkte gestresst.',
];
KL.REVIEW_BAD = [
  'Lange Wartezeiten, lauwarmer Hauptgang. Schade.',
  'Viel Getöse auf dem Teller, wenig Geschmack.',
  'Zu teuer für das, was ankam.',
  'Der Kellner hat meinen Wein verwechselt. Zweimal.',
];

KL.KITCHEN_CALLS = ['Oui, Chef!', 'Ça marche!', 'Hände!', 'Service, bitte!', 'Abholen!', 'Läuft!', 'Heiß von hinten!', 'Tisch geht!'];

// Inspektions-Hinweise, die im Service-Bon oder Wochenbericht auftauchen
KL.INSPECTOR_TELLS = [
  'Einzelgast, bestellt das große Menü und Leitungswasser.',
  'Fragt beiläufig, woher die Butter kommt.',
  'Macht sich auffällig unauffällig Notizen auf dem Handy.',
  'Hat unter falschem Namen reserviert – die Nummer ist nicht erreichbar.',
  'Isst jeden Gang in exakt gleicher Geschwindigkeit.',
  'Lässt beim Hauptgang einen Bissen auf dem Teller liegen. Absichtlich?',
];

KL.STAR_LEVELS = [
  { level: 0, name: 'Ohne Auszeichnung', min: 0 },
  { level: 0.5, name: 'Empfehlung im Guide', min: 60 },
  { level: 1, name: 'Ein Stern', min: 70, tagline: 'Eine Küche voller Finesse – einen Stopp wert.' },
  { level: 2, name: 'Zwei Sterne', min: 82, tagline: 'Eine herausragende Küche – einen Umweg wert.' },
  { level: 3, name: 'Drei Sterne', min: 91, tagline: 'Eine einzigartige Küche – eine eigene Reise wert.' },
];

KL.CRITERIA = [
  { id: 'produkt', name: 'Produktqualität' },
  { id: 'technik', name: 'Kochtechnik' },
  { id: 'harmonie', name: 'Harmonie der Aromen' },
  { id: 'persoenlichkeit', name: 'Handschrift des Kochs' },
  { id: 'bestaendigkeit', name: 'Beständigkeit' },
];

// Wöchentliche Ereignisse mit Entscheidungen. fx ist eine Funktion (state) => Text
KL.EVENTS = [
  {
    id: 'tv', title: 'Anfrage vom Fernsehen',
    text: 'Eine Kochshow am Freitagabend will dich als Jury-Mitglied. Gage plus Reichweite – aber drei Drehtage.',
    cond: (s) => s.rep >= 20,
    choices: [
      { label: 'Zusagen (+4.000 €, +Buzz, −Energie)', fx: (s) => { s.money += 4000; s.buzz += 14; s.chef.energy -= 22; return 'Die Quote stimmt, dein Gesicht ist überall. Die Küche lief zwei Tage ohne dich.'; } },
      { label: 'Absagen, ich gehöre an den Herd', fx: (s) => { s.chef.energy += 4; s.team.forEach((m) => (m.morale = Math.min(100, m.morale + 4))); return 'Dein Team merkt: Du bist da, wenn es zählt. +Moral.'; } },
    ],
  },
  {
    id: 'spueler', title: 'Der Spüler ist krank',
    text: 'Freitag, 16:40 Uhr. Kein Spüler. Das Geschirr türmt sich schon jetzt.',
    cond: (s) => s.team.some((m) => m.role === 'spueler'),
    choices: [
      { label: 'Ich spüle selbst (−Energie)', fx: (s) => { s.chef.energy -= 12; s.team.forEach((m) => (m.morale = Math.min(100, m.morale + 6))); return 'Chef*in an der Spülmaschine. Das Team wird darüber noch Jahre reden. +Moral.'; } },
      { label: 'Aushilfe über die Agentur (−400 €)', fx: (s) => { s.money -= 400; return 'Teuer, aber der Abend läuft.'; } },
    ],
  },
  {
    id: 'fischausfall', title: 'Sturm auf der Nordsee',
    text: 'Dein Fischlieferant ruft an: Die Kutter bleiben im Hafen. Kein Fisch diese Woche.',
    cond: (s) => s.menu.some((id) => { const d = s.dishes.find((x) => x.id === id); return d && KL.byId(KL.PRODUCTS, d.product).cat === 'fisch'; }),
    choices: [
      { label: 'Teuer beim Händler nachkaufen (−1.500 €)', fx: (s) => { s.money -= 1500; return 'Ware ist da, Marge ist weg.'; } },
      { label: 'Spontan improvisieren (Risiko)', fx: (s) => { if (Math.random() < 0.55) { s.buzz += 8; return 'Der improvisierte Gang wird zum Gesprächsthema der Woche! +Buzz.'; } s.weekMods.qualityPenalty += 8; return 'Die Improvisation war… mutig. Diese Woche −Qualität.'; } },
    ],
  },
  {
    id: 'influencer', title: 'Food-Influencerin am Tisch',
    text: '480.000 Follower. Sie möchte „gerne eingeladen werden, für Reichweite“.',
    cond: () => true,
    choices: [
      { label: 'Einladen (−300 €, +Buzz)', fx: (s) => { s.money -= 300; s.buzz += 10; return 'Das Reel geht viral. Telefon klingelt durch.'; } },
      { label: 'Freundlich ablehnen – hier zahlt jeder', fx: (s) => { s.rep += 1; return 'Sie postet trotzdem – über deine Haltung. Kleiner Respektgewinn.'; } },
    ],
  },
  {
    id: 'abwerben', title: 'Abwerbeversuch',
    text: 'Ein Hotelkonzern bietet deinem besten Koch das Doppelte.',
    cond: (s) => s.team.some((m) => KL.ROLES[m.role].area === 'kueche' && m.skill >= 60 && m.trait !== 'loyal'),
    choices: [
      { label: 'Gehalt um 30 % erhöhen', fx: (s) => { const m = KL.bestCook(s); m.wage = Math.round(m.wage * 1.3); m.morale = Math.min(100, m.morale + 15); return `${m.name} bleibt – und weiß jetzt, was sie*er wert ist.`; } },
      { label: 'Ziehen lassen und Glück wünschen', fx: (s) => { const m = KL.bestCook(s); s.team = s.team.filter((x) => x !== m); return `${m.name} geht. Der Pass fühlt sich leerer an.`; } },
    ],
  },
  {
    id: 'hochzeit', title: 'Exklusive Hochzeit',
    text: 'Ein Paar will das ganze Restaurant für Samstag mieten. Pauschal 9.000 €.',
    cond: (s) => s.rep >= 15,
    choices: [
      { label: 'Annehmen (+9.000 €, ein Abend weniger Öffentlichkeit)', fx: (s) => { s.money += 9000; s.weekMods.daysLost += 1; return 'Brautpaar glücklich, Konto auch.'; } },
      { label: 'Ablehnen – Stammgäste gehen vor', fx: (s) => { s.rep += 2; return 'Die Stammgäste haben es mitbekommen. +Ruf.'; } },
    ],
  },
  {
    id: 'kritiker', title: 'Die Lokalzeitung kommt',
    text: 'Der gefürchtetste Restaurantkritiker der Stadt hat für Donnerstag reserviert. Unter seinem echten Namen.',
    cond: () => true,
    choices: [
      { label: 'Alles wie immer. Konsequenz ist alles.', fx: (s) => { s.weekMods.critic = 1; return 'Du bleibst ruhig. Die Kritik folgt nach dem Service.'; } },
      { label: 'Extra-Gänge und Champagner aufs Haus', fx: (s) => { s.money -= 250; s.weekMods.critic = 1; s.weekMods.criticBribe = 1; return 'Er bemerkt es. Ob ihm das gefällt?'; } },
    ],
  },
  {
    id: 'wasser', title: 'Wasserrohrbruch',
    text: 'Montagmorgen, die Kühlung steht unter Wasser.',
    cond: () => true,
    choices: [
      { label: 'Notdienst sofort (−2.200 €)', fx: (s) => { s.money -= 2200; return 'Nach sechs Stunden ist alles trocken. Teurer Montag.'; } },
      { label: 'Selbst flicken, einen Tag schließen', fx: (s) => { s.money -= 400; s.weekMods.daysLost += 1; s.chef.energy -= 8; return 'Mit Panzertape und Fluchen. Hält erstmal.'; } },
    ],
  },
  {
    id: 'forager', title: 'Die Wildkräuter-Sammlerin',
    text: 'Eine Försterin bietet dir exklusiv Waldmeister, Fichtenspitzen und Pilze an. Handschlag-Deal.',
    cond: (s) => !s.flags.forager,
    choices: [
      { label: 'Deal! (+Kreativität dauerhaft)', fx: (s) => { s.flags.forager = true; s.chef.crea = Math.min(100, s.chef.crea + 5); return 'Neue Zutaten, neue Ideen. Deine Handschrift wird schärfer.'; } },
      { label: 'Kein Bedarf', fx: () => 'Sie zieht weiter zum Restaurant gegenüber.' },
    ],
  },
  {
    id: 'bank', title: 'Die Bank ruft an',
    text: 'Deine Beraterin bietet einen Investitionskredit über 30.000 € an. Zins 1 % pro Woche.',
    cond: (s) => s.money < 25000 && s.debt < 120000,
    choices: [
      { label: 'Kredit aufnehmen (+30.000 €)', fx: (s) => { s.money += 30000; s.debt += 30000; return 'Frisches Geld. Die Raten laufen ab jetzt mit.'; } },
      { label: 'Nein danke', fx: () => 'Lieber organisch wachsen.' },
    ],
  },
  {
    id: 'burnout', title: 'Dein Körper streikt',
    text: 'Seit Wochen 16-Stunden-Tage. Deine Hände zittern beim Anrichten.',
    cond: (s) => s.chef.energy < 35,
    choices: [
      { label: 'Zwei Tage raus. Wirklich raus.', fx: (s) => { s.chef.energy += 30; s.weekMods.daysLost += 1; return 'Du schläfst 14 Stunden. Die Welt ist danach wieder bunt.'; } },
      { label: 'Durchziehen', fx: (s) => { s.weekMods.qualityPenalty += 6; s.chef.energy -= 5; return 'Du ziehst durch. Man sieht es den Tellern an.'; } },
    ],
  },
  {
    id: 'stammgast', title: 'Der Stammgast',
    text: 'Herr B. kommt seit Tag eins jeden Donnerstag. Er fragt, ob er seinen 80. Geburtstag bei dir feiern darf – für 12 Personen, Budget klein.',
    cond: () => true,
    choices: [
      { label: 'Natürlich. Zum Selbstkostenpreis.', fx: (s) => { s.money -= 600; s.rep += 3; s.team.forEach((m) => (m.morale = Math.min(100, m.morale + 3))); return 'Ein Abend, über den der ganze Kiez redet. +Ruf, +Moral.'; } },
      { label: 'Normales Menü, normaler Preis', fx: (s) => { s.money += 900; return 'Geschäft ist Geschäft. Er kommt trotzdem wieder. Vielleicht.'; } },
    ],
  },
];

KL.byId = (arr, id) => arr.find((x) => x.id === id);
KL.bestCook = (s) => s.team.filter((m) => KL.ROLES[m.role].area === 'kueche' && m.trait !== 'loyal').sort((a, b) => b.skill - a.skill)[0];

/* ---------- RPG: Talente und Quests ---------- */
KL.PERK_TREES = [
  { id: 'handwerk', name: 'Handwerk', stat: 'Technik' },
  { id: 'handschrift', name: 'Handschrift', stat: 'Kreativität' },
  { id: 'gastgeber', name: 'Gastgeber', stat: 'Führung' },
  { id: 'ausdauer', name: 'Ausdauer', stat: 'Energie' },
];
KL.PERKS = [
  { id: 'messer', tree: 'handwerk', tier: 1, name: 'Messerarbeit', desc: '+6 Technik.' },
  { id: 'saucier', tree: 'handwerk', tier: 2, name: 'Saucier', desc: '+6 Harmonie für Gerichte mit Jus, Beurre blanc, Nussbutter oder Dashi.' },
  { id: 'garpunkt', tree: 'handwerk', tier: 3, name: 'Garpunkt-Instinkt', desc: 'Die perfekte Zone am Pass ist 25 % breiter.' },
  { id: 'praezision', tree: 'handwerk', tier: 4, name: 'Präzision', desc: '+6 Beständigkeit bei jeder Inspektion.' },
  { id: 'neugier', tree: 'handschrift', tier: 1, name: 'Neugier', desc: '+6 Kreativität.' },
  { id: 'fermentation', tree: 'handschrift', tier: 2, name: 'Fermentations-Nerd', desc: '„Fermentiert“ geht auch ohne Fermentationskammer.' },
  { id: 'signature', tree: 'handschrift', tier: 3, name: 'Signature-Denken', desc: 'Signature-Gericht schon ab 60 % Reife.' },
  { id: 'avantgarde', tree: 'handschrift', tier: 4, name: 'Avantgarde', desc: '+10 Kreativität für mutige Kombinationen.' },
  { id: 'ansage', tree: 'gastgeber', tier: 1, name: 'Klare Ansage', desc: '+6 Führung. Die Brigade zieht mit.' },
  { id: 'mentor', tree: 'gastgeber', tier: 2, name: 'Mentor*in', desc: 'Dein Team lernt doppelt so schnell.' },
  { id: 'charisma', tree: 'gastgeber', tier: 3, name: 'Charisma', desc: '+3 Buzz pro Woche. Die Leute reden über dich.' },
  { id: 'netzwerk', tree: 'gastgeber', tier: 4, name: 'Netzwerk', desc: 'Alle Lieferanten sofort verfügbar, bessere Bewerbungen.' },
  { id: 'lunge', tree: 'ausdauer', tier: 1, name: 'Eiserne Lunge', desc: '25 % weniger Energieverlust pro Woche.' },
  { id: 'adrenalin', tree: 'ausdauer', tier: 2, name: 'Adrenalin', desc: 'Bons warten 30 % länger, bevor die Brigade übernimmt.' },
  { id: 'powernap', tree: 'ausdauer', tier: 3, name: 'Powernap', desc: '+6 Energie jede Woche.' },
  { id: 'unkaputtbar', tree: 'ausdauer', tier: 4, name: 'Unkaputtbar', desc: 'Keine Qualitätsverluste bei niedriger Energie.' },
];

// Quests: check(s) → true, wenn erfüllt
KL.QUESTS = [
  { id: 'q_first', name: 'Feuertaufe', desc: 'Spiel deinen ersten Service selbst am Pass.', xp: 60, check: (s) => s.stats.servicesPlayed >= 1 },
  { id: 'q_dish', name: 'Eigene Handschrift', desc: 'Entwickle 3 eigene Gerichte in der Testküche.', xp: 60, check: (s) => s.stats.dishesCreated >= 3 },
  { id: 'q_bold', name: 'Mutprobe', desc: 'Entdecke eine mutige Kombination.', xp: 80, check: (s) => s.discovered.length >= 1 },
  { id: 'q_tables', name: 'Mehr Plätze', desc: 'Bau dein Restaurant auf 24 Plätze aus.', xp: 60, check: (s) => KL.layoutStats(s).seats >= 24 },
  { id: 'q_somm', name: 'Die Weinfrage', desc: 'Stell eine*n Sommelier*e ein.', xp: 60, check: (s) => s.team.some((m) => m.role === 'sommelier') },
  { id: 'q_perfect', name: 'Zwölf Volltreffer', desc: '12 perfekte Teller an einem Abend.', xp: 120, check: (s) => s.stats.bestPerfect >= 12 },
  { id: 'q_rep', name: 'Stadtgespräch', desc: 'Erreiche Ruf 50.', xp: 120, check: (s) => s.rep >= 50 },
  { id: 'q_regional', name: 'Wurzeln', desc: 'Alle vier Warengruppen von regionalen Lieferanten.', xp: 80, check: (s) => Object.values(s.suppliers).every((id) => KL.byId(KL.SUPPLIERS, id).regional) },
  { id: 'q_menu8', name: 'Die große Reise', desc: 'Biete ein 8-Gänge-Menü an.', xp: 100, check: (s) => s.menu.length >= 8 },
  { id: 'q_rec', name: 'Im Guide', desc: 'Werde vom Guide Céleste empfohlen.', xp: 150, check: (s) => s.stars >= 0.5 },
  { id: 'q_star', name: 'Der erste Stern', desc: 'Hol dir einen Stern.', xp: 400, check: (s) => s.stars >= 1 },
  { id: 'q_star2', name: 'Einen Umweg wert', desc: 'Zwei Sterne.', xp: 800, check: (s) => s.stars >= 2 },
  { id: 'q_star3', name: 'Legende', desc: 'Drei Sterne. Eine eigene Reise wert.', xp: 1500, check: (s) => s.stars >= 3 },
];

// Quests, die du im Kiez von Figuren bekommst (erst nach Annahme aktiv)
KL.QUESTS.push(
  { id: 'q_hanne', giver: 'Hanne', name: 'Hannes Acker', desc: 'Zwei herzhafte Gemüsegerichte auf der Karte, Gemüse regional bezogen.', xp: 150, check: (s) => s.flags.q_hanne && KL.byId(KL.SUPPLIERS, s.suppliers.gemuese).regional && KL.menuDishes(s).filter((d) => { const p = KL.byId(KL.PRODUCTS, d.product); return p.cat === 'gemuese' && p.type === 'herzhaft'; }).length >= 2, reward: (s) => { s.rep = Math.min(100, s.rep + 4); } },
  { id: 'q_jens', giver: 'Jens', name: 'Fang des Tages', desc: 'Bring ein Fischgericht mit mindestens 60 % Reife auf die Karte.', xp: 150, check: (s) => s.flags.q_jens && KL.menuDishes(s).some((d) => KL.byId(KL.PRODUCTS, d.product).cat === 'fisch' && d.maturity >= 60), reward: (s) => { s.flags.jensDeal = true; } },
  { id: 'q_greta', giver: 'Greta', name: 'Der Wald auf dem Teller', desc: 'Setz ein Gericht mit Wildkräutern, Fichtennadel oder Sauerampfer auf die Karte.', xp: 120, check: (s) => s.flags.q_greta && KL.menuDishes(s).some((d) => ['wildkraeuter', 'fichte', 'sauerampfer'].includes(d.accent)), reward: (s) => { s.chef.crea = Math.min(100, s.chef.crea + 3); } },
  { id: 'q_mira', giver: 'Mira', name: 'Überrasch mich', desc: 'Biete ein Gericht mit Kreativität 80 oder mehr an.', xp: 150, check: (s) => s.flags.q_mira && KL.menuDishes(s).some((d) => KL.evalDish(s, d).creativity >= 80), reward: (s) => { s.buzz += 15; s.news.unshift({ week: s.week, text: 'Mira Haddad schreibt im Stadtmagazin über dich. Das Telefon klingelt.' }); } },
);

/* ---------- Stadtkarte: Viertel und freie Ladenlokale ---------- */
// foot = Laufkundschaft, spend = Aufschlag auf die Preisbereitschaft (€), buzz = Grundrauschen,
// compete = Nachfrage-Abzug durch Konkurrenz (wird mit Ruf kleiner), starPull = wie stark Sterne ziehen,
// mood = Ambiente-Bonus der Lage, supQ = Qualitätsbonus je Warengruppe
KL.DISTRICTS = [
  { id: 'kreuzkiez', name: 'Kreuzkiez', vibe: 'Laut, jung, Street Art', desc: 'Späti an jeder Ecke, Schlangen vor den Bars. Hier wird über Essen geredet – laut und auf Instagram. Teuer darf es aber nicht sein.',
    foot: 1.15, spend: -12, buzz: 14, compete: 0.78, starPull: 1, mood: 2, supQ: {}, color: '#c4553b', x: 34, y: 58,
    stats: { foot: 4, spend: 2, scene: 5, compete: 5, rent: 2 },
    sites: [
      { id: 'kk-hof', type: 'hinterhof', name: 'Remise im Hinterhof', rent: 1050, prestige: 0, note: 'Graffiti im Treppenhaus, Linde im Hof.' },
      { id: 'kk-eck', type: 'altbau', name: 'Eckladen an der Kreuzung', rent: 2100, prestige: 6, note: 'Große Fenster, Lärm bis 2 Uhr.' },
    ] },
  { id: 'altstadt', name: 'Altstadt-Ufer', vibe: 'Touristisch, Kopfstein, Flussblick', desc: 'Busse voller Gäste, die einmal kommen und nie wieder. Viel Laufkundschaft, wenig Stammgäste – der Ruf wächst langsamer.',
    foot: 1.3, spend: 6, buzz: 6, compete: 0.82, starPull: 0.9, mood: 8, supQ: {}, repSlow: 0.75, color: '#d4a24c', x: 58, y: 40,
    stats: { foot: 5, spend: 3, scene: 2, compete: 4, rent: 4 },
    sites: [
      { id: 'as-ufer', type: 'altbau', name: 'Fachwerkhaus am Ufer', rent: 2600, prestige: 12, note: 'Terrasse zum Fluss möglich.' },
      { id: 'as-hotel', type: 'hotel', name: 'Dependance im Hotel am Markt', rent: 3900, prestige: 16, note: 'Hotelgäste als Grundauslastung.' },
    ] },
  { id: 'lindenhain', name: 'Am Lindenhain', vibe: 'Villen, still, alte Bäume', desc: 'Wenig Laufkundschaft, aber wer kommt, zahlt. Die Nachbarschaft erwartet Stil – ein schäbiger Gastraum fällt sofort auf.',
    foot: 0.75, spend: 38, buzz: 2, compete: 0.95, starPull: 1.15, mood: 6, supQ: {}, ambWeight: 1.5, color: '#5f7d55', x: 22, y: 26,
    stats: { foot: 1, spend: 5, scene: 1, compete: 1, rent: 4 },
    sites: [
      { id: 'lh-villa', type: 'altbau', name: 'Gründerzeit-Villa', rent: 2900, prestige: 18, note: 'Kronleuchter inklusive.' },
      { id: 'lh-orangerie', type: 'hotel', name: 'Orangerie im Park', rent: 3600, prestige: 20, note: 'Glasdach, Gartenblick.' },
    ] },
  { id: 'hafen', name: 'Hafenquartier', vibe: 'Rau, im Wandel, Möwen', desc: 'Lagerhallen, Kräne, die ersten Galerien. Billig – und mit jedem Jahr kommen mehr Leute mit Geld. Der Fisch kommt direkt vom Kutter.',
    foot: 0.85, spend: -6, buzz: 8, compete: 0.95, starPull: 1.1, mood: -2, supQ: { fisch: 8 }, growth: 6, fishRep: 10, color: '#3f6d8a', x: 78, y: 70,
    stats: { foot: 2, spend: 2, scene: 3, compete: 1, rent: 1 },
    sites: [
      { id: 'hf-halle', type: 'hotel', name: 'Alte Fischhalle', rent: 1700, prestige: 4, note: 'Riesig, Backstein, Hallendach.' },
      { id: 'hf-kontor', type: 'hinterhof', name: 'Kontor an der Kaimauer', rent: 900, prestige: 2, note: 'Klein, zugig, Blick auf die Elbe.' },
    ] },
  { id: 'mitte', name: 'Bankenviertel', vibe: 'Glas, Anzüge, Spesenkonten', desc: 'Mittags voll, abends Geschäftsessen mit Kreditkarte. Hohe Preise gehen durch, Experimente eher nicht.',
    foot: 1.0, spend: 26, buzz: 4, compete: 0.85, starPull: 1, mood: 0, supQ: {}, creaPenalty: 6, color: '#7d868d', x: 62, y: 18,
    stats: { foot: 3, spend: 5, scene: 2, compete: 3, rent: 5 },
    sites: [
      { id: 'mi-turm', type: 'hotel', name: 'Erdgeschoss im Glasturm', rent: 4300, prestige: 14, note: 'Klimaanlage, Lounge, null Charme.' },
      { id: 'mi-passage', type: 'altbau', name: 'Ladenlokal in der Passage', rent: 3000, prestige: 8, note: 'Laufweg der Banker.' },
    ] },
  { id: 'land', name: 'Uckermark-Land', vibe: 'Dorf, Felder, eine Stunde raus', desc: 'Kaum jemand kommt zufällig vorbei. Aber Sterne-Gäste fahren für dich raus – und die Bauern stehen vor der Tür.',
    foot: 0.55, spend: 0, buzz: 0, compete: 1, starPull: 1.5, mood: 10, supQ: { gemuese: 10, fleisch: 6 }, green: true, color: '#9a8a4a', x: 12, y: 80,
    stats: { foot: 1, spend: 3, scene: 1, compete: 0, rent: 1 },
    sites: [
      { id: 'la-gasthof', type: 'altbau', name: 'Alter Landgasthof', rent: 800, prestige: 10, note: 'Kachelofen, Dorflinde, Pferde.' },
      { id: 'la-scheune', type: 'hotel', name: 'Umgebaute Scheune', rent: 1300, prestige: 12, note: 'Holz, Licht, endlos Platz.' },
    ] },
];
KL.siteById = (id) => { for (const d of KL.DISTRICTS) { const s = d.sites.find((x) => x.id === id); if (s) return { site: s, district: d }; } return null; };

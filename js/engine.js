/* Kitchen Legends – Simulation
 * Reine Spiellogik: Gerichte bewerten, Woche simulieren, Inspektionen, Guide-Verleihung.
 */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
  const uid = () => Math.random().toString(36).slice(2, 9);
  KL.util = { clamp, rnd, pick, avg, uid };

  const STAR_PULL = { 0: 1, 0.5: 1.15, 1: 1.6, 2: 2.2, 3: 3.0 };
  const STAR_PRICE = { 0: 0, 0.5: 12, 1: 60, 2: 140, 3: 230 };
  const STAR_STEPS = [0, 0.5, 1, 2, 3];

  KL.weekOfYear = (s) => ((s.week - 1) % KL.WEEKS_PER_YEAR) + 1;
  KL.season = (s) => KL.SEASONS[Math.floor((KL.weekOfYear(s) - 1) / 3)];
  KL.starLabel = (lvl) => KL.STAR_LEVELS.find((x) => x.level === lvl).name;

  /* ---------- Spielstand ---------- */
  KL.newGame = function ({ chefName, restaurantName, archetype, location }) {
    const arch = KL.byId(KL.ARCHETYPES, archetype);
    const s = {
      v: 1,
      chef: { name: chefName, archetype, tech: arch.tech, crea: arch.crea, lead: arch.lead, energy: 100 },
      name: restaurantName,
      location,
      week: 1,
      year: 1,
      money: 42000,
      debt: 60000,
      rep: 8,
      buzz: 10,
      stars: 0,
      green: false,
      dishes: [],
      menu: [],
      price: 79,
      pairingPrice: 45,
      openDays: 5,
      orderCovers: 80,
      suppliers: { fisch: 'grossmarkt', fleisch: 'grossmarkt', gemuese: 'biohof', feinkost: 'grossmarkt' },
      cellar: { w1: 12, w3: 18, w8: 12, w13: 12 },
      nonAlc: false,
      team: [],
      candidates: [],
      equipment: [],
      interior: [],
      inspections: { planned: [], visits: [] },
      history: [],
      reviews: [],
      news: [],
      flags: {},
      weekMods: { qualityPenalty: 0, daysLost: 0, critic: 0, criticBribe: 0 },
      pendingEvent: null,
      lastReport: null,
      ceremony: null,
      gameOver: null,
      awards: [],
      discovered: [],
    };
    // Startteam: ein Commis und ein Spüler, sonst nichts
    s.team.push(KL.genStaff(s, 'commis', 44));
    s.team.push(KL.genStaff(s, 'spueler', 50));
    s.team.push(KL.genStaff(s, 'service', 46));
    // Startgerichte: solide, aber brav
    [
      ['karotte', 'glasiert', 'nussbutter', 'crumble'],
      ['saibling', 'gebeizt', 'buttermilch', 'keine'],
      ['schweinebauch', 'gebraten', 'jus', 'pueree'],
      ['schokolade', 'pochiert', 'salzkaramell', 'keine'],
    ].forEach(([p, t, a, x]) => {
      const d = KL.makeDish(s, p, t, a, x);
      d.maturity = 35;
      s.dishes.push(d);
      s.menu.push(d.id);
    });
    KL.refreshCandidates(s);
    KL.planInspections(s);
    s.orderCovers = Math.max(10, KL.forecast(s).covers);
    s.news.unshift({ week: 1, text: `${restaurantName} öffnet. Kredit unterschrieben, Herz in der Hose, Messer geschliffen.` });
    return s;
  };

  KL.genStaff = function (s, role, fixedSkill) {
    const starBoost = (s.stars || 0) * 6;
    const skill = Math.round(fixedSkill != null ? fixedSkill : clamp(rnd(28, 66) + (s.rep || 0) * 0.25 + starBoost, 20, 96));
    const r = KL.ROLES[role];
    const wage = Math.round((r.wage * (0.55 + skill / 100) * rnd(0.92, 1.1)) / 10) * 10;
    const trait = Math.random() < 0.45 ? pick(KL.TRAITS).id : null;
    return { id: uid(), name: `${pick(KL.FIRST_NAMES)} ${pick(KL.LAST_NAMES)}`, role, skill, wage, morale: 72, trait, weeks: 0 };
  };

  KL.refreshCandidates = function (s) {
    const roles = Object.keys(KL.ROLES);
    s.candidates = [];
    for (let i = 0; i < 5; i++) s.candidates.push(KL.genStaff(s, pick(roles)));
  };

  KL.planInspections = function (s) {
    const n = 2 + (s.stars >= 1 ? 1 : 0) + (s.stars >= 2 ? 1 : 0);
    const weeks = new Set();
    while (weeks.size < n) weeks.add(Math.floor(rnd(2, KL.WEEKS_PER_YEAR + 1)));
    s.inspections = { planned: [...weeks].sort((a, b) => a - b), visits: [] };
  };

  /* ---------- Gerichte ---------- */
  KL.makeDish = function (s, product, technique, accent, texture) {
    return { id: uid(), product, technique, accent, texture, maturity: 0, created: s.week };
  };

  KL.dishName = function (d) {
    const p = KL.byId(KL.PRODUCTS, d.product);
    const a = KL.byId(KL.ACCENTS, d.accent);
    const x = KL.byId(KL.TEXTURES, d.texture);
    return [p.name, a.name, x.tex ? x.name : null].filter(Boolean).join(' · ');
  };

  KL.evalDish = function (s, d) {
    const p = KL.byId(KL.PRODUCTS, d.product);
    const t = KL.byId(KL.TECHNIQUES, d.technique);
    const a = KL.byId(KL.ACCENTS, d.accent);
    const x = KL.byId(KL.TEXTURES, d.texture);
    // Produkt dominiert, Technik und Textur färben, der Begleiter setzt den Akzent
    const flav = KL.FLAVORS.map((_, i) => Math.round(clamp(p.f[i] + t.f[i] * 0.5 + a.f[i] * 0.8 + x.f[i] * 0.4, 0, 7) * 10) / 10);
    const target = KL.TARGETS[p.type];
    const notes = [];
    let penalty = 0;
    flav.forEach((v, i) => {
      const [lo, hi] = target[i];
      if (v < lo) penalty += (lo - v) * 7;
      if (v > hi) penalty += (v - hi) * 8;
    });
    const texes = new Set([p.tex, t.tex, x.tex].filter(Boolean));
    const texBonus = texes.size >= 3 ? 10 : texes.size === 2 ? 4 : -8;
    if (texes.size < 2) notes.push('Texturen monoton');
    const key = `${p.id}+${a.id}`;
    const classic = KL.CLASSICS[key];
    const bold = KL.BOLD[key];
    let combo = 0;
    if (classic) combo += 12;
    if (bold) combo += 9;
    // Handwerkliche Fehlgriffe
    if (t.id === 'dryaged' && p.cat !== 'fleisch') { combo -= 14; notes.push('Dry-Aged ohne Fleisch?'); }
    if (t.id === 'roh' && p.cat === 'fleisch' && p.id !== 'faerse') { combo -= 12; notes.push('Roh? Bei diesem Produkt riskant'); }
    if (t.id === 'eis' && p.type === 'herzhaft') { combo -= 4; }
    if (p.type === 'dessert' && ['jus', 'garum', 'dashi'].includes(a.id)) { combo -= 10; notes.push('Herzhafte Sauce im Dessert'); }
    const harmony = Math.round(clamp(76 - penalty + texBonus + combo, 5, 100));

    let crea = 18 + (p.wow + t.wow + a.wow + (x.tex ? 1 : 0)) * 6 + (bold ? 18 : 0) - (classic ? 10 : 0) + (s.chef.crea - 50) * 0.4;
    if (s.flags.forager && ['wildkraeuter', 'fichte', 'sauerampfer'].includes(a.id)) crea += 6;
    const kreativ = s.team.some((m) => m.trait === 'kreativ');
    if (kreativ) crea += 4;
    const creativity = Math.round(clamp(crea, 0, 100));
    const difficulty = clamp(t.diff + x.diff + (p.wow >= 4 ? 1 : 0), 1, 5);

    // Weinstil bestimmen
    let wine;
    if (p.type === 'dessert') wine = flav[0] >= 4 ? 'suess' : 'aromatisch';
    else if (t.id === 'fermentiert' || (flav[4] >= 5 && flav[5] <= 2)) wine = 'orange';
    else if (p.id === 'kaviar' || flav[2] >= 5) wine = 'schaum';
    else if (p.body === 'kraeftig') wine = flav[5] >= 4 ? 'rotkraeftig' : 'rotelegant';
    else if (flav[5] >= 4) wine = 'weisskraeftig';
    else if (flav[1] >= 3 || flav[0] >= 3) wine = 'aromatisch';
    else wine = 'weissleicht';

    const baseCost = p.cost + a.cost + x.cost;
    const sea = KL.season(s).id;
    const inSeason = !p.seasons.length || p.seasons.includes(sea);
    return { flav, harmony, creativity, difficulty, wine, baseCost, classic, bold, inSeason, type: p.type, cat: p.cat, notes, texes: [...texes] };
  };

  /* ---------- Kennzahlen ---------- */
  KL.seats = (s) => KL.byId(KL.LOCATIONS, s.location).seats + (s.interior.includes('chefstable') ? 6 : 0);
  KL.ambience = (s) => {
    const loc = KL.byId(KL.LOCATIONS, s.location);
    return clamp(22 + loc.prestige + s.interior.reduce((sum, id) => sum + KL.byId(KL.INTERIOR, id).amb, 0), 0, 100);
  };

  KL.kitchen = function (s, coversPerDay, courses) {
    const cooks = s.team.filter((m) => KL.ROLES[m.role].area === 'kueche');
    let wSum = 1.5;
    let skillSum = s.chef.tech * 1.5;
    cooks.forEach((m) => {
      const w = KL.ROLES[m.role].weight;
      const eff = m.skill * (0.65 + 0.35 * (m.morale / 100)) + (m.trait === 'sterne' ? 6 : 0) + (m.trait === 'tempo' ? 3 : 0);
      wSum += w;
      skillSum += eff * w;
    });
    const skill = skillSum / wSum;
    const hands = 1 + cooks.reduce((n, m) => n + KL.ROLES[m.role].weight, 0) + (cooks.some((m) => m.trait === 'tempo') ? 0.4 : 0);
    const needed = Math.max(1.5, (coversPerDay * courses) / 38);
    const load = needed / hands;
    const equip = s.equipment.reduce((n, id) => n + (KL.byId(KL.EQUIPMENT, id).power || 0), 0);
    let strength = skill * Math.min(1, 1 / load) ** 0.6 + equip;
    const notes = [];
    if (!cooks.some((m) => m.role === 'spueler')) { strength -= 12; notes.push('Kein Spüler – Chaos an der Spüle'); }
    if (!cooks.some((m) => m.role === 'patissier') && s.menu.some((id) => { const d = s.dishes.find((x) => x.id === id); return d && KL.byId(KL.PRODUCTS, d.product).type === 'dessert'; })) { strength -= 4; notes.push('Kein Patissier für die Desserts'); }
    if (load > 1.15) notes.push('Küche unterbesetzt');
    return { strength: clamp(Math.round(strength), 5, 100), load, hands, needed, notes };
  };

  KL.frontOfHouse = function (s) {
    const fo = s.team.filter((m) => KL.ROLES[m.role].area === 'service');
    const seats = KL.seats(s);
    let skill = 30, wSum = 0.5;
    skill *= 0.5;
    fo.forEach((m) => {
      const w = KL.ROLES[m.role].weight * (m.role === 'sommelier' ? 0.5 : 1);
      skill += (m.skill * (0.7 + 0.3 * m.morale / 100) + (m.trait === 'gastgeber' ? 10 : 0)) * w;
      wSum += w;
    });
    const avgSkill = skill / wSum;
    const hands = fo.reduce((n, m) => n + KL.ROLES[m.role].weight, 0) + 0.3;
    const needed = seats / 14;
    const strength = clamp(Math.round(avgSkill * Math.min(1, hands / needed) ** 0.7), 5, 100);
    const somm = fo.filter((m) => m.role === 'sommelier').sort((a, b) => b.skill - a.skill)[0];
    const maitre = fo.find((m) => m.role === 'maitre');
    const sommSkill = somm ? somm.skill : maitre ? maitre.skill * 0.5 : 15;
    return { strength, sommSkill, hands, needed };
  };

  KL.menuDishes = (s) => s.menu.map((id) => s.dishes.find((d) => d.id === id)).filter(Boolean);

  const agg = (vals) => (vals.length ? 0.7 * avg(vals) + 0.3 * Math.min(...vals) : 0);

  KL.evalMenu = function (s, opts = {}) {
    const dishes = KL.menuDishes(s);
    const evals = dishes.map((d) => ({ d, e: KL.evalDish(s, d) }));
    const fails = opts.supplierFails || [];
    const qualities = evals.map(({ e, d }) => {
      const sup = KL.byId(KL.SUPPLIERS, s.suppliers[e.cat]);
      const feinkost = KL.byId(KL.SUPPLIERS, s.suppliers.feinkost);
      let q = sup.q * 0.8 + feinkost.q * 0.2;
      if (!e.inSeason) q -= 14;
      if (s.equipment.includes('kuehlhaus')) q += 3;
      if (fails.includes(e.cat)) q -= 15;
      if (d.product === 'kaviar' || d.accent === 'trueffel') q += 4;
      return clamp(q, 0, 100);
    });
    const issues = [];
    let harmony = agg(evals.map((x) => x.e.harmony));
    let creativity = agg(evals.map((x) => x.e.creativity));
    if (evals.length && evals[evals.length - 1].e.type !== 'dessert') { harmony -= 8; issues.push('Das Menü endet ohne Dessert.'); }
    const prods = dishes.map((d) => d.product);
    if (new Set(prods).size < prods.length) { harmony -= 8; issues.push('Ein Produkt taucht doppelt auf.'); }
    const techs = dishes.map((d) => d.technique);
    if (techs.length >= 4 && new Set(techs).size <= 2) { creativity -= 6; issues.push('Kaum Abwechslung bei den Techniken.'); }
    const desserts = evals.filter((x) => x.e.type === 'dessert').length;
    if (desserts > 2) { harmony -= 5; issues.push('Zu viele süße Gänge.'); }
    if (evals.length < 4) issues.push('Unter vier Gängen nimmt dich der Guide kaum ernst.');
    // Signature-Gericht: ausgereift und eigenständig
    const signature = evals.find((x) => x.d.maturity >= 80 && x.e.creativity >= 70);
    if (signature) creativity += 6;
    const maturity = avg(dishes.map((d) => d.maturity));
    const difficulty = avg(evals.map((x) => x.e.difficulty));
    const supMult = (cat) => KL.byId(KL.SUPPLIERS, s.suppliers[cat]).cost;
    const foodCost = evals.reduce((sum, { e }) => sum + e.baseCost * supMult(e.cat) * (e.inSeason ? 1 : 1.4), 0) + 2.5; // + Brot, Butter, Amuse
    const regional = evals.length ? evals.filter(({ e }) => KL.byId(KL.SUPPLIERS, s.suppliers[e.cat]).regional).length / evals.length : 0;
    const outOfSeason = evals.filter(({ e }) => !e.inSeason).map(({ d }) => KL.dishName(d));
    return {
      evals, qualities, issues, signature: signature ? signature.d : null,
      product: Math.round(agg(qualities)), harmony: Math.round(clamp(harmony, 0, 100)), creativity: Math.round(clamp(creativity, 0, 100)),
      maturity, difficulty, foodCost, regional, outOfSeason, courses: evals.length,
    };
  };

  KL.pairing = function (s, menuEval, foh) {
    const stock = { ...s.cellar };
    const bonus = s.interior.reduce((n, id) => n + (KL.byId(KL.INTERIOR, id).wine || 0), 0);
    if (s.nonAlc) {
      const score = clamp(62 + foh.sommSkill * 0.25 + bonus * 0.5, 0, 100);
      return { score: Math.round(score), pours: [], nonAlc: true };
    }
    const pours = menuEval.evals.map(({ e }) => {
      const wines = Object.keys(stock).filter((id) => stock[id] > 0).map((id) => KL.byId(KL.WINES, id));
      const match = wines.filter((w) => w.style === e.wine).sort((a, b) => b.q - a.q)[0];
      if (match) return { wine: match, match: true, value: match.q };
      const any = wines.sort((a, b) => b.q - a.q)[0];
      if (any) return { wine: any, match: false, value: any.q * 0.55 };
      return { wine: null, match: false, value: 0 };
    });
    const hasWine = pours.some((p) => p.wine);
    const raw = avg(pours.map((p) => p.value));
    const score = hasWine ? clamp(raw * (0.55 + 0.45 * foh.sommSkill / 100) + bonus, 0, 100) : 0;
    return { score: Math.round(score), pours, nonAlc: false, hasWine };
  };

  // Was Gäste für angemessen halten: Ruf, Sterne, Raum und das, was auf dem Teller ankommt
  KL.expectedPrice = function (s, menuEval) {
    const quality = (menuEval.harmony + menuEval.product + menuEval.creativity) / 3;
    return Math.round(18 + s.rep * 0.7 + quality * 0.55 + STAR_PRICE[s.stars] + KL.ambience(s) * 0.3 + menuEval.courses * 5 + (s.green ? 8 : 0));
  };

  /* Kernrechnung einer Woche. det = deterministisch (für Prognosen) */
  KL.compute = function (s, opts = {}) {
    const det = !!opts.det;
    const noise = (a, b) => (det ? (a + b) / 2 : rnd(a, b));
    const loc = KL.byId(KL.LOCATIONS, s.location);
    const fails = [];
    if (!det) {
      KL.CATEGORIES.forEach((c) => {
        const sup = KL.byId(KL.SUPPLIERS, s.suppliers[c.id]);
        if (Math.random() > sup.rel) fails.push(c.id);
      });
    }
    const menu = KL.evalMenu(s, { supplierFails: fails });
    const seats = KL.seats(s);
    const amb = KL.ambience(s);
    const expected = KL.expectedPrice(s, menu);
    const priceFactor = clamp(Math.pow(expected / s.price, 1.6), 0.1, 1.25);
    const sea = KL.season(s).id;
    let seasonMod = { fruehling: 1, sommer: 0.92, herbst: 1.05, winter: 1.08 }[sea];
    if (sea === 'sommer' && s.interior.includes('terrasse')) seasonMod += 0.2;
    const buzz = s.buzz + (s.interior.includes('kueche') ? 6 : 0);
    const days = Math.max(0, s.openDays - s.weekMods.daysLost);
    const perDayDemand = seats * loc.base * (0.2 + s.rep / 75) * STAR_PULL[s.stars] * priceFactor * (1 + buzz / 100) * seasonMod;
    let covers = 0;
    for (let i = 0; i < days; i++) covers += Math.min(seats, Math.round(perDayDemand * noise(0.82, 1.18)));
    if (menu.courses === 0) covers = 0;
    const perDay = days ? covers / days : 0;
    const kitchen = KL.kitchen(s, perDay, Math.max(4, menu.courses));
    const foh = KL.frontOfHouse(s);
    const pairing = KL.pairing(s, menu, foh);

    // Logistik: bestellte Gedecke vs. tatsächliche Gäste
    const ordered = Math.max(0, s.orderCovers);
    const short = Math.max(0, covers - ordered);
    const surplus = Math.max(0, ordered - covers);
    const spoil = s.equipment.includes('kuehlhaus') ? 0.35 : 0.7;
    const ingredientCost = Math.min(ordered, covers) * menu.foodCost + short * menu.foodCost * 1.6 + surplus * menu.foodCost * spoil;
    const wasteRate = covers ? (surplus * spoil) / Math.max(1, ordered) : 0;
    const shortPenalty = covers ? (short / covers) * 30 : 0;

    // Service-Qualität
    const energyF = s.chef.energy < 30 ? 0.88 : 1;
    const serviceAvg = opts.service ? opts.service.avg : clamp(kitchen.strength * 0.7 + menu.maturity * 0.18 + s.chef.tech * 0.12 - (menu.difficulty - 2) * 4, 15, 96) * energyF;
    const plate = clamp(serviceAvg * 0.45 + menu.harmony * 0.25 + menu.product * 0.2 + menu.creativity * 0.1 - s.weekMods.qualityPenalty - shortPenalty, 0, 100);
    const value = clamp(50 + ((expected - s.price) / expected) * 120, 0, 100);
    const pairingTake = pairing.nonAlc ? clamp(0.3 + foh.sommSkill / 300, 0.1, 0.7) : pairing.hasWine ? clamp(0.25 + foh.sommSkill / 250 + (pairing.score - 60) / 200 - (s.pairingPrice / s.price - 0.6) * 0.45, 0.04, 0.85) : 0;
    const sat = clamp(plate * 0.5 + amb * 0.15 + foh.strength * 0.15 + (pairingTake ? pairing.score : 55) * 0.1 + value * 0.1, 0, 100);

    // Umsatz
    const ctSeats = s.interior.includes('chefstable') ? Math.min(6 * days, covers * (6 / seats)) : 0;
    const menuRevenue = covers * s.price + ctSeats * s.price * 0.4;
    const pairingRevenue = covers * pairingTake * s.pairingPrice;
    const nonAlcCost = pairing.nonAlc ? covers * pairingTake * 6 : 0;
    const extras = covers * (8 + amb * 0.08); // Aperitif, Wasser, Kaffee
    const revenue = menuRevenue + pairingRevenue + extras;

    const wages = s.team.reduce((n, m) => n + m.wage, 0);
    const upkeep = s.equipment.reduce((n, id) => n + KL.byId(KL.EQUIPMENT, id).upkeep, 0) + s.interior.reduce((n, id) => n + KL.byId(KL.INTERIOR, id).upkeep, 0);
    const misc = 950 + covers * 4.5; // Energie, Reinigung, Wäsche, Versicherung, Steuerbüro
    const interest = Math.round(s.debt * 0.006);
    const costs = { ingredients: ingredientCost, wages, rent: loc.rent, upkeep, misc: misc + nonAlcCost, interest };
    const pretax = revenue - Object.values(costs).reduce((a, b) => a + b, 0);
    costs.taxes = pretax > 0 ? pretax * 0.3 : 0; // Steuern & Abgaben
    const costTotal = Object.values(costs).reduce((a, b) => a + b, 0);
    const profit = revenue - costTotal;

    return {
      menu, kitchen, foh, pairing, covers, days, seats, amb, expected, priceFactor, perDayDemand,
      ordered, short, surplus, wasteRate, fails, serviceAvg, plate, value, sat, pairingTake,
      revenue, menuRevenue, pairingRevenue, extras, costs, costTotal, profit,
      foodCostPct: s.price ? (menu.foodCost / s.price) * 100 : 0,
    };
  };

  KL.inspectorCriteria = function (s, c, service) {
    const svc = service || { avg: c.serviceAvg, inspectorAvg: c.serviceAvg, missRate: 0.1 };
    const crit = {
      produkt: c.menu.product,
      technik: clamp(svc.avg * 0.45 + (svc.inspectorAvg ?? svc.avg) * 0.35 + c.kitchen.strength * 0.2 - s.weekMods.qualityPenalty, 0, 100),
      harmonie: c.menu.harmony,
      persoenlichkeit: c.menu.creativity,
      bestaendigkeit: clamp(c.menu.maturity * 0.45 + (100 - svc.missRate * 160) * 0.35 + c.kitchen.strength * 0.2 + (s.equipment.includes('sousvide') ? 4 : 0) + (s.team.some((m) => m.trait === 'perfektion') ? 3 : 0), 0, 100),
    };
    if (c.menu.courses < 4) Object.keys(crit).forEach((k) => (crit[k] *= 0.8));
    Object.keys(crit).forEach((k) => (crit[k] = Math.round(crit[k])));
    const score = avg(Object.values(crit));
    return { crit, score };
  };

  /* Prognose ohne Zufall für die UI */
  KL.forecast = (s) => {
    const c = KL.compute(s, { det: true });
    const insp = KL.inspectorCriteria(s, c);
    return { ...c, insp };
  };

  /* ---------- Woche abschließen ---------- */
  KL.runWeek = function (s, service) {
    const c = KL.compute(s, { service });
    const wiy = KL.weekOfYear(s);
    const report = {
      week: s.week, wiy, season: KL.season(s).name, covers: c.covers, revenue: Math.round(c.revenue), costs: c.costs,
      costTotal: Math.round(c.costTotal), profit: Math.round(c.profit), sat: Math.round(c.sat), plate: Math.round(c.plate),
      pairingTake: c.pairingTake, pairingScore: c.pairing.score, wasteRate: c.wasteRate, short: c.short, surplus: c.surplus,
      fails: c.fails, service: service || null, delegated: !service || service.delegated, events: [], reviews: [], hints: [],
      menuRevenue: Math.round(c.menuRevenue), pairingRevenue: Math.round(c.pairingRevenue), extras: Math.round(c.extras),
    };

    s.money += c.profit;
    // Ruf und Buzz
    const repBefore = s.rep;
    s.rep = clamp(s.rep + (c.sat - 4 - s.rep) * 0.14 + (c.covers > 0 ? 0 : -1), 0, 100);
    s.buzz = Math.max(0, s.buzz * 0.78);
    report.repDelta = s.rep - repBefore;

    // Rezensionen
    const nReviews = Math.min(3, Math.max(1, Math.round(c.covers / 60)));
    for (let i = 0; i < nReviews && c.covers > 0; i++) {
      const sat = c.sat + rnd(-12, 12);
      const pool = sat >= 72 ? KL.REVIEW_GOOD : sat >= 52 ? KL.REVIEW_MID : KL.REVIEW_BAD;
      const r = { week: s.week, stars: clamp(Math.round(sat / 20), 1, 5), text: pick(pool), src: pick(['Gast', 'Gast', 'Food-Blog', 'Bewertungsportal']) };
      report.reviews.push(r);
      s.reviews.unshift(r);
    }
    if (s.weekMods.critic) {
      const sat = c.sat + (s.weekMods.criticBribe ? -8 : 0);
      const verdict = sat >= 78 ? 'Ein Ereignis. Diese Küche hat das Zeug zu mehr.' : sat >= 60 ? 'Viel Talent, noch nicht immer Präzision. Man sollte den Namen im Auge behalten.' : 'Ambitioniert, aber an diesem Abend nicht überzeugend.';
      const r = { week: s.week, stars: clamp(Math.round(sat / 20), 1, 5), text: (s.weekMods.criticBribe ? 'Die Küche hat sich spürbar angebiedert. ' : '') + verdict, src: 'Lokalzeitung' };
      report.reviews.unshift(r);
      s.reviews.unshift(r);
      s.rep = clamp(s.rep + (sat - 60) / 6, 0, 100);
      s.buzz += 8;
    }
    s.reviews = s.reviews.slice(0, 30);

    // Inspektion?
    if (s.inspections.planned.includes(wiy)) {
      const insp = KL.inspectorCriteria(s, c, service ? { avg: service.avg, inspectorAvg: service.inspectorAvg, missRate: service.missRate } : null);
      insp.score = clamp(insp.score + rnd(-2.5, 2.5), 0, 100);
      if (!service || service.delegated) { insp.crit.persoenlichkeit = Math.max(0, insp.crit.persoenlichkeit - 6); insp.score -= 1.2; }
      s.inspections.visits.push({ week: wiy, ...insp });
      report.hints.push(pick(KL.INSPECTOR_TELLS));
      report.inspected = true;
    } else if (Math.random() < 0.25) {
      report.hints.push('Gerüchte in der Szene: Die Inspektoren seien in der Stadt unterwegs.');
    }

    // Team: Moral, Lernen, Kündigungen
    const leaving = [];
    s.team.forEach((m) => {
      m.weeks++;
      const fair = (m.wage / (KL.ROLES[m.role].wage * (0.55 + m.skill / 100)) - 1) * 25;
      let d = 2 - (s.openDays - 4) * 3 + fair + (s.chef.lead - 50) / 10;
      if (KL.ROLES[m.role].area === 'kueche' && c.kitchen.load > 1.2) d -= 5;
      if (m.trait === 'perfektion' && service && service.missRate > 0.25) d -= 4;
      m.morale = clamp(m.morale + d, 0, 100);
      if (m.weeks % 2 === 0) m.skill = Math.min(95, m.skill + 1);
      if (m.morale < 22 && Math.random() < 0.45) leaving.push(m);
    });
    leaving.forEach((m) => {
      s.team = s.team.filter((x) => x !== m);
      report.events.push(`${m.name} (${KL.ROLES[m.role].name}) hat gekündigt. Moral im Keller.`);
    });

    // Chef*in
    s.chef.energy = clamp(s.chef.energy - (4 + s.openDays * 2.6) + 8 + (s.team.some((m) => m.role === 'souschef') ? 3 : 0) + (service && service.delegated ? 5 : 0), 0, 100);
    if (service && !service.delegated) s.chef.tech = Math.min(100, s.chef.tech + 0.5);
    s.chef.lead = Math.min(100, s.chef.lead + 0.3);

    // Reife der Gerichte
    s.dishes.forEach((d) => {
      if (s.menu.includes(d.id)) d.maturity = Math.min(100, d.maturity + 9 + (service && !service.delegated ? 3 : 0));
      else d.maturity = Math.max(0, d.maturity - 4);
    });

    // Weinverbrauch
    if (c.pairing.pours && c.pairingTake) {
      const guests = c.covers * c.pairingTake;
      const used = {};
      c.pairing.pours.forEach((p) => { if (p.wine) used[p.wine.id] = (used[p.wine.id] || 0) + guests / 7; });
      Object.entries(used).forEach(([id, n]) => { s.cellar[id] = Math.max(0, Math.round((s.cellar[id] || 0) - n)); });
      report.bottles = Math.round(Object.values(used).reduce((a, b) => a + b, 0));
    }
    if (c.fails.length) report.events.push(`Lieferausfall: ${c.fails.map((id) => KL.byId(KL.CATEGORIES, id).name).join(', ')}. Ersatz in letzter Minute.`);

    s.history.push({ week: s.week, covers: c.covers, revenue: report.revenue, profit: report.profit, sat: report.sat, rep: Math.round(s.rep), money: Math.round(s.money), regional: c.menu.regional, waste: c.wasteRate });
    s.weekMods = { qualityPenalty: 0, daysLost: 0, critic: 0, criticBribe: 0 };

    // Insolvenz?
    if (s.money < -20000) {
      s.gameOver = { week: s.week, reason: 'Das Konto ist mehr als 20.000 € im Minus. Die Bank zieht den Stecker.' };
    }

    // Jahresende → Guide-Verleihung
    if (wiy === KL.WEEKS_PER_YEAR && !s.gameOver) s.ceremony = KL.guideAward(s);

    s.lastReport = report;
    s.week++;
    if (s.ceremony) { s.year++; KL.planInspections(s); }
    KL.refreshCandidates(s);
    s.orderCovers = Math.max(10, Math.round(c.covers * 1.05) || s.orderCovers);
    // Ereignis für die nächste Woche
    const pool = KL.EVENTS.filter((e) => e.cond(s) && e.id !== s.flags.lastEvent);
    if (!s.gameOver && s.chef.energy < 15) {
      s.pendingEvent = 'burnout';
    } else if (!s.gameOver && Math.random() < 0.6 && pool.length) {
      s.pendingEvent = pick(pool).id;
      s.flags.lastEvent = s.pendingEvent;
    }
    return report;
  };

  KL.guideAward = function (s) {
    const visits = s.inspections.visits;
    const old = s.stars;
    if (!visits.length) return { year: s.year, old, level: old, score: null, crit: null, visits: 0, quote: 'Die Inspektoren haben dich dieses Jahr nicht besucht.' };
    const scores = visits.map((v) => v.score);
    const mean = avg(scores);
    const sd = Math.sqrt(avg(scores.map((x) => (x - mean) ** 2)));
    const final = mean - sd * 0.6;
    const crit = {};
    KL.CRITERIA.forEach((k) => (crit[k.id] = Math.round(avg(visits.map((v) => v.crit[k.id])))));
    let computed = 0;
    KL.STAR_LEVELS.forEach((l) => { if (final >= l.min) computed = l.level; });
    let level = computed;
    const cap = Math.floor(old) + 1;
    if (level > cap) level = cap;
    // Höchstens einen Stern pro Jahr verlieren
    const oldIdx = STAR_STEPS.indexOf(old);
    if (oldIdx > 0 && STAR_STEPS.indexOf(level) < oldIdx - 1) level = STAR_STEPS[oldIdx - 1];
    const hist = s.history.slice(-12);
    const regional = avg(hist.map((h) => h.regional));
    const waste = avg(hist.map((h) => h.waste));
    const green = level >= 0.5 && regional >= 0.7 && waste < 0.12;
    const sorted = KL.CRITERIA.map((k) => ({ ...k, v: crit[k.id] })).sort((a, b) => b.v - a.v);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    const quote = `Besonders überzeugt hat uns die ${best.name.toLowerCase()}. ${worst.v < 70 ? `Bei der ${worst.name.toLowerCase()} sehen wir noch Luft nach oben.` : 'Ein Haus, das auf ganzer Linie überzeugt.'}${sd > 6 ? ' Die Besuche fielen sehr unterschiedlich aus.' : ''}`;

    s.stars = level;
    const gained = STAR_STEPS.indexOf(level) - oldIdx;
    s.rep = clamp(s.rep + gained * 9, 0, 100);
    s.buzz += gained > 0 ? 30 + level * 10 : gained < 0 ? 10 : 2;
    if (gained > 0) s.team.forEach((m) => (m.morale = clamp(m.morale + 15, 0, 100)));
    if (gained < 0) s.team.forEach((m) => (m.morale = clamp(m.morale - 10, 0, 100)));
    const wasGreen = s.green;
    s.green = green;
    s.awards.push({ year: s.year, level, green, score: Math.round(final) });
    s.news.unshift({ week: s.week, text: `Guide Céleste, Jahr ${s.year}: ${KL.starLabel(level)}${green ? ' + Grüner Stern' : ''}.` });
    return { year: s.year, old, level, gained, score: Math.round(final), mean: Math.round(mean), sd: Math.round(sd * 10) / 10, crit, visits: visits.length, quote, green, newGreen: green && !wasGreen, computed };
  };

  KL.applyEvent = function (s, choiceIdx) {
    const ev = KL.byId(KL.EVENTS, s.pendingEvent);
    s.pendingEvent = null;
    if (!ev) return '';
    const text = ev.choices[choiceIdx].fx(s);
    s.chef.energy = clamp(s.chef.energy, 0, 100);
    s.rep = clamp(s.rep, 0, 100);
    s.news.unshift({ week: s.week, text: `${ev.title}: ${text}` });
    s.news = s.news.slice(0, 40);
    return text;
  };

  /* Betriebsferien: eine Woche zu */
  KL.closeWeek = function (s) {
    const loc = KL.byId(KL.LOCATIONS, s.location);
    const wages = s.team.reduce((n, m) => n + m.wage, 0);
    const cost = loc.rent + wages + Math.round(s.debt * 0.006) + 200;
    s.money -= cost;
    s.chef.energy = Math.min(100, s.chef.energy + 45);
    s.team.forEach((m) => (m.morale = Math.min(100, m.morale + 12)));
    s.buzz *= 0.7;
    s.dishes.forEach((d) => (d.maturity = Math.max(0, d.maturity - 3)));
    const wiy = KL.weekOfYear(s);
    const report = { week: s.week, wiy, closed: true, costTotal: cost, profit: -cost, events: [], reviews: [], hints: [] };
    if (s.inspections.planned.includes(wiy)) {
      report.hints.push('Ein Gast stand vor verschlossener Tür und hat sich die Öffnungszeiten notiert …');
      s.inspections.planned = s.inspections.planned.filter((w) => w !== wiy);
      const later = wiy + 1 + Math.floor(Math.random() * (KL.WEEKS_PER_YEAR - wiy));
      if (wiy < KL.WEEKS_PER_YEAR && !s.inspections.planned.includes(later)) s.inspections.planned.push(later);
    }
    s.history.push({ week: s.week, covers: 0, revenue: 0, profit: -cost, sat: 0, rep: Math.round(s.rep), money: Math.round(s.money), regional: 0, waste: 0 });
    if (s.money < -20000) s.gameOver = { week: s.week, reason: 'Das Konto ist mehr als 20.000 € im Minus. Die Bank zieht den Stecker.' };
    if (wiy === KL.WEEKS_PER_YEAR && !s.gameOver) s.ceremony = KL.guideAward(s);
    s.lastReport = report;
    s.week++;
    if (s.ceremony) { s.year++; KL.planInspections(s); }
    KL.refreshCandidates(s);
    return report;
  };

  /* Serviceparameter für das Pass-Minispiel */
  KL.serviceSetup = function (s) {
    const f = KL.forecast(s);
    const dishes = KL.menuDishes(s);
    const inspectorWeek = s.inspections.planned.includes(KL.weekOfYear(s));
    const tables = [3, 5, 7, 9, 11, 12];
    const inspTable = inspectorWeek ? pick(tables) : null;
    const plates = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const d = dishes[i % dishes.length];
      const e = KL.evalDish(s, d);
      const table = tables[Math.floor(i / Math.max(1, Math.ceil(n / tables.length)))] || pick(tables);
      plates.push({ id: i, dish: d, name: KL.dishName(d), table, difficulty: e.difficulty, maturity: d.maturity, inspector: table === inspTable });
    }
    // Zonen-Breite: Küchenstärke, Reife, Energie
    const base = 0.05 + f.kitchen.strength / 1100;
    return { plates, base, energy: s.chef.energy, inspTable, tell: inspTable ? pick(KL.INSPECTOR_TELLS) : null, strength: f.kitchen.strength };
  };

  KL.delegatedService = function (s) {
    const f = KL.forecast(s);
    const avgQ = clamp(f.serviceAvg + rnd(-7, 5), 10, 95);
    return { delegated: true, avg: avgQ, inspectorAvg: avgQ - 2, missRate: clamp((100 - avgQ) / 160, 0.02, 0.6), perfect: 0, good: 0, miss: 0, late: 0 };
  };

  /* ---------- Speichern ---------- */
  const KEY = 'kitchen-legends-save-v1';
  KL.save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* Speicher nicht verfügbar */ } };
  KL.load = () => { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
  KL.wipe = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ } };
})();

/* Kitchen Legends – Die Stadtkarte
 * 2,5D-Übersicht der ganzen Stadt mit sechs Vierteln und freien Ladenlokalen.
 * Hier suchst du dir zu Beginn deinen Standort aus – wie in einer Aufbausimulation.
 */
(function () {
  if (!window.THREE) return;
  const T = window.THREE;
  const { clamp, rnd, pick } = KL.util;
  const MW = 56, MH = 40; // Kartengröße in Einheiten
  const INK = 0x2b1e1a;
  const edgeMat = new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35 });
  const cache = new Map();
  const mat = (c, o = {}) => {
    const k = c + JSON.stringify(o);
    if (!cache.has(k)) cache.set(k, new T.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1, flatShading: true, transparent: !!o.opacity, opacity: o.opacity ?? 1 }));
    return cache.get(k);
  };
  const BOX = new T.BoxGeometry(1, 1, 1);
  const BOX_EDGES = new T.EdgesGeometry(BOX);

  // Zufall mit festem Startwert, damit die Stadt bei jedem Start gleich aussieht
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rr = (a, b) => a + rand() * (b - a);
  const rp = (arr) => arr[Math.floor(rand() * arr.length)];

  const center = (d) => ({ x: (d.x / 100) * MW, z: (d.y / 100) * MH });
  const zoneAt = (x, z) => {
    let best = null, bd = Infinity;
    KL.DISTRICTS.forEach((d) => { const c = center(d); const dd = (c.x - x) ** 2 + (c.z - z) ** 2 * 1.2; if (dd < bd) { bd = dd; best = d; } });
    return best;
  };
  const river = (z) => 30 + Math.sin(z * 0.16) * 3.2; // Fluss läuft von Nord nach Süd
  const isWater = (x, z) => Math.abs(x - river(z)) < 1.4 || x > MW - 5;

  class CityMap {
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = opts;
      seed = 7;
      const r = new T.WebGLRenderer({ antialias: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.outputEncoding = T.sRGBEncoding;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.domElement.className = 'view3d';
      host.appendChild(r.domElement);
      this.r = r;
      this.labels = document.createElement('div');
      this.labels.className = 'labels3d';
      host.appendChild(this.labels);
      const sc = new T.Scene();
      this.scene = sc;
      sc.background = new T.Color('#f0d9a8');
      sc.fog = new T.Fog('#f0d9a8', 60, 130);
      this.cam = new T.PerspectiveCamera(30, 1, 0.5, 400);
      this.cam.position.set(MW / 2 + 34, 46, MH / 2 + 40);
      this.controls = new T.OrbitControls(this.cam, r.domElement);
      this.controls.target.set(MW / 2, 0, MH / 2);
      this.controls.enableDamping = true;
      this.controls.maxPolarAngle = 1.15; this.controls.minPolarAngle = 0.3;
      this.controls.minDistance = 12; this.controls.maxDistance = 110;
      this.controls.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
      this.controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
      sc.add(new T.HemisphereLight(0xcfe2ff, 0x7a5a3d, 0.6));
      const sun = new T.DirectionalLight(0xffd08a, 2.4);
      sun.position.set(-30, 32, 18);
      sun.target.position.set(MW / 2, 0, MH / 2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 40, bottom: -40, near: 1, far: 140 });
      sun.shadow.bias = -0.0008;
      sc.add(sun); sc.add(sun.target);
      this.buildGround();
      this.buildCity();
      this.buildSites();
      this.pick = new T.Raycaster();
      this.plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
      let down = null;
      const el = r.domElement;
      el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
      el.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
        down = null;
        this.click(e);
      });
      el.addEventListener('pointermove', (e) => this.hoverAt(e));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      this.resize();
      this.t = 0;
      this.running = true;
      this.flyTo = null;
      const loop = (ts) => {
        if (!this.running) return;
        const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
        this.last = ts; this.t += dt;
        this.update(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resize() {
      const w = this.host.clientWidth || 800, h = this.host.clientHeight || 600;
      this.r.setSize(w, h);
      this.cam.aspect = w / h;
      this.cam.updateProjectionMatrix();
      this.W = w; this.H = h;
    }

    destroy() {
      this.running = false;
      this._ro.disconnect();
      this.controls.dispose();
      this.r.dispose();
      this.r.domElement.remove();
      this.labels.remove();
    }

    buildGround() {
      const px = 24;
      const c = document.createElement('canvas');
      c.width = MW * px; c.height = MH * px;
      const g = c.getContext('2d');
      for (let z = 0; z < MH; z++) for (let x = 0; x < MW; x++) {
        const d = zoneAt(x + 0.5, z + 0.5);
        let col = d.id === 'land' ? ((Math.floor(x / 3) + Math.floor(z / 2)) % 3 === 0 ? '#c9b25a' : (Math.floor(x / 3) + z) % 4 === 0 ? '#8ea35a' : '#a7b866') : d.id === 'lindenhain' ? '#9cb27a' : d.id === 'hafen' ? '#a9a49a' : d.id === 'mitte' ? '#b9b6ae' : '#c9bda6';
        if (isWater(x + 0.5, z + 0.5)) col = '#4a7f9c';
        g.fillStyle = col; g.fillRect(x * px, z * px, px, px);
      }
      // Straßenraster
      g.fillStyle = 'rgba(80,78,74,0.85)';
      for (let x = 0; x < MW; x += 6) g.fillRect(x * px, 0, px * 0.9, MH * px);
      for (let z = 0; z < MH; z += 5) g.fillRect(0, z * px, MW * px, px * 0.9);
      // Viertelgrenzen weich einfärben
      KL.DISTRICTS.forEach((d) => {
        const ctr = center(d);
        const gr = g.createRadialGradient(ctr.x * px, ctr.z * px, 0, ctr.x * px, ctr.z * px, 12 * px);
        gr.addColorStop(0, d.color + '55'); gr.addColorStop(1, d.color + '00');
        g.fillStyle = gr; g.fillRect(0, 0, MW * px, MH * px);
      });
      // Fluss nochmal drüber
      g.fillStyle = '#4a7f9c';
      for (let z = 0; z < MH * px; z += 2) { const rx = river(z / px); g.fillRect((rx - 1.4) * px, z, 2.8 * px, 2); }
      g.fillRect((MW - 5) * px, 0, 5 * px, MH * px);
      const img = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 12; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
      g.putImageData(img, 0, 0);
      const tex = new T.CanvasTexture(c);
      tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
      const m = new T.Mesh(new T.PlaneGeometry(MW, MH), new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
      m.rotation.x = -Math.PI / 2; m.position.set(MW / 2, 0, MH / 2); m.receiveShadow = true;
      this.scene.add(m);
      const out = new T.Mesh(new T.PlaneGeometry(MW + 140, MH + 140), mat('#a7b866', { rough: 1 }));
      out.rotation.x = -Math.PI / 2; out.position.set(MW / 2, -0.05, MH / 2); out.receiveShadow = true;
      this.scene.add(out);
      this.water = new T.Mesh(new T.PlaneGeometry(40, MH + 120), new T.MeshStandardMaterial({ color: 0x4a7f9c, roughness: 0.1, metalness: 0.2 }));
      this.water.rotation.x = -Math.PI / 2; this.water.position.set(MW + 15, 0.01, MH / 2); this.scene.add(this.water);
      // Brücken
      [8, 22, 33].forEach((z) => this.box(river(z) - 2, z + 0.1, 4, 0.8, 0, 0.25, '#a08a6a'));
    }

    box(x, z, w, d, y, h, color, o = {}) {
      const m = new T.Mesh(BOX, mat(color, o));
      m.scale.set(w, h, d);
      m.position.set(x + w / 2, y + h / 2, z + d / 2);
      m.castShadow = o.cast !== false; m.receiveShadow = true;
      if (o.edges !== false) m.add(new T.LineSegments(BOX_EDGES, edgeMat));
      this.scene.add(m);
      return m;
    }

    roof(x, z, w, d, y, h, color) {
      const shape = new T.Shape();
      shape.moveTo(-0.05, 0); shape.lineTo(d / 2, h); shape.lineTo(d + 0.05, 0); shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, { depth: w + 0.1, bevelEnabled: false });
      const m = new T.Mesh(geo, mat(color));
      m.rotation.y = -Math.PI / 2; m.position.set(x + w + 0.05, y, z);
      m.castShadow = true;
      this.scene.add(m);
    }

    tree(x, z, s = 1) {
      this.box(x - 0.06 * s, z - 0.06 * s, 0.12 * s, 0.12 * s, 0, 0.5 * s, '#5a3a28', { edges: false });
      const m = new T.Mesh(new T.IcosahedronGeometry(0.42 * s, 0), mat(rp(['#4f6b4a', '#5f7d55', '#6f8f60'])));
      m.position.set(x, 0.8 * s, z); m.castShadow = true; this.scene.add(m);
    }

    buildCity() {
      this.siteSpots = [];
      for (let bz = 0; bz < MH; bz += 5) for (let bx = 0; bx < MW; bx += 6) {
        const x0 = bx + 1, z0 = bz + 1, bw = 5, bd = 4;
        const cx = x0 + bw / 2, cz = z0 + bd / 2;
        if (isWater(cx, cz) || isWater(x0, z0) || isWater(x0 + bw, z0 + bd)) continue;
        const d = zoneAt(cx, cz);
        this.block(d, x0, z0, bw, bd);
      }
      // Wahrzeichen
      const as = center(KL.byId(KL.DISTRICTS, 'altstadt'));
      this.box(as.x - 0.6, as.z - 0.6, 1.2, 1.2, 0, 5, '#cfc6b4');
      const spire = new T.Mesh(new T.ConeGeometry(0.85, 2.6, 4), mat('#4a6a5a'));
      spire.position.set(as.x, 6.3, as.z); spire.rotation.y = Math.PI / 4; spire.castShadow = true; this.scene.add(spire);
      // Kräne am Hafen
      const hf = center(KL.byId(KL.DISTRICTS, 'hafen'));
      [[-2, -6], [3, -9], [5, 2]].forEach(([dx, dz]) => {
        const x = MW - 5.5, z = hf.z + dz + dx;
        this.box(x, z, 0.3, 0.3, 0, 6, '#c4553b');
        this.box(x - 3, z, 4.5, 0.3, 6, 0.3, '#c4553b');
      });
      // Boote
      this.boats = [0, 1, 2].map((i) => { const m = this.box(MW + 2 + i * 3, 6 + i * 11, 1.6, 0.6, 0, 0.35, rp(['#f2ead9', '#b2442e', '#3f6d8a'])); return m; });
      // Autos auf den Straßen
      this.cars = Array.from({ length: 14 }, (_, i) => {
        const m = this.box(0, 0, 0.7, 0.35, 0.05, 0.3, rp(['#b2442e', '#3f6d8a', '#d4b06a', '#f2ead9', '#2f3a44']), { edges: false });
        const horiz = i % 2 === 0;
        return { m, horiz, lane: horiz ? Math.floor(rr(0, 8)) * 5 + 0.45 : Math.floor(rr(0, 9)) * 6 + 0.45, p: rr(0, 50), v: rr(2, 4) * (rand() < 0.5 ? 1 : -1) };
      });
    }

    block(d, x0, z0, bw, bd) {
      const id = d.id;
      const lots = [];
      if (id === 'mitte') lots.push([x0 + 0.3, z0 + 0.3, 2.1, 1.6], [x0 + 2.8, z0 + 0.3, 1.9, 1.6], [x0 + 0.3, z0 + 2.2, 4.4, 1.5]);
      else if (id === 'lindenhain' || id === 'land') lots.push([x0 + 0.5, z0 + 0.5, 1.6, 1.4], [x0 + 3, z0 + 2, 1.5, 1.3]);
      else if (id === 'hafen') lots.push([x0 + 0.2, z0 + 0.3, 4.6, 1.6], [x0 + 0.2, z0 + 2.3, 2.2, 1.4], [x0 + 2.7, z0 + 2.3, 2.1, 1.4]);
      else for (let i = 0; i < 4; i++) lots.push([x0 + 0.2 + (i % 2) * 2.45, z0 + 0.2 + Math.floor(i / 2) * 1.95, 2.25, 1.7]);
      lots.forEach(([x, z, w, dd], i) => {
        if (isWater(x + w / 2, z + dd / 2)) return;
        let h, wall, roofCol, flat = false;
        switch (id) {
          case 'kreuzkiez': h = rr(2.4, 3.6); wall = rp(['#c4553b', '#d9a066', '#8a6a9a', '#e0c48a', '#6b8a7a']); roofCol = '#4a3a34'; flat = rand() < 0.6; break;
          case 'altstadt': h = rr(1.6, 2.4); wall = rp(['#f2ead9', '#e8d6b0', '#d9c4a0']); roofCol = rp(['#b2442e', '#a33a28', '#8c3a2a']); break;
          case 'lindenhain': h = rr(1.4, 1.9); wall = rp(['#f4efe6', '#e8e0d0', '#d6d2c8']); roofCol = '#3a3f4a'; break;
          case 'hafen': h = rr(1.4, 2.4); wall = rp(['#8c4a3a', '#7a3f30', '#9a5a40']); roofCol = '#4a4d52'; flat = true; break;
          case 'mitte': h = rr(5, 11); wall = rp(['#7d95a6', '#9aaab6', '#5f7486']); roofCol = '#2f3a44'; flat = true; break;
          default: h = rr(1, 1.4); wall = rp(['#f2ead9', '#b2442e', '#e8d6b0']); roofCol = rp(['#6b4a33', '#8c3a2a']); break;
        }
        const glassy = id === 'mitte';
        this.box(x, z, w, dd, 0, h, wall, glassy ? { metal: 0.4, rough: 0.25 } : {});
        if (flat) this.box(x - 0.05, z - 0.05, w + 0.1, dd + 0.1, h, 0.12, roofCol, { edges: false });
        else this.roof(x, z, w, dd, h, Math.min(1.1, dd * 0.6), roofCol);
        if (glassy) for (let k = 1; k < h; k += 1.1) this.box(x - 0.01, z + dd - 0.02, w + 0.02, 0.04, k, 0.12, '#2f3a44', { edges: false, cast: false });
        if (id === 'hafen' && i === 0) for (let k = 0; k < 3; k++) this.box(x + 0.4 + k * 1.3, z + dd + 0.25, 1.1, 0.5, 0, 0.5, rp(['#c4553b', '#3f6d8a', '#d4b06a', '#4f6b4a']), { edges: false });
        this.siteSpots.push({ d: id, x: x + w / 2, z: z + dd / 2, h, w, dd });
      });
      if (id === 'lindenhain' || id === 'land' || rand() < 0.25) for (let k = 0; k < (id === 'lindenhain' ? 4 : 2); k++) this.tree(x0 + rr(0.3, bw - 0.3), z0 + rr(0.3, bd - 0.3), id === 'lindenhain' ? 1.3 : 1);
    }

    buildSites() {
      this.sites = [];
      const pinGeo = new T.ConeGeometry(0.35, 1, 4);
      KL.DISTRICTS.forEach((d) => {
        const spots = this.siteSpots.filter((s) => s.d === d.id);
        const ctr = center(d);
        spots.sort((a, b) => Math.hypot(a.x - ctr.x, a.z - ctr.z) - Math.hypot(b.x - ctr.x, b.z - ctr.z));
        d.sites.forEach((site, i) => {
          const sp = spots[i * 2] || spots[i] || { x: ctr.x + i * 2, z: ctr.z, h: 2 };
          const pin = new T.Mesh(pinGeo, new T.MeshStandardMaterial({ color: 0xff6b1f, emissive: 0xff4a10, emissiveIntensity: 0.6, flatShading: true }));
          pin.rotation.x = Math.PI;
          pin.position.set(sp.x, sp.h + 1.6, sp.z);
          pin.userData = { site, district: d };
          this.scene.add(pin);
          const ring = new T.Mesh(new T.RingGeometry(0.9, 1.15, 32), new T.MeshBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0.7, side: T.DoubleSide }));
          ring.rotation.x = -Math.PI / 2; ring.position.set(sp.x, 0.05, sp.z);
          this.scene.add(ring);
          this.sites.push({ site, district: d, pin, ring, x: sp.x, z: sp.z, h: sp.h });
        });
      });
    }

    ndc(e) {
      const rect = this.r.domElement.getBoundingClientRect();
      return new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    }

    hitSite(e) {
      this.pick.setFromCamera(this.ndc(e), this.cam);
      const hit = this.pick.intersectObjects(this.sites.map((s) => s.pin))[0];
      if (hit) return this.sites.find((s) => s.pin === hit.object);
      // Nähe zum Boden-Ring zählt auch
      const p = new T.Vector3();
      if (!this.pick.ray.intersectPlane(this.plane, p)) return null;
      return this.sites.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < 1.3) || null;
    }

    hoverAt(e) {
      const s = this.hitSite(e);
      this.hover = s;
      this.r.domElement.style.cursor = s ? 'pointer' : 'grab';
    }

    click(e) {
      const s = this.hitSite(e);
      if (s) return this.select(s);
      this.pick.setFromCamera(this.ndc(e), this.cam);
      const p = new T.Vector3();
      if (this.pick.ray.intersectPlane(this.plane, p) && p.x > 0 && p.z > 0 && p.x < MW && p.z < MH && !isWater(p.x, p.z)) {
        const d = zoneAt(p.x, p.z);
        this.focusDistrict(d);
      }
    }

    focusDistrict(d) {
      this.district = d;
      const c = center(d);
      this.fly(c.x, c.z, 40);
      if (this.opts.onDistrict) this.opts.onDistrict(d);
    }

    select(s) {
      this.selected = s;
      this.district = s.district;
      this.fly(s.x, s.z, 28);
      if (this.opts.onSite) this.opts.onSite(s.site, s.district);
    }

    fly(x, z, dist) {
      const dir = this.cam.position.clone().sub(this.controls.target).normalize();
      this.flyTo = { t: new T.Vector3(x, 0, z), p: new T.Vector3(x, 0, z).add(dir.multiplyScalar(dist)) };
    }

    update(dt) {
      if (this.flyTo) {
        this.controls.target.lerp(this.flyTo.t, 0.07);
        this.cam.position.lerp(this.flyTo.p, 0.07);
        if (this.cam.position.distanceTo(this.flyTo.p) < 0.1) this.flyTo = null;
      } else if (this.opts.idleSpin && !this.district) {
        const off = this.cam.position.clone().sub(this.controls.target);
        off.applyAxisAngle(new T.Vector3(0, 1, 0), dt * 0.05);
        this.cam.position.copy(this.controls.target).add(off);
      }
      this.controls.update();
      this.cars.forEach((c) => {
        c.p += c.v * dt;
        const span = c.horiz ? MW : MH;
        if (c.p > span + 2) c.p = -2; if (c.p < -2) c.p = span + 2;
        if (c.horiz) { c.m.position.set(c.p, 0.2, c.lane); c.m.rotation.y = 0; } else { c.m.position.set(c.lane, 0.2, c.p); c.m.rotation.y = Math.PI / 2; }
      });
      this.boats.forEach((b, i) => { b.position.z = (b.position.z + dt * (0.6 + i * 0.2)) % (MH + 10); });
      this.sites.forEach((s, i) => {
        const on = this.selected === s, hv = this.hover === s, dist = this.district === s.district;
        s.pin.position.y = s.h + 1.6 + Math.sin(this.t * 2.5 + i) * 0.18;
        s.pin.rotation.y += dt * 1.5;
        s.pin.scale.setScalar(on ? 1.5 : hv ? 1.25 : 1);
        s.ring.material.opacity = on ? 0.95 : dist ? 0.7 : 0.35;
        s.ring.scale.setScalar(1 + (on ? Math.sin(this.t * 4) * 0.15 : 0));
      });
      this.r.render(this.scene, this.cam);
      this.drawLabels();
    }

    drawLabels() {
      const items = [];
      KL.DISTRICTS.forEach((d) => { const c = center(d); items.push({ text: d.name, x: c.x, y: 7, z: c.z, cls: 'dist' + (this.district === d ? ' on' : '') }); });
      this.sites.forEach((s) => { if (this.district === s.district || this.selected === s || this.hover === s) items.push({ text: `Zu vermieten · ${s.site.name}`, x: s.x, y: s.h + 2.4, z: s.z, cls: 'site' + (this.selected === s ? ' on' : '') }); });
      while (this.labels.children.length < items.length) this.labels.appendChild(document.createElement('div'));
      [...this.labels.children].forEach((el, i) => {
        const it = items[i];
        if (!it) { el.style.display = 'none'; return; }
        const v = new T.Vector3(it.x, it.y, it.z).project(this.cam);
        el.style.display = v.z < 1 ? '' : 'none';
        el.className = 'lbl ' + it.cls;
        if (el.textContent !== it.text) el.textContent = it.text;
        el.style.transform = `translate(${(v.x * 0.5 + 0.5) * this.W}px, ${(-v.y * 0.5 + 0.5) * this.H}px) translate(-50%, -100%)`;
      });
    }
  }

  KL.CityMap = CityMap;
})();

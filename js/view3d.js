/* Kitchen Legends – 2,5D-Ansicht mit Three.js
 * Echte Perspektive, Sonnenlicht durch die Fenster, Schatten, Lampen in der Nacht.
 * Die Spiellogik bleibt in KL.World / KL.City; diese Ansicht spiegelt deren Zustand jedes Frame.
 */
(function () {
  if (!window.THREE) return;
  const T = window.THREE;
  const { clamp } = KL.util;
  const INK = 0x2b1e1a;

  const matCache = new Map();
  const mat = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!matCache.has(key)) {
      matCache.set(key, new T.MeshStandardMaterial({ color, roughness: o.rough ?? 0.82, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.opacity, opacity: o.opacity ?? 1, flatShading: true }));
    }
    return matCache.get(key);
  };
  const edgeMat = new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.5 });

  // Quader mit Tusche-Kante. x,z = Ecke, w,d = Größe, y = Unterkante, h = Höhe
  const box = (parent, x, z, w, d, y, h, color, o = {}) => {
    const g = new T.BoxGeometry(w, h, d);
    const m = new T.Mesh(g, mat(color, o));
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    m.castShadow = o.cast !== false;
    m.receiveShadow = true;
    if (o.edges !== false) m.add(new T.LineSegments(new T.EdgesGeometry(g), edgeMat));
    parent.add(m);
    return m;
  };
  const cyl = (parent, x, z, r, y, h, color, o = {}) => {
    const g = new T.CylinderGeometry(o.rTop ?? r, r, h, o.seg || 12);
    const m = new T.Mesh(g, mat(color, o));
    m.position.set(x, y + h / 2, z);
    m.castShadow = o.cast !== false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const ball = (parent, x, y, z, r, color, o = {}) => {
    const m = new T.Mesh(new T.IcosahedronGeometry(r, o.detail ?? 1), mat(color, o));
    m.position.set(x, y, z);
    m.castShadow = o.cast !== false;
    parent.add(m);
    return m;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  };
  const signTex = (text, bg, fg) => canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2b1e1a'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = fg; c.font = "italic 700 64px 'Bodoni Moda', Georgia, serif"; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 4, w - 40);
  });
  const lerpC = (a, b, t) => new T.Color(a).lerp(new T.Color(b), t);

  /* ---------- Figuren ---------- */
  const COOK = ['chef', 'souschef', 'partie', 'patissier', 'commis'];
  function figure(look) {
    const g = new T.Group();
    const r = look.role;
    let body = look.cloth, apron = null;
    if (r === 'chef' || COOK.includes(r)) body = '#f4f1ea';
    else if (r === 'spueler') { body = '#5a6b7a'; apron = '#2f3a44'; }
    else if (['service', 'maitre', 'sommelier'].includes(r)) { body = '#1e1f22'; apron = r === 'sommelier' ? '#5a1424' : '#ecebe6'; }
    else if (r === 'inspector') body = '#4a4d52';
    const legs = [];
    for (const s of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(s * 0.06, 0.32, 0);
      const m = new T.Mesh(new T.BoxGeometry(0.08, 0.32, 0.09), mat(r === 'chef' || COOK.includes(r) ? '#3a3a3a' : '#2a2a33'));
      m.position.y = -0.16; m.castShadow = true;
      leg.add(m); g.add(leg); legs.push(leg);
    }
    const torso = new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 0.34, 10), mat(body));
    torso.position.y = 0.49; torso.castShadow = true;
    torso.add(new T.LineSegments(new T.EdgesGeometry(torso.geometry, 40), edgeMat));
    g.add(torso);
    if (apron) { const a = new T.Mesh(new T.BoxGeometry(0.2, 0.22, 0.02), mat(apron)); a.position.set(0, 0.42, 0.135); g.add(a); }
    if (r === 'chef') { const c = new T.Mesh(new T.CylinderGeometry(0.125, 0.125, 0.04, 10), mat('#d4b06a', { metal: 0.4, rough: 0.4 })); c.position.y = 0.66; g.add(c); }
    const head = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), mat(look.skin));
    head.position.y = 0.76; head.castShadow = true; g.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(0.105, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(look.hair));
    hair.position.y = 0.775; g.add(hair);
    if (look.long && !COOK.includes(r) && r !== 'chef') { const h2 = new T.Mesh(new T.BoxGeometry(0.2, 0.16, 0.06), mat(look.hair)); h2.position.set(0, 0.7, -0.07); g.add(h2); }
    if (r === 'chef' || COOK.includes(r)) {
      const hh = r === 'chef' ? 0.24 : r === 'souschef' ? 0.17 : 0.1;
      const toque = new T.Mesh(new T.CylinderGeometry(0.1, 0.085, hh, 12), mat('#ffffff'));
      toque.position.y = 0.84 + hh / 2; toque.castShadow = true; g.add(toque);
      const puff = new T.Mesh(new T.SphereGeometry(0.115, 12, 8), mat('#ffffff')); puff.position.y = 0.84 + hh; g.add(puff);
    }
    if (r === 'inspector') {
      const brim = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.02, 14), mat('#25272b')); brim.position.y = 0.85; g.add(brim);
      const crown = new T.Mesh(new T.CylinderGeometry(0.1, 0.11, 0.1, 14), mat('#25272b')); crown.position.y = 0.91; g.add(crown);
    }
    const plate = new T.Mesh(new T.CylinderGeometry(0.11, 0.09, 0.02, 14), mat('#ffffff', { rough: 0.3 }));
    plate.position.set(0.17, 0.62, 0.08); plate.visible = false; g.add(plate);
    if (r === 'chef') {
      const ring = new T.Mesh(new T.RingGeometry(0.2, 0.25, 28), new T.MeshBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0.85 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; g.add(ring);
      g.userData.ring = ring;
    }
    g.userData.legs = legs;
    g.userData.plate = plate;
    g.userData.torso = torso;
    return g;
  }

  /* ---------- Möbel ---------- */
  function furniture(it, style, t) {
    const g = new T.Group();
    const f = KL.FURN[it.type];
    const x = it.x, z = it.y, w = f.w, d = f.d;
    const steel = '#b9c0c6';
    switch (it.type) {
      case 't2': case 't4': case 't6': {
        const top = style.linen ? '#f4efe6' : '#a87a4f';
        box(g, x + 0.1, z + 0.22, w - 0.2, d - 0.44, 0.42, 0.05, top);
        if (style.linen) box(g, x + 0.1, z + 0.22, w - 0.2, d - 0.44, 0.3, 0.12, '#ebe4d6', { edges: false });
        for (let i = 0; i < w; i++) {
          box(g, x + i + 0.47, z + 0.47, 0.06, 0.06, 0, 0.42, '#2a1d16', { edges: false });
          for (const side of [0, 1]) {
            const cz = side ? z + 0.82 : z + 0.04;
            box(g, x + i + 0.33, cz, 0.34, 0.14, 0.24, 0.05, '#4a3326');
            box(g, x + i + 0.33, side ? cz + 0.11 : cz, 0.34, 0.03, 0.29, 0.32, '#3b2a20');
            for (const lx of [0.35, 0.63]) box(g, x + i + lx, cz + 0.05, 0.03, 0.03, 0, 0.24, '#2a1d16', { edges: false });
          }
        }
        const candle = cyl(g, x + w / 2, z + 0.5, 0.025, 0.47, 0.08, '#f4efe6', { cast: false });
        const flame = ball(g, x + w / 2, 0.58, z + 0.5, 0.022, '#ffb347', { emissive: 0xff9a3c, ei: 2, cast: false, detail: 0 });
        g.userData.flame = flame; candle.userData.candle = true;
        break;
      }
      case 'pflanze':
        cyl(g, x + 0.5, z + 0.5, 0.17, 0, 0.32, '#8c5a3a', { rTop: 0.2 });
        ball(g, x + 0.5, 0.75, z + 0.5, 0.3, '#4f6b4a', { detail: 0 });
        ball(g, x + 0.38, 0.98, z + 0.56, 0.22, '#5f7d55', { detail: 0 });
        ball(g, x + 0.62, 1.1, z + 0.44, 0.18, '#6f8f60', { detail: 0 });
        break;
      case 'lampe': {
        cyl(g, x + 0.5, z + 0.5, 0.12, 0, 0.03, '#222');
        cyl(g, x + 0.5, z + 0.5, 0.02, 0, 1.4, '#222');
        const shade = cyl(g, x + 0.5, z + 0.5, 0.2, 1.3, 0.22, '#f2ead9', { rTop: 0.12, emissive: 0xffd9a0, ei: 0 });
        g.userData.shade = shade;
        break;
      }
      case 'skulptur':
        box(g, x + 0.25, z + 0.25, 0.5, 0.5, 0, 0.5, '#2c2c2c');
        box(g, x + 0.38, z + 0.4, 0.24, 0.2, 0.5, 0.7, '#d4b06a', { metal: 0.6, rough: 0.35 });
        ball(g, x + 0.5, 1.35, z + 0.5, 0.16, '#d4b06a', { metal: 0.6, rough: 0.3, detail: 0 });
        break;
      case 'weinregal':
        box(g, x + 0.08, z + 0.2, 0.84, 0.6, 0, 1.7, '#3b2a20');
        for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
          const b = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.22, 8), mat((r + k) % 3 ? '#4a1020' : '#c9b46a', { rough: 0.3 }));
          b.rotation.x = Math.PI / 2; b.position.set(x + 0.2 + k * 0.2, 0.2 + r * 0.32, z + 0.75); g.add(b);
        }
        break;
      case 'bar':
        box(g, x + 0.05, z + 0.25, w - 0.1, 0.5, 0, 0.75, '#5a3a28');
        box(g, x, z + 0.18, w, 0.64, 0.75, 0.06, '#c9a45c', { metal: 0.4, rough: 0.4 });
        for (let i = 0; i < 3; i++) cyl(g, x + 0.35 + i * 0.65, z + 0.95, 0.1, 0, 0.5, '#2a2a2a');
        break;
      case 'pass': {
        box(g, x + 0.05, z + 0.2, w - 0.1, 0.6, 0, 0.62, '#d6dbe0', { metal: 0.5, rough: 0.35 });
        box(g, x + 0.02, z + 0.17, w - 0.04, 0.66, 0.62, 0.04, '#e8ecef', { metal: 0.6, rough: 0.25 });
        const lamps = [];
        for (let i = 0; i < 3; i++) {
          const lx = x + 0.35 + i * 0.65;
          cyl(g, lx, z + 0.5, 0.015, 0.66, 0.75, '#333', { cast: false });
          const l = cyl(g, lx, z + 0.5, 0.16, 1.32, 0.1, '#3a3a3a', { rTop: 0.1, emissive: 0xff5a10, ei: 0.6 });
          lamps.push(l);
        }
        g.userData.lamps = lamps;
        break;
      }
      case 'herd': {
        box(g, x + 0.05, z + 0.08, w - 0.1, 0.84, 0, 0.6, '#c3c9ce', { metal: 0.5, rough: 0.35 });
        box(g, x + 0.05, z + 0.08, w - 0.1, 0.84, 0.6, 0.04, '#2b2f33', { rough: 0.5 });
        for (let i = 0; i < 4; i++) {
          const bx = x + 0.45 + (i % 2) * 0.95, bz = z + 0.3 + Math.floor(i / 2) * 0.4;
          cyl(g, bx, bz, 0.12, 0.64, 0.01, '#ff6b1f', { emissive: 0xff4a00, ei: 0.8, cast: false });
          if (i % 2 === 0) { cyl(g, bx, bz, 0.13, 0.66, 0.08, '#3a3a3a', { metal: 0.6, rough: 0.3 }); }
        }
        g.userData.burner = true;
        break;
      }
      case 'spuele':
        box(g, x + 0.05, z + 0.08, 0.9, 0.84, 0, 0.62, '#c9d0d5', { metal: 0.5, rough: 0.3 });
        box(g, x + 0.2, z + 0.22, 0.6, 0.55, 0.6, 0.03, '#6f9fb8', { rough: 0.15, edges: false });
        cyl(g, x + 0.5, z + 0.15, 0.02, 0.62, 0.3, '#aeb6bd', { metal: 0.8 });
        break;
      case 'posten':
        box(g, x + 0.05, z + 0.08, 0.9, 0.84, 0, 0.62, '#d6dbe0', { metal: 0.45, rough: 0.35 });
        box(g, x + 0.25, z + 0.3, 0.5, 0.35, 0.62, 0.03, '#e8d6b0');
        box(g, x + 0.45, z + 0.4, 0.3, 0.06, 0.65, 0.01, '#cfd5da', { metal: 0.9, rough: 0.2, edges: false });
        break;
      case 'grill':
        box(g, x + 0.08, z + 0.1, 0.84, 0.8, 0, 0.75, '#1d1d1d', { rough: 0.6 });
        box(g, x + 0.2, z + 0.85, 0.6, 0.05, 0.25, 0.3, '#ff6b1f', { emissive: 0xff4a00, ei: 1.5, edges: false });
        g.userData.fire = true;
        break;
      case 'kombi':
        box(g, x + 0.1, z + 0.1, 0.8, 0.8, 0, 1.25, '#aeb6bd', { metal: 0.5, rough: 0.3 });
        box(g, x + 0.22, z + 0.88, 0.56, 0.03, 0.3, 0.7, '#22323c', { rough: 0.1, edges: false });
        break;
      case 'sousvide':
        box(g, x + 0.1, z + 0.1, 0.8, 0.8, 0, 0.62, '#d6dbe0', { metal: 0.45 });
        box(g, x + 0.22, z + 0.22, 0.56, 0.56, 0.62, 0.25, '#78bee6', { opacity: 0.55, rough: 0.1, edges: false });
        break;
      case 'raeucher':
        box(g, x + 0.1, z + 0.1, 0.8, 0.8, 0, 1.3, '#6b4a33');
        g.userData.smoke = true;
        break;
      case 'ferment':
        box(g, x + 0.1, z + 0.1, 0.8, 0.8, 0, 1.3, '#3a4249');
        for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) cyl(g, x + 0.33 + k * 0.34, z + 0.92, 0.07, 0.15 + r * 0.38, 0.22, ['#c9a45c', '#8c4a3a', '#7a8a3a'][r], { opacity: 0.85 });
        break;
      case 'dryager':
        box(g, x + 0.1, z + 0.1, 0.8, 0.8, 0, 1.4, '#2a2a2a');
        box(g, x + 0.18, z + 0.88, 0.64, 0.03, 0.12, 1.15, '#c83c46', { emissive: 0x801820, ei: 0.8, opacity: 0.8, edges: false });
        break;
      case 'eismaschine':
        box(g, x + 0.2, z + 0.2, 0.6, 0.6, 0, 0.62, '#eaeef1');
        cyl(g, x + 0.5, z + 0.5, 0.14, 0.62, 0.25, '#c9d0d5', { metal: 0.6 });
        break;
      case 'kuehlhaus':
        box(g, x + 0.05, z + 0.05, w - 0.1, 0.9, 0, 1.6, '#cfd5da', { metal: 0.4, rough: 0.4 });
        box(g, x + 0.6, z + 0.94, 0.8, 0.03, 0.05, 1.35, '#8a949b', { edges: false });
        break;
      case 'buero':
        box(g, x + 0.1, z + 0.15, 0.8, 0.7, 0, 0.55, '#6b4a33');
        box(g, x + 0.3, z + 0.3, 0.4, 0.04, 0.55, 0.28, '#1d2630', { emissive: 0x4a90c8, ei: 0.4 });
        box(g, x + 0.62, z + 0.55, 0.2, 0.22, 0.55, 0.1, '#f2ead9', { edges: false });
        break;
      default:
        box(g, x + 0.1, z + 0.1, w - 0.2, d - 0.2, 0, 0.8, '#888');
    }
    return g;
  }

  /* ---------- Ansicht ---------- */
  class View3D {
    constructor(world) {
      this.w = world;
      this.city = KL.City && world instanceof KL.City;
      const host = world.c.parentElement;
      this.host = host;
      world.c.style.display = 'none';
      const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.outputEncoding = T.sRGBEncoding;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      r.domElement.className = 'view3d';
      host.appendChild(r.domElement);
      this.r = r;
      this.labels = document.createElement('div');
      this.labels.className = 'labels3d';
      host.appendChild(this.labels);
      this.labelPool = [];

      const s = world.s;
      const g = world.g;
      this.W = g.w; this.H = g.h;
      const scene = new T.Scene();
      this.scene = scene;
      this.cam = new T.PerspectiveCamera(32, 1, 0.1, 400);
      const cx = this.W / 2, cz = this.H / 2;
      const dist = Math.max(this.W, this.H) * (this.city ? 1.75 : 1.85);
      this.cam.position.set(cx + dist * 0.62, dist * 0.78, cz + dist * 0.62);
      if (T.OrbitControls) {
        const c = new T.OrbitControls(this.cam, r.domElement);
        c.target.set(cx, 0, cz);
        c.enableDamping = true; c.dampingFactor = 0.08;
        c.minPolarAngle = 0.35; c.maxPolarAngle = 1.2;
        c.minAzimuthAngle = this.city ? -Infinity : 0.05; c.maxAzimuthAngle = this.city ? Infinity : Math.PI / 2 - 0.05;
        c.minDistance = 5; c.maxDistance = dist * 1.6;
        c.screenSpacePanning = false;
        c.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
        c.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
        this.controls = c;
      }
      this.cam.lookAt(cx, 0, cz);

      // Licht
      this.hemi = new T.HemisphereLight(0xbfd8ff, 0x6b4a33, 0.55);
      scene.add(this.hemi);
      this.sun = new T.DirectionalLight(0xffe2b0, 2.2);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      const ext = Math.max(this.W, this.H) * 0.9;
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 0.5; sc.far = 120;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.02;
      this.sun.target.position.set(cx, 0, cz);
      scene.add(this.sun); scene.add(this.sun.target);
      this.warm = new T.PointLight(0xffb46a, 0, Math.max(this.W, this.H) * 1.4, 1.6);
      this.warm.position.set(cx, 2.2, cz + 1);
      scene.add(this.warm);

      this.static = new T.Group(); scene.add(this.static);
      this.furn = new T.Group(); scene.add(this.furn);
      this.dyn = new T.Group(); scene.add(this.dyn);
      this.people = new Map();
      this.lights = [];
      if (this.city) this.buildCity(); else this.buildRoom();

      // Partikel
      const N = 260;
      this.pGeo = new T.BufferGeometry();
      this.pPos = new Float32Array(N * 3); this.pCol = new Float32Array(N * 3);
      this.pGeo.setAttribute('position', new T.BufferAttribute(this.pPos, 3));
      this.pGeo.setAttribute('color', new T.BufferAttribute(this.pCol, 3));
      this.points = new T.Points(this.pGeo, new T.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
      scene.add(this.points);

      // Bau-Geist
      this.ghost = new T.Mesh(new T.BoxGeometry(1, 0.06, 1), new T.MeshBasicMaterial({ color: 0x7cc495, transparent: true, opacity: 0.45, depthWrite: false }));
      this.ghost.visible = false; scene.add(this.ghost);
      this.selBox = new T.Mesh(new T.BoxGeometry(1, 0.05, 1), new T.MeshBasicMaterial({ color: 0xd4b06a, transparent: true, opacity: 0.4, depthWrite: false }));
      this.selBox.visible = false; scene.add(this.selBox);

      // Eingabe: Klick vs. Ziehen
      this.ray = new T.Raycaster();
      this.ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
      const el = r.domElement;
      let down = null;
      this._down = (e) => { down = { x: e.clientX, y: e.clientY }; };
      this._up = (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        down = null;
        if (moved > 6 || e.button !== 0) return;
        const t = this.pick(e);
        if (t && world.onTile) world.onTile(t);
      };
      this._move = (e) => { const t = this.pick(e); if (t) world.hover = t; };
      this._ctx = (e) => e.preventDefault();
      el.addEventListener('pointerdown', this._down);
      el.addEventListener('pointerup', this._up);
      el.addEventListener('pointermove', this._move);
      el.addEventListener('contextmenu', this._ctx);
      this.resize();
      this.lastTod = -1;
    }

    pick(e) {
      const rect = this.r.domElement.getBoundingClientRect();
      const v = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.ray.setFromCamera(v, this.cam);
      const p = new T.Vector3();
      if (!this.ray.ray.intersectPlane(this.ground, p)) return null;
      const x = Math.floor(p.x), y = Math.floor(p.z);
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) return null;
      return { x, y };
    }

    getCam() { return { p: this.cam.position.toArray(), t: this.controls ? this.controls.target.toArray() : [this.W / 2, 0, this.H / 2] }; }
    setCam(c) { this.cam.position.fromArray(c.p); if (this.controls) { this.controls.target.fromArray(c.t); this.controls.update(); } }

    resize() {
      const w = this.host.clientWidth || 600;
      const h = this.host.clientHeight > 120 ? this.host.clientHeight : Math.max(320, this.w.cssH);
      this.r.setSize(w, h);
      this.cam.aspect = w / h;
      this.cam.updateProjectionMatrix();
      this.sizeW = w; this.sizeH = h;
    }

    dispose() {
      const el = this.r.domElement;
      el.removeEventListener('pointerdown', this._down);
      el.removeEventListener('pointerup', this._up);
      el.removeEventListener('pointermove', this._move);
      el.removeEventListener('contextmenu', this._ctx);
      if (this.controls) this.controls.dispose();
      this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.r.dispose();
      el.remove();
      this.labels.remove();
      this.w.c.style.display = '';
    }

    /* --- Raum (Restaurant) --- */
    buildRoom() {
      const s = this.w.s, g = KL.GRID[s.location];
      const W = this.W, H = this.H, K = KL.KITCHEN_ROWS;
      const grp = this.static;
      // Boden als gemalte Textur
      const px = 96;
      const floor = canvasTex(W * px, H * px, (c) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (y < K) {
            c.fillStyle = (x + y) % 2 ? '#8e979e' : '#a7afb5';
            c.fillRect(x * px, y * px, px, px);
            c.strokeStyle = 'rgba(40,40,40,0.25)'; c.lineWidth = 2; c.strokeRect(x * px, y * px, px, px);
          } else {
            for (let k = 0; k < 4; k++) {
              c.fillStyle = (x + k + y) % 3 === 0 ? g.floorA : (x + k) % 2 ? g.floorB : '#7a5a3d';
              c.fillRect(x * px, y * px + k * (px / 4), px, px / 4);
              c.strokeStyle = 'rgba(30,18,10,0.35)'; c.lineWidth = 2;
              c.strokeRect(x * px + ((k * 37 + y * 11) % px) - px, y * px + k * (px / 4), px * 1.6, px / 4);
            }
          }
        }
        const d = KL.doorTile(s);
        c.fillStyle = '#7a2e22'; c.fillRect(d.x * px + 10, d.y * px + 14, px - 20, px - 28);
        // Papierkorn
        const img = c.getImageData(0, 0, W * px, H * px);
        for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
        c.putImageData(img, 0, 0);
      });
      const fm = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ map: floor, roughness: 0.75 }));
      fm.rotation.x = -Math.PI / 2; fm.position.set(W / 2, 0, H / 2); fm.receiveShadow = true;
      grp.add(fm);
      // Außenboden (Hof/Gehweg) für Tiefe
      const out = new T.Mesh(new T.PlaneGeometry(W + 30, H + 30), mat('#b8ad9a', { rough: 1 }));
      out.rotation.x = -Math.PI / 2; out.position.set(W / 2, -0.02, H / 2); out.receiveShadow = true;
      grp.add(out);
      const WH = 2.3, TH = 0.18;
      // Linke Wand mit Fenstern (Licht fällt hindurch)
      this.windows = [];
      for (let y = 0; y < H; y++) {
        const kitchen = y < K;
        const col = kitchen ? '#7d868d' : g.wall;
        const win = !kitchen && y % 2 === 1 && y < H - 1;
        if (!win) { box(grp, -TH, y, TH, 1, 0, WH, col); continue; }
        box(grp, -TH, y, TH, 1, 0, 0.7, col);
        box(grp, -TH, y, TH, 1, 1.85, WH - 1.85, col);
        box(grp, -TH, y, TH, 0.18, 0.7, 1.15, col);
        box(grp, -TH, y + 0.82, TH, 0.18, 0.7, 1.15, col);
        box(grp, -TH - 0.02, y + 0.18, TH + 0.04, 0.64, 0.68, 0.04, '#e8dcc4');
        const glass = box(grp, -TH * 0.5, y + 0.18, 0.02, 0.64, 0.72, 1.12, '#cfe6f2', { opacity: 0.18, rough: 0.05, cast: false, edges: false, emissive: 0xffb050, ei: 0 });
        glass.castShadow = false;
        box(grp, -TH * 0.5, y + 0.49, 0.03, 0.02, 0.72, 1.12, '#e8dcc4', { cast: true, edges: false });
        box(grp, -TH * 0.5, y + 0.18, 0.03, 0.64, 1.27, 0.02, '#e8dcc4', { cast: true, edges: false });
        this.windows.push(glass);
      }
      // Hintere Wand: Küche mit Fliesenspiegel und Schild
      box(grp, -TH, -TH, W + TH, TH, 0, WH, '#6b747b');
      const tiles = canvasTex(256, 128, (c, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#e4e1d9' : '#d6d2c8'; c.fillRect(i * 16, j * 16, 16, 16); c.strokeStyle = 'rgba(0,0,0,0.12)'; c.strokeRect(i * 16, j * 16, 16, 16); } });
      tiles.wrapS = tiles.wrapT = T.RepeatWrapping; tiles.repeat.set(W / 2, 1);
      const back = new T.Mesh(new T.PlaneGeometry(W, 1.1), new T.MeshStandardMaterial({ map: tiles, roughness: 0.4 }));
      back.position.set(W / 2, 0.55 + 0.5, 0.005); back.receiveShadow = true; grp.add(back);
      const sign = new T.Mesh(new T.PlaneGeometry(3.2, 0.8), new T.MeshStandardMaterial({ map: signTex(s.name, '#2a2520', '#ffb070'), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
      sign.position.set(W - 2.2, 1.85, 0.01); grp.add(sign);
      this.sign = sign;
      // Halbhohe Küchenwand mit Durchgang
      const pass = KL.passItem(s);
      const gap = KL.kitchenGap(s);
      if (!s.interior.includes('kueche')) {
        for (let x = 0; x < W; x++) {
          if ((x >= pass.x && x < pass.x + 2) || x === gap) continue;
          box(grp, x, K - 0.1, 1, 0.1, 0, 0.95, '#7d868d');
        }
      } else box(grp, 0, K - 0.04, W, 0.04, 0, 0.05, '#c9a45c', { metal: 0.5 });
      // Kunst an der Wand
      if (s.interior.includes('kunst')) {
        [K + 1, K + 3, K + 5].filter((y) => y % 2 === 0 && y < H - 1).forEach((y, i) => box(grp, -0.02, y + 0.2, 0.04, 0.6, 1.0, 0.7, ['#b2442e', '#2f5d7a', '#d4b06a'][i % 3]));
      }
    }

    syncFurniture() {
      const s = this.w.s;
      const style = { linen: s.interior.includes('tische'), light: s.interior.includes('licht') };
      const sig = s.layout.map((i) => i.type + i.x + ',' + i.y).join('|') + JSON.stringify(style);
      if (sig === this.furnSig) return;
      this.furnSig = sig;
      this.furn.clear();
      this.flames = []; this.passLamps = []; this.shades = []; this.fireSpots = []; this.smokeSpots = []; this.burners = [];
      this.lights.forEach((l) => this.scene.remove(l));
      this.lights = [];
      this.tablePos = new Map();
      s.layout.forEach((it) => {
        const m = furniture(it, style);
        this.furn.add(m);
        const f = KL.FURN[it.type];
        if (m.userData.flame) this.flames.push(m.userData.flame);
        if (m.userData.lamps) this.passLamps.push(...m.userData.lamps);
        if (m.userData.shade) this.shades.push(m.userData.shade);
        if (m.userData.fire) this.fireSpots.push([it.x + 0.5, it.y + 0.9]);
        if (m.userData.smoke) this.smokeSpots.push([it.x + 0.5, it.y + 0.5]);
        if (f.seats) this.tablePos.set(it.id, { x: it.x + f.w / 2, z: it.y + 0.5, w: f.w });
        if (it.type === 'lampe' && this.lights.length < 6) { const l = new T.PointLight(0xffc988, 0, 4, 2); l.position.set(it.x + 0.5, 1.35, it.y + 0.5); this.scene.add(l); this.lights.push(l); }
        if (it.type === 'pass') { const l = new T.PointLight(0xff7a2a, 0, 3.2, 2); l.position.set(it.x + 1, 1.2, it.y + 0.5); this.scene.add(l); this.lights.push(l); this.passLight = l; }
      });
    }

    /* --- Kiez (Stadt) --- */
    buildCity() {
      const grp = this.static;
      const W = this.W, H = this.H;
      const px = 64;
      const tileType = (x, y) => (x === 15 ? 'water' : y === 5 || y === 6 ? 'road' : y === 4 || y === 7 ? 'walk' : x >= 11 && y >= 8 ? 'grass' : 'plaza');
      const COL = { road: ['#55585e', '#4f5257'], walk: ['#c4b9a5', '#bbb09b'], plaza: ['#d2c6ae', '#c9bda5'], grass: ['#7a9a5f', '#71915a'], water: ['#3f6d8a', '#3a6782'] };
      const tex = canvasTex(W * px, H * px, (c) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const t = tileType(x, y);
          c.fillStyle = COL[t][(x + y) % 2]; c.fillRect(x * px, y * px, px, px);
          if (t === 'walk' || t === 'plaza') { c.strokeStyle = 'rgba(60,40,30,0.18)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) c.strokeRect(x * px + (k % 2) * 16, y * px + k * 16, px, 16); }
          if (t === 'road' && y === 5 && x % 2 === 0) { c.fillStyle = '#efe3c8'; c.fillRect(x * px + 12, (y + 1) * px - 3, px - 24, 6); }
          if (t === 'grass') { for (let k = 0; k < 12; k++) { c.fillStyle = Math.random() < 0.5 ? '#86a86a' : '#5f7d4c'; c.fillRect(x * px + Math.random() * px, y * px + Math.random() * px, 3, 6); } }
        }
        const img = c.getImageData(0, 0, W * px, H * px);
        for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 12; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
        c.putImageData(img, 0, 0);
      });
      const gm = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      gm.rotation.x = -Math.PI / 2; gm.position.set(W / 2, 0, H / 2); gm.receiveShadow = true; grp.add(gm);
      // Umland
      const out = new T.Mesh(new T.PlaneGeometry(W + 60, H + 60), mat('#8fa36a', { rough: 1 }));
      out.rotation.x = -Math.PI / 2; out.position.set(W / 2, -0.03, H / 2); out.receiveShadow = true; grp.add(out);
      // Wasser
      this.water = new T.Mesh(new T.PlaneGeometry(14, H + 40), new T.MeshStandardMaterial({ color: 0x3f6d8a, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.92 }));
      this.water.rotation.x = -Math.PI / 2; this.water.position.set(15 + 7, 0.02, H / 2); grp.add(this.water);
      box(grp, 14.9, 5.2, 1.6, 0.6, 0, 0.12, '#8c6a48');
      // Häuser
      this.cityWindows = [];
      KL.CITY_BUILDINGS.forEach((b) => this.building(grp, b));
      // Hintergrund-Häuserzeile für Tiefe
      for (let i = 0; i < 8; i++) this.building(grp, { x: -4 + i * 2.6, y: -3.4, w: 2.2, d: 2.4, h: 2 + (i % 3) * 0.8, wall: ['#a36a4a', '#c9bda6', '#7d868d', '#b07a45'][i % 4], roof: ['#3a2a24', '#5a5f66', '#2a1d16'][i % 3], decor: true });
      for (let i = 0; i < 5; i++) this.building(grp, { x: -3.6, y: i * 2.6, w: 2.4, d: 2.2, h: 2 + (i % 2), wall: ['#8c4a3a', '#c9bda6', '#6b2030'][i % 3], roof: '#3a2a24', decor: true });
      // Bäume
      [{ x: 12, y: 9 }, { x: 14, y: 11 }, { x: 11, y: 11 }, { x: 14, y: 8 }, { x: 0, y: 6 }].forEach((t) => this.tree(grp, t.x + 0.5, t.y + 0.5, 1));
      [[-6, 8], [-7, 11], [-5, 14], [20, -4], [-2, 15], [5, 15], [9, 14.5]].forEach(([x, z]) => this.tree(grp, x, z, 1.3));
      // Laternen
      this.lanterns = [];
      for (let x = 1; x < 15; x += 4) for (const z of [4.1, 7.9]) {
        cyl(grp, x, z, 0.03, 0, 1.6, '#2a2a2a');
        const head = ball(grp, x, 1.65, z, 0.09, '#fff2cc', { emissive: 0xffc070, ei: 0 , detail: 0});
        this.lanterns.push(head);
      }
      // Autos
      this.cars = this.w.cars.map((c) => {
        const m = new T.Group();
        box(m, -0.45, -0.22, 0.9, 0.44, 0.08, 0.28, c.col, { metal: 0.3, rough: 0.4 });
        box(m, -0.25, -0.19, 0.5, 0.38, 0.36, 0.22, '#cfe0ea', { rough: 0.1 });
        for (const [wx, wz] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]]) { const w = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.06, 10), mat('#1d1d1d')); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.08, wz); m.add(w); }
        this.dyn.add(m);
        return m;
      });
    }

    building(grp, b) {
      const g = new T.Group();
      box(g, b.x, b.y, b.w, b.d, 0, b.h, b.wall);
      // Satteldach
      const shape = new T.Shape();
      shape.moveTo(-0.08, 0); shape.lineTo(b.d / 2, 0.75); shape.lineTo(b.d + 0.08, 0); shape.lineTo(-0.08, 0);
      const roofGeo = new T.ExtrudeGeometry(shape, { depth: b.w + 0.16, bevelEnabled: false });
      const roof = new T.Mesh(roofGeo, mat(b.roof, { rough: 0.9 }));
      roof.rotation.y = -Math.PI / 2;
      roof.position.set(b.x + b.w + 0.08, b.h, b.y - 0.0);
      roof.castShadow = true; roof.receiveShadow = true;
      roof.add(new T.LineSegments(new T.EdgesGeometry(roofGeo), edgeMat));
      g.add(roof);
      if (!b.decor) cyl(g, b.x + b.w * 0.75, b.y + b.d * 0.3, 0.1, b.h + 0.3, 0.6, '#5a3a28', { seg: 6 });
      // Fenster vorne und rechts
      const floors = Math.max(1, Math.floor(b.h / 1));
      for (let fl = 0; fl < floors; fl++) {
        for (let i = 0; i < b.w; i++) {
          if (b.door && fl === 0 && b.x + i === b.door.x) continue;
          const wm = box(g, b.x + i + 0.28, b.y + b.d, 0.44, 0.03, fl + 0.32, 0.5, '#9fc4d6', { emissive: 0xffb860, ei: 0, rough: 0.1, edges: false, cast: false });
          this.cityWindows.push(wm);
        }
        for (let j = 0; j < b.d; j++) {
          const wm = box(g, b.x + b.w, b.y + j + 0.28, 0.03, 0.44, fl + 0.32, 0.5, '#86aec2', { emissive: 0xffb860, ei: 0, rough: 0.1, edges: false, cast: false });
          this.cityWindows.push(wm);
        }
      }
      if (b.door) {
        box(g, b.door.x + 0.28, b.y + b.d, 0.44, 0.04, 0, 0.82, '#2a1d16', { edges: false });
        // Markise
        box(g, b.door.x + 0.1, b.y + b.d, 0.8, 0.35, 0.95, 0.05, b.id === 'home' ? '#c14b0c' : '#d4b06a', { edges: false });
        const label = b.id === 'home' ? this.w.s.name : b.sign;
        const sign = new T.Mesh(new T.PlaneGeometry(Math.min(2.4, b.w + 0.4), 0.42), new T.MeshStandardMaterial({ map: signTex(label, b.id === 'home' ? '#c14b0c' : '#f2ead9', b.id === 'home' ? '#fff3e0' : '#2a2520') }));
        sign.position.set(b.x + b.w / 2, Math.min(b.h - 0.25, 1.45), b.y + b.d + 0.04);
        g.add(sign);
      }
      grp.add(g);
    }

    tree(grp, x, z, s) {
      cyl(grp, x, z, 0.07 * s, 0, 0.8 * s, '#5a3a28', { seg: 6 });
      ball(grp, x, 1.0 * s, z, 0.42 * s, '#4f6b4a', { detail: 0 });
      ball(grp, x - 0.15 * s, 1.3 * s, z + 0.1 * s, 0.32 * s, '#5f7d55', { detail: 0 });
      ball(grp, x + 0.12 * s, 1.5 * s, z - 0.08 * s, 0.24 * s, '#6f8f60', { detail: 0 });
    }

    /* --- Licht nach Tageszeit --- */
    applyLight(tod) {
      const L = KL.todPreset(tod);
      const sky = lerpC(L.skyTop, L.skyBot, 0.55);
      this.scene.background = sky;
      this.scene.fog = new T.Fog(sky, 30, this.city ? 70 : 60);
      const day = clamp(1 - (tod - 0.55) / 0.35, 0, 1);
      this.sun.color = new T.Color(L.sun);
      this.sun.intensity = 0.15 + 2.4 * day;
      // Sonne tief von links (durch die Fenster), wandert mit der Zeit nach unten
      const elev = 0.25 + 0.55 * (1 - clamp(tod / 0.7, 0, 1));
      const cx = this.W / 2, cz = this.H / 2;
      const az = this.city ? 2.4 : 2.75;
      this.sun.position.set(cx + Math.cos(az) * 30, Math.sin(elev) * 30 + 2, cz + Math.sin(az) * 12 + (this.city ? -10 : 4));
      this.hemi.color = lerpC('#cfe2ff', '#3a4680', 1 - day);
      this.hemi.groundColor = lerpC('#7a5a3d', '#1d2244', 1 - day);
      this.hemi.intensity = 0.35 + 0.35 * day;
      this.lampLevel = clamp(L.lamps, 0, 1);
      this.r.toneMappingExposure = 0.95 + 0.25 * (1 - day);
    }

    /* --- Pro Frame --- */
    frame() {
      const w = this.w, s = w.s;
      if (Math.abs(w.tod - this.lastTod) > 0.004) { this.applyLight(w.tod); this.lastTod = w.tod; }
      const lamps = this.lampLevel;
      const styleLight = s.interior && s.interior.includes('licht');
      if (!this.city) {
        this.syncFurniture();
        const lv = Math.max(lamps, styleLight ? 0.45 : 0);
        this.lights.forEach((l) => (l.intensity = l === this.passLight ? 1.2 + lv * 1.5 : lv * 2.2));
        this.warm.intensity = lv * 1.3;
        this.flames.forEach((f, i) => { f.scale.setScalar(0.8 + Math.sin(w.t * 12 + i) * 0.15); f.material.emissiveIntensity = 0.6 + lv * 2.4; });
        this.shades.forEach((m) => (m.material.emissiveIntensity = lv * 1.4));
        this.windows.forEach((g) => (g.material.emissiveIntensity = lamps * 0.6));
        this.passLamps.forEach((m) => (m.material.emissiveIntensity = 0.8 + Math.sin(w.t * 3) * 0.1));
        if (this.sign) { this.sign.material.emissive = new T.Color(0xffffff); this.sign.material.emissiveMap = this.sign.material.map; this.sign.material.emissiveIntensity = lamps * 0.7; }
        // Teller auf Tischen und am Pass
        const sig = [...(w.platesOnTables || new Map()).entries()].join() + '|' + (w.passPlates || 0);
        if (sig !== this.plateSig) {
          this.plateSig = sig;
          if (this.plates) this.scene.remove(this.plates);
          this.plates = new T.Group();
          (w.platesOnTables || new Map()).forEach((n, id) => {
            const tp = this.tablePos && this.tablePos.get(id);
            if (!tp) return;
            for (let i = 0; i < n; i++) {
              const p = new T.Mesh(new T.CylinderGeometry(0.1, 0.08, 0.02, 14), mat('#ffffff', { rough: 0.3 }));
              const col = i % tp.w, side = i >= tp.w ? 1 : 0;
              p.position.set(tp.x - tp.w / 2 + col + 0.5, 0.48, tp.z + (side ? 0.15 : -0.15));
              const food = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), mat('#c14b0c'));
              food.position.y = 0.025; p.add(food);
              this.plates.add(p);
            }
          });
          const pass = KL.passItem(s);
          for (let i = 0; i < Math.min(6, w.passPlates || 0); i++) {
            const p = new T.Mesh(new T.CylinderGeometry(0.1, 0.08, 0.02, 14), mat('#ffffff', { rough: 0.3 }));
            p.position.set(pass.x + 0.3 + i * 0.28, 0.67, pass.y + 0.5);
            this.plates.add(p);
          }
          this.scene.add(this.plates);
        }
        // Funken aus dem Grill, Rauch
        if (Math.random() < 0.5) this.fireSpots.forEach(([x, z]) => w.emit(x, z, 0.9, 'fire'));
      } else {
        this.cityWindows.forEach((m) => (m.material.emissiveIntensity = lamps * 1.4));
        this.lanterns.forEach((m) => (m.material.emissiveIntensity = lamps * 3));
        this.warm.intensity = 0;
        this.cars.forEach((m, i) => { const c = w.cars[i]; m.position.set(c.x, 0, c.y); m.rotation.y = c.v > 0 ? 0 : Math.PI; });
        this.water.material.color.setHSL(0.56, 0.38, 0.38 + Math.sin(w.t * 1.5) * 0.02);
      }
      this.syncPeople();
      this.syncParticles();
      this.syncOverlays();
      if (this.controls) this.controls.update();
      this.r.render(this.scene, this.cam);
    }

    syncPeople() {
      const w = this.w;
      const seen = new Set();
      w.agents.forEach((a) => {
        let p = this.people.get(a);
        if (!p) {
          const look = a.kind === 'chef' ? { ...a.look, role: 'chef' } : a.look;
          p = { g: figure(look), lx: a.x, ly: a.y };
          this.people.set(a, p);
          this.scene.add(p.g);
        }
        seen.add(a);
        const g = p.g;
        g.visible = !a.hidden;
        let x = a.x, z = a.y, y = 0;
        if (a.seated && a.seat) {
          x = a.seat.x; z = a.seat.y;
          y = -0.1;
          g.rotation.y = a.seat.side === 'n' ? 0 : Math.PI;
          g.userData.legs.forEach((l) => (l.rotation.x = -1.3));
        } else {
          const dx = x - p.lx, dz = z - p.ly;
          if (Math.abs(dx) + Math.abs(dz) > 0.002) g.rotation.y = Math.atan2(dx, dz);
          const walk = a.walking || (a.path && a.path.length);
          const sw = walk ? Math.sin(w.t * 11 + (a.phase || 0)) * 0.6 : 0;
          g.userData.legs[0].rotation.x = sw; g.userData.legs[1].rotation.x = -sw;
          y = walk ? Math.abs(Math.sin(w.t * 11 + (a.phase || 0))) * 0.03 : 0;
          if (a.working) g.userData.torso.rotation.z = Math.sin(w.t * 14) * 0.05;
        }
        p.lx = a.x; p.ly = a.y;
        g.position.set(x, y, z);
        g.userData.plate.visible = !!a.carry;
        if (g.userData.ring) g.userData.ring.visible = w.player === a;
      });
      this.people.forEach((p, a) => { if (!seen.has(a)) { this.scene.remove(p.g); this.people.delete(a); } });
    }

    syncParticles() {
      const ps = this.w.particles;
      const n = Math.min(ps.length, 260);
      const col = new T.Color();
      for (let i = 0; i < 260; i++) {
        if (i < n) {
          const p = ps[i];
          this.pPos[i * 3] = p.x; this.pPos[i * 3 + 1] = p.z * 0.5; this.pPos[i * 3 + 2] = p.y;
          col.set(p.color);
          const a = clamp(p.life / p.max, 0, 1);
          this.pCol[i * 3] = col.r * a; this.pCol[i * 3 + 1] = col.g * a; this.pCol[i * 3 + 2] = col.b * a;
        } else { this.pPos[i * 3 + 1] = -50; }
      }
      this.pGeo.attributes.position.needsUpdate = true;
      this.pGeo.attributes.color.needsUpdate = true;
    }

    label(i, text, x, y, z, cls, color) {
      let el = this.labelPool[i];
      if (!el) { el = document.createElement('div'); this.labels.appendChild(el); this.labelPool[i] = el; }
      const v = new T.Vector3(x, y, z).project(this.cam);
      const sx = (v.x * 0.5 + 0.5) * this.sizeW, sy = (-v.y * 0.5 + 0.5) * this.sizeH;
      el.className = 'lbl ' + (cls || '');
      if (el.textContent !== text) el.textContent = text;
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      el.style.color = color || '';
      el.style.display = v.z < 1 ? '' : 'none';
      return el;
    }

    syncOverlays() {
      const w = this.w;
      let i = 0;
      w.bubbles.forEach((b) => { const el = this.label(i++, b.text, b.x, 1.5 + (1 - b.life / b.max) * 0.5, b.y, 'bubble', b.color); el.style.opacity = Math.min(1, b.life * 2); });
      if (this.city) w.agents.filter((a) => a.kind === 'npc').forEach((a) => (this.label(i++, KL.NPCS[a.npc].name, a.x, 1.2, a.y, 'name').style.opacity = 1));
      if (w.showNumbers && this.tablePos) this.tablePos.forEach((tp, id) => { const it = w.s.layout.find((x) => x.id === id); if (it && it.num) this.label(i++, String(it.num), tp.x, 0.95, tp.z, 'num').style.opacity = 1; });
      if (w.near && w.player && !(w.player.path && w.player.path.length)) {
        const t = w.near;
        const [x, z] = t.person ? [t.px, t.py] : [t.x + (t.w || 1) / 2, t.y + (t.d || 1) / 2];
        this.label(i++, `E · ${t.label}`, x, t.person ? 1.35 : (t.h ? t.h * 0.6 : 1.3), z, 'prompt').style.opacity = 1;
      }
      for (let k = i; k < this.labelPool.length; k++) this.labelPool[k].style.display = 'none';
      // Bau-Geist
      if (w.mode === 'build' && w.ghost && w.hover) {
        const f = KL.FURN[w.ghost.type];
        const err = KL.canPlace(w.s, w.ghost.type, w.hover.x, w.hover.y, w.ghost.ignore);
        this.ghost.visible = true;
        this.ghost.scale.set(f.w, 1, f.d);
        this.ghost.position.set(w.hover.x + f.w / 2, 0.04, w.hover.y + f.d / 2);
        this.ghost.material.color.set(err ? 0xef6a5a : 0x7cc495);
      } else this.ghost.visible = false;
      if (w.mode === 'build' && w.selected) {
        const it = w.selected, f = KL.FURN[it.type];
        this.selBox.visible = true; this.selBox.scale.set(f.w + 0.1, 1, f.d + 0.1);
        this.selBox.position.set(it.x + f.w / 2, 0.03, it.y + f.d / 2);
      } else this.selBox.visible = false;
    }
  }

  // WebGL verfügbar?
  KL.has3D = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  KL.View3D = View3D;
})();

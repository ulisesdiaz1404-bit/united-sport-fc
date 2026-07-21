/* ============================================================
   UNITED SPORT FC — Visor 3D de la camiseta (Three.js)
   Camiseta sobre un torso de maniquí real: cuerpo con pecho,
   hombros y cintura, mangas y cuello con volumen, cabeza gris.
   Frente: escudo · Espalda: GABRIEL 7. Arrastrá para girar 360°.
   ============================================================ */
(function () {
  'use strict';

  var visor = document.getElementById('kitVisor');
  if (!visor || !window.THREE) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PI = Math.PI;

  /* ---------- Perfil del torso (t: 0 dobladillo → 1 hombros) ---------- */
  var PROFILE = [
    /* t,     y,     rx,   rz  */
    [0.00, -1.30, 0.64, 0.30],
    [0.28, -0.58, 0.58, 0.27],
    [0.50, -0.05, 0.59, 0.27],
    [0.70, 0.52, 0.73, 0.33],
    [0.87, 0.90, 0.92, 0.33],
    [0.95, 1.05, 0.78, 0.30],
    [1.00, 1.14, 0.46, 0.23]
  ];
  function smoothstep(a) { return a * a * (3 - 2 * a); }
  function profile(t) {
    for (var i = 0; i < PROFILE.length - 1; i++) {
      var A = PROFILE[i], B = PROFILE[i + 1];
      if (t <= B[0] || i === PROFILE.length - 2) {
        var f = smoothstep((t - A[0]) / (B[0] - A[0] || 1));
        return {
          y: A[1] + (B[1] - A[1]) * f,
          rx: A[2] + (B[2] - A[2]) * f,
          rz: A[3] + (B[3] - A[3]) * f
        };
      }
    }
    return { y: PROFILE[0][1], rx: PROFILE[0][2], rz: PROFILE[0][3] };
  }

  /* Media superficie del torso (frente o espalda) con UV para textura */
  function buildTorsoHalf(th0, th1) {
    var HSEG = 54, ASEG = 40;
    var pos = [], uv = [], idx = [];
    for (var i = 0; i <= HSEG; i++) {
      var t = i / HSEG, p = profile(t);
      for (var j = 0; j <= ASEG; j++) {
        var a = th0 + (th1 - th0) * (j / ASEG);
        pos.push(p.rx * Math.sin(a), p.y, p.rz * Math.cos(a));
        uv.push(j / ASEG, t);
      }
    }
    for (i = 0; i < HSEG; i++) {
      for (j = 0; j < ASEG; j++) {
        var a0 = i * (ASEG + 1) + j, b0 = a0 + 1, c0 = a0 + (ASEG + 1), d0 = c0 + 1;
        idx.push(a0, c0, b0, b0, c0, d0);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* Cilindro/cono orientado de A a B (para mangas, cuello, brazos) */
  function tube(ax, ay, az, bx, by, bz, rBottom, rTop) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var h = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var geo = new THREE.CylinderGeometry(rTop, rBottom, h, 28, 1, false);
    var mesh = new THREE.Mesh(geo);
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx / h, dy / h, dz / h)
    );
    mesh.updateMatrix();
    geo.applyMatrix4(mesh.matrix);
    return geo;
  }

  /* ---------- Texturas de diseño (en espacio UV 0..1) ---------- */
  var CANW = 1024, CANH = 1200;
  function px(u) { return u * CANW; }
  function py(v) { return (1 - v) * CANH; }
  var COL_WHITE = '#f3f4f6', COL_BLACK = '#161616';

  function baseFabric(ctx) {
    ctx.fillStyle = COL_WHITE;
    ctx.fillRect(0, 0, CANW, CANH);
    /* paneles laterales negros (en los cantos = costuras del cuerpo) */
    ctx.fillStyle = COL_BLACK;
    ctx.fillRect(0, py(0.90), px(0.085), py(0) - py(0.90));
    ctx.fillRect(px(0.915), py(0.90), px(0.085), py(0) - py(0.90));
    /* cuello negro arriba */
    ctx.fillRect(0, 0, CANW, py(0.955));
  }

  function drawSwoosh(ctx, cu, cv, s) {
    ctx.save();
    ctx.translate(px(cu), py(cv));
    ctx.scale(px(s), px(s));
    ctx.fillStyle = COL_BLACK;
    ctx.beginPath();
    ctx.moveTo(-0.5, 0.16);
    ctx.bezierCurveTo(-0.1, -0.10, 0.28, -0.28, 0.52, -0.30);
    ctx.bezierCurveTo(0.30, -0.14, 0.06, 0.10, -0.16, 0.30);
    ctx.bezierCurveTo(-0.24, 0.36, -0.34, 0.34, -0.30, 0.22);
    ctx.bezierCurveTo(-0.26, 0.13, -0.16, 0.06, -0.02, 0.0);
    ctx.bezierCurveTo(-0.18, 0.05, -0.36, 0.12, -0.5, 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function buildFrontCanvas(shieldImg) {
    var c = document.createElement('canvas'); c.width = CANW; c.height = CANH;
    var ctx = c.getContext('2d');
    baseFabric(ctx);
    drawSwoosh(ctx, 0.5, 0.75, 0.12);
    if (shieldImg) {
      var w = px(0.30);
      var h = w * (shieldImg.naturalHeight / shieldImg.naturalWidth);
      ctx.drawImage(shieldImg, px(0.5) - w / 2, py(0.62) - h / 2, w, h);
    }
    return c;
  }

  function buildBackCanvas() {
    var c = document.createElement('canvas'); c.width = CANW; c.height = CANH;
    var ctx = c.getContext('2d');
    ctx.translate(CANW, 0); ctx.scale(-1, 1); /* espejo → texto legible desde atrás */
    baseFabric(ctx);
    ctx.fillStyle = COL_BLACK;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    /* nombre */
    ctx.font = '700 ' + px(0.075) + 'px "Barlow Condensed", sans-serif';
    ctx.fillText('G A B R I E L', px(0.5), py(0.80));
    /* número con doble contorno */
    var np = px(0.42);
    ctx.font = '400 ' + np + 'px "Anton", sans-serif';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL_BLACK; ctx.lineWidth = px(0.045); ctx.strokeText('7', px(0.5), py(0.55));
    ctx.strokeStyle = COL_WHITE; ctx.lineWidth = px(0.022); ctx.strokeText('7', px(0.5), py(0.55));
    ctx.fillStyle = COL_BLACK; ctx.fillText('7', px(0.5), py(0.55));
    return c;
  }

  /* ---------- Escena ---------- */
  var poster = visor.querySelector('.kit-cara');
  var canvas = document.createElement('canvas');
  canvas.className = 'kit-canvas';
  visor.insertBefore(canvas, visor.firstChild);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4f5c, 0.66));
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(2.5, 3, 4); scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-3.5, 0.6, 2.5); scene.add(fill);
  var rim = new THREE.DirectionalLight(0x9bb4ff, 0.5); rim.position.set(0, 1.5, -4); scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  var manMat = new THREE.MeshStandardMaterial({ color: 0xccd0d7, roughness: 0.95, metalness: 0 });
  var blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  var frontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  var backMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });

  /* torso (camiseta) — dos mitades */
  group.add(new THREE.Mesh(buildTorsoHalf(-PI / 2, PI / 2), frontMat));   /* frente (+z) */
  group.add(new THREE.Mesh(buildTorsoHalf(PI / 2, 3 * PI / 2), backMat));  /* espalda (−z) */

  /* mangas negras + brazos de maniquí */
  [1, -1].forEach(function (s) {
    group.add(new THREE.Mesh(tube(s * 0.60, 0.82, 0.0, s * 1.16, 0.52, 0.04, 0.30, 0.185), blackMat));
    group.add(new THREE.Mesh(tube(s * 1.16, 0.52, 0.04, s * 1.30, 0.24, 0.05, 0.17, 0.135), manMat));
  });

  /* cuello + cabeza de maniquí */
  group.add(new THREE.Mesh(tube(0, 1.00, 0, 0, 1.36, 0, 0.20, 0.165), manMat));
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 24), manMat);
  head.position.set(0, 1.62, 0); head.scale.set(1, 1.14, 1.02);
  group.add(head);

  /* cuello negro (borde de la camiseta) — anillo elíptico */
  var collar = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.045, 16, 40), blackMat);
  collar.rotation.x = PI / 2; collar.position.set(0, 1.05, 0); collar.scale.set(1.5, 0.78, 1);
  group.add(collar);

  function applyTexture(mat, canv) {
    var tex = new THREE.CanvasTexture(canv);
    if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    mat.map = tex; mat.needsUpdate = true;
  }

  applyTexture(backMat, buildBackCanvas());
  function paintFront(img) { applyTexture(frontMat, buildFrontCanvas(img)); if (poster) poster.style.display = 'none'; }

  function start() {
    var img = new Image();
    img.onload = function () { paintFront(img); };
    img.onerror = function () { paintFront(null); };
    img.src = 'assets/escudo-nuevo.png';
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 100px "Anton"'),
      document.fonts.load('700 100px "Barlow Condensed"')
    ]).then(start, start);
  } else { start(); }

  /* ---------- Encaje de cámara al bounding box ---------- */
  var box = new THREE.Box3().setFromObject(group);
  var size = box.getSize(new THREE.Vector3());
  var center = box.getCenter(new THREE.Vector3());
  group.position.y -= center.y; /* centrar verticalmente */
  var radius = 0.5 * Math.sqrt(size.x * size.x + size.y * size.y);

  function fit() {
    var w = visor.clientWidth, h = visor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var vFOV = camera.fov * PI / 180;
    var distH = radius / Math.tan(vFOV / 2);
    var distW = radius / Math.tan(vFOV / 2) / camera.aspect;
    camera.position.set(0, 0, Math.max(distH, distW) * 1.08);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(visor);
  else window.addEventListener('resize', fit);

  /* ---------- Interacción: arrastrar con inercia + giro automático ---------- */
  var rotY = -0.5, rotX = 0.02, velY = 0, velX = 0, dragging = false, lx = 0, ly = 0;
  var AUTO = reduceMotion ? 0 : 0.32;

  visor.addEventListener('pointerdown', function (e) {
    dragging = true; lx = e.clientX; ly = e.clientY; velY = velX = 0;
    visor.classList.add('tocado');
    if (visor.setPointerCapture) visor.setPointerCapture(e.pointerId);
  });
  visor.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    velY = dx * 0.010; velX = dy * 0.006;
    rotY += velY; rotX += velX;
    rotX = Math.max(-0.5, Math.min(0.5, rotX));
  });
  function release() { dragging = false; }
  visor.addEventListener('pointerup', release);
  visor.addEventListener('pointercancel', release);
  visor.addEventListener('pointerleave', release);

  var last = performance.now();
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.05); last = t;
    if (!dragging) {
      rotY += AUTO * dt + velY;
      rotX += velX;
      velY *= 0.93; velX *= 0.93;
      rotX += (0 - rotX) * 0.02;
      rotX = Math.max(-0.5, Math.min(0.5, rotX));
    }
    group.rotation.y = rotY;
    group.rotation.x = rotX;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

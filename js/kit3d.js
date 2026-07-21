/* ============================================================
   UNITED SPORT FC — Visor 3D de la camiseta (Three.js)
   Malla real extruida con volumen + iluminación + texturas
   de diseño (frente: escudo · espalda: GABRIEL 7). Girala 360°.
   ============================================================ */
(function () {
  'use strict';

  var visor = document.getElementById('kitVisor');
  if (!visor || !window.THREE) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Contorno de la camiseta (unidades de escena, y hacia arriba) ---------- */
  var CP = [
    [0.26, 1.14], [0.58, 1.10], [0.98, 0.95], [1.16, 0.74], [0.99, 0.54],
    [0.70, 0.63], [0.74, 0.05], [0.76, -0.60], [0.70, -1.22], [0.0, -1.28],
    [-0.70, -1.22], [-0.76, -0.60], [-0.74, 0.05], [-0.70, 0.63], [-0.99, 0.54],
    [-1.16, 0.74], [-0.98, 0.95], [-0.58, 1.10], [-0.26, 1.14], [0.0, 0.98]
  ];

  /* Catmull-Rom cerrado -> contorno suave */
  function smoothClosed(pts, perSeg) {
    var out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (var t = 0; t < perSeg; t++) {
        var s = t / perSeg, s2 = s * s, s3 = s2 * s;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3)
        ]);
      }
    }
    return out;
  }

  var CONTOUR = smoothClosed(CP, 9);

  /* bounding box del contorno */
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  CONTOUR.forEach(function (p) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  });
  var W = maxX - minX, H = maxY - minY;

  /* ---------- Texturas de diseño en canvas ---------- */
  var CANW = 1024, CANH = Math.round(CANW * H / W);
  function mapX(x) { return (x - minX) / W * CANW; }
  function mapY(y) { return (1 - (y - minY) / H) * CANH; }
  function u2px(u) { return u / W * CANW; } /* longitud en unidades -> px */

  var COL_WHITE = '#f3f4f6', COL_BLACK = '#141414', COL_RED = '#d21f2b';

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(mapX(pts[0][0]), mapY(pts[0][1]));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(mapX(pts[i][0]), mapY(pts[i][1]));
    ctx.closePath();
    ctx.fill();
  }

  /* mangas raglán + panel lateral + cuello (comunes a frente y espalda) */
  function baseFabric(ctx) {
    ctx.fillStyle = COL_WHITE;
    ctx.fillRect(0, 0, CANW, CANH);

    ctx.fillStyle = COL_BLACK;
    /* manga raglán derecha (llega hasta el cuello) */
    poly(ctx, [[0.28, 1.13], [0.46, 1.12], [0.60, 1.09], [0.98, 0.95], [1.16, 0.74], [0.99, 0.54], [0.70, 0.63], [0.40, 0.90]]);
    /* manga raglán izquierda */
    poly(ctx, [[-0.28, 1.13], [-0.46, 1.12], [-0.60, 1.09], [-0.98, 0.95], [-1.16, 0.74], [-0.99, 0.54], [-0.70, 0.63], [-0.40, 0.90]]);
    /* panel lateral derecho */
    poly(ctx, [[0.70, 0.60], [0.765, 0.02], [0.72, -1.20], [0.585, -1.18], [0.60, 0.02], [0.55, 0.58]]);
    /* panel lateral izquierdo */
    poly(ctx, [[-0.70, 0.60], [-0.765, 0.02], [-0.72, -1.20], [-0.585, -1.18], [-0.60, 0.02], [-0.55, 0.58]]);

    /* cuello negro */
    ctx.strokeStyle = COL_BLACK;
    ctx.lineWidth = u2px(0.075);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mapX(0.27), mapY(1.13));
    ctx.quadraticCurveTo(mapX(0), mapY(0.955), mapX(-0.27), mapY(1.13));
    ctx.stroke();
  }

  function drawSwoosh(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(mapX(cx), mapY(cy));
    ctx.scale(u2px(scale), u2px(scale));
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

  /* número con doble contorno (estilo del kit) */
  function drawNumber(ctx, txt, cx, cy, sizeUnits) {
    var px = u2px(sizeUnits);
    ctx.font = '400 ' + px + 'px "Anton", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    var x = mapX(cx), y = mapY(cy);
    ctx.strokeStyle = COL_BLACK; ctx.lineWidth = u2px(0.11); ctx.strokeText(txt, x, y);
    ctx.strokeStyle = COL_WHITE; ctx.lineWidth = u2px(0.055); ctx.strokeText(txt, x, y);
    ctx.fillStyle = COL_BLACK; ctx.fillText(txt, x, y);
  }

  function drawName(ctx, txt, cx, cy, sizeUnits) {
    var px = u2px(sizeUnits);
    ctx.font = '700 ' + px + 'px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COL_BLACK;
    var spaced = txt.split('').join(' ');
    ctx.fillText(spaced, mapX(cx), mapY(cy));
  }

  function buildFrontCanvas(shieldImg) {
    var c = document.createElement('canvas'); c.width = CANW; c.height = CANH;
    var ctx = c.getContext('2d');
    baseFabric(ctx);
    drawSwoosh(ctx, 0, 0.66, 0.34);
    if (shieldImg) {
      var wpx = u2px(0.5);
      var hpx = wpx * (shieldImg.naturalHeight / shieldImg.naturalWidth);
      ctx.drawImage(shieldImg, mapX(0) - wpx / 2, mapY(0.24) - hpx / 2, wpx, hpx);
    }
    return c;
  }

  function buildBackCanvas() {
    var c = document.createElement('canvas'); c.width = CANW; c.height = CANH;
    var ctx = c.getContext('2d');
    /* espejar en horizontal: al ver la espalda (cámara detrás) el texto queda legible */
    ctx.translate(CANW, 0); ctx.scale(-1, 1);
    baseFabric(ctx);
    drawName(ctx, 'GABRIEL', 0, 0.66, 0.19);
    drawNumber(ctx, '7', 0, 0.02, 1.05);
    return c;
  }

  /* ---------- Geometría 3D de la camiseta ---------- */
  function buildGeometry() {
    var shape = new THREE.Shape();
    shape.moveTo(CONTOUR[0][0], CONTOUR[0][1]);
    for (var i = 1; i < CONTOUR.length; i++) shape.lineTo(CONTOUR[i][0], CONTOUR[i][1]);
    shape.closePath();

    var uvGen = {
      generateTopUV: function (geometry, vertices, a, b, c) {
        var res = [];
        [a, b, c].forEach(function (idx) {
          var x = vertices[idx * 3], y = vertices[idx * 3 + 1];
          res.push(new THREE.Vector2((x - minX) / W, (y - minY) / H));
        });
        return res;
      },
      generateSideWallUV: function () {
        return [new THREE.Vector2(0, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)];
      }
    };

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.17, bevelEnabled: true, bevelThickness: 0.07,
      bevelSize: 0.055, bevelSegments: 4, steps: 1, curveSegments: 1, UVGenerator: uvGen
    });
    geo.center();

    /* nº de triángulos de una tapa */
    var F = THREE.ShapeUtils.triangulateShape(CONTOUR.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), []).length;
    var F3 = F * 3;

    var pos = geo.attributes.position.array;
    function avgZ(startVert, count) {
      var s = 0; for (var v = startVert; v < startVert + count; v++) s += pos[v * 3 + 2];
      return s / count;
    }
    var total = geo.attributes.position.count;
    geo.clearGroups();
    if (2 * F3 <= total) {
      var frontFirst = avgZ(0, F3) >= avgZ(F3, F3);
      geo.addGroup(0, F3, frontFirst ? 0 : 1);
      geo.addGroup(F3, F3, frontFirst ? 1 : 0);
      geo.addGroup(2 * F3, total - 2 * F3, 2);
    } else {
      geo.addGroup(0, total, 2);
    }
    return geo;
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
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x565b68, 0.62));
  var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(2.5, 3, 4); scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.42); fill.position.set(-3.5, 0.5, 2.5); scene.add(fill);
  var rim = new THREE.DirectionalLight(0x9bb4ff, 0.55); rim.position.set(0, 1.5, -4); scene.add(rim);

  var group = new THREE.Group();
  scene.add(group);

  var sideMat = new THREE.MeshStandardMaterial({ color: 0xe4e5e9, roughness: 0.92, metalness: 0 });
  var frontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
  var backMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
  var mesh = new THREE.Mesh(buildGeometry(), [frontMat, backMat, sideMat]);
  group.add(mesh);

  function applyTexture(mat, canv) {
    var tex = new THREE.CanvasTexture(canv);
    if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    mat.map = tex; mat.needsUpdate = true;
  }

  /* espalda ya se puede pintar; frente espera al escudo */
  applyTexture(backMat, buildBackCanvas());

  function paintFront(shieldImg) { applyTexture(frontMat, buildFrontCanvas(shieldImg)); if (poster) poster.style.display = 'none'; }

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

  /* ---------- Ajuste de tamaño ---------- */
  function fit() {
    var w = visor.clientWidth, h = visor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect;
    var vFOV = camera.fov * Math.PI / 180;
    var fitH = (H / 2) / Math.tan(vFOV / 2);
    var fitW = (W / 2) / Math.tan(vFOV / 2) / aspect;
    camera.position.z = Math.max(fitH, fitW) * 1.16;
    camera.updateProjectionMatrix();
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(visor);
  else window.addEventListener('resize', fit);

  /* ---------- Interacción: arrastrar con inercia + giro automático ---------- */
  var rotY = -0.5, rotX = 0.05, velY = 0, velX = 0, dragging = false, px = 0, py = 0;
  var AUTO = reduceMotion ? 0 : 0.35; /* rad/s */

  visor.addEventListener('pointerdown', function (e) {
    dragging = true; px = e.clientX; py = e.clientY; velY = velX = 0;
    visor.classList.add('tocado');
    if (visor.setPointerCapture) visor.setPointerCapture(e.pointerId);
  });
  visor.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    velY = dx * 0.010; velX = dy * 0.006;
    rotY += velY; rotX += velX;
    rotX = Math.max(-0.6, Math.min(0.6, rotX));
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
      rotX += (0 - rotX) * 0.02;            /* vuelve suave a la horizontal */
      rotX = Math.max(-0.6, Math.min(0.6, rotX));
    }
    group.rotation.y = rotY;
    group.rotation.x = rotX;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ============================================================
   UNITED SPORT FC — MVPs de la temporada
   Visor tipo showcase: la card activa va grande al centro y las
   vecinas asoman a los costados, más chicas y apagadas. Nunca se
   repite un premio. Avanza sola, se frena al pasar el mouse y se
   maneja con flechas, puntitos, teclado o deslizando el dedo.
   Los datos salen de Supabase (o del fallback local).
   ============================================================ */
(function(){
  'use strict';

  var ESCUDO = 'assets/escudo-nuevo.png';
  var LIGA = 'assets/liga/momcsl.jpg';
  var ESPERA = 5500;   // ms que queda quieta cada card

  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function menosMovimiento(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Los nombres se guardan como lista. Los premios viejos (un solo
     jugador en el campo "nombre") se siguen entendiendo igual. */
  function nombresDe(m){
    var lista = Array.isArray(m.nombres) ? m.nombres : String(m.nombre || '').split('\n');
    return lista.map(function(n){ return String(n || '').trim(); })
                .filter(function(n){ return n.length; });
  }

  function mvpHTML(m, i){
    var nombres = nombresDe(m);
    var varios = nombres.length > 1;
    var foto = m.foto || ESCUDO;
    var sinFoto = !m.foto;   // sin foto propia se usa el escudo, como en la placa de la defensa

    return '<article class="mvp' + (varios ? ' mvp-grupo' : '') + '" data-i="' + i + '">' +
      '<div class="mvp-top">' +
        '<div class="mvp-banda">' +
          (m.premio ? '<span class="mvp-premio">' + esc(m.premio) + '</span>' : '') +
          (m.subtitulo ? '<span class="mvp-sub">' + esc(m.subtitulo) + '</span>' : '') +
        '</div>' +
        '<div class="mvp-top-der">' +
          '<img class="mvp-liga" src="' + LIGA + '" alt="Liga MOMCSL" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<span class="mvp-rayas"></span>' +
        '</div>' +
      '</div>' +

      '<div class="mvp-marco' + (sinFoto ? ' sin-foto' : '') + '">' +
        '<div class="mvp-foto">' +
          '<img src="' + esc(foto) + '" alt="' + esc(nombres[0] || m.premio) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
        '</div>' +
      '</div>' +

      '<div class="mvp-abajo">' +
        '<div class="mvp-nombres">' +
          '<span class="mvp-flechas">&gt;&gt;&gt;</span>' +
          (m.etiqueta ? '<span class="mvp-etiqueta">' + esc(m.etiqueta) + ' :</span>' : '') +
          (nombres.length
            ? nombres.map(function(n){
                var num = (!varios && m.numero != null && m.numero !== '') ? '<b>#' + esc(m.numero) + '</b> ' : '';
                return '<span class="mvp-nombre">' + num + esc(n) + '</span>';
              }).join('')
            : '<span class="mvp-nombre">—</span>') +
        '</div>' +
        '<div class="mvp-club">' +
          '<span class="mvp-club-a">United</span>' +
          '<span class="mvp-club-b">Sport FC</span>' +
        '</div>' +
      '</div>' +
      (m.nota ? '<p class="mvp-nota">' + esc(m.nota) + '</p>' : '') +
    '</article>';
  }

  /* ---------- visor ---------- */
  var visor = {
    cont: null, escenario: null, cards: [], puntos: [],
    activo: 0, total: 0, reloj: null
  };

  function controlesHTML(total){
    var puntos = '';
    for (var i = 0; i < total; i++){
      puntos += '<button type="button" class="mvps-punto" data-mvp-a="' + i + '" aria-label="Premio ' + (i + 1) + '"></button>';
    }
    return '<div class="mvps-controles">' +
      '<button type="button" class="mvps-flecha" data-mvp-ir="-1" aria-label="Premio anterior">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<div class="mvps-puntos">' + puntos + '</div>' +
      '<button type="button" class="mvps-flecha" data-mvp-ir="1" aria-label="Premio siguiente">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg>' +
      '</button>' +
    '</div>';
  }

  /* Cada card se ubica según su distancia a la activa: 0 al centro,
     ±1 asomando a los costados, el resto fuera de escena. */
  function colocar(){
    var n = visor.total;
    visor.cards.forEach(function(card, i){
      var pos = i - visor.activo;
      if (pos > n / 2) pos -= n;
      if (pos < -n / 2) pos += n;
      card.dataset.pos = pos;
      card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      card.style.zIndex = String(10 - Math.abs(pos));
    });
    visor.puntos.forEach(function(p, i){
      p.classList.toggle('activo', i === visor.activo);
    });
    medir();
  }

  /* El escenario no tiene alto propio (las cards van absolutas): se lo
     damos con la más alta, así no salta al cambiar de premio. */
  function medir(){
    if (!visor.escenario) return;
    var alto = 0;
    visor.cards.forEach(function(c){ alto = Math.max(alto, c.offsetHeight); });
    if (alto) visor.escenario.style.height = alto + 'px';
  }

  function ir(paso){
    if (visor.total < 2) return;
    visor.activo = (visor.activo + paso + visor.total) % visor.total;
    colocar();
  }

  function arrancar(){
    parar();
    if (visor.total < 2 || menosMovimiento()) return;
    visor.reloj = setInterval(function(){ ir(1); }, ESPERA);
  }

  function parar(){
    if (visor.reloj){ clearInterval(visor.reloj); visor.reloj = null; }
  }

  function armarVisor(cont, lista){
    parar();
    cont.innerHTML =
      '<div class="mvps-escenario">' + lista.map(mvpHTML).join('') + '</div>' +
      (lista.length > 1 ? controlesHTML(lista.length) : '');

    visor.cont = cont;
    visor.escenario = cont.querySelector('.mvps-escenario');
    visor.cards = Array.prototype.slice.call(cont.querySelectorAll('.mvp'));
    visor.puntos = Array.prototype.slice.call(cont.querySelectorAll('.mvps-punto'));
    visor.total = visor.cards.length;
    visor.activo = 0;
    cont.classList.toggle('mvps-solo', visor.total < 2);

    colocar();
    // las fotos cambian el alto al terminar de cargar
    cont.querySelectorAll('img').forEach(function(img){
      img.addEventListener('load', medir);
    });
    arrancar();
  }

  /* ---------- controles ---------- */
  document.addEventListener('click', function(e){
    var cont = visor.cont;
    if (!cont || !cont.contains(e.target)) return;

    var flecha = e.target.closest('[data-mvp-ir]');
    if (flecha){ ir(parseInt(flecha.dataset.mvpIr, 10)); arrancar(); return; }

    var punto = e.target.closest('[data-mvp-a]');
    if (punto){ visor.activo = parseInt(punto.dataset.mvpA, 10); colocar(); arrancar(); return; }

    // tocar una card de al lado la trae al centro
    var card = e.target.closest('.mvp');
    if (card && card.dataset.pos !== '0'){
      visor.activo = parseInt(card.dataset.i, 10);
      colocar();
      arrancar();
    }
  });

  document.addEventListener('keydown', function(e){
    var cont = visor.cont;
    if (!cont || !cont.contains(document.activeElement)) return;
    if (e.key === 'ArrowLeft'){ ir(-1); arrancar(); }
    if (e.key === 'ArrowRight'){ ir(1); arrancar(); }
  });

  /* deslizar con el dedo */
  var arrastre = null;
  document.addEventListener('pointerdown', function(e){
    if (!visor.cont || !visor.cont.contains(e.target)) return;
    arrastre = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  document.addEventListener('pointerup', function(e){
    if (!arrastre) return;
    var dx = e.clientX - arrastre.x;
    var dy = e.clientY - arrastre.y;
    arrastre = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)){
      ir(dx < 0 ? 1 : -1);
      arrancar();
    }
  }, { passive: true });

  /* se frena mientras lo mirás */
  document.addEventListener('mouseenter', function(e){
    if (visor.cont && e.target === visor.cont) parar();
  }, true);
  document.addEventListener('mouseleave', function(e){
    if (visor.cont && e.target === visor.cont) arrancar();
  }, true);
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) parar(); else arrancar();
  });

  /* ---------- render ---------- */
  var ultimosDatos = null;

  function render(data){
    var seccion = document.getElementById('mvps');
    var cont = document.getElementById('gridMvps');
    var temporada = document.getElementById('mvpsTemporada');
    if (!seccion || !cont) return;

    ultimosDatos = data;
    var lista = (data && data.mvps) || [];
    var enNav = document.querySelector('.nav-links a[href="#mvps"]');

    if (!lista.length){
      parar();
      seccion.style.display = 'none';
      if (enNav && enNav.parentElement) enNav.parentElement.style.display = 'none';
      cont.innerHTML = '';
      visor.cont = null;
      return;
    }
    seccion.style.display = '';
    if (enNav && enNav.parentElement) enNav.parentElement.style.display = '';
    if (temporada) temporada.textContent = (data.temporada || '').trim() || 'Temporada';
    armarVisor(cont, lista);
  }

  var relojMedida = null;
  window.addEventListener('resize', function(){
    clearTimeout(relojMedida);
    relojMedida = setTimeout(medir, 200);
  }, { passive: true });

  // Render inmediato con el fallback local
  window.USFC.renderMvps = render;
  render(window.USFC.MVPS_DEFAULT);

  // Después intenta traer los premios guardados por el capitán.
  // window.USFC.listoMvps es una promesa que el panel espera antes de abrirse.
  window.USFC.listoMvps = fetch(window.USFC.MVPS_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(data){
      if (data && Array.isArray(data.mvps)){
        window.USFC.MVPS_ACTUAL = data;
        render(data);
      }
      return data;
    })
    .catch(function(){ return null; /* sin conexión o sin premios guardados: queda el fallback */ });
})();

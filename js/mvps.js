/* ============================================================
   UNITED SPORT FC — Render de los MVPs de la temporada
   Dibuja las cards de premios desde los datos (Supabase o
   fallback local). Si no hay premios cargados, la sección se
   esconde sola.
   ============================================================ */
(function(){
  'use strict';

  var ESCUDO = 'assets/escudo-nuevo.png';
  var LIGA = 'assets/liga/momcsl.jpg';

  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Los nombres se guardan como lista. Los premios viejos (un solo
     jugador en el campo "nombre") se siguen entendiendo igual. */
  function nombresDe(m){
    var lista = Array.isArray(m.nombres) ? m.nombres : String(m.nombre || '').split('\n');
    return lista.map(function(n){ return String(n || '').trim(); })
                .filter(function(n){ return n.length; });
  }

  function mvpHTML(m){
    var nombres = nombresDe(m);
    var varios = nombres.length > 1;
    var foto = m.foto || ESCUDO;
    var sinFoto = !m.foto;   // sin foto propia se usa el escudo, como en la placa de la defensa

    return '<article class="mvp' + (varios ? ' mvp-grupo' : '') + '">' +
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

  var VELOCIDAD = 55;      // píxeles por segundo del carrusel
  var ultimosDatos = null; // para poder redibujar al cambiar el ancho

  function menosMovimiento(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Marquesina infinita: como los premios son pocos, el set de cards se
     repite hasta pasar el ancho de la pantalla y después se duplica entero.
     La animación corre exactamente el largo de una vuelta (--vuelta), así
     el salto al reiniciar cae justo y no se nota el corte. */
  function armarCarrusel(carrusel, lista){
    var unSet = lista.map(mvpHTML).join('');
    carrusel.innerHTML = '<div class="mvps-pista"></div>';
    var pista = carrusel.firstChild;
    pista.innerHTML = unSet;

    if (menosMovimiento()){
      carrusel.classList.add('sin-animacion'); // queda como fila que se arrastra a mano
      return;
    }
    carrusel.classList.remove('sin-animacion');

    var ancho = carrusel.clientWidth || window.innerWidth;
    var vueltas = 1;
    while (pista.scrollWidth < ancho * 1.2 && vueltas < 12){
      pista.insertAdjacentHTML('beforeend', unSet);
      vueltas++;
    }

    // largo real de una vuelta = cards + separación (el margen del último cuenta)
    var tarjetas = pista.children;
    var separacion = tarjetas.length ? parseFloat(getComputedStyle(tarjetas[0]).marginRight) || 0 : 0;
    var vuelta = 0;
    for (var i = 0; i < tarjetas.length; i++) vuelta += tarjetas[i].offsetWidth + separacion;

    pista.insertAdjacentHTML('beforeend', pista.innerHTML);
    pista.style.setProperty('--vuelta', vuelta + 'px');
    pista.style.animationDuration = Math.max(12, Math.round(vuelta / VELOCIDAD)) + 's';
  }

  function render(data){
    var seccion = document.getElementById('mvps');
    var carrusel = document.getElementById('gridMvps');
    var temporada = document.getElementById('mvpsTemporada');
    if (!seccion || !carrusel) return;

    ultimosDatos = data;
    var lista = (data && data.mvps) || [];
    var enNav = document.querySelector('.nav-links a[href="#mvps"]');

    if (!lista.length){
      seccion.style.display = 'none';
      if (enNav && enNav.parentElement) enNav.parentElement.style.display = 'none';
      carrusel.innerHTML = '';
      return;
    }
    seccion.style.display = '';
    if (enNav && enNav.parentElement) enNav.parentElement.style.display = '';
    if (temporada) temporada.textContent = (data.temporada || '').trim() || 'Temporada';
    armarCarrusel(carrusel, lista);
  }

  /* Al cambiar el ancho hay que recalcular cuántas copias entran */
  var reloj = null, anchoPrevio = window.innerWidth;
  window.addEventListener('resize', function(){
    if (window.innerWidth === anchoPrevio) return; // en móvil la barra del navegador dispara resize de más
    anchoPrevio = window.innerWidth;
    clearTimeout(reloj);
    reloj = setTimeout(function(){ if (ultimosDatos) render(ultimosDatos); }, 250);
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

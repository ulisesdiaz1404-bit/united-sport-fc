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

    return '<article class="mvp reveal' + (varios ? ' mvp-grupo' : '') + '">' +
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

  var primerRender = true;

  function render(data){
    var seccion = document.getElementById('mvps');
    var grid = document.getElementById('gridMvps');
    var temporada = document.getElementById('mvpsTemporada');
    if (!seccion || !grid) return;

    var lista = (data && data.mvps) || [];
    var enNav = document.querySelector('.nav-links a[href="#mvps"]');

    if (!lista.length){
      seccion.style.display = 'none';
      if (enNav && enNav.parentElement) enNav.parentElement.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    seccion.style.display = '';
    if (enNav && enNav.parentElement) enNav.parentElement.style.display = '';
    if (temporada) temporada.textContent = (data.temporada || '').trim() || 'Temporada';
    grid.innerHTML = lista.map(mvpHTML).join('');

    /* El primer dibujado ocurre antes que el observer de main.js, así que las
       cards entran con la animación de scroll normal. Los siguientes (datos de
       Supabase o guardado desde el panel) ya no están observados: se muestran
       visibles a mano para que no queden invisibles. */
    if (!primerRender){
      grid.querySelectorAll('.reveal').forEach(function(el, i){
        el.style.transitionDelay = (i * 90) + 'ms';
        requestAnimationFrame(function(){ el.classList.add('visible'); });
      });
    }
    primerRender = false;
  }

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

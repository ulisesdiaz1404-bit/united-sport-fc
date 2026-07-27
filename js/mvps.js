/* ============================================================
   UNITED SPORT FC — Render de los MVPs de la temporada
   Dibuja las cards de premios desde los datos (Supabase o
   fallback local). Si no hay premios cargados, la sección se
   esconde sola.
   ============================================================ */
(function(){
  'use strict';

  var SILUETA = '<svg class="mvp-silueta" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z"/></svg>';

  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mvpHTML(m){
    var foto = m.foto ? '<img src="' + esc(m.foto) + '" alt="' + esc(m.nombre) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '';
    return '<article class="mvp reveal">' +
      '<span class="mvp-rayas"></span>' +
      '<div class="mvp-banda">' +
        (m.premio ? '<span class="mvp-premio">' + esc(m.premio) + '</span>' : '') +
        (m.subtitulo ? '<span class="mvp-sub">' + esc(m.subtitulo) + '</span>' : '') +
      '</div>' +
      '<div class="mvp-foto">' + SILUETA + foto + '</div>' +
      '<div class="mvp-pie">' +
        (m.numero != null && m.numero !== '' ? '<span class="mvp-num">#' + esc(m.numero) + '</span>' : '') +
        '<span class="mvp-nombre">' + (esc(m.nombre) || '—') + '</span>' +
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

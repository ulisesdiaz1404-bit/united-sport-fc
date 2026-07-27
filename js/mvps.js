/* ============================================================
   UNITED SPORT FC — MVPs de la temporada
   Cinta continua: las cards se desplazan hacia la izquierda, se
   desvanecen en el borde y vuelven a entrar por la derecha cuando
   les toca la vuelta. Hay UNA sola card por premio en el HTML, así
   que nunca se ve el mismo dos veces a la vez.
   Los datos salen de Supabase (o del fallback local).
   ============================================================ */
(function(){
  'use strict';

  var ESCUDO = 'assets/escudo-nuevo.png';
  var LIGA = 'assets/liga/momcsl.jpg';
  var VELOCIDAD = 62;   // píxeles por segundo del desplazamiento
  var SEPARACION = 64;  // aire entre una card y la siguiente

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

  /* ---------- cinta ---------- */
  var cinta = { cont: null, pista: null, cards: [] };

  /* Todas las cards corren la misma animación (de derecha a izquierda) y
     se escalonan con un retraso negativo: la 0 arranca recién entrando,
     la 1 ya avanzó un paso, y así. Como el recorrido total mide justo
     lo que ocupan todas juntas, cuando una sale por la izquierda la
     siguiente está entrando por la derecha — sin huecos ni repeticiones. */
  function acomodar(){
    var cards = cinta.cards;
    var n = cards.length;
    if (!n || !cinta.pista) return;

    var anchoCard = cards[0].offsetWidth || 340;
    var paso = anchoCard + SEPARACION;
    var recorrido = Math.max(paso * n, (cinta.cont.clientWidth || window.innerWidth) + paso);
    var ciclo = recorrido / VELOCIDAD;

    cinta.pista.style.setProperty('--recorrido', recorrido + 'px');
    cards.forEach(function(card, i){
      card.style.animationDuration = ciclo.toFixed(2) + 's';
      card.style.animationDelay = '-' + (ciclo * i / n).toFixed(2) + 's';
    });
    medir();
  }

  /* Las cards van absolutas, así que la pista no tiene alto propio:
     se lo damos con la más alta para que la sección no salte. */
  function medir(){
    if (!cinta.pista) return;
    var alto = 0;
    cinta.cards.forEach(function(c){ alto = Math.max(alto, c.offsetHeight); });
    if (alto) cinta.pista.style.height = alto + 'px';
  }

  function armarCinta(cont, lista){
    cont.innerHTML = '<div class="mvps-pista">' + lista.map(mvpHTML).join('') + '</div>';
    cinta.cont = cont;
    cinta.pista = cont.firstChild;
    cinta.cards = Array.prototype.slice.call(cont.querySelectorAll('.mvp'));
    cont.classList.toggle('mvps-solo', cinta.cards.length < 2 || menosMovimiento());

    acomodar();
    // las fotos cambian el alto al terminar de cargar
    cont.querySelectorAll('img').forEach(function(img){
      img.addEventListener('load', medir);
    });
  }

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
      seccion.style.display = 'none';
      if (enNav && enNav.parentElement) enNav.parentElement.style.display = 'none';
      cont.innerHTML = '';
      cinta.cont = null;
      cinta.cards = [];
      return;
    }
    seccion.style.display = '';
    if (enNav && enNav.parentElement) enNav.parentElement.style.display = '';
    if (temporada) temporada.textContent = (data.temporada || '').trim() || 'Temporada';
    armarCinta(cont, lista);
  }

  var relojMedida = null;
  window.addEventListener('resize', function(){
    clearTimeout(relojMedida);
    relojMedida = setTimeout(acomodar, 200);
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

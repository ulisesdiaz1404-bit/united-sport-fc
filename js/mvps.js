/* ============================================================
   UNITED SPORT FC — MVPs de la temporada
   Carrusel de una card por vez: la placa ocupa el centro, grande,
   y se desliza hacia la izquierda. El loop es infinito sin copias:
   al terminar cada paso la card que salió se manda al final de la
   fila y la pista vuelve a cero sin transición, así el salto no se
   ve. Nunca hay dos veces el mismo premio.
   Los datos salen de Supabase (o del fallback local).
   ============================================================ */
(function(){
  'use strict';

  var ESCUDO = 'assets/escudo-nuevo.png';
  var LIGA = 'assets/liga/momcsl.jpg';
  var ESPERA = 5200;   // ms que queda quieta cada card
  var PASO = 700;      // ms que dura el deslizamiento (igual que en el CSS)

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

  /* ---------- carrusel ---------- */
  var car = {
    cont: null, pista: null, puntos: [],
    total: 0, animando: false, reloj: null, pendientes: 0, rumbo: 1
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

  function alFrente(){
    var primero = car.pista && car.pista.firstElementChild;
    return primero ? parseInt(primero.dataset.i, 10) : 0;
  }

  function marcar(i){
    car.puntos.forEach(function(p, k){ p.classList.toggle('activo', k === i); });
  }

  /* Reordena la fila sin que se vea: apaga la transición, mueve el
     slide y fuerza un reflow antes de volver a encenderla. */
  function sinTransicion(fn){
    var p = car.pista;
    p.style.transition = 'none';
    fn();
    void p.offsetHeight;
    p.style.transition = '';
  }

  function avanzar(dir){
    var p = car.pista;
    if (!p || car.animando || car.total < 2) return;
    car.animando = true;

    // el que va a quedar al frente cuando termine el paso
    var proximo = dir > 0 ? p.children[1] : p.lastElementChild;
    marcar(parseInt(proximo.dataset.i, 10));

    var listo = false;
    function fin(e){
      if (e && e.propertyName && e.propertyName !== 'transform') return;
      if (listo) return;
      listo = true;
      p.removeEventListener('transitionend', fin);
      if (dir > 0){
        sinTransicion(function(){
          p.appendChild(p.firstElementChild);
          p.style.transform = 'translateX(0)';
        });
      }
      car.animando = false;
      seguirCadena();   // si el puntito pidió saltar varios, sigue el próximo paso
    }
    p.addEventListener('transitionend', fin);
    setTimeout(fin, PASO + 120);   // red de seguridad si no llega el transitionend

    if (dir > 0){
      p.style.transform = 'translateX(-100%)';
    } else {
      // el último pasa al principio y arrancamos corridos, para deslizar hacia la derecha
      sinTransicion(function(){
        p.insertBefore(p.lastElementChild, p.firstElementChild);
        p.style.transform = 'translateX(-100%)';
      });
      requestAnimationFrame(function(){ p.style.transform = 'translateX(0)'; });
    }
  }

  /* Los puntitos pueden pedir saltar varios premios: se encadenan pasos */
  function seguirCadena(){
    if (car.pendientes <= 0) return;
    car.pendientes--;
    avanzar(car.rumbo);
  }

  function irA(destino){
    if (car.animando || destino === alFrente()) return;
    var actual = alFrente();
    var haciaAdelante = (destino - actual + car.total) % car.total;
    var haciaAtras = (actual - destino + car.total) % car.total;
    car.rumbo = haciaAdelante <= haciaAtras ? 1 : -1;
    car.pendientes = Math.min(haciaAdelante, haciaAtras);
    seguirCadena();
  }

  function arrancar(){
    parar();
    if (car.total < 2 || menosMovimiento()) return;
    car.reloj = setInterval(function(){
      if (!car.animando && car.pendientes === 0) avanzar(1);
    }, ESPERA);
  }

  function parar(){
    if (car.reloj){ clearInterval(car.reloj); car.reloj = null; }
  }

  function armar(cont, lista){
    parar();
    cont.innerHTML =
      '<div class="mvps-marco-vista"><div class="mvps-pista">' +
        lista.map(function(m, i){
          return '<div class="mvps-slide" data-i="' + i + '">' + mvpHTML(m) + '</div>';
        }).join('') +
      '</div></div>' +
      (lista.length > 1 ? controlesHTML(lista.length) : '');

    car.cont = cont;
    car.pista = cont.querySelector('.mvps-pista');
    car.puntos = Array.prototype.slice.call(cont.querySelectorAll('.mvps-punto'));
    car.total = lista.length;
    car.animando = false;
    car.pendientes = 0;
    cont.classList.toggle('mvps-solo', car.total < 2);

    marcar(0);
    arrancar();
  }

  /* ---------- controles ---------- */
  document.addEventListener('click', function(e){
    if (!car.cont || !car.cont.contains(e.target)) return;

    var flecha = e.target.closest('[data-mvp-ir]');
    if (flecha){ avanzar(parseInt(flecha.dataset.mvpIr, 10)); arrancar(); return; }

    var punto = e.target.closest('[data-mvp-a]');
    if (punto){ irA(parseInt(punto.dataset.mvpA, 10)); arrancar(); }
  });

  document.addEventListener('keydown', function(e){
    if (!car.cont || !car.cont.contains(document.activeElement)) return;
    if (e.key === 'ArrowLeft'){ avanzar(-1); arrancar(); }
    if (e.key === 'ArrowRight'){ avanzar(1); arrancar(); }
  });

  /* deslizar con el dedo */
  var toque = null;
  document.addEventListener('pointerdown', function(e){
    if (!car.cont || !car.cont.contains(e.target)) return;
    toque = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  document.addEventListener('pointerup', function(e){
    if (!toque) return;
    var dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    toque = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)){
      avanzar(dx < 0 ? 1 : -1);
      arrancar();
    }
  }, { passive: true });

  /* se frena mientras lo mirás */
  document.addEventListener('mouseenter', function(e){
    if (car.cont && e.target === car.cont) parar();
  }, true);
  document.addEventListener('mouseleave', function(e){
    if (car.cont && e.target === car.cont) arrancar();
  }, true);
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) parar(); else arrancar();
  });

  /* ---------- render ---------- */
  function render(data){
    var seccion = document.getElementById('mvps');
    var cont = document.getElementById('gridMvps');
    var temporada = document.getElementById('mvpsTemporada');
    if (!seccion || !cont) return;

    var lista = (data && data.mvps) || [];
    var enNav = document.querySelector('.nav-links a[href="#mvps"]');

    if (!lista.length){
      parar();
      seccion.style.display = 'none';
      if (enNav && enNav.parentElement) enNav.parentElement.style.display = 'none';
      cont.innerHTML = '';
      car.cont = null;
      return;
    }
    seccion.style.display = '';
    if (enNav && enNav.parentElement) enNav.parentElement.style.display = '';
    if (temporada) temporada.textContent = (data.temporada || '').trim() || 'Temporada';
    armar(cont, lista);
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

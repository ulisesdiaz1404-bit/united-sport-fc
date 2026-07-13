/* ============================================================
   UNITED SPORT FC — Interacciones
   ============================================================ */
(function(){
  'use strict';

  /* Año actual en footer */
  document.getElementById('anio').textContent = new Date().getFullYear();

  /* Si falta assets/escudo.png, volver al escudo SVG placeholder (evita ícono roto) */
  document.querySelectorAll('img.hero-escudo, img.mini-escudo, img.escudo').forEach(function(img){
    img.addEventListener('error', function(){
      var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class', img.className);
      svg.setAttribute('viewBox','0 0 100 114');
      svg.innerHTML = '<use href="#escudo-usfc"/>';
      img.replaceWith(svg);
    });
  });

  /* Nav fija con fondo al hacer scroll */
  var nav = document.getElementById('nav');
  function actualizarNav(){ nav.classList.toggle('fija', window.scrollY > 40); }
  window.addEventListener('scroll', actualizarNav, {passive:true});
  actualizarNav();

  /* Menú móvil */
  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');
  burger.addEventListener('click', function(){
    burger.classList.toggle('abierto');
    links.classList.toggle('abierto');
  });
  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      burger.classList.remove('abierto');
      links.classList.remove('abierto');
    });
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Countdown al próximo partido — lee data-kickoff del .matchday (formato ISO) */
  var matchday = document.querySelector('.matchday[data-kickoff]');
  var cdCajas = {
    d: document.getElementById('cdDias'),
    h: document.getElementById('cdHoras'),
    m: document.getElementById('cdMin'),
    s: document.getElementById('cdSeg')
  };
  if (matchday && cdCajas.d){
    var kickoff = new Date(matchday.dataset.kickoff).getTime();
    var contenedorCd = document.getElementById('countdown');
    var vivo = document.getElementById('cdVivo');
    function pad(n){ return n < 10 ? '0' + n : '' + n; }
    function tictac(){
      var dif = kickoff - Date.now();
      if (isNaN(kickoff)) { contenedorCd.style.display = 'none'; return; }
      if (dif <= 0){
        /* partido en curso o ya jugado: mostrar cartel en vez de números */
        contenedorCd.style.display = 'none';
        vivo.style.display = 'block';
        return;
      }
      cdCajas.d.textContent = pad(Math.floor(dif / 86400000));
      cdCajas.h.textContent = pad(Math.floor(dif / 3600000) % 24);
      cdCajas.m.textContent = pad(Math.floor(dif / 60000) % 60);
      cdCajas.s.textContent = pad(Math.floor(dif / 1000) % 60);
      setTimeout(tictac, 1000);
    }
    tictac();
  }

  /* Reveal + stagger con Intersection Observer */
  var reveals = document.querySelectorAll('.reveal, .reveal-izq, .reveal-scale');
  if ('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entradas){
      entradas.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target;
        /* stagger: retraso según posición entre hermanos animados */
        var hermanos = el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal, :scope > .reveal-scale') : [];
        var i = Array.prototype.indexOf.call(hermanos, el);
        el.style.transitionDelay = (i > 0 ? i * 90 : 0) + 'ms';
        el.classList.add('visible');
        /* contador de goles dentro de la card */
        el.querySelectorAll('[data-goles]').forEach(animarGoles);
        io.unobserve(el);
      });
    }, {threshold:.18, rootMargin:'0px 0px -40px 0px'});
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    reveals.forEach(function(el){ el.classList.add('visible'); });
    document.querySelectorAll('[data-goles]').forEach(function(el){
      el.textContent = el.dataset.goles;
    });
  }

  /* Marcadores animados: cuentan de 0 al resultado final */
  function animarGoles(el){
    var fin = parseInt(el.dataset.goles, 10);
    if (isNaN(fin)) return;
    if (fin === 0){ el.textContent = '0'; return; }
    var dur = 900, inicio = null;
    function paso(t){
      if (!inicio) inicio = t;
      var p = Math.min((t - inicio) / dur, 1);
      p = 1 - Math.pow(1 - p, 3); /* ease-out cúbico */
      el.textContent = Math.round(p * fin);
      if (p < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  /* Parallax: franjas del hero + textos gigantes de fondo */
  var capas = document.querySelectorAll('[data-parallax]');
  if (capas.length && !reduceMotion){
    var tick = false;
    function parallax(){
      capas.forEach(function(el){
        var rect = el.parentElement.getBoundingClientRect();
        var v = parseFloat(el.dataset.parallax) || .2;
        el.style.transform =
          (el.classList.contains('hero-franja') ? 'rotate(-14deg) ' : '') +
          'translateY(' + (rect.top * -v) + 'px)';
      });
      tick = false;
    }
    window.addEventListener('scroll', function(){
      if (!tick){ requestAnimationFrame(parallax); tick = true; }
    }, {passive:true});
    parallax();
  }

  /* Lightbox de la galería: click para ampliar, flechas y Esc */
  var fotos = Array.prototype.slice.call(document.querySelectorAll('.grid-galeria .foto img'));
  var lightbox = document.getElementById('lightbox');
  if (fotos.length && lightbox){
    var lbImg = document.getElementById('lbImg');
    var lbContador = document.getElementById('lbContador');
    var actual = 0;

    function abrir(i){
      actual = i;
      mostrar();
      lightbox.classList.add('abierto');
      document.body.style.overflow = 'hidden';
    }
    function cerrar(){
      lightbox.classList.remove('abierto');
      document.body.style.overflow = '';
    }
    function mostrar(){
      var img = fotos[actual];
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbContador.textContent = (actual + 1) + ' / ' + fotos.length;
    }
    function mover(paso){
      actual = (actual + paso + fotos.length) % fotos.length;
      mostrar();
    }

    fotos.forEach(function(img, i){
      img.closest('.foto').addEventListener('click', function(){ abrir(i); });
    });
    document.getElementById('lbCerrar').addEventListener('click', cerrar);
    document.getElementById('lbPrev').addEventListener('click', function(e){ e.stopPropagation(); mover(-1); });
    document.getElementById('lbNext').addEventListener('click', function(e){ e.stopPropagation(); mover(1); });
    lightbox.addEventListener('click', function(e){
      if (e.target === lightbox) cerrar();
    });
    document.addEventListener('keydown', function(e){
      if (!lightbox.classList.contains('abierto')) return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowRight') mover(1);
    });
  }
})();

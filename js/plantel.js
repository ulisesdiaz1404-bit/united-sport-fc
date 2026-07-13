/* ============================================================
   UNITED SPORT FC — Render del plantel
   Dibuja la formación y el banco desde los datos (Supabase o
   fallback local). El capitán lleva la "C" dorada.
   ============================================================ */
(function(){
  'use strict';

  var SILUETA = '<svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z"/></svg>';

  function fotoHTML(j, claseNum){
    var img = j.foto ? '<img src="' + j.foto + '" alt="" onerror="this.style.display=\'none\'">' : '';
    var num = j.rol === 'dt'
      ? '<span class="jugador-num dt">DT</span>'
      : '<span class="jugador-num' + (claseNum || '') + '">' + (j.numero != null ? j.numero : '') + '</span>';
    var c = j.capitan ? '<span class="badge-c" title="Capitán">C</span>' : '';
    return '<div class="foto-wrap"><div class="jugador-foto">' + SILUETA + img + '</div>' + num + c + '</div>';
  }

  function jugadorHTML(j){
    return '<div class="jugador reveal visible">' + fotoHTML(j) +
      '<span class="jugador-nombre">' + j.nombre + (j.capitan ? ' <span class="c-inline">(C)</span>' : '') + '</span>' +
      '<span class="jugador-pos">' + j.posicion + '</span></div>';
  }

  function suplenteHTML(j){
    return '<div class="suplente reveal visible">' + fotoHTML(j) +
      '<div class="sup-info"><span class="jugador-nombre">' + j.nombre + (j.capitan ? ' <span class="c-inline">(C)</span>' : '') + '</span>' +
      '<span class="jugador-pos">' + j.posicion + '</span></div></div>';
  }

  function render(data){
    var lineas = document.getElementById('lineas');
    var banco = document.getElementById('banco');
    var badge = document.getElementById('formacionBadge');
    if (!lineas || !banco) return;

    var js = data.jugadores || [];
    var ataque  = js.filter(function(j){ return j.linea === 'ataque'; });
    var medio   = js.filter(function(j){ return j.linea === 'medio'; });
    var defensa = js.filter(function(j){ return j.linea === 'defensa'; });
    var arquero = js.filter(function(j){ return j.linea === 'arquero'; });
    var supl    = js.filter(function(j){ return j.linea === 'suplente'; });
    var dt      = js.filter(function(j){ return j.rol === 'dt'; });

    if (badge) badge.textContent = defensa.length + '-' + medio.length + '-' + ataque.length;

    var html = '';
    [ataque, medio, defensa, arquero].forEach(function(linea){
      if (!linea.length) return;
      html += '<div class="linea">' + linea.map(jugadorHTML).join('') + '</div>';
    });
    lineas.innerHTML = html;

    banco.innerHTML = supl.map(suplenteHTML).join('') + dt.map(suplenteHTML).join('');
  }

  // Render inmediato con el fallback local
  window.USFC.renderPlantel = render;
  render(window.USFC.PLANTEL_DEFAULT);

  // Después intenta traer el plantel guardado por el capitán
  fetch(window.USFC.PLANTEL_URL + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(data){
      if (data && data.jugadores && data.jugadores.length){
        window.USFC.PLANTEL_ACTUAL = data;
        render(data);
      }
    })
    .catch(function(){ /* sin conexión o sin datos: queda el fallback */ });
})();

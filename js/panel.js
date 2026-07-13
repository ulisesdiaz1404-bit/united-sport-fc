/* ============================================================
   UNITED SPORT FC — Panel del Capitán
   Se abre entrando a la web con #panel (ej: unitedsport.com/#panel).
   Permite editar formación, nombres, números, fotos y elegir
   quién lleva la cinta de capitán (C).
   ============================================================ */
(function(){
  'use strict';

  var LINEAS = [
    ['arquero', 'Arquero'],
    ['defensa', 'Defensa'],
    ['medio', 'Mediocampo'],
    ['ataque', 'Ataque'],
    ['suplente', 'Suplente']
  ];

  var estado = null;        // copia editable del plantel
  var fotosNuevas = {};     // id -> dataURL (se suben al guardar)
  var root = null;
  var passVal = '';         // la contraseña sobrevive a los re-dibujados

  // Si la página se abre desde el archivo local (file://), igual guarda en la web
  var API = (location.protocol === 'https:' || location.protocol === 'http:')
    ? '/api/plantel'
    : 'https://united-sport-fc.vercel.app/api/plantel';

  function clonar(x){ return JSON.parse(JSON.stringify(x)); }

  function datosActuales(){
    return clonar(window.USFC.PLANTEL_ACTUAL || window.USFC.PLANTEL_DEFAULT);
  }

  /* ---------- armado del panel ---------- */
  function abrir(){
    if (!root){
      root = document.createElement('div');
      root.id = 'panelCapitan';
      root.className = 'panel-capitan';
      document.body.appendChild(root);
    }
    estado = estado || datosActuales();
    dibujar();
    root.classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }

  function cerrar(){
    if (root) root.classList.remove('abierto');
    document.body.style.overflow = '';
    if (location.hash === '#panel'){
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function filaHTML(j, i){
    var esDT = j.rol === 'dt';
    var opciones = LINEAS.map(function(l){
      return '<option value="' + l[0] + '"' + (j.linea === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
    }).join('');
    var foto = (fotosNuevas[j.id]) || j.foto || '';
    return '<div class="pc-fila" data-i="' + i + '">' +
      '<button type="button" class="pc-foto" data-accion="foto" title="Cambiar foto">' +
        (foto ? '<img src="' + foto + '" alt="" onerror="this.remove()">' : '') +
        '<span class="pc-foto-mas">📷</span>' +
      '</button>' +
      '<div class="pc-campos">' +
        '<input class="pc-nombre" data-campo="nombre" value="' + (j.nombre || '').replace(/"/g, '&quot;') + '" placeholder="Nombre">' +
        '<div class="pc-sub">' +
          (esDT ? '<span class="pc-dt-tag">DT</span>' :
            '<input class="pc-num" data-campo="numero" type="number" min="1" max="99" value="' + (j.numero != null ? j.numero : '') + '" placeholder="#">') +
          '<input class="pc-pos" data-campo="posicion" value="' + (j.posicion || '').replace(/"/g, '&quot;') + '" placeholder="Posición">' +
          (esDT ? '' : '<select class="pc-linea" data-campo="linea">' + opciones + '</select>') +
        '</div>' +
      '</div>' +
      '<div class="pc-acciones">' +
        (esDT ? '' :
          '<label class="pc-c' + (j.capitan ? ' activo' : '') + '" title="Capitán">' +
            '<input type="radio" name="capitan" data-accion="capitan"' + (j.capitan ? ' checked' : '') + '>C</label>' +
          '<button type="button" class="pc-mover" data-accion="subir" title="Subir">▲</button>' +
          '<button type="button" class="pc-mover" data-accion="bajar" title="Bajar">▼</button>' +
          '<button type="button" class="pc-borrar" data-accion="borrar" title="Quitar">✕</button>') +
      '</div>' +
    '</div>';
  }

  function dibujar(){
    var filas = estado.jugadores.map(filaHTML).join('');
    root.innerHTML =
      '<div class="pc-caja">' +
        '<div class="pc-cabecera">' +
          '<h3>Panel del Capitán</h3>' +
          '<button type="button" class="pc-cerrar" data-accion="cerrar">✕</button>' +
        '</div>' +
        '<p class="pc-ayuda">Editá nombre, número, posición y línea de cada jugador. La formación se arma sola según cuántos pongas en defensa / medio / ataque. Marcá la <b>C</b> para elegir al capitán. Los cambios se publican al guardar.</p>' +
        '<div class="pc-lista">' + filas + '</div>' +
        '<button type="button" class="pc-agregar" data-accion="agregar">+ Agregar jugador</button>' +
        '<div class="pc-pie">' +
          '<input type="password" id="pcPass" placeholder="Contraseña del capitán" autocomplete="current-password" value="' + passVal.replace(/"/g, '&quot;') + '">' +
          '<button type="button" class="pc-guardar" data-accion="guardar">Guardar y publicar</button>' +
        '</div>' +
        '<p class="pc-msj" id="pcMsj"></p>' +
      '</div>';
  }

  function msj(texto, esError){
    var el = document.getElementById('pcMsj');
    if (el){
      el.textContent = texto;
      el.className = 'pc-msj' + (esError ? ' error' : ' ok');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ---------- foto: elegir archivo y achicar a 400px ---------- */
  function elegirFoto(j){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(){
      var f = input.files && input.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function(){
        var lado = 400;
        var canvas = document.createElement('canvas');
        canvas.width = lado; canvas.height = lado;
        var ctx = canvas.getContext('2d');
        var s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
        fotosNuevas[j.id] = canvas.toDataURL('image/jpeg', .82);
        URL.revokeObjectURL(img.src);
        dibujar();
      };
      img.src = URL.createObjectURL(f);
    };
    input.click();
  }

  /* ---------- guardar ---------- */
  function guardar(){
    var campo = document.getElementById('pcPass');
    var pass = (campo && campo.value) || passVal || '';
    if (!pass){ msj('Poné la contraseña del capitán (el campo de acá abajo).', true); return; }
    passVal = pass;
    msj('Guardando…');
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass, data: estado, fotos: fotosNuevas })
    })
    .then(function(r){
      return r.json()
        .then(function(b){ return { ok: r.ok, status: r.status, b: b }; })
        .catch(function(){ return { ok: false, status: r.status, b: {} }; });
    })
    .then(function(res){
      if (!res.ok){
        msj((res.b.error || 'Error al guardar') + ' (HTTP ' + res.status + ')', true);
        return;
      }
      window.USFC.PLANTEL_ACTUAL = res.b.data;
      estado = clonar(res.b.data);
      fotosNuevas = {};
      window.USFC.renderPlantel(res.b.data);
      dibujar();
      msj('✔ Publicado. Ya se ve en la web.');
    })
    .catch(function(e){ msj('No se pudo conectar con el servidor: ' + e.message, true); });
  }

  /* ---------- eventos (delegados) ---------- */
  document.addEventListener('click', function(e){
    if (!root || !root.classList.contains('abierto')) return;
    var boton = e.target.closest('[data-accion]');
    if (!boton) return;
    var accion = boton.dataset.accion;
    var fila = boton.closest('.pc-fila');
    var i = fila ? parseInt(fila.dataset.i, 10) : -1;
    var j = i >= 0 ? estado.jugadores[i] : null;

    if (accion === 'cerrar'){ cerrar(); return; }
    if (accion === 'guardar'){ guardar(); return; }
    if (accion === 'agregar'){
      estado.jugadores.splice(estado.jugadores.length - 1, 0, {
        id: 'j' + Date.now(), nombre: '', numero: null, posicion: 'Jugador',
        linea: 'suplente', rol: 'suplente', foto: '', capitan: false
      });
      dibujar();
      return;
    }
    if (!j) return;
    if (accion === 'foto') elegirFoto(j);
    if (accion === 'borrar'){ estado.jugadores.splice(i, 1); dibujar(); }
    if (accion === 'subir' && i > 0){
      estado.jugadores.splice(i - 1, 0, estado.jugadores.splice(i, 1)[0]); dibujar();
    }
    if (accion === 'bajar' && i < estado.jugadores.length - 1){
      estado.jugadores.splice(i + 1, 0, estado.jugadores.splice(i, 1)[0]); dibujar();
    }
  });

  document.addEventListener('input', function(e){
    if (e.target && e.target.id === 'pcPass') passVal = e.target.value;
  });

  document.addEventListener('change', function(e){
    if (!root || !root.classList.contains('abierto')) return;
    var fila = e.target.closest('.pc-fila');
    if (!fila) return;
    var j = estado.jugadores[parseInt(fila.dataset.i, 10)];
    if (!j) return;
    if (e.target.dataset.accion === 'capitan'){
      estado.jugadores.forEach(function(x){ x.capitan = false; });
      j.capitan = true;
      dibujar();
      return;
    }
    var campo = e.target.dataset.campo;
    if (!campo) return;
    if (campo === 'numero') j.numero = e.target.value === '' ? null : parseInt(e.target.value, 10);
    else j[campo] = e.target.value;
    if (campo === 'linea') j.rol = (e.target.value === 'suplente') ? 'suplente' : 'titular';
  });

  /* ---------- apertura por hash ---------- */
  function chequearHash(){
    if (location.hash === '#panel') abrir();
    else if (root) cerrar();
  }
  window.addEventListener('hashchange', chequearHash);
  chequearHash();
})();

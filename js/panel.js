/* ============================================================
   UNITED SPORT FC — Panel del Capitán
   Se abre entrando a la web con #panel (ej: unitedsport.com/#panel).
   Dos pestañas:
   · Plantel — los jugadores se arrastran (⠿) entre líneas para
     armar la formación. Máximo 11 en cancha, un solo arquero y
     números únicos. La C marca al capitán.
   · MVPs — los premios de la temporada (premio, jugador, número,
     foto y nota). Se ordenan con ↑ ↓.
   Cada pestaña se guarda por separado.
   ============================================================ */
(function(){
  'use strict';

  var GRUPOS = [
    ['arquero', 'Arquero'],
    ['defensa', 'Defensa'],
    ['medio', 'Mediocampo'],
    ['ataque', 'Ataque'],
    ['suplente', 'Suplentes']
  ];
  var LINEAS_CANCHA = ['arquero', 'defensa', 'medio', 'ataque'];

  var estado = null;        // copia editable del plantel
  var fotosNuevas = {};     // id -> dataURL (se suben al guardar)
  var estadoMvps = null;    // copia editable de los MVPs
  var fotosMvps = {};       // id -> dataURL
  var tab = 'plantel';      // pestaña abierta: 'plantel' | 'mvps'
  var root = null;
  var passVal = '';         // la contraseña sobrevive a los re-dibujados

  // Si la página se abre desde el archivo local (file://), igual guarda en la web
  var BASE = (location.protocol === 'https:' || location.protocol === 'http:')
    ? ''
    : 'https://united-sport-fc.vercel.app';
  var API = BASE + '/api/plantel';
  var API_MVPS = BASE + '/api/mvps';

  function clonar(x){ return JSON.parse(JSON.stringify(x)); }

  function datosActuales(){
    return clonar(window.USFC.PLANTEL_ACTUAL || window.USFC.PLANTEL_DEFAULT);
  }

  function datosMvps(){
    var d = clonar(window.USFC.MVPS_ACTUAL || window.USFC.MVPS_DEFAULT || {});
    if (!Array.isArray(d.mvps)) d.mvps = [];
    if (typeof d.temporada !== 'string') d.temporada = '';
    return d;
  }

  function buscarMvp(id){
    for (var k = 0; k < estadoMvps.mvps.length; k++){
      if (estadoMvps.mvps[k].id === id) return estadoMvps.mvps[k];
    }
    return null;
  }

  function buscar(id){
    for (var k = 0; k < estado.jugadores.length; k++){
      if (estado.jugadores[k].id === id) return estado.jugadores[k];
    }
    return null;
  }

  function titulares(){
    return estado.jugadores.filter(function(j){
      return j.rol !== 'dt' && LINEAS_CANCHA.indexOf(j.linea) !== -1;
    });
  }

  function numerosRepetidos(){
    var vistos = {}, repes = [];
    estado.jugadores.forEach(function(j){
      if (j.rol === 'dt' || j.numero == null) return;
      if (vistos[j.numero] && repes.indexOf(j.numero) === -1) repes.push(j.numero);
      vistos[j.numero] = true;
    });
    return repes;
  }

  /* ---------- apertura / cierre ---------- */
  var sucio = false;      // plantel con cambios sin guardar
  var sucioMvps = false;  // MVPs con cambios sin guardar

  function abrir(){
    if (!root){
      root = document.createElement('div');
      root.id = 'panelCapitan';
      root.className = 'panel-capitan';
      document.body.appendChild(root);
    }
    root.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    root.innerHTML = '<div class="pc-caja"><p class="pc-ayuda">Cargando datos…</p></div>';

    // Esperar los datos guardados antes de mostrar (si no, aparecerían los de fábrica)
    Promise.all([
      window.USFC.listo || Promise.resolve(null),
      window.USFC.listoMvps || Promise.resolve(null)
    ]).then(function(){
      if (!sucio || !estado) estado = datosActuales();
      if (!sucioMvps || !estadoMvps) estadoMvps = datosMvps();
      dibujar();
    });
  }

  function cerrar(){
    if (root) root.classList.remove('abierto');
    document.body.style.overflow = '';
    if (location.hash === '#panel'){
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  /* ---------- armado del panel ---------- */
  function filaHTML(j){
    var esDT = j.rol === 'dt';
    var foto = (fotosNuevas[j.id]) || j.foto || '';
    return '<div class="pc-fila' + (esDT ? ' pc-fila-dt' : '') + '" data-id="' + j.id + '">' +
      (esDT ? '' : '<span class="pc-handle" title="Arrastrar para mover">⠿</span>') +
      '<button type="button" class="pc-foto" data-accion="foto" title="Cambiar foto">' +
        (foto ? '<img src="' + foto + '" alt="" onerror="this.remove()">' : '') +
        '<span class="pc-foto-mas">📷</span>' +
      '</button>' +
      '<div class="pc-campos">' +
        '<input class="pc-nombre" data-campo="nombre" value="' + (j.nombre || '').replace(/"/g, '&quot;') + '" placeholder="Nombre">' +
        '<div class="pc-sub">' +
          (esDT ? '<span class="pc-dt-tag">' + (/director/i.test(j.posicion||'') ? 'DT' : 'CT') + '</span>' :
            '<input class="pc-num" data-campo="numero" type="number" min="1" max="99" value="' + (j.numero != null ? j.numero : '') + '" placeholder="#">') +
          '<input class="pc-pos" data-campo="posicion" value="' + (j.posicion || '').replace(/"/g, '&quot;') + '" placeholder="Posición">' +
        '</div>' +
      '</div>' +
      '<div class="pc-acciones">' +
        (esDT ? '<button type="button" class="pc-borrar" data-accion="borrar" title="Quitar">✕</button>' :
          '<label class="pc-c' + (j.capitan ? ' activo' : '') + '" title="Capitán">' +
            '<input type="radio" name="capitan" data-accion="capitan"' + (j.capitan ? ' checked' : '') + '>C</label>' +
          '<button type="button" class="pc-borrar" data-accion="borrar" title="Quitar">✕</button>') +
      '</div>' +
    '</div>';
  }

  function grupoHTML(linea, titulo){
    var js = estado.jugadores.filter(function(j){ return j.linea === linea && j.rol !== 'dt'; });
    return '<div class="pc-grupo" data-linea="' + linea + '">' +
      '<p class="pc-grupo-titulo">' + titulo + ' <span class="pc-grupo-n">' + js.length + '</span></p>' +
      '<div class="pc-grupo-lista">' + js.map(filaHTML).join('') + '</div>' +
    '</div>';
  }

  /* ---------- pestaña MVPs ---------- */
  function nombresTexto(m){
    var lista = Array.isArray(m.nombres) ? m.nombres : String(m.nombre || '').split('\n');
    return lista.map(function(n){ return String(n || '').trim(); })
                .filter(function(n){ return n.length; })
                .join('\n');
  }

  function mvpFilaHTML(m, i, total){
    var foto = (fotosMvps[m.id]) || m.foto || '';
    function v(x){ return String(x == null ? '' : x).replace(/"/g, '&quot;'); }
    function t(x){ return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    return '<div class="pc-fila pc-mvp-fila" data-mvp="' + m.id + '">' +
      '<button type="button" class="pc-foto" data-accion="mvpfoto" title="Cambiar foto (sin foto se usa el escudo)">' +
        (foto ? '<img src="' + foto + '" alt="" onerror="this.remove()">' : '') +
        '<span class="pc-foto-mas">📷</span>' +
        (foto ? '<span class="pc-foto-quitar" data-accion="mvpsinfoto" title="Quitar la foto y usar el escudo">✕</span>' : '') +
      '</button>' +
      '<div class="pc-campos">' +
        '<input class="pc-nombre pc-premio" data-mvpcampo="premio" value="' + v(m.premio) + '" placeholder="Premio (ej: Best Defense)">' +
        '<input class="pc-nombre" data-mvpcampo="subtitulo" value="' + v(m.subtitulo) + '" placeholder="Bajada (ej: of the Season)">' +
        '<div class="pc-sub">' +
          '<input class="pc-num" data-mvpcampo="numero" type="number" min="1" max="99" value="' + v(m.numero) + '" placeholder="#">' +
          '<input class="pc-pos" data-mvpcampo="etiqueta" value="' + v(m.etiqueta) + '" placeholder="Rótulo de la lista (ej: Defense)">' +
        '</div>' +
        '<textarea class="pc-nombres" data-mvpcampo="nombres" rows="3" placeholder="Jugador (uno por línea si son varios)">' + t(nombresTexto(m)) + '</textarea>' +
        '<input class="pc-nombre" data-mvpcampo="nota" value="' + v(m.nota) + '" placeholder="Nota opcional (ej: 12 vallas invictas)">' +
      '</div>' +
      '<div class="pc-acciones">' +
        '<button type="button" class="pc-mover" data-accion="mvparriba" title="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="pc-mover" data-accion="mvpabajo" title="Bajar"' + (i === total - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="pc-borrar" data-accion="mvpborrar" title="Quitar">✕</button>' +
      '</div>' +
    '</div>';
  }

  function cuerpoMvpsHTML(){
    var lista = estadoMvps.mvps || [];
    return '<p class="pc-ayuda">Cada card es un premio. Poné el <b>premio</b> (banda blanca), la <b>bajada</b> (banda roja) y los jugadores: <b>uno por línea</b> si el premio es de varios (ej: la defensa). El <b>#</b> solo se muestra cuando hay un único jugador. Foto vacía = se usa el <b>escudo del club</b>. Ordená con <b>↑ ↓</b>. Si borrás todos, la sección desaparece de la web.</p>' +
      '<div class="pc-temporada">' +
        '<label for="pcTemporada">Temporada</label>' +
        '<input id="pcTemporada" data-mvpmeta="temporada" value="' + String(estadoMvps.temporada || '').replace(/"/g, '&quot;') + '" placeholder="Spring 2026">' +
      '</div>' +
      '<div class="pc-lista">' +
        (lista.length
          ? lista.map(function(m, i){ return mvpFilaHTML(m, i, lista.length); }).join('')
          : '<p class="pc-vacio">Todavía no hay premios cargados. Agregá el primero acá abajo.</p>') +
      '</div>' +
      '<div class="pc-agregar-fila">' +
        '<button type="button" class="pc-agregar" data-accion="mvpagregar">+ Agregar premio</button>' +
      '</div>';
  }

  function cuerpoPlantelHTML(){
    var dt = estado.jugadores.filter(function(j){ return j.rol === 'dt'; });
    return '<p class="pc-ayuda">Agarrá el <b>⠿</b> y arrastrá al jugador a la línea donde querés que juegue (o a Suplentes). Máximo <b>11 en cancha</b> y un solo arquero. Marcá la <b>C</b> para el capitán. Números no repetidos. Tocá la foto para cambiarla.</p>' +
      '<div class="pc-lista">' +
        GRUPOS.map(function(g){ return grupoHTML(g[0], g[1]); }).join('') +
        '<div class="pc-grupo" data-linea="dt"><p class="pc-grupo-titulo">Cuerpo Técnico</p><div class="pc-grupo-lista">' + dt.map(filaHTML).join('') + '</div></div>' +
      '</div>' +
      '<div class="pc-agregar-fila">' +
        '<button type="button" class="pc-agregar" data-accion="agregar">+ Agregar jugador</button>' +
        '<button type="button" class="pc-agregar" data-accion="agregarct">+ Agregar cuerpo técnico</button>' +
      '</div>';
  }

  function dibujar(){
    var nTit = titulares().length;
    var contador = tab === 'plantel'
      ? '<span class="pc-contador' + (nTit > 11 ? ' exceso' : (nTit === 11 ? ' completo' : '')) + '">En cancha: ' + nTit + '/11</span>'
      : '<span class="pc-contador">Premios: ' + (estadoMvps.mvps || []).length + '</span>';
    root.innerHTML =
      '<div class="pc-caja">' +
        '<div class="pc-cabecera">' +
          '<h3>Panel del Capitán</h3>' +
          contador +
          '<button type="button" class="pc-cerrar" data-accion="cerrar">✕</button>' +
        '</div>' +
        '<div class="pc-tabs">' +
          '<button type="button" class="pc-tab' + (tab === 'plantel' ? ' activo' : '') + '" data-accion="tab" data-tab="plantel">Plantel</button>' +
          '<button type="button" class="pc-tab' + (tab === 'mvps' ? ' activo' : '') + '" data-accion="tab" data-tab="mvps">MVPs</button>' +
        '</div>' +
        (tab === 'plantel' ? cuerpoPlantelHTML() : cuerpoMvpsHTML()) +
        '<div class="pc-pie">' +
          '<input type="password" id="pcPass" placeholder="Contraseña del capitán" autocomplete="current-password" value="' + passVal.replace(/"/g, '&quot;') + '">' +
          '<button type="button" class="pc-guardar" data-accion="guardar">Guardar y publicar</button>' +
        '</div>' +
        '<p class="pc-msj" id="pcMsj"></p>' +
      '</div>';
    if (tab === 'plantel') marcarNumerosRepetidos();
  }

  function marcarNumerosRepetidos(){
    var repes = numerosRepetidos();
    root.querySelectorAll('.pc-num').forEach(function(inp){
      var v = inp.value === '' ? null : parseInt(inp.value, 10);
      inp.classList.toggle('pc-error', v != null && repes.indexOf(v) !== -1);
    });
  }

  function msj(texto, esError){
    var el = document.getElementById('pcMsj');
    if (el){
      el.textContent = texto;
      el.className = 'pc-msj' + (esError ? ' error' : ' ok');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ---------- drag & drop (mouse + dedo) ---------- */
  var drag = null; // { j, fila, ghost }
  var ultimoDestino = null; // último grupo válido resaltado durante el arrastre

  function puntoDestino(x, y){
    var el = document.elementFromPoint(x, y);
    if (!el) return null;
    var grupo = el.closest ? el.closest('.pc-grupo') : null;
    if (!grupo || grupo.dataset.linea === 'dt') return null;
    var fila = el.closest('.pc-fila');
    return { grupo: grupo, linea: grupo.dataset.linea, fila: (fila && fila !== drag.fila) ? fila : null };
  }

  function moverEnDatos(j, linea, beforeId){
    var arr = estado.jugadores;
    arr.splice(arr.indexOf(j), 1);
    j.linea = linea;
    j.rol = (linea === 'suplente') ? 'suplente' : 'titular';
    var idx = -1;
    if (beforeId){
      for (var k = 0; k < arr.length; k++){ if (arr[k].id === beforeId){ idx = k; break; } }
    }
    if (idx === -1){
      var ultimo = -1;
      arr.forEach(function(x, k){ if (x.linea === linea && x.rol !== 'dt') ultimo = k; });
      idx = ultimo >= 0 ? ultimo + 1 : arr.length - 1; // si el grupo está vacío, antes del DT
      if (idx < 0) idx = 0;
    }
    arr.splice(idx, 0, j);
  }

  document.addEventListener('pointerdown', function(e){
    if (!root || !root.classList.contains('abierto')) return;
    var handle = e.target.closest('.pc-handle');
    if (!handle) return;
    e.preventDefault();
    var fila = handle.closest('.pc-fila');
    var j = buscar(fila.dataset.id);
    if (!j) return;

    var ghost = fila.cloneNode(true);
    ghost.className = 'pc-fila pc-ghost';
    ghost.style.width = fila.offsetWidth + 'px';
    document.body.appendChild(ghost);
    fila.classList.add('arrastrando');
    drag = { j: j, fila: fila, ghost: ghost };
    moverGhost(e.clientX, e.clientY);
  });

  function moverGhost(x, y){
    drag.ghost.style.left = (x - 30) + 'px';
    drag.ghost.style.top = (y - drag.ghost.offsetHeight / 2) + 'px';
  }

  document.addEventListener('pointermove', function(e){
    if (!drag) return;
    e.preventDefault();
    moverGhost(e.clientX, e.clientY);

    // autoscroll de la lista cuando el dedo llega arriba/abajo
    var lista = root.querySelector('.pc-lista');
    var r = lista.getBoundingClientRect();
    if (e.clientY < r.top + 70) lista.scrollTop -= 14;
    else if (e.clientY > r.bottom - 70) lista.scrollTop += 14;

    root.querySelectorAll('.pc-grupo').forEach(function(g){ g.classList.remove('destino'); });
    var d = puntoDestino(e.clientX, e.clientY);
    if (d){ d.grupo.classList.add('destino'); ultimoDestino = d; }
  }, { passive: false });

  document.addEventListener('pointerup', function(e){
    if (!drag) return;
    var d = puntoDestino(e.clientX, e.clientY) || ultimoDestino;
    var j = drag.j;
    drag.ghost.remove();
    drag.fila.classList.remove('arrastrando');
    root.querySelectorAll('.pc-grupo').forEach(function(g){ g.classList.remove('destino'); });
    drag = null;
    ultimoDestino = null;
    if (!d) return;

    // reglas: máx 11 en cancha, un solo arquero
    var esACancha = LINEAS_CANCHA.indexOf(d.linea) !== -1;
    var yaEnCancha = LINEAS_CANCHA.indexOf(j.linea) !== -1;
    if (esACancha && !yaEnCancha && titulares().length >= 11){
      msj('Ya hay 11 en cancha. Sacá uno antes de meter otro.', true);
      return;
    }
    if (d.linea === 'arquero' && j.linea !== 'arquero' &&
        estado.jugadores.some(function(x){ return x.linea === 'arquero' && x.rol !== 'dt'; })){
      msj('Solo puede haber un arquero en cancha.', true);
      return;
    }

    sucio = true;
    moverEnDatos(j, d.linea, d.fila ? d.fila.dataset.id : null);
    dibujar();
  });

  /* ---------- foto: elegir archivo y recortar ----------
     Plantel: cuadrada de 400px (las fichas son redondas).
     MVPs: vertical 4:5 de 800x1000, igual que la card de la placa
     (una foto de cuerpo entero no se corta la cabeza ni los pies). */
  function elegirFoto(j, mapa, esMvp){
    mapa = mapa || fotosNuevas;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(){
      var f = input.files && input.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function(){
        var ancho = esMvp ? 800 : 400;
        var alto = esMvp ? 1000 : 400;
        var canvas = document.createElement('canvas');
        canvas.width = ancho; canvas.height = alto;
        var ctx = canvas.getContext('2d');
        // recorte centrado que respeta la proporción de destino
        var prop = ancho / alto;
        var w = img.width, h = img.height;
        if (w / h > prop) w = h * prop; else h = w / prop;
        ctx.drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, ancho, alto);
        mapa[j.id] = canvas.toDataURL('image/jpeg', .82);
        if (esMvp) sucioMvps = true; else sucio = true;
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

    if (tab === 'mvps'){ guardarMvps(pass); return; }

    var nTit = titulares().length;
    if (nTit > 11){ msj('Hay ' + nTit + ' en cancha y el máximo es 11.', true); return; }
    var repes = numerosRepetidos();
    if (repes.length){ msj('Números repetidos: ' + repes.join(', ') + '. Cada jugador tiene que tener un número distinto.', true); return; }

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
      sucio = false;
      window.USFC.renderPlantel(res.b.data);
      dibujar();
      msj('✔ Publicado. Ya se ve en la web.');
    })
    .catch(function(e){ msj('No se pudo conectar con el servidor: ' + e.message, true); });
  }

  function guardarMvps(pass){
    var sinTitulo = (estadoMvps.mvps || []).filter(function(m){
      return !String(m.premio || '').trim() && !String(m.subtitulo || '').trim();
    });
    if (sinTitulo.length){ msj('Hay ' + sinTitulo.length + ' premio(s) sin título. Completá al menos la línea del premio.', true); return; }

    msj('Guardando…');
    fetch(API_MVPS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass, data: estadoMvps, fotos: fotosMvps })
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
      window.USFC.MVPS_ACTUAL = res.b.data;
      estadoMvps = clonar(res.b.data);
      fotosMvps = {};
      sucioMvps = false;
      window.USFC.renderMvps(res.b.data);
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

    if (accion === 'cerrar'){ cerrar(); return; }
    if (accion === 'guardar'){ guardar(); return; }
    if (accion === 'tab'){
      if (tab !== boton.dataset.tab){ tab = boton.dataset.tab; dibujar(); }
      return;
    }
    if (accion === 'mvpagregar'){
      sucioMvps = true;
      estadoMvps.mvps.push({
        id: 'm' + Date.now(), premio: '', subtitulo: 'of the Season',
        etiqueta: '', nombres: [], numero: null, nota: '', foto: ''
      });
      dibujar();
      return;
    }

    // acciones sobre una card de MVP
    var filaMvp = boton.closest('.pc-mvp-fila');
    if (filaMvp){
      var m = buscarMvp(filaMvp.dataset.mvp);
      if (!m) return;
      var i = estadoMvps.mvps.indexOf(m);
      if (accion === 'mvpfoto'){ elegirFoto(m, fotosMvps, true); return; }
      if (accion === 'mvpsinfoto'){
        sucioMvps = true;
        m.foto = '';
        delete fotosMvps[m.id];
        dibujar();
        return;
      }
      if (accion === 'mvpborrar'){
        sucioMvps = true;
        estadoMvps.mvps.splice(i, 1);
        dibujar();
        return;
      }
      if (accion === 'mvparriba' && i > 0){
        sucioMvps = true;
        estadoMvps.mvps.splice(i - 1, 0, estadoMvps.mvps.splice(i, 1)[0]);
        dibujar();
        return;
      }
      if (accion === 'mvpabajo' && i < estadoMvps.mvps.length - 1){
        sucioMvps = true;
        estadoMvps.mvps.splice(i + 1, 0, estadoMvps.mvps.splice(i, 1)[0]);
        dibujar();
        return;
      }
      return;
    }

    if (accion === 'agregarct'){
      sucio = true;
      estado.jugadores.push({
        id: 'ct' + Date.now(), nombre: '', numero: null, posicion: 'Ayudante Técnico',
        linea: 'dt', rol: 'dt', foto: '', capitan: false
      });
      dibujar();
      return;
    }
    if (accion === 'agregar'){
      var idx = estado.jugadores.length;
      for (var k = 0; k < estado.jugadores.length; k++){ if (estado.jugadores[k].rol === 'dt'){ idx = k; break; } }
      sucio = true;
      estado.jugadores.splice(idx, 0, {
        id: 'j' + Date.now(), nombre: '', numero: null, posicion: 'Jugador',
        linea: 'suplente', rol: 'suplente', foto: '', capitan: false
      });
      dibujar();
      return;
    }

    var fila = boton.closest('.pc-fila');
    var j = fila ? buscar(fila.dataset.id) : null;
    if (!j) return;
    if (accion === 'foto') elegirFoto(j);
    if (accion === 'borrar'){
      sucio = true;
      estado.jugadores.splice(estado.jugadores.indexOf(j), 1);
      dibujar();
    }
  });

  document.addEventListener('input', function(e){
    if (e.target && e.target.id === 'pcPass') passVal = e.target.value;
  });

  document.addEventListener('change', function(e){
    if (!root || !root.classList.contains('abierto')) return;

    // pestaña MVPs
    if (e.target.dataset && e.target.dataset.mvpmeta === 'temporada'){
      sucioMvps = true;
      estadoMvps.temporada = e.target.value;
      return;
    }
    var filaMvp = e.target.closest('.pc-mvp-fila');
    if (filaMvp){
      var m = buscarMvp(filaMvp.dataset.mvp);
      var campoMvp = e.target.dataset.mvpcampo;
      if (!m || !campoMvp) return;
      sucioMvps = true;
      if (campoMvp === 'numero'){
        m.numero = e.target.value === '' ? null : parseInt(e.target.value, 10);
      } else if (campoMvp === 'nombres'){
        m.nombres = e.target.value.split('\n')
          .map(function(n){ return n.trim(); })
          .filter(function(n){ return n.length; });
        delete m.nombre;
      } else {
        m[campoMvp] = e.target.value;
      }
      return;
    }

    var fila = e.target.closest('.pc-fila');
    if (!fila) return;
    var j = buscar(fila.dataset.id);
    if (!j) return;
    if (e.target.dataset.accion === 'capitan'){
      sucio = true;
      estado.jugadores.forEach(function(x){ x.capitan = false; });
      j.capitan = true;
      dibujar();
      return;
    }
    var campo = e.target.dataset.campo;
    if (!campo) return;
    sucio = true;
    if (campo === 'numero'){
      j.numero = e.target.value === '' ? null : parseInt(e.target.value, 10);
      marcarNumerosRepetidos();
      var repes = numerosRepetidos();
      if (j.numero != null && repes.indexOf(j.numero) !== -1){
        msj('Ojo: el número ' + j.numero + ' ya está usado.', true);
      }
    } else {
      j[campo] = e.target.value;
    }
  });

  /* ---------- apertura por hash ---------- */
  function chequearHash(){
    if (location.hash === '#panel') abrir();
    else if (root) cerrar();
  }
  window.addEventListener('hashchange', chequearHash);
  chequearHash();
})();

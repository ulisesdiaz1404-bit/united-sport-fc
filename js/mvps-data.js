/* ============================================================
   UNITED SPORT FC — Datos de los MVPs de la temporada
   Los premios "vivos" se guardan en Supabase Storage (los carga
   el capitán desde /#panel → pestaña MVPs). Esto es el fallback
   si no hay conexión o todavía no se guardó nada.

   Cada premio:
     premio     línea blanca de arriba  (ej: GOALKEEPER)
     subtitulo  línea roja              (ej: of the Season)
     etiqueta   rótulo de la lista      (ej: DEFENSE → "DEFENSE :")
     nombres    uno o varios jugadores
     numero     se muestra solo si hay un único jugador
     foto       si está vacía se usa el escudo del club
   ============================================================ */
window.USFC = window.USFC || {};

window.USFC.MVPS_URL = 'https://vpzxshalexnrwjtclubw.supabase.co/storage/v1/object/public/united-sport/mvps.json';

window.USFC.MVPS_DEFAULT = {
  temporada: 'Spring 2026',
  mvps: [
    {
      id: 'm1', premio: 'Goalkeeper', subtitulo: 'of the Season', etiqueta: '',
      nombres: ['[JUGADOR]'], numero: 1, nota: '',
      foto: 'assets/jugadores/persona-01.jpg'
    },
    {
      id: 'm2', premio: 'Best Defense', subtitulo: 'of the Season', etiqueta: 'Defense',
      nombres: ['[JUGADOR]', '[JUGADOR]', '[JUGADOR]', '[JUGADOR]'], numero: null, nota: '',
      foto: ''
    },
    {
      id: 'm3', premio: 'Player', subtitulo: 'of the Season', etiqueta: '',
      nombres: ['[JUGADOR]'], numero: 10, nota: '',
      foto: 'assets/jugadores/persona-10.jpg'
    }
  ]
};

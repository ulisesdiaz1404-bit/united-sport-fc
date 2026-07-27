/* ============================================================
   UNITED SPORT FC — Datos de los MVPs de la temporada
   Los premios "vivos" se guardan en Supabase Storage (los carga
   el capitán desde /#panel → pestaña MVPs). Esto es el fallback
   si no hay conexión o todavía no se guardó nada.
   ============================================================ */
window.USFC = window.USFC || {};

window.USFC.MVPS_URL = 'https://vpzxshalexnrwjtclubw.supabase.co/storage/v1/object/public/united-sport/mvps.json';

window.USFC.MVPS_DEFAULT = {
  temporada: 'Spring 2026',
  mvps: [
    { id: 'm1', premio: 'Goalkeeper', subtitulo: 'of the Season', nombre: '[JUGADOR]', numero: 1,  nota: '', foto: 'assets/jugadores/persona-01.jpg' },
    { id: 'm2', premio: 'Player',     subtitulo: 'of the Season', nombre: '[JUGADOR]', numero: 10, nota: '', foto: 'assets/jugadores/persona-10.jpg' },
    { id: 'm3', premio: 'Goleador',   subtitulo: 'of the Season', nombre: '[JUGADOR]', numero: 9,  nota: '', foto: 'assets/jugadores/persona-09.jpg' }
  ]
};

/* ============================================================
   UNITED SPORT FC — Datos del plantel
   El plantel "vivo" se guarda en Supabase Storage (lo edita el
   capitán desde /#panel). Esto es el fallback si no hay conexión.
   ============================================================ */
window.USFC = {
  PLANTEL_URL: 'https://vpzxshalexnrwjtclubw.supabase.co/storage/v1/object/public/united-sport/plantel.json',

  PLANTEL_DEFAULT: {
    jugadores: [
      { id: 'p7',  nombre: '[JUGADOR]',  numero: 7,  posicion: 'Extremo Izq.',   linea: 'ataque',   rol: 'titular',  foto: 'assets/jugadores/persona-07.jpg', capitan: false },
      { id: 'p9',  nombre: '[JUGADOR]',  numero: 9,  posicion: 'Delantero',      linea: 'ataque',   rol: 'titular',  foto: 'assets/jugadores/persona-09.jpg', capitan: false },
      { id: 'p11', nombre: '[JUGADOR]',  numero: 11, posicion: 'Extremo Der.',   linea: 'ataque',   rol: 'titular',  foto: 'assets/jugadores/persona-11.jpg', capitan: false },
      { id: 'p8',  nombre: '[JUGADOR]',  numero: 8,  posicion: 'Volante',        linea: 'medio',    rol: 'titular',  foto: 'assets/jugadores/persona-08.jpg', capitan: false },
      { id: 'p5',  nombre: '[JUGADOR]',  numero: 5,  posicion: 'Volante Central',linea: 'medio',    rol: 'titular',  foto: 'assets/jugadores/persona-05.jpg', capitan: false },
      { id: 'p10', nombre: '[JUGADOR]',  numero: 10, posicion: 'Enganche',       linea: 'medio',    rol: 'titular',  foto: 'assets/jugadores/persona-10.jpg', capitan: true },
      { id: 'p3',  nombre: '[JUGADOR]',  numero: 3,  posicion: 'Lateral Izq.',   linea: 'defensa',  rol: 'titular',  foto: 'assets/jugadores/persona-03.jpg', capitan: false },
      { id: 'p6',  nombre: '[JUGADOR]',  numero: 6,  posicion: 'Central',        linea: 'defensa',  rol: 'titular',  foto: 'assets/jugadores/persona-06.jpg', capitan: false },
      { id: 'p4',  nombre: '[JUGADOR]',  numero: 4,  posicion: 'Central',        linea: 'defensa',  rol: 'titular',  foto: 'assets/jugadores/persona-04.jpg', capitan: false },
      { id: 'p2',  nombre: '[JUGADOR]',  numero: 2,  posicion: 'Lateral Der.',   linea: 'defensa',  rol: 'titular',  foto: 'assets/jugadores/persona-02.jpg', capitan: false },
      { id: 'p1',  nombre: '[JUGADOR]',  numero: 1,  posicion: 'Arquero',        linea: 'arquero',  rol: 'titular',  foto: 'assets/jugadores/persona-01.jpg', capitan: false },
      { id: 's12', nombre: '[SUPLENTE]', numero: 12, posicion: 'Arquero',        linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-12.jpg', capitan: false },
      { id: 's13', nombre: '[SUPLENTE]', numero: 13, posicion: 'Defensor',       linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-13.jpg', capitan: false },
      { id: 's14', nombre: '[SUPLENTE]', numero: 14, posicion: 'Mediocampista',  linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-14.jpg', capitan: false },
      { id: 's15', nombre: '[SUPLENTE]', numero: 15, posicion: 'Mediocampista',  linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-15.jpg', capitan: false },
      { id: 's16', nombre: '[SUPLENTE]', numero: 16, posicion: 'Delantero',      linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-16.jpg', capitan: false },
      { id: 's17', nombre: '[SUPLENTE]', numero: 17, posicion: 'Jugador',        linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-17.jpg', capitan: false },
      { id: 's18', nombre: '[SUPLENTE]', numero: 18, posicion: 'Jugador',        linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-18.jpg', capitan: false },
      { id: 's19', nombre: '[SUPLENTE]', numero: 19, posicion: 'Jugador',        linea: 'suplente', rol: 'suplente', foto: 'assets/jugadores/persona-20.jpg', capitan: false },
      { id: 'dt',  nombre: '[NOMBRE DT]', numero: null, posicion: 'Director Técnico', linea: 'dt',  rol: 'dt',       foto: 'assets/jugadores/persona-19.jpg', capitan: false }
    ]
  }
};

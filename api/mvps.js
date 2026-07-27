/* ============================================================
   UNITED SPORT FC — API de los MVPs de la temporada
   POST /api/mvps  { password, data, fotos: { id: dataURL } }
   Valida la contraseña, sube las fotos nuevas a Supabase Storage
   y guarda mvps.json. Corre en Vercel (Node).
   ============================================================ */
const BUCKET = 'united-sport';
const MAX_MVPS = 24;

module.exports = async (req, res) => {
  // CORS: permite guardar también probando desde el archivo local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PASSWORD = process.env.CAPTAIN_PASSWORD;
  if (!SUPABASE_URL || !SERVICE_KEY || !PASSWORD) {
    return res.status(500).json({ error: 'Faltan variables de entorno en Vercel' });
  }

  const { password, data, fotos } = req.body || {};
  if (password !== PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  if (!data || !Array.isArray(data.mvps)) {
    return res.status(400).json({ error: 'Datos de los MVPs inválidos' });
  }
  if (data.mvps.length > MAX_MVPS) {
    return res.status(400).json({ error: 'Máximo ' + MAX_MVPS + ' premios (hay ' + data.mvps.length + ')' });
  }
  for (const m of data.mvps) {
    if (!m || typeof m.id !== 'string' || !m.id) {
      return res.status(400).json({ error: 'Hay un premio sin id' });
    }
    if (!String(m.premio || '').trim() && !String(m.subtitulo || '').trim()) {
      return res.status(400).json({ error: 'Cada premio necesita un título (ej: "Goalkeeper")' });
    }
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY
  };

  async function subir(ruta, cuerpo, tipo) {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + ruta, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': tipo, 'x-upsert': 'true', 'cache-control': 'no-cache' }, headers),
      body: cuerpo
    });
    if (!r.ok) throw new Error('Storage ' + r.status + ': ' + (await r.text()));
  }

  try {
    // Subir fotos nuevas (dataURL -> jpg en el bucket) y apuntar el premio a su URL pública
    if (fotos && typeof fotos === 'object') {
      for (const id of Object.keys(fotos)) {
        const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(fotos[id] || '');
        if (!m) continue;
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 1500000) {
          return res.status(400).json({ error: 'Foto demasiado pesada: ' + id });
        }
        const ruta = 'mvps/' + encodeURIComponent(id) + '.jpg';
        await subir(ruta, buf, 'image/jpeg');
        const premio = data.mvps.find(function (x) { return x.id === id; });
        if (premio) premio.foto = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + ruta + '?v=' + Date.now();
      }
    }

    // Normalizar: número entero o null, textos recortados, nombres como lista
    data.mvps.forEach(function (m) {
      const n = parseInt(m.numero, 10);
      m.numero = isNaN(n) ? null : n;
      const nombres = Array.isArray(m.nombres) ? m.nombres : String(m.nombre || '').split('\n');
      m.nombres = nombres
        .map(function (x) { return String(x || '').trim().slice(0, 60); })
        .filter(function (x) { return x.length; })
        .slice(0, 20);
      delete m.nombre;
      ['premio', 'subtitulo', 'etiqueta', 'nota'].forEach(function (campo) {
        m[campo] = String(m[campo] || '').trim().slice(0, 120);
      });
    });
    data.temporada = String(data.temporada || '').trim().slice(0, 60);

    data.actualizado = new Date().toISOString();
    await subir('mvps.json', JSON.stringify(data), 'application/json');

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

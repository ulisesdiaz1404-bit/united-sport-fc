/* ============================================================
   UNITED SPORT FC — API del panel del capitán
   POST /api/plantel  { password, data, fotos: { id: dataURL } }
   Valida la contraseña, sube las fotos nuevas a Supabase Storage
   y guarda plantel.json. Corre en Vercel (Node).
   ============================================================ */
const BUCKET = 'united-sport';

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
  if (!data || !Array.isArray(data.jugadores)) {
    return res.status(400).json({ error: 'Datos del plantel inválidos' });
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
    // Subir fotos nuevas (dataURL -> jpg en el bucket) y apuntar el jugador a su URL pública
    if (fotos && typeof fotos === 'object') {
      for (const id of Object.keys(fotos)) {
        const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(fotos[id] || '');
        if (!m) continue;
        const buf = Buffer.from(m[2], 'base64');
        if (buf.length > 1500000) {
          return res.status(400).json({ error: 'Foto demasiado pesada: ' + id });
        }
        const ruta = 'jugadores/' + encodeURIComponent(id) + '.jpg';
        await subir(ruta, buf, 'image/jpeg');
        const j = data.jugadores.find(function (x) { return x.id === id; });
        if (j) j.foto = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + ruta + '?v=' + Date.now();
      }
    }

    // Un solo capitán
    let vioC = false;
    data.jugadores.forEach(function (j) {
      if (j.capitan && vioC) j.capitan = false;
      if (j.capitan) vioC = true;
    });

    data.actualizado = new Date().toISOString();
    await subir('plantel.json', JSON.stringify(data), 'application/json');

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

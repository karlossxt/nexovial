import type { Request, Response } from 'express';

// POST /api/classify
export default async function handler(req: Request, res: Response) {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const lower = text.toLowerCase();
    let type = 'orange';

    if (/\b(violencia|balacera|disparos|enfrentamiento|delincuencia|armados|emboscada|seguridad|peligro)\b/i.test(lower)) {
      type = 'security';
    } else if (/\b(bloqueo|cierre total|manifestaci[oó]n|protesta|ret[eé]n|toma de caseta|incomunicad)\b/i.test(lower)) {
      type = 'red';
    } else if (/\b(libre|fluye|abierto|circulaci[oó]n normal|restablecid|despejad|habilitad)\b/i.test(lower)) {
      type = 'green';
    } else if (/\b(incidente|choque|accidente|volcadura|derrumbe|deslave|averiado|tr[aá]fico lento|carambola)\b/i.test(lower)) {
      type = 'orange';
    }

    const raw = [
      { label: type, score: 0.95 },
      { label: type === 'red' ? 'bloqueo' : type === 'orange' ? 'incidente' : type === 'green' ? 'via_libre' : 'zona_roja', score: 0.95 }
    ];

    res.json({ type, raw });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: 'Error classifying alert' });
  }
}
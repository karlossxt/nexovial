import type { Request, Response } from 'express';
import { fallbackMexicanGeocode } from './lib/geocode';

// POST /api/ner
export default async function handler(req: Request, res: Response) {
  try {
    const { text } = req.body || {};
    const geo = fallbackMexicanGeocode(text || '');
    res.json({
      raw: {
        highway: geo?.highway || null,
        state: geo?.state || null,
        location: geo?.locationName || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error extracting entities' });
  }
}
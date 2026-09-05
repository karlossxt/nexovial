import type { Request, Response } from 'express';
import { RSS_BUNDLE } from './lib/env';
import { esEntradaReciente, parsearRssXml } from './lib/rss';
import { isSafePublicUrl } from './lib/security';

// GET /api/feed-proxy
// Único origen: RSS_BUNDLE o ?url= ; nunca simula eventos.
export default async function handler(req: Request, res: Response) {
  const customUrl = req.query.url as string | undefined;
  const feedUrl = customUrl || RSS_BUNDLE;

  // Intentar el feed (por ?url= o por RSS_BUNDLE del entorno), siempre en URL pública segura
  if (feedUrl && isSafePublicUrl(feedUrl)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CentralVialMX-Bot/1.0 (Highway Traffic Monitor)',
          'Accept': 'application/json, text/xml, application/xml, */*'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const bodyText = await response.text();
        const filtrarItems = (items: unknown[]) =>
          items.filter((it) => {
            const rec = it as Record<string, unknown>;
            return esEntradaReciente((rec?.pubDate ?? rec?.isoDate ?? rec?.date) as string | number | undefined);
          });

        if (/xml|rss|atom/i.test(contentType)) {
          const parsed = parsearRssXml(bodyText);
          if (parsed !== null) {
            return res.json({ title: 'NEXO — Red Vial', status: 'rss_synced', items: parsed });
          }
        } else {
          try {
            const data = JSON.parse(bodyText);
            const rows = Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.channel?.item)
                ? data.channel.item
                : [];
            if (rows.length > 0) {
              return res.json({
                title: data.title || data.channel?.title || 'NEXO — Red Vial',
                status: 'json_synced',
                items: filtrarItems(rows),
              });
            }
          } catch {
            // No es JSON válido; podría ser XML con content-type incorrecto
            const parsed = parsearRssXml(bodyText);
            if (parsed) {
              return res.json({ title: 'NEXO — Red Vial', status: 'rss_synced', items: parsed });
            }
          }
        }
      }
    } catch {
      // el feed falló: se reporta como no disponible (nunca se simulan eventos)
    }
  }

  return res.json({
    title: 'NEXO — Red Vial',
    status: 'feed_unavailable',
    items: [],
    error: feedUrl ? 'No se pudo obtener el feed RSS' : 'RSS_BUNDLE no configurado ni ?url= indicado'
  });
}
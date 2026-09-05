// GET /api/feed-proxy — función autocontenida (sin imports compartidos para Vercel)
// Único origen: RSS_BUNDLE o ?url= ; nunca simula eventos.

const RSS_BUNDLE = (process.env.RSS_BUNDLE || '').trim();
const FEED_MAX_HOURS = Number(process.env.FEED_MAX_HOURS || 24);

interface Req {
  query: { url?: string };
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  const customUrl = req.query.url;
  const feedUrl = customUrl || RSS_BUNDLE;

  if (feedUrl && isSafePublicUrl(feedUrl)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CentralVialMX-Bot/1.0 (Highway Traffic Monitor)',
          'Accept': 'application/json, text/xml, application/xml, */*',
        },
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
            const parsed = parsearRssXml(bodyText);
            if (parsed) {
              return res.json({ title: 'NEXO — Red Vial', status: 'rss_synced', items: parsed });
            }
          }
        }
      }
    } catch {
      // feed falló: se reporta como no disponible
    }
  }

  return res.json({
    title: 'NEXO — Red Vial',
    status: 'feed_unavailable',
    items: [],
    error: feedUrl ? 'No se pudo obtener el feed RSS' : 'RSS_BUNDLE no configurado ni ?url= indicado',
  });
}

function decodificarXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

function extraerEtiqueta(bloque: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = bloque.match(re);
  return m ? decodificarXml(m[1].replace(/<[^>]*>/g, ' ').trim()) : '';
}

function esEntradaReciente(pub: string | number | undefined, horas: number = FEED_MAX_HOURS): boolean {
  if (pub === undefined || pub === null) return true;
  let t = typeof pub === 'number' ? pub : Date.parse(String(pub));
  if (typeof pub === 'number' && t < 1e13) t *= 1000;
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= horas * 3600 * 1000;
}

function parsearRssXml(xml: string): Record<string, unknown>[] | null {
  const cabecera = xml.slice(0, 600).toLowerCase();
  if (!/<(rss|rdf|feed)\b/.test(cabecera)) return null;

  const bloques: string[] = [];
  const itemRe = /<(item|entry)[\s>][\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) bloques.push(m[0]);

  const feedTitleM = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const feedTitle = feedTitleM ? decodificarXml(feedTitleM[1].trim()) : 'NEXO — Red Vial';

  const resultado = bloques
    .map((bloque, i) => {
      const titulo = extraerEtiqueta(bloque, 'title');
      const desc = extraerEtiqueta(bloque, 'description') || extraerEtiqueta(bloque, 'summary') || extraerEtiqueta(bloque, 'content');
      const linkM = bloque.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || bloque.match(/<link[^>]*href=["']([^"' >]+)["']/i);
      const link = linkM ? decodificarXml(linkM[1].trim()) : '';
      const guid = extraerEtiqueta(bloque, 'guid') || link || `rss-item-${i}`;
      const pub = extraerEtiqueta(bloque, 'pubDate') || extraerEtiqueta(bloque, 'published') || extraerEtiqueta(bloque, 'updated') || extraerEtiqueta(bloque, 'date');
      let fechaIso: string;
      try {
        fechaIso = pub ? new Date(pub).toISOString() : new Date().toISOString();
      } catch {
        fechaIso = new Date().toISOString();
      }
      return {
        id: guid,
        title: titulo || 'Sin título',
        description: desc || titulo,
        content: desc || titulo,
        link,
        pubDate: fechaIso,
        isoDate: fechaIso,
        source: 'Sindicación RSS',
        feedSource: feedTitle,
      };
    })
    .filter((it) => esEntradaReciente(it.pubDate as string));

  return resultado;
}

function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    let host = url.hostname.toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

    if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
    if (host.includes(':')) return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const m172 = host.match(/^172\.(\d{1,2})\./);
    if (m172) {
      const second = Number(m172[1]);
      if (second >= 16 && second <= 31) return false;
    }
    const m100 = host.match(/^100\.(\d{1,3})\./);
    if (m100 && Number(m100[1]) >= 64 && Number(m100[1]) <= 127) return false;
    if (/^169\.254\.169\.254$/.test(host) || host === 'metadata.google.internal') return false;

    return true;
  } catch {
    return false;
  }
}

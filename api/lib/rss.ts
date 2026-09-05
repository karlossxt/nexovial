import { FEED_MAX_HOURS } from './env.ts';

export function decodificarXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

export function extraerEtiqueta(bloque: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = bloque.match(re);
  return m ? decodificarXml(m[1].replace(/<[^>]*>/g, ' ').trim()) : '';
}

export function esEntradaReciente(pub: string | number | undefined, horas: number = FEED_MAX_HOURS): boolean {
  if (pub === undefined || pub === null) return true;
  let t = typeof pub === 'number' ? pub : Date.parse(String(pub));
  if (typeof pub === 'number' && t < 1e13) t *= 1000;
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= horas * 3600 * 1000;
}

// Parsea feeds RSS 2.0 / Atom y normaliza items al mismo formato que usa el frontend.
export function parsearRssXml(xml: string): Record<string, unknown>[] | null {
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

  // Un feed válido sin items recientes sigue estando disponible.
  return resultado;
}
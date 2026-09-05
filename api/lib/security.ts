// Valida que una URL de feed sea un endpoint público http(s).
// Previene SSRF contra localhost, rangos privados, link-local y servicios de metadatos de cloud.
export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    let host = url.hostname.toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

    if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
    if (host.includes(':')) return false; // reject raw IPv6 (covers ::1 and fc00::/7)
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const m172 = host.match(/^172\.(\d{1,2})\./);
    if (m172) {
      const second = Number(m172[1]);
      if (second >= 16 && second <= 31) return false;
    }
    const m100 = host.match(/^100\.(\d{1,3})\./); // CGNAT 100.64.0.0/10
    if (m100 && Number(m100[1]) >= 64 && Number(m100[1]) <= 127) return false;
    // Cloud metadata endpoints
    if (/^169\.254\.169\.254$/.test(host) || host === 'metadata.google.internal') return false;

    return true;
  } catch {
    return false;
  }
}
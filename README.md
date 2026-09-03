# NEXO — Monitoreo Vial en Tiempo Real

Plataforma de monitoreo vial y seguridad carretera en tiempo real para México. Combina alertas sindicadas por RSS, inteligencia artificial (Groq) para clasificación y geolocalización de incidentes, generador de rutas seguras, directorio de emergencias, clima por corredor y notificaciones push.

## Características

- **Alertas en vivo**: feed RSS agregado con clasificación automática por IA (`red` / `orange` / `green` / `security`).
- **Clasificación por lote (batch)**: hasta 10 incidentes en una sola llamada IA para optimizar la cuota de Groq.
- **Geolocalización inteligente**: servidor-side con Groq + 3 capas de fallback (heurística mexicana → Nominatim OSM).
- **Análisis profundo de alertas**: dictamen IA con severidad, carriles afectados y ruta alterna.
- **Rutas seguras**: generador de rutas que evalúa incidentes en el trayecto con badge de seguridad.
- **Clima por corredor**, directorio de emergencias, notificaciones push nativas y efectos de sonido.
- **Mapa interactivo**: capas (dark/satellite/standard), heatmap, agrupación de puntos y GPS en vivo.
- **Tema claro/oscuro** y diseño responsive tipo centro de operaciones (SOC).
- **PWA instalable**: manifest + service worker con soporte offline básico del shell, ideal para monitoreo móvil en carretera.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Leaflet + Lucide React
- **Backend**: Express (API serverless compatible con Vercel)
- **IA**: Groq API (multi-modelo con fallback y reintentos)
- **Vista de mapa**: Leaflet + marker clustering

## Requisitos

- Node.js 18+ (para desarrollo local)
- Cuenta en [Groq](https://console.groq.com/keys) para la API key

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completalo:

   ```bash
   cp .env.example .env
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app estará disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Requerida |
| --- | --- | --- |
| `GROQ_API_KEY` | API key de Groq para las llamadas de IA. | Sí |
| `GROQ_MODELS` | Modelos a probar en orden (separados por coma). El primero que responda gana. | No |
| `RSS_BUNDLE` | URL del feed RSS/Atom con las noticias de incidencias. | Sí (para alimentar el feed) |
| `FEED_MAX_HOURS` | Solo se procesan entradas más recientes que este número de horas (evita noticias viejas). | No |
| `AI_RATE_PER_MIN` | Límite de llamadas IA por minuto por IP. Protege la cuota de Groq. | No |
| `API_ACCESS_TOKEN` | Token opcional que protege los endpoints internos con la cabecera `X-Access-Token`. | No |

## Endpoints de API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/feed-proxy` | Proxy del feed RSS (`?url=` opcional; usa `RSS_BUNDLE` si no se pasa). |
| `POST` | `/api/geolocate` | Geolocaliza un texto de alerta. Requiere `X-Access-Token` si está configurado. |
| `POST` | `/api/classify` | Clasifica una alerta en `red/orange/green/security`. |
| `POST` | `/api/classify-batch` | Clasifica hasta 10 alertas en una sola llamada IA. Requiere token si está configurado. |
| `POST` | `/api/ner` | Extrae entidades nombradas (carretera, estado, lugar). |
| `POST` | `/api/ai-analyze-alert` | Análisis profundo de una alerta (severidad, carriles, desvío). Requiere token si está configurado. |

## Scripts

```bash
npm run dev     # desarrollo con HMR y servidor Express
npm run build   # build de producción (Vite + bundle del server)
npm run start   # ejecuta el build en node
npm run lint    # typecheck con tsc --noEmit
```

## Despliegue en Vercel

1. Conecta el repositorio en Vercel (framework: **Vite**).
2. Añade las variables de entorno listadas arriba (al menos `GROQ_API_KEY` y `RSS_BUNDLE`).
3. Despliega. La config en `vercel.json` sirve el frontend y las funciones serverless de `api/`.

> **Nota**: `vercel.json` usa `functions.api/index.ts.maxDuration: 60` para dar margen a las llamadas IA.

## Instalación PWA

NEXO es una PWA instalable. Una vez desplegada, en el navegador:

- **Android / Chrome**: aparece un botón "Instalar" en la barra de direcciones, o usa *Menú → Instalar app*.
- **iOS / Safari**: *Compartir → Añadir a pantalla de inicio*.

El service worker (`public/sw.js`) precachea el shell y usa *network-first* para la navegación, lo que permite abrir la app en offline básico. Los datos en vivo siguen dependiendo de la red y del backend.

## Estructura

```
├── api/index.ts            # Backend Express serverless (todos los endpoints)
├── src/
│   ├── App.tsx             # Orquestador principal (estado global, modales, feed)
│   ├── index.css           # Sistema de diseño y estilos globales
│   ├── components/         # Paneles, mapa y modales
│   ├── services/           # Clientes de API, clima, rutas, notificaciones, sonido
│   ├── data/               # Datos estáticos (directorio de emergencias, etc.)
│   └── types.ts            # Tipos de TypeScript
├── public/                  # Assets estáticos (iconos, manifest, service worker)
├── server.ts               # Servidor Express para desarrollo local
└── vercel.json             # Configuración de Vercel
```

## Seguridad

- **Anti-SSRF** en el proxy de feed: solo permite URLs HTTP(S) públicas, bloquea localhost/IPs privadas/metadata cloud.
- **Rate limiting** en memoria por IP para las llamadas IA.
- **Token opcional** (`X-Access-Token`) para endpoints internos.
- El feed **nunca simula** eventos; solo presenta incidencias reales sindicadas.

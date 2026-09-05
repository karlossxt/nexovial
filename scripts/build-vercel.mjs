import { readdir, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.vercel', 'output');
const STATIC = join(OUT, 'static');
const FUNCS = join(OUT, 'functions', 'api');
const API_DIR = join(ROOT, 'api');
const DIST_FRONT = join(ROOT, 'dist');

async function collectRouteFiles(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('lib')) continue; // código compartido, no es una función
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await collectRouteFiles(full, out);
    } else if (/(\.ts|\.js)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// 1. Frontend Vite a .vercel/output/static
console.log('Bundling frontend (vite)...');
execSync('npx vite build --outDir .vercel/output/static', { cwd: ROOT, stdio: 'inherit' });

// 2. Limpiar functions previas
await rm(FUNCS, { recursive: true, force: true });

// 3. Bundlear cada función con esbuild (autocontenido, lib/ inline)
const routes = await collectRouteFiles(API_DIR);
for (const route of routes) {
  const rel = relative(API_DIR, route).replace(/\.(ts|js)$/, '');
  const outFile = join(FUNCS, `${rel}.func`, 'index.js');
  await mkdir(dirname(outFile), { recursive: true });

  await build({
    entryPoints: [route],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    packages: 'bundle',
    sourcemap: false,
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });

  // config de la función
  await writeFile(
    join(FUNCS, `${rel}.func`, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        maxDuration: 60,
      },
      null,
      2
    )
  );

  console.log(`Bundled function: /api/${rel}`);
}

// 4. config.json de rutas
// handle:filesystem sirve los estáticos reales (sw.js, manifest, iconos).
// Las functions en functions/api/*.func se sirven automáticamente en /api/*.
// El SPA fallback excluye /api/ para no enmascarar los endpoints.
await writeFile(
  join(OUT, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '/((?!api/).*)', dest: '/index.html' },
      ],
    },
    null,
    2
  )
);

// 5. Limpieza: dist/ sobrante no se necesita (ya copiamos a static)
await rm(DIST_FRONT, { recursive: true, force: true });

console.log(`Build Output listo en ${relative(ROOT, OUT)}`);
console.log(`- Static: ${await (async () => (await stat(STATIC)).isDirectory())() ? 'ok' : 'falta'}`);
console.log(`- Functions: ${(await readdir(JOIN(OUT, 'functions'))).join(', ')}`);

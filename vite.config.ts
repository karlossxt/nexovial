import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR se deshabilita opcionalmente para editores/agentes (evita parpadeo durante ediciones).
      hmr: process.env.DISABLE_HMR !== 'true',
      // Desactiva el file watching cuando DISABLE_HMR es true para ahorrar CPU durante ediciones de agentes.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { comlink } from 'vite-plugin-comlink';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isPortable = mode === 'portable';

  if (isPortable) {
    // Portable single-file build - no Comlink (use inline worker)
    return {
      plugins: [viteSingleFile()],
      define: {
        __PORTABLE_BUILD__: true,
      },
      build: {
        target: 'esnext',
        minify: true,
        outDir: 'dist-portable',
        assetsInlineLimit: 200000, // Inline assets up to 200KB (logo is ~147KB)
      },
    };
  }

  // PWA build with service workers
  return {
    plugins: [
      comlink(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png'],
        manifest: {
          name: 'eVelo - Portfolio Strategy Simulator',
          short_name: 'eVelo',
          description: 'Monte Carlo portfolio simulation tool',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          icons: [
            { src: 'logo.png', sizes: '192x192', type: 'image/png' },
            { src: 'logo.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png}'],
        },
      }),
    ],
    worker: {
      plugins: () => [comlink()],
    },
    build: {
      target: 'esnext',
      minify: true,
      outDir: 'dist',
    },
  };
});
